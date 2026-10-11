import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEvaluationJobs, runCli } from "../scripts/evaluate-tones";
import { MODELS, runEvaluation, type EvaluationJob } from "../scripts/evaluation-support";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
async function outputPath() { const path = await mkdtemp(join(tmpdir(), "chiitalk-cli-test-")); directories.push(path); return join(path, "result.json"); }
const provenance = { promptVersion: "test-v2", fixturePromptVersion: "test-v2", fixtureVersion: 2, styleSha256: "a".repeat(64), fixtureSha256: "b".repeat(64) };
const job = (index: number): EvaluationJob => ({ index, caseId: `chiikawa-${index + 1}`, characterId: "chiikawa", category: "joy", input: "정말 기뻐.", expectedMode: "vocal", model: MODELS[0], messages: [{ role: "system", content: "짧은 반응" }, { role: "user", content: "정말 기뻐." }] });
const chat = (model: string = MODELS[0].canonical) => ({ id: "gen-test-1", model, choices: [{ message: { content: "와…!", tool_calls: [] }, finish_reason: "stop" }], usage: { prompt_tokens: 400, completion_tokens: 8, total_tokens: 408, cost: 0.0000412, completion_tokens_details: { reasoning_tokens: 0 } } });
function stub(options: { model?: string; auditStatus?: number; nativeReasoning?: unknown; timeout?: boolean } = {}) {
  const calls: { method: string; url: string }[] = [];
  const fetcher = async (url: string, init: RequestInit) => {
    calls.push({ method: init.method ?? "GET", url });
    if (url.endsWith("/models")) return Response.json({ data: MODELS.map((model) => ({ id: model.id, canonical_slug: model.canonical })) });
    if (url.endsWith("/endpoints")) return Response.json({ data: { endpoints: [{ provider_name: "Darkbloom", pricing: { prompt: "0.0000001", completion: "0.00000015", request: "0" }, supported_parameters: ["reasoning"] }] } });
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
  expect(postedModels).toEqual(MODELS.map((model) => model.id));
  expect(savedBeforeAudit).toBe(true); expect(result.halted).toBe(false); expect(result.languageSuccesses).toBe(2); expect(result.auditPending).toBe(2);
  expect(result.rows[0]?.output).toBe("와…!"); expect(result.rows[0]?.generationHttpStatus).toBe(404); expect(result.rows[0]?.auditError).toBe("HTTP_404");
  expect(result.rows[0]?.status).toBe("ok"); expect(result.rows.map((row) => row.caseId)).toEqual(["chiikawa-1", "chiikawa-2"]);
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
  expect(dry.plannedRequests).toBe(480); expect(dry.cases).toBe(240); expect(dry.paidRequests).toBe(0);
  expect(dry.promptVersion).toBe(dry.fixturePromptVersion); expect(dry.styleSha256).toMatch(/^[a-f0-9]{64}$/);
  await expect(runCli(["--live"], dependencies)).rejects.toThrow("OPENROUTER_API_KEY is required");
  expect(requests).toBe(0);
  expect(() => buildEvaluationJobs(["--live", "--dry"])).toThrow();
  expect(() => buildEvaluationJobs(["--limit=481"])).toThrow();
});

test("pilot chooses one fixed input for each character across both models", () => {
  const pilot = buildEvaluationJobs(["--pilot"]);
  expect(pilot.jobs).toHaveLength(16); expect(new Set(pilot.jobs.map((item) => item.characterId)).size).toBe(8);
  expect(pilot.jobs.map((item) => item.index)).toEqual([0, 1, 60, 61, 120, 121, 180, 181, 240, 241, 300, 301, 360, 361, 420, 421]);
  const prefix = buildEvaluationJobs(["--limit=16"]);
  expect(prefix.jobs.map((item) => item.index)).toEqual(Array.from({ length: 16 }, (_, index) => index));
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
