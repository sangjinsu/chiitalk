import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEvaluationJobs, runCli } from "../scripts/evaluate-tones";
import { MODELS, runEvaluation, type EvaluationJob } from "../scripts/evaluation-support";
import { MODEL_CONFIGS } from "../src/lib/server/model-config";
import { buildPayload } from "../src/lib/server/provider";
import fixtures from "../data/character-evaluation-inputs.json";
import { createHash } from "node:crypto";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
async function outputPath() { const path = await mkdtemp(join(tmpdir(), "chiitalk-cli-test-")); directories.push(path); return join(path, "result.json"); }
const provenance = { promptVersion: "test-v2", fixturePromptVersion: "test-v2", fixtureVersion: 2, styleSha256: "a".repeat(64), fixtureSha256: "b".repeat(64), modelConfigSha256: "c".repeat(64), providerSha256: "d".repeat(64) };
const job = (index: number): EvaluationJob => ({ index, caseId: `hachiware-${index + 1}`, characterId: "hachiware", category: "joy", input: "정말 기뻐.", expectedMode: "verbal", model: MODELS[0], messages: [{ role: "system", content: "짧은 반응" }, { role: "user", content: JSON.stringify({ inputText: "정말 기뻐." }) }] });
const chat = (model: string = MODELS[0].canonical) => ({ id: "gen-test-1", model, choices: [{ message: { content: "와…!", tool_calls: [] }, finish_reason: "stop" }], usage: { prompt_tokens: 400, completion_tokens: 8, total_tokens: 408, cost: 0.0000412, completion_tokens_details: { reasoning_tokens: 0 } } });
function stub(options: { model?: string; auditStatus?: number; nativeReasoning?: unknown; timeout?: boolean } = {}) {
  const calls: { method: string; url: string }[] = [];
  const fetcher = async (url: string, init: RequestInit) => {
    calls.push({ method: init.method ?? "GET", url });
    if (url.endsWith("/models")) return Response.json({ data: MODELS.map((model) => ({ id: model.id, canonical_slug: model.canonical })) });
    if (url.endsWith("/endpoints")) return Response.json({ data: { endpoints: [{ provider_name: "Darkbloom", tag: "anthropic", pricing: { prompt: "0.0000001", completion: "0.00000015", request: "0" }, supported_parameters: ["reasoning", "max_tokens"] }] } });
    if (url.endsWith("/key")) return Response.json({ data: { limit: 5, limit_reset: "monthly", limit_remaining: 4, is_management_key: false, label: "private-label" } });
    if (url.includes("/generation?")) return options.auditStatus ? new Response("sensitive vendor error", { status: options.auditStatus }) : Response.json({ data: { id: "gen-test-1", model: MODELS[0].canonical, provider_name: "Darkbloom", native_tokens_reasoning: options.nativeReasoning ?? 0, native_tokens_prompt: 400, native_tokens_completion: 8, total_cost: 0.0000412 } });
    if (options.timeout) return new Promise<Response>(() => {});
    return Response.json(chat(options.model));
  };
  return { fetcher, calls };
}

test("canonical Qwen is accepted and pending is durable before the only paid POST", async () => {
  const outPath = await outputPath(); const fake = stub(); let pendingSeen = false;
  const fetcher = async (url: string, init: RequestInit) => {
    if (init.method === "POST") { const saved = JSON.parse(await readFile(outPath, "utf8")); pendingSeen = saved.rows[0].status === "pending"; }
    return fake.fetcher(url, init);
  };
  const result = await runEvaluation({ outPath, key: "stub-only", jobs: [job(0)], provenance, fetcher });
  expect(pendingSeen).toBe(true); expect(result.rows[0]?.status).toBe("ok"); expect(result.rows[0]?.output).toBe("와…!");
  expect(fake.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(result.promptVersion).toBe("test-v2"); expect(result.sourceHashes.style).toBe(provenance.styleSha256);
  const saved = await readFile(outPath, "utf8"); expect(saved).not.toContain("stub-only"); expect(saved).not.toContain("private-label"); expect(saved).not.toContain("limit_remaining");
});

test("a wrong-model response preserves output and cost then halts before another POST", async () => {
  const fake = stub({ model: `${MODELS[0].canonical}-impostor` });
  const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher: fake.fetcher });
  expect(result.halted).toBe(true); expect(result.rows).toHaveLength(1); expect(result.rows[0]?.status).toBe("error");
  expect(result.rows[0]?.output).toBe("와…!"); expect(result.rows[0]?.chatEvidence?.costUsd).toBe(0.0000412);
  expect(result.rows[0]?.generationId).toBe("gen-test-1"); expect(fake.calls.filter((call) => call.method === "POST")).toHaveLength(1);
});

test("Generation 404 preserves durable language success and proceeds to a distinct job without retries", async () => {
  const fake = stub({ auditStatus: 404 }); const outPath = await outputPath(); let savedBeforeAudit = false; const postedModels: string[] = [];
  const fetcher = async (url: string, init: RequestInit) => {
    if (url.includes("/generation?")) { const saved = JSON.parse(await readFile(outPath, "utf8")); savedBeforeAudit = saved.rows.at(-1).languageSucceeded && saved.rows.at(-1).status === "ok"; }
    const response = await fake.fetcher(url, init);
    if (init.method === "POST") { const requested = JSON.parse(String(init.body)).model as string; postedModels.push(requested); return Response.json(chat(requested)); }
    return response;
  };
  const result = await runEvaluation({ outPath, key: "stub-only", jobs: [job(0), { ...job(1), model: MODELS[1] }], provenance, fetcher });
  expect(postedModels).toEqual(MODELS.slice(0, 2).map((model) => model.id));
  expect(savedBeforeAudit).toBe(true); expect(result.halted).toBe(false); expect(result.languageSuccesses).toBe(2); expect(result.auditPending).toBe(2);
  expect(result.rows[0]?.output).toBe("와…!"); expect(result.rows[0]?.generationHttpStatus).toBe(404); expect(result.rows[0]?.auditError).toBe("HTTP_404");
  expect(result.rows[0]?.status).toBe("ok"); expect(result.rows.map((row) => row.caseId)).toEqual(["hachiware-1", "hachiware-2"]);
  expect(fake.calls.filter((call) => call.method === "POST")).toHaveLength(2); expect(fake.calls.filter((call) => call.url.includes("/generation?"))).toHaveLength(2);
  expect(JSON.stringify(result)).not.toContain("sensitive vendor error");
});

test("timeout after pending leaves an error and never starts the next paid request", async () => {
  const fake = stub({ timeout: true }); const outPath = await outputPath();
  const result = await runEvaluation({ outPath, key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher: fake.fetcher, timeoutMs: 10 });
  expect(result.halted).toBe(true); expect(result.rows[0]?.status).toBe("error"); expect(fake.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(JSON.parse(await readFile(outPath, "utf8")).rows[0].status).toBe("error");
});

test("existing output is never overwritten and prevents all network calls", async () => {
  const outPath = await outputPath(); await writeFile(outPath, "previous pending result"); const fake = stub();
  await expect(runEvaluation({ outPath, key: "stub-only", jobs: [job(0)], provenance, fetcher: fake.fetcher })).rejects.toThrow();
  expect(await readFile(outPath, "utf8")).toBe("previous pending result"); expect(fake.calls).toHaveLength(0);
});

test("invalid monthly key blocks POST while unknown native metadata defers the supplementary audit", async () => {
  const fake = stub();
  const badKey = async (url: string, init: RequestInit) => url.endsWith("/key") ? Response.json({ data: { limit: 5, limit_reset: "daily", limit_remaining: 4, is_management_key: false } }) : fake.fetcher(url, init);
  const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0)], provenance, fetcher: badKey });
  expect(result.halted).toBe(true); expect(fake.calls.filter((call) => call.method === "POST")).toHaveLength(0);
  const unknown = stub({ nativeReasoning: "0" });
  const audited = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher: unknown.fetcher });
  expect(audited.halted).toBe(false); expect(audited.auditPending).toBe(2); expect(audited.rows[0]?.output).toBe("와…!"); expect(unknown.calls.filter((call) => call.method === "POST")).toHaveLength(2);
});


test("CLI defaults to dry, freezes provenance, and refuses missing live key without network", async () => {
  let requests = 0; const lines: string[] = [];
  const dependencies = { fetcher: async () => { requests++; throw new Error("must not call"); }, log: (line: string) => lines.push(line) };
  expect(await runCli([], dependencies)).toBe(0);
  const dry = JSON.parse(lines[0]!);
  expect(dry.plannedRequests).toBe(960); expect(dry.cases).toBe(240); expect(dry.paidRequests).toBe(0);
  expect(dry.models).toEqual(["anthropic/claude-haiku-5.5", "openai/gpt-5.4-nano", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"]);
  expect(dry.modelConfigSha256).toMatch(/^[a-f0-9]{64}$/); expect(dry.providerSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(dry.budget.assumption).toContain("assumption"); expect(dry.budget.conservativeMaximumUsd).toBeCloseTo(3.038208, 7);
  expect(dry.promptVersion).toBe(dry.fixturePromptVersion); expect(dry.styleSha256).toMatch(/^[a-f0-9]{64}$/);
  await expect(runCli(["--live"], dependencies)).rejects.toThrow("OPENROUTER_API_KEY is required");
  expect(requests).toBe(0);
  expect(() => buildEvaluationJobs(["--live", "--dry"])).toThrow();
  expect(() => buildEvaluationJobs(["--limit=961"])).toThrow();
});

test("pilot chooses one fixed input for each character across four candidates", () => {
  const pilot = buildEvaluationJobs(["--pilot"]);
  expect(pilot.jobs).toHaveLength(32); expect(new Set(pilot.jobs.map((item) => item.characterId)).size).toBe(8);
  expect(pilot.jobs.map((item) => item.index)).toEqual(Array.from({ length: 8 }, (_, character) => Array.from({ length: 4 }, (_, model) => character * 120 + model)).flat());
  const prefix = buildEvaluationJobs(["--limit=16"]);
  expect(prefix.jobs.map((item) => item.index)).toEqual(Array.from({ length: 16 }, (_, index) => index));
});

test("exact model selection derives caps and rejects malformed or unsupported choices without network", async () => {
  const selected = buildEvaluationJobs(["--pilot", "--models=openai/gpt-4.1-mini,qwen/qwen3.5-9b"]);
  expect(selected.jobs).toHaveLength(16); expect(selected.options.requestCap).toBe(16);
  expect(selected.jobs.slice(0, 2).map((item) => item.model.id)).toEqual(["openai/gpt-4.1-mini", "qwen/qwen3.5-9b"]);
  expect(new Set<string>(MODELS.map((model) => model.id))).toEqual(new Set(Object.keys(MODEL_CONFIGS)));
  for (const args of [["--models="], ["--models=openai/gpt-4.1-mini,"], ["--models=openai/gpt-4.1-mini,openai/gpt-4.1-mini"], ["--models=unknown/model"], ["--models=openai/gpt-4.1-mini-impostor"], ["--pilot", "--limit=33"], ["--limit=NaN"], ["--limit=Infinity"], ["--limit=1.2"], ["--limit=0"], ["--models=qwen/qwen3.5-9b", "--limit=241"]]) {
    let requests = 0;
    await expect(runCli(args, { fetcher: async () => { requests++; throw new Error("must not call"); }, log: () => {} })).rejects.toThrow();
    expect(requests).toBe(0);
  }
});

test("each registry model sends the exact shared provider controls and frozen prompt", async () => {
  for (const model of MODELS) {
    const currentJob = { ...job(0), model };
    const fake = stub(); let body: Record<string, unknown> | undefined;
    const fetcher = async (url: string, init: RequestInit) => {
      if (url.endsWith("/endpoints")) return Response.json({ data: { endpoints: [{ provider_name: "Standard", tag: model.provider ?? "qwen", status: 0, pricing: { prompt: model.promptPrice / 1e6, completion: model.completionPrice / 1e6 }, supported_parameters: model.supportsReasoning ? ["max_tokens", "reasoning"] : ["max_tokens"] }] } });
      if (init.method === "POST") { body = JSON.parse(String(init.body)); return Response.json(chat(model.id)); }
      if (url.includes("/generation?")) return new Response(null, { status: 404 });
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [currentJob], provenance, fetcher });
    expect(result.halted).toBe(false);
    expect(body).toEqual({ ...buildPayload({ characterId: "hachiware", text: currentJob.input }, model.id), messages: currentJob.messages });
    expect(body).not.toHaveProperty("temperature"); expect(body).not.toHaveProperty("top_p"); expect(body).not.toHaveProperty("top_k");
    expect(body).not.toHaveProperty("tools"); expect(body).not.toHaveProperty("plugins");
    expect(result.rows[0]?.inputSha256).toBe(createHash("sha256").update(currentJob.input).digest("hex"));
    expect(result.sourceHashes.modelConfig).toBe(provenance.modelConfigSha256); expect(result.sourceHashes.provider).toBe(provenance.providerSha256);
  }
});

test("provider restrictions exclude tiers, unsupported controls and nonzero request fees before POST", async () => {
  const model = MODELS.find((item) => item.id === "anthropic/claude-haiku-5.5")!;
  for (const invalid of ["tier", "reasoning", "max_tokens", "request", "status"]) {
    const fake = stub(); let posts = 0;
    const fetcher = async (url: string, init: RequestInit) => {
      if (init.method === "POST") posts++;
      if (url.endsWith("/endpoints")) return Response.json({ data: { endpoints: [{ provider_name: "Anthropic", tag: invalid === "tier" ? "anthropic/fast" : "anthropic", status: invalid === "status" ? 1 : 0, pricing: { prompt: model.promptPrice / 1e6, completion: model.completionPrice / 1e6, request: invalid === "request" ? 0.001 : 0 }, supported_parameters: ["max_tokens", "reasoning"].filter((parameter) => parameter !== invalid) }] } });
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [{ ...job(0), model }], provenance, fetcher });
    expect(result.halted).toBe(true); expect(result.error).toBe("NO_ELIGIBLE_PROVIDER"); expect(posts).toBe(0);
  }
});

test("applicable advertised price overrides block POST while strictly greater boundary tiers do not apply", async () => {
  for (const scenario of ["prompt", "completion", "request", "boundary", "safe", "malformed"] as const) {
    const fake = stub(); let posts = 0;
    const override: Record<string, unknown> = {
      min_prompt_tokens: scenario === "boundary" ? 16384 : scenario === "malformed" ? "399" : 399,
      ...(scenario === "prompt" || scenario === "boundary" ? { prompt: "0.0000005" } : {}),
      ...(scenario === "completion" ? { completion: "0.0000025" } : {}),
      ...(scenario === "request" ? { request: "0.001" } : {}),
    };
    const fetcher = async (url: string, init: RequestInit) => {
      if (init.method === "POST") posts++;
      if (url.endsWith("/endpoints")) return Response.json({ data: { endpoints: [{ provider_name: "Darkbloom", pricing: { prompt: "0.0000001", completion: "0.00000015", request: "0", overrides: [override] }, supported_parameters: ["reasoning", "max_tokens"] }] } });
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher });
    const blocked = scenario !== "boundary" && scenario !== "safe";
    expect(result.halted).toBe(blocked); expect(posts).toBe(blocked ? 0 : 2);
    if (blocked) expect(result.error).toBe("NO_ELIGIBLE_PROVIDER");
  }
});

test("known native provider and generation ID contradictions halt while missing fields remain pending", async () => {
  for (const scenario of ["provider", "id", "missing-provider", "missing-id", "unknown-provider", "unknown-id"] as const) {
    const fake = stub(); let posts = 0;
    const fetcher = async (url: string, init: RequestInit) => {
      if (init.method === "POST") posts++;
      if (url.includes("/generation?")) {
        const audit: Record<string, unknown> = { id: "gen-test-1", model: MODELS[0].canonical, provider_name: "Darkbloom", native_tokens_reasoning: 0, native_tokens_prompt: 400, native_tokens_completion: 8, total_cost: 0.0000412 };
        if (scenario === "provider") audit.provider_name = "OpenAI";
        if (scenario === "id") audit.id = "gen-unrelated-999";
        if (scenario === "missing-provider") delete audit.provider_name;
        if (scenario === "missing-id") delete audit.id;
        if (scenario === "unknown-provider") audit.provider_name = null;
        if (scenario === "unknown-id") audit.id = null;
        return Response.json({ data: audit });
      }
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher });
    const violation = scenario === "provider" || scenario === "id";
    expect(result.halted).toBe(violation); expect(posts).toBe(violation ? 1 : 2);
    expect(result.rows[0]?.output).toBe("와…!"); expect(result.rows[0]?.costUsd).toBe(0.0000412);
    expect(result.rows[0]?.languageSucceeded).toBe(true); expect(result.rows[0]?.auditStatus).toBe(violation ? "violation" : "pending");
    if (violation) {
      expect(result.rows[0]?.error).toBe(scenario === "id" ? "INVALID_GENERATION_ID" : "INVALID_GENERATION_PROVIDER");
      expect(result.rows[0]?.generationId).toBe("gen-test-1");
      expect(result.rows[0]?.generationEvidence?.returnedGenerationId).toBe(scenario === "id" ? "gen-unrelated-999" : "gen-test-1");
      expect(result.rows[0]?.generationEvidence?.provider).toBe(scenario === "provider" ? "OpenAI" : "Darkbloom");
    }
    else expect(result.rows[0]?.auditError).toBe("GENERATION_METADATA_PENDING");
  }
});

test("catalog exact canonical aliases are verified and prefixes cannot impersonate them", async () => {
  const model = MODELS.find((item) => item.id === "anthropic/claude-haiku-5.5")!;
  const canonical = `${model.id}-20261001`;
  for (const scenario of ["valid", "prefix", "empty", "duplicate", "mandatory"]) {
    const fake = stub(); let posts = 0;
    const fetcher = async (url: string, init: RequestInit) => {
      if (url.endsWith("/models")) { const entry = { id: model.id, canonical_slug: scenario === "empty" ? null : canonical, reasoning: { mandatory: scenario === "mandatory" } }; return Response.json({ data: scenario === "duplicate" ? [entry, entry] : [entry] }); }
      if (init.method === "POST") { posts++; return Response.json(chat(scenario === "prefix" ? `${canonical}-impostor` : canonical)); }
      if (url.includes("/generation?")) return new Response(null, { status: 404 });
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [{ ...job(0), model }, { ...job(1), model }], provenance, fetcher });
    expect(result.halted).toBe(scenario !== "valid"); expect(posts).toBe(scenario === "valid" ? 2 : scenario === "prefix" ? 1 : 0);
    if (scenario === "valid") expect(result.verifiedModelAliases[model.id]).toBe(canonical);
  }
});

test("fixture IDs, characters, categories and input text remain independent of mutable prompt metadata", () => {
  const immutableInputs = fixtures.cases.map(({ id, characterId, category, text }) => ({ id, characterId, category, text }));
  expect(createHash("sha256").update(JSON.stringify(immutableInputs)).digest("hex")).toBe("78ba880ffc9f1ce2c26e83b3c66e1197d813dab6e41d906454cfe72926395896");
  const evaluation = buildEvaluationJobs([]);
  expect(evaluation.jobs).toHaveLength(fixtures.cases.length * 4);
  for (const item of fixtures.cases) {
    const jobs = evaluation.jobs.filter((candidate) => candidate.caseId === item.id);
    expect(jobs.map((candidate) => candidate.input)).toEqual(Array(4).fill(item.text));
    expect(jobs.every((candidate) => candidate.category === item.category && candidate.characterId === item.characterId)).toBe(true);
  }
});

test("larger candidate runs pass the former 480 cap while excessive monthly reserve blocks all network", async () => {
  const fake = stub({ timeout: true });
  const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: Array.from({ length: 481 }, (_, index) => job(index)), provenance, fetcher: fake.fetcher, timeoutMs: 10 });
  expect(result.maxRequests).toBe(481); expect(result.modelPostAttempts).toBe(1); expect(result.halted).toBe(true);
  const all = buildEvaluationJobs([`--models=${MODELS.map((model) => model.id).join(",")}`]);
  expect(all.jobs).toHaveLength(240 * MODELS.length);
  const unused = stub();
  await expect(runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: all.jobs, provenance, fetcher: unused.fetcher })).rejects.toThrow("RUN_BUDGET_EXCEEDS_MONTHLY_LIMIT");
  expect(unused.calls).toHaveLength(0);
});

test("missing or positive primary reasoning never counts as zero and unknown paid errors stop without retry", async () => {
  for (const scenario of ["missing", "positive", "unknown"]) {
    const fake = stub(); let posts = 0;
    const fetcher = async (url: string, init: RequestInit) => {
      if (init.method === "POST") {
        posts++;
        if (scenario === "unknown") throw new Error("unknown transport outcome");
        const payload = chat();
        if (scenario === "positive") payload.usage.completion_tokens_details.reasoning_tokens = 1;
        else Reflect.deleteProperty(payload.usage.completion_tokens_details, "reasoning_tokens");
        return Response.json(payload);
      }
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher });
    expect(result.halted).toBe(true); expect(posts).toBe(1); expect(result.languageSuccesses).toBe(0);
    expect(result.rows[0]?.error).toBe(scenario === "unknown" ? "REQUEST_FAILED_OR_UNKNOWN" : "REASONING_NOT_DISABLED");
  }
});

test("missing primary Chat usage preserves output but halts before another POST", async () => {
  const fake = stub();
  const fetcher = async (url: string, init: RequestInit) => {
    if (init.method === "POST") { const payload = chat(); const { usage: _usage, ...withoutUsage } = payload; void _usage; return Response.json(withoutUsage); }
    return fake.fetcher(url, init);
  };
  const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher });
  expect(result.rows[0]?.status).toBe("error"); expect(result.halted).toBe(true); expect(result.rows).toHaveLength(1);
  expect(result.rows[0]?.output).toBe("와…!"); expect(result.rows[0]?.chatEvidence?.reasoningTokens).toBeNull();
  expect(result.rows[0]?.chatEvidence?.costUsd).toBeNull(); expect(result.rows[0]?.generationEvidence).toBeUndefined();
});

test("unverified catalog and excessive endpoint price prevent model POST", async () => {
  for (const stage of ["catalog", "price"]) {
    const fake = stub();
    const fetcher = async (url: string, init: RequestInit) => {
      if (stage === "catalog" && url.endsWith("/models")) return Response.json({ data: [{ id: MODELS[0].id, canonical_slug: "qwen/unknown" }] });
      if (stage === "price" && url.endsWith("/endpoints")) return Response.json({ data: { endpoints: [{ provider_name: "Darkbloom", pricing: { prompt: "0.000001", completion: "0.00000015" }, supported_parameters: ["reasoning"] }] } });
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0)], provenance, fetcher });
    expect(result.halted).toBe(true); expect(result.modelPostAttempts).toBe(0); expect(fake.calls.filter((item) => item.method === "POST")).toHaveLength(0);
  }
});


test("confirmed native price-cap violation and stalled response body retain a single-attempt failure", async () => {
  for (const scenario of ["cost", "body"]) {
    const fake = stub(); let posts = 0;
    const fetcher = async (url: string, init: RequestInit) => {
      if (init.method === "POST") {
        posts++;
        if (scenario === "body") return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"id":"gen-partial"')); } }), { status: 200 });
      }
      if (scenario === "cost" && url.includes("/generation?")) return Response.json({ data: { id: "gen-test-1", model: MODELS[0].canonical, provider_name: "Darkbloom", native_tokens_reasoning: 0, native_tokens_prompt: 400, native_tokens_completion: 8, total_cost: 0.00005 } });
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher, timeoutMs: 1000 });
    expect(posts).toBe(1); expect(result.halted).toBe(true); expect(result.rows).toHaveLength(1); expect(result.rows[0]?.httpStatus).toBe(200);
    if (scenario === "cost") { expect(result.rows[0]?.output).toBe("와…!"); expect(result.rows[0]?.generationEvidence?.costUsd).toBe(0.00005); expect(result.rows[0]?.error).toBe("PRICE_CAP_EXCEEDED"); }
    else expect(result.rows[0]?.error).toBe("REQUEST_TIMEOUT");
  }
});


test("transient Generation failures defer while confirmed reasoning and auth failures halt", async () => {
  for (const failure of [429, 503, "timeout", 403, "reasoning"] as const) {
    const fake = stub(); let posts = 0; let audits = 0;
    const fetcher = async (url: string, init: RequestInit) => {
      if (init.method === "POST") posts++;
      if (url.includes("/generation?")) {
        audits++;
        if (failure === "timeout") return new Promise<Response>(() => {});
        if (failure === "reasoning") return Response.json({ data: { id: "gen-test-1", model: MODELS[0].canonical, native_tokens_reasoning: 1 } });
        return new Response(null, { status: failure });
      }
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher, timeoutMs: 1000 });
    const definitive = failure === 403 || failure === "reasoning";
    expect(result.halted).toBe(definitive); expect(posts).toBe(definitive ? 1 : 2); expect(audits).toBe(posts);
    expect(result.rows[0]?.output).toBe("와…!"); expect(result.rows[0]?.languageSucceeded).toBe(true);
    expect(result.rows[0]?.auditStatus).toBe(definitive ? "violation" : "pending");
    expect(result.qualityValidated).toBe(false); expect(result.rows[0]?.humanScores.fidelity).toBeNull();
  }
});


test("Chat/native tokenizers and differing costs preserve both values and the conservative maximum", async () => {
  for (const scenario of [{ cost: 0.00004, prompt: 1000 }, { cost: 0.00005, prompt: 1000 }, { cost: null, prompt: 1000 }, { cost: 0.00005, prompt: null }]) {
    const nativeCost = scenario.cost; const auditPending = nativeCost === null || scenario.prompt === null;
    const fake = stub(); let posts = 0;
    const fetcher = async (url: string, init: RequestInit) => {
      if (init.method === "POST") { posts++; const payload = chat(); payload.usage.cost = 0.000045; return Response.json(payload); }
      if (url.includes("/generation?")) return Response.json({ data: { id: "gen-test-1", model: MODELS[0].canonical, provider_name: "Darkbloom", native_tokens_reasoning: 0, native_tokens_prompt: scenario.prompt, native_tokens_completion: 8, total_cost: nativeCost } });
      return fake.fetcher(url, init);
    };
    const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher });
    expect(result.halted).toBe(false); expect(posts).toBe(2); expect(result.languageSuccesses).toBe(2);
    expect(result.rows[0]?.chatEvidence?.costUsd).toBe(0.000045); expect(result.rows[0]?.generationEvidence?.costUsd).toBe(nativeCost);
    expect(result.rows[0]?.costUsd).toBe(Math.max(0.000045, nativeCost ?? 0));
    expect(result.rows[0]?.costDifferenceRecorded).toBe(nativeCost !== null);
    expect(result.rows[0]?.auditStatus).toBe(auditPending ? "pending" : "verified");
    expect(result.auditPending).toBe(auditPending ? 2 : 0);
  }
});


test("Chat over the conservative job budget still halts before another POST", async () => {
  const fake = stub(); let posts = 0;
  const fetcher = async (url: string, init: RequestInit) => {
    if (init.method === "POST") { posts++; const payload = chat(); payload.usage.cost = 0.002; return Response.json(payload); }
    return fake.fetcher(url, init);
  };
  const result = await runEvaluation({ outPath: await outputPath(), key: "stub-only", jobs: [job(0), job(1)], provenance, fetcher });
  expect(result.halted).toBe(true); expect(posts).toBe(1); expect(result.rows[0]?.output).toBe("와…!");
  expect(result.rows[0]?.costUsd).toBe(0.002); expect(result.rows[0]?.error).toBe("CHAT_COST_CEILING_EXCEEDED");
  expect(fake.calls.filter((item) => item.url.includes("/generation?"))).toHaveLength(0);
});

test('vocal CLI preserves raw JSON before validating a separate display output',async()=>{
 const model=MODELS.find(item=>item.id==='anthropic/claude-haiku-5.5')!;
 const input='기뻐.';const wire=buildPayload({characterId:'chiikawa',text:input},model.id);
 const current:EvaluationJob={index:0,caseId:'synthetic-vocal',characterId:'chiikawa',category:'joy',input,expectedMode:'vocal',model,messages:wire.messages};
 const raw=' \n{"text":"와아…!"}\n';let posts=0;
 const fetcher=async(url:string,init:RequestInit)=>{
  if(url.endsWith('/models'))return Response.json({data:[{id:model.id,canonical_slug:'anthropic/claude-haiku-5.5-20261007'}]});
  if(url.endsWith('/endpoints'))return Response.json({data:{endpoints:[{provider_name:'Anthropic',tag:'anthropic',status:0,pricing:{prompt:.0000001,completion:.0000005},supported_parameters:['max_tokens','reasoning','response_format','structured_outputs']}]}});
  if(url.endsWith('/key'))return Response.json({data:{limit:5,limit_reset:'monthly',limit_remaining:5,is_management_key:false}});
  if(init.method==='POST'){posts++;const payload=chat(model.id);payload.choices[0].message.content=raw;return Response.json(payload);}
  return new Response(null,{status:404});
 };
 const result=await runEvaluation({outPath:await outputPath(),key:'stub',jobs:[current],provenance,fetcher});
 expect(result.halted).toBe(false);expect(posts).toBe(1);
 expect(result.rows[0]).toHaveProperty('rawOutput',raw);expect(result.rows[0]?.output).toBe(raw);
 expect(result.rows[0]).toHaveProperty('displayOutput','와아…!');
});
test('vocal CLI missing native support rejects before any paid POST',async()=>{
 const model=MODELS.find(item=>item.id==='anthropic/claude-haiku-5.5')!;const fake=stub();
 const result=await runEvaluation({outPath:await outputPath(),key:'stub',jobs:[{...job(0),characterId:'chiikawa',model,expectedMode:'vocal'}],provenance,fetcher:fake.fetcher});
 expect(result.halted).toBe(true);expect(fake.calls.filter(call=>call.method==='POST')).toHaveLength(0);
});

test('CLI includes generation settings in the 8 KiB bound before any journal or network',async()=>{
 const current=job(0);current.messages[0]!.content='a'.repeat(7950);
 expect(Buffer.byteLength(JSON.stringify(current.messages))).toBeLessThanOrEqual(8192);
 const fake=stub();
 await expect(runEvaluation({outPath:await outputPath(),key:'stub',jobs:[current],provenance,fetcher:fake.fetcher})).rejects.toThrow('REQUEST_BODY_TOO_LARGE');
 expect(fake.calls).toHaveLength(0);
});
