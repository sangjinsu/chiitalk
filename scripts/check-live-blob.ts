import { del } from '@vercel/blob';
import { BlobQuotaStore } from '../src/lib/server/blob-store';
import { safeServerErrorClass } from '../src/lib/server/quota';
process.env.VERCEL_BLOB_RETRIES = '0';
if (!process.argv.includes('--live')) {
  console.log('Dry run: use bun run check:live-blob --live with an existing private test Blob store. No network calls or writes were made.');
  process.exit(0);
}
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('BLOB_READ_WRITE_TOKEN is required. Its value is never printed.');
  process.exit(1);
}
const path = `verification/chiitalk-${crypto.randomUUID()}.json`;
const store = new BlobQuotaStore(token);
// Keep the object above the compression threshold to exercise the production read path.
const padding = 'synthetic-quota-session-request-entry:'.repeat(64);
const document = (total: number) => JSON.stringify({ version: 1, total, padding });
try {
  if (Buffer.byteLength(document(0)) <= 1024) throw Error('Verification object must exceed 1 KiB');
  if (!await store.compareAndSwap(path, document(0), null)) throw Error('Initial create failed');
  let createRejected = false;
  try { await store.compareAndSwap(path, document(99), null); } catch { createRejected = true; }
  if (!createRejected) throw Error('Non-overwrite create did not reject an existing pathname');
  const first = await store.read(path);
  if (!first || first.value !== document(0)) throw Error('Uncached read or create exclusion failed');
  const writes = await Promise.allSettled([1,2].map(total => store.compareAndSwap(path, document(total), first.etag)));
  if (writes.filter(result => result.status === 'fulfilled' && result.value).length !== 1 || writes.filter(result => result.status === 'fulfilled' && !result.value).length !== 1) throw Error('Concurrent CAS must have exactly one winner and one known conflict');
  const latest = await store.read(path);
  if (!latest) throw Error('Final uncached read failed');
  const final = JSON.parse(latest.value);
  if (![1,2].includes(final.total) || final.padding !== padding || latest.etag === first.etag) throw Error('Final document and ETag did not reflect the winning CAS');
  if (await store.compareAndSwap(path, document(0), first.etag)) throw Error('Stale ETag unexpectedly overwrote the winning CAS');
  const afterStale = await store.read(path);
  if (!afterStale || afterStale.value !== latest.value || afterStale.etag !== latest.etag) throw Error('Stale CAS changed the winning document');
  console.log('PASS: production BlobQuotaStore reads of JSON larger than 1 KiB, create exclusion, body-bound ETag CAS, one concurrent winner, stale version rejection, latest read. No LLM calls.');
} catch (error) {
  console.error(`FAIL: ${safeServerErrorClass(error)}. Check private store configuration; no secret or response body was printed.`);
  process.exitCode = 1;
} finally {
  try { await del(path,{token,abortSignal:AbortSignal.timeout(8000)}); console.log('Verification object cleanup completed.'); } catch { console.error('Verification object cleanup failed; remove only the verification/chiitalk object created by this run.'); process.exitCode = 1; }
}
