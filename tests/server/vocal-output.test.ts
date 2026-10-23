import { test, expect } from 'bun:test';
import { buildVocalResponseFormat, decodeCharacterOutput, vocalCharacterIdFromFormat } from '../../src/lib/vocal-output';
import { buildPayload, callProvider, demoResult } from '../../src/lib/server/provider';

test('vocal output accepts exact JSON enum text and keeps spoken dialogue plain',()=>{
 expect(decodeCharacterOutput('chiikawa',{content:'{"text":"와아…!"}',finishReason:'stop'})).toBe('와아…!');
 expect(decodeCharacterOutput('hachiware',{content:'기분 좋아!',finishReason:'stop'})).toBe('기분 좋아!');
});
test('wrong character, extra/duplicate keys, malformed JSON, whitespace repair and incomplete/refusal output fail closed',()=>{
 for(const content of ['{"text":"야하—!"}','{"text":"와아…!","other":0}','{"text":"와아…!","text":"와아…!"}','["와아…!"]','null','{"text":null}','{"text":" 와아…!"}','{"text":"와아…! "}','{"text":"와아…!"','와아…!']){
  expect(()=>decodeCharacterOutput('chiikawa',{content,finishReason:'stop'})).toThrow();
 }
 for(const finishReason of ['length','refusal',null,undefined])expect(()=>decodeCharacterOutput('chiikawa',{content:'{"text":"와아…!"}',finishReason})).toThrow();
 expect(()=>decodeCharacterOutput('chiikawa',{content:'{"text":"와아…!"}',finishReason:'stop',refusal:'declined'})).toThrow();
});
test('schema name alone cannot authorize a changed enum or extra schema keywords',()=>{
 const original=buildVocalResponseFormat('chiikawa')!;
 expect(vocalCharacterIdFromFormat(original)).toBe('chiikawa');
 for(const changed of [{...original,json_schema:{...original.json_schema,strict:false}},{...original,json_schema:{...original.json_schema,schema:{...original.json_schema.schema,properties:{text:{type:'string',enum:['wrong']}}}}},{...original,extra:true}])expect(()=>vocalCharacterIdFromFormat(changed)).toThrow();
});
test('provider returns decoded display only after native support, without retrying rejection or length responses',async()=>{
 for(const finishReason of ['stop','length','refusal']){
  let posts=0;
  const fake=async(_url:string|URL|Request,init?:RequestInit)=>{
   if(init?.method==='GET')return Response.json({data:{endpoints:[{provider_name:'Anthropic',tag:'anthropic',supported_parameters:['response_format','structured_outputs']}]}});
   posts++;return Response.json({model:'anthropic/claude-haiku-5.5',choices:[{message:{content:'{"text":"와아…!"}'},finish_reason:finishReason}]});
  };
  const result=callProvider(buildPayload({characterId:'chiikawa',text:'기뻐.'}),'stub',new AbortController().signal,fake);
  if(finishReason==='stop')expect(await result).toBe('와아…!');else await expect(result).rejects.toThrow('MODEL_UNAVAILABLE');
  expect(posts).toBe(1);
 }
});
test('three JSON assistant shots and finite schema fit the whole body for 300-codepoint edge inputs while demo stays plain',()=>{
 for(const characterId of ['chiikawa','hachiware','usagi','kurimanju','momonga','rakko','shisa','furuhonya'] as const){
  for(const text of ['한'.repeat(300),'😀'.repeat(300),'"'.repeat(300),'\\'.repeat(300)]){
   const payload=buildPayload({characterId,text});
   expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThanOrEqual(8192);
   expect(payload.messages.filter(message=>message.role==='assistant')).toHaveLength(3);
  }
  const demo=demoResult({characterId,text:'기뻐.'});
  expect(demo.startsWith('{')).toBe(false);
 }
});

test('unrecognized schema and oversized whole request fail before any network, and unchecked models cannot send vocal POST',async()=>{
 for(const kind of ['schema','body','model'] as const){
  const payload=buildPayload({characterId:'chiikawa',text:'기뻐.'},kind==='model'?'openai/gpt-4.1-mini':undefined);
  if(kind==='schema')payload.response_format!.json_schema.schema.properties.text.enum=['unapproved'];
  if(kind==='body')payload.messages[0]!.content='a'.repeat(8200);
  let calls=0;const fake=async()=>{calls++;return Response.json({});};
  await expect(callProvider(payload,'stub',new AbortController().signal,fake)).rejects.toThrow('MODEL_UNAVAILABLE');
  expect(calls).toBe(0);
 }
});

test('native refusal or token truncation cannot hide behind a normalized stop',()=>{
 for(const nativeFinishReason of ['refusal','max_tokens','length']){
  expect(()=>decodeCharacterOutput('chiikawa',{content:'{"text":"와아…!"}',finishReason:'stop',nativeFinishReason} as Parameters<typeof decodeCharacterOutput>[1])).toThrow();
 }
});
