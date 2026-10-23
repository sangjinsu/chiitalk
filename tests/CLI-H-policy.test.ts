import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildEvaluationJobs } from '../scripts/evaluate-tones';
import { DEFAULT_EVALUATION_MODEL_IDS, MODELS, runEvaluation } from '../scripts/evaluation-support';

test('CLI preserves existing six model positions while appending the new internal H candidate', () => {
  expect(MODELS.slice(0, 6).map(m => m.id)).toEqual([
    'qwen/qwen3.5-9b', 'anthropic/claude-haiku-5.5', 'openai/gpt-5.4-nano',
    'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'openai/gpt-4.1-mini',
  ]);
  expect(MODELS.at(-1)!.id).toBe('openai/gpt-5.4-mini');
});
test('CLI default four-model comparison stays explicit rather than inheriting API mixed routing', () => {
  const { jobs, options } = buildEvaluationJobs(['--pilot']);
  expect(options.models.map(m => m.id)).toEqual([...DEFAULT_EVALUATION_MODEL_IDS]);
  expect(options.models.map(m => m.id)).toEqual(['anthropic/claude-haiku-5.5', 'openai/gpt-5.4-nano', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite']);
  expect(jobs).toHaveLength(32);
});
test('explicit single-model H CLI refuses unsupported vocal before any paid POST, without fallback', async () => {
  const { jobs } = buildEvaluationJobs(['--pilot', '--models=openai/gpt-5.4-mini']);
  expect(jobs).toHaveLength(8);
  expect(jobs.every(j => j.model.id === 'openai/gpt-5.4-mini')).toBe(true);
  const vocal = jobs.find(j => j.characterId === 'chiikawa')!;
  const directory = await mkdtemp(new URL('./cli-H-policy-', import.meta.url).pathname);
  let posts = 0;
  try {
    const report = await runEvaluation({
      outPath: join(directory, 'result.json'), key: 'stub-only', jobs: [vocal],
      provenance: { promptVersion: 'test', fixturePromptVersion: 'test', fixtureVersion: 1, styleSha256: 'a'.repeat(64), fixtureSha256: 'b'.repeat(64), modelConfigSha256: 'c'.repeat(64), providerSha256: 'd'.repeat(64) },
      fetcher: async (url, init) => {
        if (init.method === 'POST') posts++;
        if (url.endsWith('/models')) return Response.json({ data: [{ id: 'openai/gpt-5.4-mini', canonical_slug: 'openai/gpt-5.4-mini-20260317' }] });
        return Response.json({ data: { endpoints: [] } });
      },
    });
    expect(report.error).toBe('UNSUPPORTED_VOCAL_MODEL');
    expect(report.modelPostAttempts).toBe(0);
    expect(posts).toBe(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
