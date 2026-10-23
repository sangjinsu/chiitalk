import { expect, test } from 'bun:test';
import { buildPayload, callProvider, demoResult } from '../../src/lib/server/provider';
import { getModelConfig } from '../../src/lib/server/model-config';
import { readInput } from '../../src/lib/server/security';

const spoken = ['hachiware', 'momonga', 'rakko', 'shisa'] as const;
const signal = () => new AbortController().signal;
function reply(finish: unknown = 'stop', extra: Record<string, unknown> = {}) {
  return {
    model: 'openai/gpt-5.4-mini-20260317', provider: 'OpenAI',
    usage: { completion_tokens_details: { reasoning_tokens: 0 } },
    choices: [{ finish_reason: finish, message: { content: '내가 해냈어!' } }], ...extra,
  };
}

test('spoken defaults to server-only GPT5.4mini with exact readonly wire policy', () => {
  for (const characterId of spoken) {
    const payload = buildPayload({ characterId, text: '내가 했어.' });
    expect(payload.model).toBe('openai/gpt-5.4-mini');
    expect(payload.reasoning).toEqual({ effort: 'none' });
    expect(payload.provider).toEqual({ only: ['openai'], require_parameters: true, allow_fallbacks: false, max_price: { prompt: '0.75', completion: '4.50', request: '0' } });
    expect(payload.provider).not.toHaveProperty('sort');
    expect(payload).not.toHaveProperty('temperature');
    expect(payload).not.toHaveProperty('top_p');
  }
  expect(getModelConfig('openai/gpt-5.4-mini' as never)).toMatchObject({ promptPrice: 0.75, completionPrice: 4.5, provider: 'openai' });
});

for (const finish of [undefined, null, 'length', 'max_tokens', 'tool_calls', 'error', 'refusal']) {
  test(`spoken ${String(finish)} finish fails closed after exactly one request`, async () => {
    let calls = 0;
    const data = reply(finish); if (finish === undefined) delete (data.choices[0] as { finish_reason?: unknown }).finish_reason;
    const fake = async () => { calls++; return Response.json(data); };
    await expect(callProvider(buildPayload({ characterId: 'hachiware', text: '내가 했어.' }), 'test-key', signal(), fake)).rejects.toThrow('MODEL_UNAVAILABLE');
    expect(calls).toBe(1);
  });
}
test('normalized stop cannot conceal native truncation/refusal or refusal content', async () => {
  for (const native_finish_reason of ['length', 'max_tokens', 'refusal']) {
    const data = reply(); Object.assign(data.choices[0]!, { native_finish_reason });
    await expect(callProvider(buildPayload({ characterId: 'rakko', text: '내가 했어.' }), 'test-key', signal(), async () => Response.json(data))).rejects.toThrow('MODEL_UNAVAILABLE');
  }
  const data = reply(); Object.assign(data.choices[0]!.message, { refusal: 'declined' });
  await expect(callProvider(buildPayload({ characterId: 'shisa', text: '내가 했어.' }), 'test-key', signal(), async () => Response.json(data))).rejects.toThrow('MODEL_UNAVAILABLE');
});
test('GPT canonical/bare IDs with OpenAI and observed reasoning0 accept ordinary text', async () => {
  for (const model of ['openai/gpt-5.4-mini', 'openai/gpt-5.4-mini-20260317']) {
    let calls = 0;
    const fake = async (_url: string | URL | Request, init?: RequestInit) => {
      calls++; expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.redirect).toBe('error');
      return Response.json(reply('stop', { model }));
    };
    expect(await callProvider(buildPayload({ characterId: 'momonga', text: '내가 했어.' }), 'test-key', signal(), fake)).toBe('내가 해냈어!');
    expect(calls).toBe(1);
  }
});
test('wrong GPT identity/provider/nonzero-or-missing reasoning metadata fail closed', async () => {
  for (const extra of [
    { model: 'openai/gpt-other' }, { provider: 'Other' },
    { usage: { completion_tokens_details: { reasoning_tokens: 1 } } }, { usage: {} },
  ]) {
    await expect(callProvider(buildPayload({ characterId: 'hachiware', text: '내가 했어.' }), 'test-key', signal(), async () => Response.json(reply('stop', extra)))).rejects.toThrow('MODEL_UNAVAILABLE');
  }
});
test('real and malformed tool calls remain rejected', async () => {
  for (const tool_calls of [[{ type: 'function', function: { name: 'bad', arguments: '{}' } }], {}, 'bad']) {
    const data = reply(); Object.assign(data.choices[0]!.message, { tool_calls });
    await expect(callProvider(buildPayload({ characterId: 'hachiware', text: '내가 했어.' }), 'test-key', signal(), async () => Response.json(data))).rejects.toThrow('MODEL_UNAVAILABLE');
  }
});
test('native Haiku capability gate/strict enum decoding and plain preview remain', async () => {
  const payload = buildPayload({ characterId: 'chiikawa', text: '기뻐.' }); let calls = 0;
  const fake = async (_url: string | URL | Request, init?: RequestInit) => {
    calls++;
    if (init?.method === 'GET') return Response.json({ data: { endpoints: [{ provider_name: 'Anthropic', tag: 'anthropic', supported_parameters: ['response_format', 'structured_outputs'] }] } });
    return Response.json({ model: 'anthropic/claude-haiku-5.5', choices: [{ finish_reason: 'stop', message: { content: '{"text":"와아…!"}' } }] });
  };
  expect(await callProvider(payload, 'test-key', signal(), fake)).toBe('와아…!'); expect(calls).toBe(2);
  expect(demoResult({ characterId: 'chiikawa', text: '기뻐.' })).toBe('와아…!');
});
test('vocal JSON cannot be sent through an explicitly requested spoken model', async () => {
  let calls = 0;
  const result = callProvider(buildPayload({ characterId: 'chiikawa', text: '기뻐.' }, 'openai/gpt-5.4-mini' as never), 'test-key', signal(), async () => { calls++; return Response.json({}); });
  await expect(result).rejects.toThrow('MODEL_UNAVAILABLE'); expect(calls).toBe(0);
});
test('client model/settings fields are denied by the unchanged public request parser', async () => {
  for (const extra of [{ model: 'openai/gpt-5.4-mini' }, { provider: 'openai' }, { reasoning: { effort: 'none' } }]) {
    const request = new Request('http://localhost/api/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: 'hachiware', text: '안녕', ...extra }) });
    await expect(readInput(request)).rejects.toThrow('INVALID_INPUT');
  }
});
test('300-codepoint edge inputs keep three examples/escaped data boundary and whole body<=8KiB', () => {
  for (const characterId of spoken) for (const text of ['한'.repeat(300), '😀'.repeat(300), '"'.repeat(300), '\\'.repeat(300)]) {
    const payload = buildPayload({ characterId, text });
    expect(payload.messages.filter(m => m.role === 'assistant')).toHaveLength(3);
    expect(payload.messages.at(-1)).toEqual({ role: 'user', content: JSON.stringify({ inputText: text }) });
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThanOrEqual(8192);
  }
});
