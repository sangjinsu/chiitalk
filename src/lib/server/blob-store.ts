import { get, put, list, del, BlobPreconditionFailedError } from '@vercel/blob';
import { MAX_LEDGER_BYTES, kstPeriod, type QuotaStore, type StoredLedger } from './quota';
import { readBoundedStream } from './security';
// SDK 2.8.1 reads this setting per request. Unknown writes must never auto-retry.
process.env.VERCEL_BLOB_RETRIES = '0';
type BlobCommands = Pick<typeof import('@vercel/blob'), 'get' | 'put'>;
export class BlobQuotaStore implements QuotaStore {
  constructor(private token: string, private commands: BlobCommands = { get, put }) {}
  async read(path: string): Promise<StoredLedger | null> {
    // Bind the uncompressed body to its storage ETag, rather than a weak CDN representation tag.
    const response = await this.commands.get(path, { access: 'private', token: this.token, useCache: false, headers: { 'accept-encoding': 'identity' }, abortSignal: AbortSignal.timeout(8000) });
    if (!response) return null;
    if (response.statusCode !== 200) throw Error('Invalid quota document');
    const encoding = response.headers.get('content-encoding')?.trim().toLowerCase();
    if ((encoding && encoding !== 'identity') || !Number.isSafeInteger(response.blob.size) || response.blob.size < 0 || response.blob.size > MAX_LEDGER_BYTES || !/^"[\x21\x23-\x7e\x80-\xff]+"$/.test(response.blob.etag) || response.headers.get('etag') !== response.blob.etag || response.blob.pathname !== path) throw Error('Invalid quota document');
    return { value: await readBoundedStream(response.stream, MAX_LEDGER_BYTES), etag: response.blob.etag };
  }
  async compareAndSwap(path: string, value: string, etag: string | null): Promise<boolean> {
    try {
      await this.commands.put(path, value, { access: 'private', token: this.token, addRandomSuffix: false, allowOverwrite: etag !== null, ...(etag ? { ifMatch: etag } : {}), contentType: 'application/json', cacheControlMaxAge: 60, abortSignal: AbortSignal.timeout(8000) });
      return true;
    } catch (error) {
      if (etag !== null && error instanceof BlobPreconditionFailedError) return false;
      // The SDK has no typed create-collision error. An ambiguous create fails closed.
      throw error;
    }
  }
}
export async function cleanupQuota(token: string, date: Date): Promise<number> {
  const current = kstPeriod(date).month;
  const previous = kstPeriod(new Date(Date.parse(`${current}-01T00:00:00+09:00`) - 1)).month;
  let cursor: string | undefined, pages = 0; const candidates: string[] = [];
  do {
    const page = await list({ prefix: 'quota/', token, limit: 100, ...(cursor ? { cursor } : {}), abortSignal: AbortSignal.timeout(8000) });
    for (const blob of page.blobs) {
      const match = /^quota\/(\d{4}-(?:0[1-9]|1[0-2]))\.json$/.exec(blob.pathname);
      if (match && match[1] < previous && match[1] !== current) candidates.push(blob.url);
    }
    cursor = page.hasMore ? page.cursor : undefined;
    pages++;
    if (cursor && pages >= 20) throw Error('Cleanup listing limit reached');
  } while (cursor);
  if (candidates.length) await del(candidates, { token, abortSignal: AbortSignal.timeout(8000) });
  return candidates.length;
}
