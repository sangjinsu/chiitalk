import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { BlobPreconditionFailedError, type GetBlobResult } from '@vercel/blob';
import { BlobQuotaStore } from '../../src/lib/server/blob-store';
import { MAX_LEDGER_BYTES, QuotaService } from '../../src/lib/server/quota';

const path = 'quota/2026-10.json';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function fixture() {
  const sessions: Record<string, number> = {}, ips: Record<string, number> = {}, requests: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    const session = digest(`session-${i}`);
    sessions[session] = 1; ips[digest(`ip-${i}`)] = 1; requests[digest(`request-${i}`)] = session;
  }
  return JSON.stringify({ version: 1, month: '2026-10', total: 4, days: { '2026-10-11': { sessions, ips } }, requests });
}
function sdkFixture() {
  let value = fixture(), etag = '"stored-v1"', writes = 0, missing = false;
  let writeFailure: Error | undefined;
  let alter: (response: GetBlobResult) => GetBlobResult = response => response;
  const commands: Pick<typeof import('@vercel/blob'), 'get' | 'put'> = {
    get: async (pathname, options) => {
      if (missing) return null;
      const identity = new Headers(options.headers).get('accept-encoding') === 'identity';
      const downloadEtag = identity ? etag : `W/${etag}`;
      return alter({ statusCode: 200, headers: new Headers({ etag: downloadEtag, ...(identity ? {} : { 'content-encoding': 'br' }) }), stream: new ReadableStream({ start(controller) { controller.enqueue(Buffer.from(value)); controller.close(); } }), blob: { url: 'https://example.private.blob.vercel-storage.com/test', downloadUrl: 'https://example.private.blob.vercel-storage.com/test', pathname, contentDisposition: '', cacheControl: 'max-age=60', uploadedAt: new Date(0), etag: downloadEtag, contentType: 'application/json', size: Buffer.byteLength(value) } });
    },
    put: async (pathname, body, options) => {
      writes++;
      if (writeFailure) throw writeFailure;
      if (options.ifMatch !== etag) throw new BlobPreconditionFailedError();
      if (typeof body !== 'string') throw new Error('Unexpected fixture body');
      value = body; etag = `"stored-v${writes + 1}"`;
      return { url: 'https://example.private.blob.vercel-storage.com/test', downloadUrl: 'https://example.private.blob.vercel-storage.com/test', pathname, contentType: 'application/json', contentDisposition: '', etag };
    },
  };
  return { store: new BlobQuotaStore('test-token', commands), get value() { return value; }, get writes() { return writes; }, set alter(next: typeof alter) { alter = next; }, set missing(next: boolean) { missing = next; }, set writeFailure(next: Error) { writeFailure = next; } };
}
test('quota reservation binds the uncompressed body to its storage ETag', async () => {
  const sdk = sdkFixture(); expect(Buffer.byteLength(sdk.value)).toBeGreaterThan(1024);
  const quota = new QuotaService(sdk.store, 'test-quota-secret');
  const result = await quota.reserve('eligible-session', 'eligible-ip', `2026-10:${crypto.randomUUID()}`, new Date('2026-10-11T10:00:00Z'));
  expect(result.remaining).toBe(9); expect(result.monthlyRemaining).toBe(1495);
  expect(sdk.writes).toBe(1); expect(JSON.parse(sdk.value).total).toBe(5);
});
test('a changed blob rejects an older body-bound ETag', async () => {
  const sdk = sdkFixture(), original = await sdk.store.read(path);
  expect(original).not.toBeNull();
  expect(await sdk.store.compareAndSwap(path, original!.value, original!.etag)).toBe(true);
  expect(await sdk.store.compareAndSwap(path, original!.value, original!.etag)).toBe(false);
  expect(sdk.writes).toBe(2);
});
test('compressed or weak version responses fail closed before writes', async () => {
  for (const alter of [
    (response: GetBlobResult): GetBlobResult => ({ ...response, headers: new Headers({ etag: response.blob.etag, 'content-encoding': 'br' }) }),
    (response: GetBlobResult): GetBlobResult => response.statusCode === 200 ? ({ ...response, headers: new Headers({ etag: `W/${response.blob.etag}` }), blob: { ...response.blob, etag: `W/${response.blob.etag}` } }) : response,
  ]) {
    const sdk = sdkFixture(); sdk.alter = alter;
    await expect(sdk.store.read(path)).rejects.toThrow(); expect(sdk.writes).toBe(0);
  }
});
test('invalid blob metadata is rejected without writes', async () => {
  for (const alter of [
    (response: GetBlobResult): GetBlobResult => response.statusCode === 200 ? ({ ...response, blob: { ...response.blob, pathname: 'unexpected.json' } }) : response,
    (response: GetBlobResult): GetBlobResult => response.statusCode === 200 ? ({ ...response, blob: { ...response.blob, size: MAX_LEDGER_BYTES + 1 } }) : response,
    (response: GetBlobResult): GetBlobResult => response.statusCode === 200 ? ({ ...response, blob: { ...response.blob, size: -1 } }) : response,
    (response: GetBlobResult): GetBlobResult => response.statusCode === 200 ? ({ ...response, blob: { ...response.blob, size: Number.NaN } }) : response,
    (response: GetBlobResult): GetBlobResult => response.statusCode === 200 ? ({ ...response, blob: { ...response.blob, etag: '' } }) : response,
    (response: GetBlobResult): GetBlobResult => ({ ...response, headers: new Headers({ etag: '"different-version"' }) }),
  ]) {
    const sdk = sdkFixture(); sdk.alter = alter;
    await expect(sdk.store.read(path)).rejects.toThrow(); expect(sdk.writes).toBe(0);
  }
});
test('missing blobs remain absent and ambiguous responses do not allocate', async () => {
  const missing = sdkFixture(); missing.missing = true;
  expect(await missing.store.read(path)).toBeNull(); expect(missing.writes).toBe(0);
  const ambiguous = sdkFixture();
  ambiguous.alter = response => ({ ...response, statusCode: 304, stream: null, blob: { ...response.blob, size: null, contentType: null } });
  await expect(ambiguous.store.read(path)).rejects.toThrow(); expect(ambiguous.writes).toBe(0);
});
test('unknown write failures are never converted to retryable conflicts', async () => {
  const sdk = sdkFixture(), initial = await sdk.store.read(path);
  sdk.writeFailure = new Error('uncertain write');
  await expect(sdk.store.compareAndSwap(path, initial!.value, initial!.etag)).rejects.toThrow('uncertain write');
  expect(sdk.writes).toBe(1);
});
