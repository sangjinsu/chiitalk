import { test, expect, spyOn } from 'bun:test';
import { QuotaService, type QuotaStore, type StoredLedger, QuotaError, safeServerErrorClass } from '../../src/lib/server/quota';
class Store implements QuotaStore {
  record: StoredLedger | null = null; writes = 0; conflict = 0; fail = false;
  async read() { if(this.fail) throw Error('outage'); return structuredClone(this.record); }
  async compareAndSwap(_path:string, value:string, etag:string|null) {
    this.writes++;
    if(this.fail) throw Error('uncertain');
    if(this.conflict > 0) { this.conflict--; return false; }
    if((this.record?.etag ?? null) !== etag) return false;
    this.record={value,etag:String(this.writes)}; return true;
  }
}
const date = new Date('2026-10-10T06:00:00Z');
const key = () => `2026-10:${crypto.randomUUID()}`;
const service = (store:Store) => new QuotaService(store,'a'.repeat(48));
test('same session switching IP cannot reserve an eleventh daily request',async()=>{
 const s=new Store(), q=service(s);
 for(let i=0;i<10;i++) await q.reserve('sid',`ip-${i}`,key(),date);
 await expect(q.reserve('sid','different',key(),date)).rejects.toMatchObject({code:'QUOTA_EXCEEDED'});
 expect(s.writes).toBe(10);
});
test('same IP with new sessions cannot reserve request 31',async()=>{
 const s=new Store(), q=service(s);
 for(let i=0;i<30;i++) await q.reserve(`sid-${i}`,'ip',key(),date);
 await expect(q.reserve('new','ip',key(),date)).rejects.toMatchObject({code:'QUOTA_EXCEEDED'});
 expect(s.writes).toBe(30);
});
test('two simultaneous requests for last slot admit exactly one',async()=>{
 const s=new Store(),q=service(s);
 for(let i=0;i<9;i++) await q.reserve('sid','ip',key(),date);
 const result=await Promise.allSettled([q.reserve('sid','ip',key(),date),q.reserve('sid','ip',key(),date)]);
 expect(result.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 expect(JSON.parse(s.record!.value).total).toBe(10);
});
test('cross-user concurrent CAS preserves both allocations',async()=>{
 const s=new Store(),q=service(s);
 await Promise.all([q.reserve('a','ip-a',key(),date),q.reserve('b','ip-b',key(),date)]);
 expect(JSON.parse(s.record!.value).total).toBe(2);
});
test('duplicate parallel and later request IDs cannot reserve again',async()=>{
 const s=new Store(),q=service(s),id=key();
 const r=await Promise.allSettled([q.reserve('sid','ip',id,date),q.reserve('sid','ip',id,date)]);
 expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 await expect(q.reserve('sid','new-ip',id,date)).rejects.toMatchObject({code:'DUPLICATE_REQUEST'});
 expect(JSON.parse(s.record!.value).total).toBe(1);
 await q.reserve('other','ip',id,date);
 expect(JSON.parse(s.record!.value).total).toBe(2);
});
test('previous month ID performs zero writes',async()=>{
 const s=new Store();await expect(service(s).reserve('sid','ip',`2026-09:${crypto.randomUUID()}`,date)).rejects.toMatchObject({code:'INVALID_REQUEST_ID'});expect(s.writes).toBe(0);
});
test('unknown write result is not retried',async()=>{
 const s=new Store();const q=service(s);s.compareAndSwap=async()=>{s.writes++;throw Error('uncertain');};
 await expect(q.reserve('sid','ip',key(),date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});expect(s.writes).toBe(1);
});
test('conflict retries have a bounded three-attempt limit',async()=>{
 const s=new Store();s.conflict=5;
 await expect(service(s).reserve('sid','ip',key(),date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});expect(s.writes).toBe(3);
});
test('corrupt ledger fails closed with zero writes',async()=>{
 const s=new Store();s.record={etag:'bad',value:JSON.stringify({version:1,total:0,days:{},requests:{},unexpected:true})};
 await expect(service(s).reserve('sid','ip',key(),date)).rejects.toBeInstanceOf(QuotaError);expect(s.writes).toBe(0);
});
test('KST captured month remains stable through CAS retries',async()=>{
 const s=new Store();s.conflict=1;const seen:string[]=[];const original=s.compareAndSwap.bind(s);s.compareAndSwap=async(path,...args)=>{seen.push(path);return original(path,...args);};
 await service(s).reserve('sid','ip',`2026-10:${crypto.randomUUID()}`,new Date('2026-10-31T14:59:59Z'));expect(seen).toEqual(['quota/2026-10.json','quota/2026-10.json']);
});
test('monthly global cap blocks allocation 1501 across different sessions and IPs',async()=>{
 const s=new Store(),q=service(s);
 for(let i=0;i<1500;i++)await q.reserve(`sid-${i}`,`ip-${i}`,key(),date);
 const writes=s.writes;
 await expect(q.reserve('last','last-ip',key(),date)).rejects.toMatchObject({code:'QUOTA_EXCEEDED',quota:{monthlyRemaining:0,limitReason:'monthly'}});
 expect(s.writes).toBe(writes);
 expect(Buffer.byteLength(s.record!.value)).toBeLessThan(1024*1024);
}, {timeout:15000});
test('ledger persists no plaintext session IP or request UUID',async()=>{
 const s=new Store(),id=key();await service(s).reserve('private-sid','198.51.100.99',id,date);
 expect(s.record!.value).not.toContain('private-sid');expect(s.record!.value).not.toContain('198.51.100.99');expect(s.record!.value).not.toContain(id.split(':')[1]);
});
test('unknown write failures record only the stage class and attempt, without retry',async()=>{
 const s=new Store(),q=service(s),id=key(),logs:unknown[]=[];
 const logger=spyOn(console,'error').mockImplementation(value=>{logs.push(value);});
 try {
  s.compareAndSwap=async()=>{s.writes++;const error=new Error('private-text private-result private-session 198.51.100.99 private-key');error.name='untrusted-private-key';throw error;};
  await expect(q.reserve('private-session','198.51.100.99',id,date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  expect(s.writes).toBe(1);
  expect(logs).toEqual([{event:'chiitalk.quota_unavailable',operation:'reserve',stage:'write',attempt:1,errorClass:'Error'}]);
  const recorded=JSON.stringify(logs);
  for(const privateValue of ['private-text','private-result','private-session','198.51.100.99','private-key',id])expect(recorded).not.toContain(privateValue);
 } finally {logger.mockRestore();}
});
test('quota diagnostics distinguish read failures, malformed documents and exhausted CAS',async()=>{
 const logs:unknown[]=[];const logger=spyOn(console,'error').mockImplementation(value=>{logs.push(value);});
 try {
  const unavailable=new Store();unavailable.fail=true;
  await expect(service(unavailable).inspect('sid','ip',date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  const malformed=new Store();malformed.record={value:'{}',etag:'private-etag'};
  await expect(service(malformed).reserve('sid','ip',key(),date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  const conflicts=new Store();conflicts.conflict=3;
  await expect(service(conflicts).reserve('sid','ip',key(),date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  expect(logs).toEqual([
   {event:'chiitalk.quota_unavailable',operation:'inspect',stage:'read',errorClass:'Error'},
   {event:'chiitalk.quota_unavailable',operation:'reserve',stage:'parse',attempt:1,errorClass:'QuotaError'},
   {event:'chiitalk.quota_unavailable',operation:'reserve',stage:'conflict_limit',attempt:3,errorClass:'QuotaError'},
  ]);
  expect(JSON.stringify(logs)).not.toContain('private-etag');
 } finally {logger.mockRestore();}
});
test('diagnostic failures do not change quota outcomes or retry uncertain writes',async()=>{
 const s=new Store(),q=service(s);const logger=spyOn(console,'error').mockImplementation(()=>{throw new Error('diagnostic failure');});
 try {
  s.fail=true;
  await expect(q.inspect('sid','ip',date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  s.fail=false;
  s.compareAndSwap=async()=>{s.writes++;throw new Error('uncertain write');};
  await expect(q.reserve('sid','ip',key(),date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  expect(s.writes).toBe(1);
  const conflicts=new Store();conflicts.conflict=3;
  await expect(service(conflicts).reserve('sid','ip',key(),date)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  expect(conflicts.writes).toBe(3);
  const healthy=new Store();expect((await service(healthy).reserve('sid','ip',key(),date)).remaining).toBe(9);expect(healthy.writes).toBe(1);
 } finally {logger.mockRestore();}
});
test('error classification never reads arbitrary error details or trusts arbitrary class names',()=>{
 const custom=new Error('private-content');custom.name='private-class-name';
 expect(safeServerErrorClass(custom)).toBe('Error');
 const unreadable=new Error('private-content');Object.defineProperty(unreadable,'constructor',{get(){throw new Error('private-getter');}});
 expect(safeServerErrorClass(unreadable)).toBe('UnknownError');
 expect(safeServerErrorClass({name:'BlobError',message:'private-content'})).toBe('UnknownError');
});
