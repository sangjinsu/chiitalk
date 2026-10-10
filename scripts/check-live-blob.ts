import { get, put, del, BlobPreconditionFailedError } from '@vercel/blob';
import { readBoundedStream } from '../src/lib/server/security';
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
try {
  const first = await put(path, JSON.stringify({version:1,total:0}), {access:'private',token,addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});
  let createRejected = false;
  try { await put(path, '{}', {access:'private',token,addRandomSuffix:false,allowOverwrite:false}); } catch { createRejected = true; }
  if (!createRejected) throw Error('Non-overwrite create did not reject an existing pathname');
  const fetched = await get(path,{access:'private',token,useCache:false});
  if (!fetched || fetched.statusCode !== 200 || fetched.blob.etag !== first.etag) throw Error('Uncached read/ETag contract failed');
  const initial = JSON.parse(await readBoundedStream(fetched.stream,4096));
  if (initial.total !== 0) throw Error('Create collision changed existing content');
  const writes = await Promise.allSettled([1,2].map(total => put(path,JSON.stringify({version:1,total}),{access:'private',token,addRandomSuffix:false,allowOverwrite:true,ifMatch:first.etag,contentType:'application/json'})));
  if (writes.filter(r=>r.status==='fulfilled').length !== 1 || !writes.some(r=>r.status==='rejected' && r.reason instanceof BlobPreconditionFailedError)) throw Error('Concurrent CAS must have exactly one winner and one typed conflict');
  const final = await get(path,{access:'private',token,useCache:false});
  if (!final || final.statusCode !== 200) throw Error('Final uncached read failed');
  const document = JSON.parse(await readBoundedStream(final.stream,4096));
  if (![1,2].includes(document.total) || final.blob.etag === first.etag) throw Error('Final document/ETag did not reflect the winning CAS');
  console.log('PASS: private uncached reads, fixed-path create exclusion, ETag CAS, one concurrent winner, latest read. No LLM calls.');
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.name : 'Blob verification failure'}. Check private store configuration; no secret or response body was printed.`);
  process.exitCode = 1;
} finally {
  try { await del(path,{token}); console.log('Verification object cleanup completed.'); } catch { console.error('Verification object cleanup failed; remove only the verification/chiitalk object created by this run.'); process.exitCode = 1; }
}
