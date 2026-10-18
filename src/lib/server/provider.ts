import type { ConvertRequest } from '../contracts';
import { getCharacterStyle, selectCharacterExamples } from '../character-styles';
import { QuotaError } from './quota';
import { readBoundedStream } from './security';
import { DEFAULT_MODEL_ID, getModelConfig, type ModelId } from './model-config';
export type HttpFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type Message = {role:'system'|'user'|'assistant';content:string};
export interface ProviderPayload {
  model: ModelId;
  messages: Message[];
  max_tokens: 256;
  reasoning?: { enabled: false };
  provider: {
    only?: string[];
    sort?: 'price';
    require_parameters: true;
    allow_fallbacks: false;
    max_price: { prompt: number; completion: number; request: 0 };
  };
  stream: false;
}
export function buildPayload(input: ConvertRequest, modelId: ModelId = DEFAULT_MODEL_ID): ProviderPayload {
  const model = getModelConfig(modelId);
  if (!model || Array.from(input.text).length > 300) throw new QuotaError('INVALID_INPUT');
  const style = getCharacterStyle(input.characterId);
  const examples = selectCharacterExamples(input.characterId, input.text, 3);
  const messages: Message[] = [
    {role:'system',content:style.systemPrompt},
    ...examples.flatMap(example => [{role:'user' as const,content:JSON.stringify({inputText:example.input})},{role:'assistant' as const,content:example.output}]),
    {role:'user',content:JSON.stringify({inputText:input.text})},
  ];
  if (Buffer.byteLength(JSON.stringify(messages),'utf8') > 8192) throw new QuotaError('INVALID_INPUT');
  return {
    model:modelId,messages,max_tokens:256,
    ...(model.supportsReasoning ? {reasoning:{enabled:false as const}} : {}),
    provider:{
      ...(model.provider ? {only:[model.provider],sort:'price' as const} : {}),
      require_parameters:true,allow_fallbacks:false,
      max_price:{prompt:model.promptPrice,completion:model.completionPrice,request:0},
    },
    stream:false,
  };
}
export async function callProvider(payload: ReturnType<typeof buildPayload>, key: string, signal: AbortSignal, fetcher: HttpFetch = fetch): Promise<string> {
  try {
    signal.throwIfAborted();
    const combined = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    const response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','X-OpenRouter-Title':'Chiitalk'},body:JSON.stringify(payload),signal:combined,redirect:'error'});
    if (!response.ok || !response.body) throw new QuotaError('MODEL_UNAVAILABLE');
    const result = JSON.parse(await readBoundedStream(response.body, 65536));
    const message = result?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls;
    const invalidToolCalls = toolCalls != null && (!Array.isArray(toolCalls) || toolCalls.length > 0);
    if (typeof message?.content !== 'string' || !message.content.trim() || message.content.includes('\uFFFD') || invalidToolCalls || message.function_call || result.error || Buffer.byteLength(message.content) > 8192) throw new QuotaError('MODEL_UNAVAILABLE');
    return message.content.trim();
  } catch { throw new QuotaError('MODEL_UNAVAILABLE'); }
}
export function demoResult(input: ConvertRequest): string {
  const example = selectCharacterExamples(input.characterId, input.text, 1)[0];
  return example.output;
}
