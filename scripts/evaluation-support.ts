import { mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { isCharacterId } from "../src/lib/characters";
import { MODEL_CONFIGS, type ModelConfig, type ModelId } from "../src/lib/server/model-config";
import { decodeCharacterOutput } from "../src/lib/vocal-output";
import { isVocalCharacterId } from "../src/lib/vocal-palette";
import { buildPayload, isNativeVocalEndpoint } from "../src/lib/server/provider";

// The legacy Qwen alias is fixed; other aliases are verified against exact catalog IDs before POST.
export interface Model extends ModelConfig { readonly id: ModelId; readonly canonical: string }
export const MODELS: readonly Model[] = Object.freeze((Object.keys(MODEL_CONFIGS) as ModelId[]).map((id) => Object.freeze({ id, ...MODEL_CONFIGS[id], canonical: id === "qwen/qwen3.5-9b" ? "qwen/qwen3.5-9b-20260310" : id })));
export const DEFAULT_EVALUATION_MODEL_IDS: readonly ModelId[] = Object.freeze(["anthropic/claude-haiku-5.5", "openai/gpt-5.4-nano", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"]);
type Json = Record<string, unknown>;
type Message = { role: "system" | "user" | "assistant"; content: string };
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export interface EvaluationJob { index: number; caseId: string; characterId: string; category: string; input: string; expectedMode: "vocal" | "verbal"; model: Model; messages: Message[] }
export interface Provenance { promptVersion: string; fixturePromptVersion: string; fixtureVersion: number; styleSha256: string; fixtureSha256: string; modelConfigSha256: string; providerSha256: string; vocalOutputSha256?: string; vocalPaletteSha256?: string }
interface ChatEvidence { returnedModel: string | null; costUsd: number | null; reasoningTokens: number | null; promptTokens: number | null; completionTokens: number | null; totalTokens: number | null; finishReason: string | null }
export interface EvaluationRow {
  index: number; caseId: string; characterId: string; category: string; model: string; input: string; inputSha256: string;
  status: "pending" | "ok" | "error"; validationPhase: string; output: string | null; rawOutput: string | null; displayOutput: string | null; generationId: string | null;
  httpStatus: number | null; generationHttpStatus: number | null; latencyMs: number | null;
  costUsd: number | null; costDifferenceRecorded: boolean;
  languageSucceeded: boolean; auditStatus: "not-started" | "pending" | "verified" | "violation"; auditError?: string;
  chatEvidence?: ChatEvidence; generationEvidence?: Json; error?: string; humanScores: Record<string, null | "not-applicable">;
}
export interface EvaluationReport {
  schemaVersion: 1; generatedAt: string; syntheticInputsOnly: true; mode: "live"; promptVersion: string; fixturePromptVersion: string; fixtureVersion: number;
  sourceHashes: { style: string; fixture: string; modelConfig: string; provider: string; vocalOutput?: string; vocalPalette?: string }; verifiedModelAliases: Record<string, string>; budget: ReturnType<typeof evaluationBudget>; maxRequests: number; modelPostAttempts: number; completedRequests: number; languageSuccesses: number; auditPending: number; halted: boolean; qualityValidated: false;
  rows: EvaluationRow[]; error?: string;
}
const NATIVE_PROMPT_CAP = 16_384;
const OUTPUT_CAP = 256;
const object = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const integer = (value: unknown): value is number => finite(value) && Number.isInteger(value);
const own = (value: Json, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const numeric = (value: unknown) => finite(value) ? value : null;
const matches = (value: unknown, model: Model, canonical: string) => value === model.id || value === canonical;
export function evaluationBudget(jobs: readonly Pick<EvaluationJob, "model">[]) {
  return { conservativeMaximumUsd: jobs.reduce((sum, job) => sum + (NATIVE_PROMPT_CAP * job.model.promptPrice + OUTPUT_CAP * job.model.completionPrice) / 1e6, 0), promptTokenReserve: NATIVE_PROMPT_CAP, outputTokenCap: OUTPUT_CAP, assumption: "Conservative budget assumption: 2 prompt tokens per allowed 8 KiB byte; not a tokenizer guarantee. Observed usage is checked.", monthlyKeyLimitUsd: 5 };
}
class JournalError extends Error {}
class EvaluationError extends Error { constructor(readonly code: string) { super(code); } }
function requireCondition(condition: unknown, code: string): asserts condition { if (!condition) throw new EvaluationError(code); }
function optionalNumber(value: Json, key: string, whole = false) {
  if (!own(value, key)) return null;
  requireCondition(whole ? integer(value[key]) : finite(value[key]), "INVALID_CHAT_USAGE");
  return value[key] as number;
}
function price(value: unknown): number | null {
  if (typeof value === "string" && /^\d+(?:\.\d+)?(?:e-\d+)?$/i.test(value)) return numeric(Number(value));
  return numeric(value);
}
function dataObject(value: unknown): Json {
  requireCondition(object(value) && object(value.data), "INVALID_METADATA"); return value.data;
}
export function extractChat(value: unknown): { output: string | null; rawOutput: string | null; generationId: string | null; evidence: ChatEvidence } {
  const payload = object(value) ? value : {};
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = object(choices[0]) ? choices[0] : {};
  const message = object(choice.message) ? choice.message : {};
  const usage = object(payload.usage) ? payload.usage : {};
  const details = object(usage.completion_tokens_details) ? usage.completion_tokens_details : {};
  const text = message.content;
  return {
    output: typeof text === "string" ? text : null,
    rawOutput: typeof text === "string" ? text : null,
    generationId: typeof payload.id === "string" && /^gen-[0-9A-Za-z-]+$/.test(payload.id) && payload.id.length <= 128 ? payload.id : null,
    evidence: { returnedModel: typeof payload.model === "string" && payload.model.length <= 128 ? payload.model : null, costUsd: numeric(usage.cost), reasoningTokens: numeric(details.reasoning_tokens), promptTokens: numeric(usage.prompt_tokens), completionTokens: numeric(usage.completion_tokens), totalTokens: numeric(usage.total_tokens), finishReason: typeof choice.finish_reason === "string" && choice.finish_reason.length <= 64 ? choice.finish_reason : null },
  };
}
function validateChat(value: unknown, row: EvaluationRow, model: Model, canonical: string) {
  requireCondition(object(value) && matches(value.model, model, canonical) && value.error == null && row.output && row.generationId && Array.isArray(value.choices) && object(value.choices[0]) && object(value.choices[0].message), "INVALID_CHAT_METADATA");
  const message = value.choices[0].message;
  const tools = message.tool_calls;
  requireCondition((tools == null || Array.isArray(tools) && tools.length === 0) && message.function_call == null, "UNEXPECTED_TOOL_CALL");
  requireCondition(object(value.usage), "INVALID_CHAT_USAGE");
  const usage = object(value.usage) ? value.usage : {};
  requireCondition(!own(usage, "completion_tokens_details") || object(usage.completion_tokens_details), "INVALID_CHAT_USAGE");
  const details = object(usage.completion_tokens_details) ? usage.completion_tokens_details : {};
  const reasoning = optionalNumber(details, "reasoning_tokens", true);
  requireCondition(reasoning === 0, "REASONING_NOT_DISABLED");
  const completion = optionalNumber(usage, "completion_tokens", true);
  requireCondition(completion !== null && completion <= OUTPUT_CAP, "OUTPUT_CAP_EXCEEDED");
  const prompt = optionalNumber(usage, "prompt_tokens", true);
  const cost = optionalNumber(usage, "cost");
  requireCondition(prompt !== null && prompt <= NATIVE_PROMPT_CAP && cost !== null, "INVALID_CHAT_USAGE");
  // Chat and native tokenizers can differ; only enforce the conservative job ceiling here.
  requireCondition(cost <= (NATIVE_PROMPT_CAP * model.promptPrice + OUTPUT_CAP * model.completionPrice) / 1e6 + 1e-12, "CHAT_COST_CEILING_EXCEEDED");
  const total = optionalNumber(usage, "total_tokens", true);
  requireCondition(total !== null && total === prompt + completion, "INVALID_CHAT_USAGE");
}
export function validateKeyBudget(value: unknown, requiredBudget: number) {
  const data = dataObject(value);
  requireCondition(data.limit === 5 && data.limit_reset === "monthly" && data.is_management_key === false && finite(data.limit_remaining) && data.limit_remaining + 1e-9 >= requiredBudget, "KEY_BUDGET_UNVERIFIED");
}
function providerNames(value: unknown, model: Model, vocal = false): string[] {
  requireCondition(!vocal || model.id === "anthropic/claude-haiku-5.5" && model.provider === "anthropic", "UNSUPPORTED_VOCAL_MODEL");
  const data = dataObject(value);
  requireCondition(Array.isArray(data.endpoints), "INVALID_ENDPOINTS");
  const names: string[] = [];
  for (const item of data.endpoints) {
    if (!object(item) || typeof item.provider_name !== "string" || !object(item.pricing) || !Array.isArray(item.supported_parameters) || !item.supported_parameters.includes("max_tokens") || model.supportsReasoning && !item.supported_parameters.includes("reasoning") || model.provider && item.tag !== model.provider || item.status != null && item.status !== 0) continue;
    if (vocal && !isNativeVocalEndpoint(item)) continue;
    const input = price(item.pricing.prompt), output = price(item.pricing.completion);
    const request = own(item.pricing, "request") ? price(item.pricing.request) : 0;
    if (input === null || output === null || request !== 0 || input * 1e6 > model.promptPrice || output * 1e6 > model.completionPrice) continue;
    const overrides = item.pricing.overrides;
    if (overrides !== undefined && (!Array.isArray(overrides) || overrides.some((override) => {
      if (!object(override) || !integer(override.min_prompt_tokens)) return true;
      // Official tiers apply only when prompt tokens are strictly greater than the threshold.
      if (override.min_prompt_tokens >= NATIVE_PROMPT_CAP) return false;
      const tierInput = own(override, "prompt") ? price(override.prompt) : input;
      const tierOutput = own(override, "completion") ? price(override.completion) : output;
      const tierRequest = own(override, "request") ? price(override.request) : request;
      return tierInput === null || tierOutput === null || tierRequest !== 0 || tierInput * 1e6 > model.promptPrice || tierOutput * 1e6 > model.completionPrice;
    }))) continue;
    names.push(item.provider_name);
  }
  requireCondition(names.length > 0, "NO_ELIGIBLE_PROVIDER"); return [...new Set(names)];
}
function validateGeneration(data: Json, row: EvaluationRow, model: Model, providers: readonly string[], canonical: string) {
  // Known violations stop the run; missing supplementary metadata stays pending.
  requireCondition(typeof data.model !== "string" || matches(data.model, model, canonical), "INVALID_GENERATION_MODEL");
  requireCondition(typeof data.id !== "string" || data.id === row.generationId, "INVALID_GENERATION_ID");
  requireCondition(typeof data.provider_name !== "string" || providers.includes(data.provider_name), "INVALID_GENERATION_PROVIDER");
  requireCondition(!finite(data.native_tokens_reasoning) || data.native_tokens_reasoning === 0, "REASONING_NOT_DISABLED");
  requireCondition(!finite(data.native_tokens_prompt) || data.native_tokens_prompt <= NATIVE_PROMPT_CAP, "PROMPT_CAP_EXCEEDED");
  requireCondition(!finite(data.native_tokens_completion) || data.native_tokens_completion <= OUTPUT_CAP, "OUTPUT_CAP_EXCEEDED");
  if (integer(data.native_tokens_prompt) && integer(data.native_tokens_completion) && finite(data.total_cost)) {
    const costBound = data.native_tokens_prompt * model.promptPrice / 1e6 + data.native_tokens_completion * model.completionPrice / 1e6;
    requireCondition(data.total_cost <= costBound + 1e-12, "PRICE_CAP_EXCEEDED");
  }
  requireCondition(data.id === row.generationId && matches(data.model, model, canonical) && typeof data.provider_name === "string" && providers.includes(data.provider_name) && own(data, "native_tokens_reasoning") && data.native_tokens_reasoning === 0 && integer(data.native_tokens_prompt) && integer(data.native_tokens_completion) && finite(data.total_cost), "GENERATION_METADATA_PENDING");
}
function deferredAudit(error: unknown): boolean {
  if (error instanceof JournalError) return false;
  if (!(error instanceof EvaluationError)) return true;
  return /^(HTTP_(404|429|5\d\d)|REQUEST_TIMEOUT|GENERATION_METADATA_PENDING|INVALID_METADATA|INVALID_RESPONSE_JSON|RESPONSE_BODY_MISSING|RESPONSE_TOO_LARGE)$/.test(error.code);
}
async function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let abort!: () => void;
  const stopped = new Promise<never>((_, reject) => { abort = () => reject(new EvaluationError("REQUEST_TIMEOUT")); signal.addEventListener("abort", abort, { once: true }); });
  try { return await Promise.race([promise, stopped]); } finally { signal.removeEventListener("abort", abort); }
}
async function fetchJson(fetcher: Fetcher, url: string, init: RequestInit, timeoutMs: number, maxBytes: number, onStatus?: (status: number) => Promise<void>) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await raceAbort(fetcher(url, { ...init, signal: controller.signal, redirect: "error", cache: "no-store" }), controller.signal);
    await onStatus?.(response.status);
    requireCondition(response.ok, `HTTP_${response.status}`); requireCondition(response.body, "RESPONSE_BODY_MISSING");
    reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await raceAbort(reader.read(), controller.signal); if (chunk.done) break;
      size += chunk.value.byteLength; requireCondition(size <= maxBytes, "RESPONSE_TOO_LARGE"); chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    controller.signal.throwIfAborted();
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown; } catch { throw new EvaluationError("INVALID_RESPONSE_JSON"); }
  } finally { clearTimeout(timer); if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); } }
}
async function createJournal(path: string, report: EvaluationReport) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const handle = await open(path, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(report, null, 2) + "\n"); await handle.sync(); } finally { await handle.close(); }
  const syncDirectory = async () => { const dir = await open(dirname(path), "r"); try { await dir.sync(); } finally { await dir.close(); } };
  await syncDirectory();
  return async () => {
    const temporary = `${path}.${crypto.randomUUID()}.tmp`;
    let file: Awaited<ReturnType<typeof open>> | undefined;
    try {
      file = await open(temporary, "wx", 0o600);
      await file.writeFile(JSON.stringify(report, null, 2) + "\n"); await file.sync(); await file.close();
      await rename(temporary, path); await syncDirectory();
    } catch { await file?.close().catch(() => {}); await unlink(temporary).catch(() => {}); throw new JournalError("JOURNAL_WRITE_FAILED"); }
  };
}
export async function runEvaluation(options: { outPath: string; key: string; jobs: EvaluationJob[]; provenance: Provenance; fetcher?: Fetcher; timeoutMs?: number }): Promise<EvaluationReport> {
  const { outPath, key, jobs, provenance } = options;
  requireCondition(key && jobs.length > 0 && jobs.length <= 240 * MODELS.length && provenance.promptVersion === provenance.fixturePromptVersion && [provenance.styleSha256, provenance.fixtureSha256, provenance.modelConfigSha256, provenance.providerSha256].every((hash) => /^[a-f0-9]{64}$/.test(hash)), "INVALID_RUN_CONFIG");
  requireCondition(new Set(jobs.map((job) => `${job.caseId}:${job.model.id}`)).size === jobs.length, "DUPLICATE_JOB");
  for (const job of jobs) requireCondition(MODELS.includes(job.model) && isCharacterId(job.characterId) && job.input.trim() && Array.from(job.input).length <= 300 && Buffer.byteLength(JSON.stringify(job.messages)) <= 8192 && job.messages.at(-1)?.role === "user" && job.messages.at(-1)?.content === JSON.stringify({ inputText: job.input }), "INVALID_JOB");
  const requests = jobs.map(job => {
    requireCondition(isCharacterId(job.characterId), "INVALID_JOB");
    const request = { ...buildPayload({ characterId: job.characterId, text: job.input }, job.model.id), messages: job.messages };
    requireCondition(Buffer.byteLength(JSON.stringify(request), "utf8") <= 8192, "REQUEST_BODY_TOO_LARGE");
    if (isVocalCharacterId(job.characterId)) for (const shot of request.messages.filter(message => message.role === "assistant")) {
      try { decodeCharacterOutput(job.characterId, {content:shot.content,finishReason:"stop"}); } catch { throw new EvaluationError("INVALID_VOCAL_EXAMPLE"); }
    }
    return request;
  });
  const budget = evaluationBudget(jobs);
  requireCondition(Number.isFinite(budget.conservativeMaximumUsd) && budget.conservativeMaximumUsd <= 5, "RUN_BUDGET_EXCEEDS_MONTHLY_LIMIT");
  const fetcher = options.fetcher ?? fetch; const timeout = options.timeoutMs ?? 30_000;
  const report: EvaluationReport = { schemaVersion: 1, generatedAt: new Date().toISOString(), syntheticInputsOnly: true, mode: "live", promptVersion: provenance.promptVersion, fixturePromptVersion: provenance.fixturePromptVersion, fixtureVersion: provenance.fixtureVersion, sourceHashes: { style: provenance.styleSha256, fixture: provenance.fixtureSha256, modelConfig: provenance.modelConfigSha256, provider: provenance.providerSha256, ...(provenance.vocalOutputSha256 ? {vocalOutput:provenance.vocalOutputSha256} : {}), ...(provenance.vocalPaletteSha256 ? {vocalPalette:provenance.vocalPaletteSha256} : {}) }, verifiedModelAliases: {}, budget, maxRequests: jobs.length, modelPostAttempts: 0, completedRequests: 0, languageSuccesses: 0, auditPending: 0, halted: false, qualityValidated: false, rows: [] };
  const save = await createJournal(outPath, report);
  const auth = { Authorization: `Bearer ${key}` };
  const get = (url: string, maxBytes = 65536) => fetchJson(fetcher, url, { method: "GET", headers: auth }, timeout, maxBytes);
  const maximumCost = (job: EvaluationJob) => (NATIVE_PROMPT_CAP * job.model.promptPrice + OUTPUT_CAP * job.model.completionPrice) / 1e6;
  const providers = new Map<string, string[]>();
  try {
    const catalog = await get("https://openrouter.ai/api/v1/models", 8 * 1024 * 1024);
    requireCondition(object(catalog) && Array.isArray(catalog.data), "INVALID_MODEL_CATALOG");
    for (const model of new Set(jobs.map((job) => job.model))) {
      const entries = catalog.data.filter((entry) => object(entry) && entry.id === model.id);
      const entry = entries[0];
      requireCondition(entries.length === 1 && object(entry) && typeof entry.canonical_slug === "string" && /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(entry.canonical_slug) && entry.canonical_slug.length <= 128 && (model.id !== "qwen/qwen3.5-9b" || entry.canonical_slug === model.canonical), "CANONICAL_MAPPING_UNVERIFIED");
      requireCondition(!object(entry.reasoning) || entry.reasoning.mandatory !== true, "MANDATORY_REASONING_UNSUPPORTED");
      report.verifiedModelAliases[model.id] = entry.canonical_slug;
      providers.set(model.id, providerNames(await get(`https://openrouter.ai/api/v1/models/${model.id}/endpoints`), model, jobs.some(job => job.model.id === model.id && isCharacterId(job.characterId) && isVocalCharacterId(job.characterId))));
    }
    await save();
    for (let position = 0; position < jobs.length; position++) {
      const job = jobs[position]!;
      validateKeyBudget(await get("https://openrouter.ai/api/v1/key"), jobs.slice(position).reduce((sum, item) => sum + maximumCost(item), 0));
      const row: EvaluationRow = { index: job.index, caseId: job.caseId, characterId: job.characterId, category: job.category, model: job.model.id, input: job.input, inputSha256: createHash("sha256").update(job.input).digest("hex"), status: "pending", validationPhase: "chat-post", output: null, rawOutput: null, displayOutput: null, generationId: null, httpStatus: null, generationHttpStatus: null, latencyMs: null, costUsd: null, costDifferenceRecorded: false, languageSucceeded: false, auditStatus: "not-started", humanScores: { fidelity: null, emotionPolarity: null, semanticPreservation: job.expectedMode === "vocal" ? "not-applicable" : null, naturalKorean: null, noInventedFacts: null, noPromptLeak: null } };
      report.rows.push(row); report.modelPostAttempts++; await save();
      const start = performance.now();
      try {
        requireCondition(isCharacterId(job.characterId), "INVALID_JOB");
        const request = requests[position]!;
        const payload = await fetchJson(fetcher, "https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(request) }, timeout, 65536, async (status) => { row.httpStatus = status; await save(); });
        const evidence = extractChat(payload); row.output = evidence.output; row.rawOutput = evidence.rawOutput; row.generationId = evidence.generationId; row.chatEvidence = evidence.evidence; row.costUsd = evidence.evidence.costUsd; row.validationPhase = "chat-validation"; await save();
        validateChat(payload, row, job.model, report.verifiedModelAliases[job.model.id]!);
        try {
          const choice = (payload as Json).choices as Json[];
          const message = choice[0]!.message as Json;
          row.displayOutput = decodeCharacterOutput(job.characterId, {content:row.rawOutput,finishReason:choice[0]!.finish_reason,nativeFinishReason:choice[0]!.native_finish_reason,refusal:message.refusal ?? (choice[0]!.native_finish_reason === "refusal" ? "refusal" : undefined)});
        } catch { throw new EvaluationError("INVALID_CHARACTER_OUTPUT"); }
        row.status = "ok"; row.languageSucceeded = true; report.languageSuccesses++;
        row.auditStatus = "pending"; report.auditPending++;
        row.validationPhase = "generation-get"; await save();
        try {
          const audit = dataObject(await fetchJson(fetcher, `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(row.generationId!)}`, { method: "GET", headers: auth }, timeout, 65536, async (status) => { row.generationHttpStatus = status; await save(); }));
          row.generationEvidence = { returnedGenerationId: typeof audit.id === "string" && audit.id.length <= 128 ? audit.id : null, returnedModel: typeof audit.model === "string" && audit.model.length <= 128 ? audit.model : null, provider: typeof audit.provider_name === "string" && audit.provider_name.length <= 128 ? audit.provider_name : null, nativeReasoningTokens: numeric(audit.native_tokens_reasoning), nativePromptTokens: numeric(audit.native_tokens_prompt), nativeCompletionTokens: numeric(audit.native_tokens_completion), costUsd: numeric(audit.total_cost) };
          const auditCost = numeric(audit.total_cost);
          if (auditCost !== null) {
            row.costUsd = Math.max(row.costUsd ?? 0, auditCost);
            row.costDifferenceRecorded = row.chatEvidence?.costUsd != null && Math.abs(row.chatEvidence.costUsd - auditCost) > 1e-9;
          }
          row.validationPhase = "generation-validation"; await save();
          validateGeneration(audit, row, job.model, providers.get(job.model.id)!, report.verifiedModelAliases[job.model.id]!);
          row.auditStatus = "verified"; report.auditPending--; row.validationPhase = "complete";
        } catch (error) {
          if (!deferredAudit(error)) { row.auditStatus = "violation"; report.auditPending--; throw error; }
          row.auditError = error instanceof EvaluationError ? error.code : "AUDIT_UNAVAILABLE_OR_UNKNOWN";
          row.validationPhase = "language-complete-audit-pending";
        }
      } catch (error) { row.status = "error"; row.error = error instanceof EvaluationError ? error.code : "REQUEST_FAILED_OR_UNKNOWN"; report.halted = true; }
      row.latencyMs = Math.round(performance.now() - start); report.completedRequests++; await save();
      if (report.halted) break;
    }
  } catch (error) { report.halted = true; report.error = error instanceof EvaluationError ? error.code : "RUN_FAILED_OR_UNKNOWN"; await save(); }
  return report;
}
