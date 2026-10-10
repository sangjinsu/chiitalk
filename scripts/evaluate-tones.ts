import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import fixtures from "../data/character-evaluation-inputs.json";
import { characters, isCharacterId } from "../src/lib/characters";
import { getCharacterStyle } from "../src/lib/character-styles";
import { buildPayload } from "../src/lib/server/provider";

type Message = { role: "system" | "user" | "assistant"; content: string };
type EvaluationCase = (typeof fixtures.cases)[number];
const models = [
  { id: "qwen/qwen3.5-9b", promptPrice: 0.10, completionPrice: 0.15 },
  { id: "google/gemini-2.5-flash-lite", promptPrice: 0.10, completionPrice: 0.40 },
] as const;

function messagesFor(testCase: EvaluationCase): Message[] {
  if (!isCharacterId(testCase.characterId)) throw new Error(`Invalid fixture character: ${testCase.id}`);
  return buildPayload({ characterId: testCase.characterId, text: testCase.text }).messages;
}

function validateFixtures(): void {
  if (fixtures.cases.length !== 240 || new Set(fixtures.cases.map((item) => item.id)).size !== 240) throw new Error("Expected 240 unique evaluation cases.");
  for (const character of characters) {
    if (fixtures.cases.filter((item) => item.characterId === character.id).length !== 30) throw new Error(`Expected 30 cases: ${character.id}`);
    if (getCharacterStyle(character.id).examples.length !== 8) throw new Error(`Expected 8 examples: ${character.id}`);
  }
  for (const testCase of fixtures.cases) {
    if (!testCase.text.trim() || Array.from(testCase.text).length > 300) throw new Error(`Invalid fixture input: ${testCase.id}`);
    if (Buffer.byteLength(JSON.stringify(messagesFor(testCase)), "utf8") > 8192) throw new Error(`Prompt exceeds 8 KiB: ${testCase.id}`);
  }
}

function numeric(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const limitArg = args.find((argument) => argument.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.slice(8)) : 480;
  if (!Number.isInteger(limit) || limit < 1 || limit > 480) throw new Error("--limit must be an integer between 1 and 480.");
  const unknown = args.filter((argument) => argument !== "--live" && !argument.startsWith("--limit=") && !argument.startsWith("--out="));
  if (unknown.length) throw new Error(`Unknown option: ${unknown.join(", ")}`);
  validateFixtures();
  const jobs = fixtures.cases.flatMap((testCase) => models.map((model) => ({ testCase, model }))).slice(0, limit);
  if (!live) {
    console.log(JSON.stringify({ mode: "dry-run", cases: fixtures.cases.length, characters: characters.length, models: models.map((model) => model.id), plannedRequests: jobs.length, paidRequests: 0, fixtureValidation: "passed", qualityValidated: false }, null, 2));
    return;
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is required for --live. Never place keys in source or output files.");
  const outArg = args.find((argument) => argument.startsWith("--out="));
  const outPath = resolve(outArg ? outArg.slice(6) : `evaluation-output/${new Date().toISOString().replaceAll(":", "-")}.json`);
  await mkdir(resolve(outPath, ".."), { recursive: true });
  const rows: Record<string, unknown>[] = [];
  console.log(`Live evaluation: at most ${jobs.length} paid requests; sequential, 30s timeout, no retry.`);
  for (const { testCase, model } of jobs) {
    const started = performance.now();
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST", signal: AbortSignal.timeout(30_000),
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model.id, messages: messagesFor(testCase), max_tokens: 256, stream: false, reasoning: { enabled: false }, provider: { require_parameters: true, allow_fallbacks: false, max_price: { prompt: model.promptPrice, completion: model.completionPrice, request: 0 } } }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const choice = payload?.choices?.[0];
      if (typeof choice?.message?.content !== "string" || !choice.message.content.trim()) throw new Error("Missing response text");
      if (payload.model !== model.id) throw new Error("Unexpected response model");
      const usage = payload.usage;
      rows.push({ caseId: testCase.id, characterId: testCase.characterId, category: testCase.category, model: model.id, status: "ok", input: testCase.text, output: choice.message.content, latencyMs: Math.round(performance.now() - started), finishReason: choice.finish_reason ?? null, promptTokens: numeric(usage?.prompt_tokens), completionTokens: numeric(usage?.completion_tokens), totalTokens: numeric(usage?.total_tokens), reasoningTokens: numeric(usage?.completion_tokens_details?.reasoning_tokens), costUsd: numeric(usage?.cost), humanScores: { fidelity: null, emotionPolarity: null, semanticPreservation: testCase.expectedMode === "vocal" ? "not-applicable" : null, naturalKorean: null, noInventedFacts: null, noPromptLeak: null }, notes: "" });
    } catch (error) {
      // Store only controlled error labels, never vendor bodies or credentials.
      const message = error instanceof Error ? error.message : "Unknown error";
      const safeError = /^(HTTP \d{3}|Missing response text|Unexpected response model)$/.test(message) ? message : "Request failed or timed out";
      rows.push({ caseId: testCase.id, characterId: testCase.characterId, model: model.id, status: "error", error: safeError, latencyMs: Math.round(performance.now() - started) });
    }
    await writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), syntheticInputsOnly: true, mode: "live", maxRequests: jobs.length, completedRequests: rows.length, qualityValidated: false, rows }, null, 2) + "\n");
  }
  console.log(`Saved ${rows.length} evaluation rows to ${outPath}. Human review remains required.`);
}

await main();
