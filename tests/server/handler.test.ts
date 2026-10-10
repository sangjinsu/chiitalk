import { test, expect } from 'bun:test';
import { createHandlers, type HandlerDependencies } from '../../src/lib/server/handlers';
import { readConfig } from '../../src/lib/server/security';
import { QuotaService, type QuotaStore, type StoredLedger } from '../../src/lib/server/quota';
import { issueSession, SESSION_COOKIE } from '../../src/lib/server/session';
class Store implements QuotaStore {
 record:StoredLedger|null=null;writes=0;failed=false;
 async read(){if(this.failed)throw Error('outage');return structuredClone(this.record);}
 async compareAndSwap(_path:string,value:string,etag:string|null){this.writes++;if((this.record?.etag??null)!==etag)return false;this.record={value,etag:String(this.writes)};return true;}
}
const date=new Date('2026-10-10T06:00:00Z');
async function setup(){
 const store=new Store(),config=readConfig({});let calls=0;let bot=false;let broken=false;
 const deps:HandlerDependencies={config,quota:new QuotaService(store,config.quotaSecret),now:()=>date,ip:()=> 'ip',bot:async()=>{if(bot)throw Error('bot');},convert:async()=>{calls++;if(broken)throw Error('failure');return '변환완료';}};
 const token=await issueSession(config.sessionSecret,date);
 const req=(data:unknown={characterId:'hachiware',text:'안녕'},id=`2026-10:${crypto.randomUUID()}`,options:Record<string,string>={})=>new Request('http://localhost/api/convert',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json',cookie:`${SESSION_COOKIE}=${token}`,'idempotency-key':id,...options},body:JSON.stringify(data)});
 return {store,handler:createHandlers(deps),req,get calls(){return calls},bot:()=>{bot=true},broken:()=>{broken=true}};
}
test('invalid input, origin, session, BotID and stale month do zero writes/vendor calls',async()=>{
 const s=await setup();
 expect((await s.handler.convert(s.req({characterId:'invalid',text:'x'}))).status).toBe(400);
 expect((await s.handler.convert(s.req(undefined,undefined,{origin:'https://evil.test'}))).status).toBe(403);
 expect((await s.handler.convert(s.req(undefined,undefined,{cookie:''}))).status).toBe(401);
 expect((await s.handler.convert(s.req(undefined,`2026-09:${crypto.randomUUID()}`))).status).toBe(409);
 s.bot();expect((await s.handler.convert(s.req())).status).toBe(403);
 expect(s.store.writes).toBe(0);expect(s.calls).toBe(0);
});
test('two simultaneous duplicate requests call provider only once',async()=>{
 const s=await setup(),id=`2026-10:${crypto.randomUUID()}`;
 const responses=await Promise.all([s.handler.convert(s.req(undefined,id)),s.handler.convert(s.req(undefined,id))]);
 expect(responses.map(x=>x.status).sort()).toEqual([200,409]);expect(s.calls).toBe(1);
 expect((await s.handler.convert(s.req({characterId:'hachiware',text:'changed'},id))).status).toBe(409);expect(s.calls).toBe(1);
});
test('last quota slot permits exactly one provider call',async()=>{
 const s=await setup();for(let i=0;i<9;i++)await s.handler.convert(s.req());
 const r=await Promise.all([s.handler.convert(s.req()),s.handler.convert(s.req())]);
 expect(r.map(x=>x.status).sort()).toEqual([200,429]);expect(s.calls).toBe(10);
});
test('model error consumes one allocation without retry or refund',async()=>{
 const s=await setup();s.broken();expect((await s.handler.convert(s.req())).status).toBe(503);expect(s.calls).toBe(1);expect(JSON.parse(s.store.record!.value).total).toBe(1);
});
test('quota outage never calls provider',async()=>{
 const s=await setup();s.store.failed=true;expect((await s.handler.convert(s.req())).status).toBe(503);expect(s.calls).toBe(0);
});
test('GET issues cookie with no writes and all responses disable caching',async()=>{
 const s=await setup(),r=await s.handler.session(new Request('http://localhost/api/session'));
 expect(r.status).toBe(200);expect(r.headers.get('set-cookie')).toContain('HttpOnly');expect(r.headers.get('cache-control')).toContain('no-store');expect(s.store.writes).toBe(0);
});
