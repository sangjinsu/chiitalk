import { test, expect } from 'bun:test';
import { readConfig, assertOrigin, readInput } from '../../src/lib/server/security';
import { issueSession, verifySession } from '../../src/lib/server/session';
const secret='0e8c24d174ace092fe71d3c7b49e51089f9f04b5ad3eca7579ae9d05b8fba83f';
test('preview cannot enable live mode even when mode and keys are set',()=>{expect(readConfig({VERCEL_ENV:'preview',CHIITALK_MODE:'live',SESSION_SECRET:secret}).mode).toBe('demo');});
test('production missing secrets fails closed',()=>{expect(()=>readConfig({VERCEL_ENV:'production'})).toThrow();});
test('local live needs explicitly permitted CLI mode',()=>{expect(()=>readConfig({CHIITALK_MODE:'live'})).toThrow();});
test('origin is derived from deployment config and rejects spoofed host',()=>{
 const config=readConfig({VERCEL_ENV:'production',VERCEL_URL:'real.vercel.app',SESSION_SECRET:secret,QUOTA_HMAC_SECRET:secret+'different',BLOB_READ_WRITE_TOKEN:'token',OPENROUTER_API_KEY:'key',CRON_SECRET:secret});
 expect(()=>assertOrigin(new Request('https://evil.test/api/convert',{headers:{origin:'https://evil.test',host:'evil.test'}}),config)).toThrow();
 expect(()=>assertOrigin(new Request('https://real.vercel.app/api/convert',{headers:{origin:'https://real.vercel.app'}}),config)).not.toThrow();
});
test('session expired or tampered JWT is rejected',async()=>{
 const token=await issueSession(secret,new Date('2026-10-10T00:00:00Z'));
 expect(await verifySession(token,secret,new Date('2026-10-10T01:00:00Z'))).not.toBeNull();
 expect(await verifySession(token,secret,new Date('2026-10-18T00:00:00Z'))).toBeNull();
 expect(await verifySession(token+'tamper',secret,new Date('2026-10-10T01:00:00Z'))).toBeNull();
});
test('input enforces actual 4KiB body bound regardless content-length',async()=>{
 await expect(readInput(new Request('http://localhost/api/convert',{method:'POST',headers:{'content-type':'application/json','content-length':'2'},body:JSON.stringify({characterId:'chiikawa',text:'a'.repeat(5000)})}))).rejects.toThrow();
});
test('input allows 300 unicode points and rejects extras',async()=>{
 const req=(data:unknown)=>new Request('http://localhost/api/convert',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
 expect((await readInput(req({characterId:'chiikawa',text:'😀'.repeat(300)}))).text.length).toBe(600);
 await expect(readInput(req({characterId:'chiikawa',text:'x',model:'expensive'}))).rejects.toThrow();
 await expect(readInput(req({characterId:'chiikawa',text:'😀'.repeat(301)}))).rejects.toThrow();
});
test('production IP rejects missing or spoofed forwarded IP and accepts ingress IP',async()=>{
 const {trustedIP}=await import('../../src/lib/server/security');
 const config=readConfig({VERCEL_ENV:'production',VERCEL_URL:'real.vercel.app',SESSION_SECRET:secret,QUOTA_HMAC_SECRET:secret+'different',BLOB_READ_WRITE_TOKEN:'token',OPENROUTER_API_KEY:'key',CRON_SECRET:secret});
 expect(()=>trustedIP(new Request('https://real.vercel.app',{headers:{'x-forwarded-for':'198.51.100.1'}}),config)).toThrow();
 expect(()=>trustedIP(new Request('https://real.vercel.app',{headers:{'x-real-ip':'invalid'}}),config)).toThrow();
 expect(trustedIP(new Request('https://real.vercel.app',{headers:{'x-real-ip':'198.51.100.1'}}),config)).toBe('198.51.100.1');
});
test('preview session survives independent cold processes without live secrets',async()=>{
 const childBase = `import {readConfig} from './src/lib/server/security'; import {issueSession,verifySession} from './src/lib/server/session'; const date=new Date('2026-10-10T00:00:00Z'); const config=readConfig({VERCEL_ENV:'preview',VERCEL:'1',VERCEL_URL:'demo-example.vercel.app',CHIITALK_MODE:'live',SESSION_SECRET:'ignored-live-secret'});`;
 const first=Bun.spawnSync([process.execPath,'-e',childBase+'process.stdout.write(await issueSession(config.sessionSecret,date));'],{stdout:'pipe',stderr:'pipe'});
 expect(first.exitCode).toBe(0);
 const second=Bun.spawnSync([process.execPath,'-e',childBase+'process.stdout.write((await verifySession(process.env.CHIITALK_TEST_TOKEN!,config.sessionSecret,date)) ? "valid" : "invalid");'],{env:{...process.env,CHIITALK_TEST_TOKEN:first.stdout.toString()},stdout:'pipe',stderr:'pipe'});
 expect(second.exitCode).toBe(0);expect(second.stdout.toString()).toBe('valid');
});
test('production rejects demo JWT and never uses demo key or live preview credentials',async()=>{
 const date=new Date('2026-10-10T00:00:00Z');
 const demo=readConfig({VERCEL_ENV:'preview',VERCEL_URL:'demo-example.vercel.app',SESSION_SECRET:secret,BLOB_READ_WRITE_TOKEN:'live-blob',OPENROUTER_API_KEY:'live-model'});
 const prod=readConfig({VERCEL_ENV:'production',VERCEL_URL:'real.vercel.app',SESSION_SECRET:secret,QUOTA_HMAC_SECRET:secret+'different',BLOB_READ_WRITE_TOKEN:'token',OPENROUTER_API_KEY:'key',CRON_SECRET:secret});
 expect(demo.mode).toBe('demo');expect(demo.openrouterKey).toBeUndefined();expect(demo.blobToken).toBeUndefined();expect(demo.sessionSecret).not.toBe(prod.sessionSecret);
 const token=await issueSession(demo.sessionSecret,date);
 expect(await verifySession(token,prod.sessionSecret,date)).toBeNull();
});
