import { buildVocalResponseFormat, decodeCharacterOutput, vocalCharacterIdFromFormat, type VocalResponseFormat } from '../vocal-output';
import type { ConvertRequest } from '../contracts';
import { isVocalCharacterId } from '../vocal-palette';
import { getCharacterStyle, selectCharacterExamples } from '../character-styles';
import { QuotaError } from './quota';
import { readBoundedStream } from './security';
import { DEFAULT_MODEL_ID, SPOKEN_MODEL_ID, getModelConfig, type ModelId, type ProviderRoutingPolicy } from './model-config';
export type HttpFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type Message = {role:'system'|'user'|'assistant';content:string};
export interface ProviderPayload {
  model: ModelId;
  messages: Message[];
  max_tokens: 256;
  reasoning?: Readonly<{ enabled: false } | { effort: 'none' }>;
  provider: ProviderRoutingPolicy;
  response_format?: VocalResponseFormat;
  stream: false;
}
export function buildPayload(input: ConvertRequest, modelId: ModelId = isVocalCharacterId(input.characterId) ? DEFAULT_MODEL_ID : SPOKEN_MODEL_ID): ProviderPayload {
  const model = getModelConfig(modelId);
  if (!model || Array.from(input.text).length > 300) throw new QuotaError('INVALID_INPUT');
  const style = getCharacterStyle(input.characterId);
  const examples = selectCharacterExamples(input.characterId, input.text, 3);
  const responseFormat = buildVocalResponseFormat(input.characterId);
  const messages: Message[] = [
    {role:'system',content:style.systemPrompt + (responseFormat ? '\nReturn only the JSON object {"text":"..."} matching the supplied schema. Select one exact enum text; add no other keys.' : '')},
    ...examples.flatMap(example => [{role:'user' as const,content:JSON.stringify({inputText:example.input})},{role:'assistant' as const,content:responseFormat ? JSON.stringify({text:example.output}) : example.output}]),
    {role:'user',content:JSON.stringify({inputText:input.text})},
  ];
  const payload: ProviderPayload = {
    model:modelId,messages,max_tokens:256,
    ...(model.wirePolicy ? {reasoning:model.wirePolicy.reasoning} : model.supportsReasoning ? {reasoning:{enabled:false as const}} : {}),
    provider:model.wirePolicy?.provider ?? {
      ...(model.provider ? {only:[model.provider],sort:'price' as const} : {}),
      require_parameters:true,allow_fallbacks:false,
      max_price:{prompt:model.promptPrice,completion:model.completionPrice,request:0},
    },
    ...(responseFormat ? {response_format:responseFormat} : {}),
    stream:false,
  };
  if (Buffer.byteLength(JSON.stringify(payload),'utf8') > 8192) throw new QuotaError('INVALID_INPUT');
  return payload;
}
export function isNativeVocalEndpoint(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const endpoint = value as Record<string, unknown>;
  const supported = endpoint.supported_parameters;
  return endpoint.provider_name === 'Anthropic' && endpoint.tag === 'anthropic' && (endpoint.status == null || endpoint.status === 0) && Array.isArray(supported) && supported.includes('response_format') && supported.includes('structured_outputs');
}
export async function callProvider(payload: ReturnType<typeof buildPayload>, key: string, signal: AbortSignal, fetcher: HttpFetch = fetch): Promise<string> {
  try {
    signal.throwIfAborted();
    const combined = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    const vocalId = payload.response_format === undefined ? undefined : vocalCharacterIdFromFormat(payload.response_format);
    if (Buffer.byteLength(JSON.stringify(payload),'utf8') > 8192) throw new QuotaError('MODEL_UNAVAILABLE');
    if (vocalId) {
      if (payload.model !== 'anthropic/claude-haiku-5.5' || JSON.stringify(payload.provider.only) !== '["anthropic"]') throw new QuotaError('MODEL_UNAVAILABLE');
      const capability = await fetcher('https://openrouter.ai/api/v1/models/anthropic/claude-haiku-5.5/endpoints', {method:'GET',signal:combined,redirect:'error'});
      if (!capability.ok || !capability.body) throw new QuotaError('MODEL_UNAVAILABLE');
      const metadata = JSON.parse(await readBoundedStream(capability.body, 65536));
      const supported = Array.isArray(metadata?.data?.endpoints) && metadata.data.endpoints.some(isNativeVocalEndpoint);
      if (!supported) throw new QuotaError('MODEL_UNAVAILABLE');
    }
    const response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','X-OpenRouter-Title':'Chiitalk'},body:JSON.stringify(payload),signal:combined,redirect:'error'});
    if (!response.ok || !response.body) throw new QuotaError('MODEL_UNAVAILABLE');
    const result = JSON.parse(await readBoundedStream(response.body, 65536));
    const message = result?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls;
    const invalidToolCalls = toolCalls != null && (!Array.isArray(toolCalls) || toolCalls.length > 0);
    if (typeof message?.content !== 'string' || !message.content.trim() || message.content.includes('\uFFFD') || invalidToolCalls || message.function_call || result.error || Buffer.byteLength(message.content) > 8192) throw new QuotaError('MODEL_UNAVAILABLE');
    const policy = getModelConfig(payload.model)?.responsePolicy;
    if (policy && (!policy.models.includes(result.model) || result.provider !== policy.provider || result.usage?.completion_tokens_details?.reasoning_tokens !== policy.reasoningTokens)) throw new QuotaError('MODEL_UNAVAILABLE');
    if (vocalId && result.model !== payload.model && result.model !== 'anthropic/claude-haiku-5.5-20261007') throw new QuotaError('MODEL_UNAVAILABLE');
    return decodeCharacterOutput(vocalId, {content:message.content,finishReason:result.choices[0].finish_reason,nativeFinishReason:result.choices[0].native_finish_reason,refusal:message.refusal ?? (result.choices[0].native_finish_reason === 'refusal' ? 'refusal' : undefined)});
  } catch { throw new QuotaError('MODEL_UNAVAILABLE'); }
}
export function demoResult(input: ConvertRequest): string {
  const example = selectCharacterExamples(input.characterId, input.text, 1)[0];
  return example.output;
}
