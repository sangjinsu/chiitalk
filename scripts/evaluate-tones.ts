import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fixtures from "../data/character-evaluation-inputs.json";
import { characters, isCharacterId } from "../src/lib/characters";
import { CHARACTER_STYLE_VERSION, getCharacterStyle } from "../src/lib/character-styles";
import { buildPayload } from "../src/lib/server/provider";
import { MODELS, runEvaluation, type EvaluationJob, type Provenance } from "./evaluation-support";

class CliError extends Error {}
function optionsFor(args: string[]) {
  const options = { live: false, dry: false, pilot: false, limit: undefined as number | undefined, out: undefined as string | undefined };
  const seen = new Set<string>();
  for (const argument of args) {
    const name = argument.split("=", 1)[0]!;
    if (seen.has(name)) throw new CliError("Duplicate CLI option."); seen.add(name);
    if (argument === "--live") options.live = true;
    else if (argument === "--dry" || argument === "--dry-run") options.dry = true;
    else if (argument === "--pilot") options.pilot = true;
    else if (argument.startsWith("--limit=")) options.limit = Number(argument.slice(8));
    else if (argument.startsWith("--out=") && argument.slice(6)) options.out = argument.slice(6);
    else throw new CliError("Unknown or incomplete CLI option.");
  }
  if (options.live && options.dry) throw new CliError("--live and --dry are mutually exclusive.");
  const limit = options.limit ?? (options.pilot ? 16 : 480);
  if (!Number.isInteger(limit) || limit < 1 || limit > (options.pilot ? 16 : 480)) throw new CliError("--limit is outside the fixed request cap.");
  return { ...options, limit };
}
export function buildEvaluationJobs(args: string[]): { options: ReturnType<typeof optionsFor>; jobs: EvaluationJob[] } {
  const options = optionsFor(args);
  if (fixtures.promptVersion !== CHARACTER_STYLE_VERSION) throw new CliError("Fixture and source prompt versions differ.");
  if (fixtures.cases.length !== 240 || new Set(fixtures.cases.map((item) => item.id)).size !== 240) throw new CliError("Expected 240 unique synthetic cases.");
  for (const character of characters) {
    if (fixtures.cases.filter((item) => item.characterId === character.id).length !== 30 || getCharacterStyle(character.id).examples.length !== 8) throw new CliError("Character fixture or example count differs.");
  }
  const all = fixtures.cases.flatMap((item, caseIndex): EvaluationJob[] => {
    if (!isCharacterId(item.characterId) || !item.text.trim() || Array.from(item.text).length > 300) throw new CliError("Invalid synthetic fixture input.");
    const messages = buildPayload({ characterId: item.characterId, text: item.text }).messages;
    if (Buffer.byteLength(JSON.stringify(messages), "utf8") > 8192) throw new CliError("Prompt exceeds 8 KiB.");
    return MODELS.map((model, modelIndex) => ({ index: caseIndex * 2 + modelIndex, caseId: item.id, characterId: item.characterId, category: item.category, input: item.text, expectedMode: item.expectedMode === "vocal" ? "vocal" : "verbal", model, messages }));
  });
  const firstCases = new Set(characters.map((character) => fixtures.cases.find((item) => item.characterId === character.id)!.id));
  const jobs = (options.pilot ? all.filter((job) => firstCases.has(job.caseId)) : all).slice(0, options.limit);
  return { options, jobs };
}
async function provenance(): Promise<Provenance> {
  const hash = async (path: string) => createHash("sha256").update(await readFile(new URL(path, import.meta.url))).digest("hex");
  return { promptVersion: CHARACTER_STYLE_VERSION, fixturePromptVersion: fixtures.promptVersion, fixtureVersion: fixtures.version, styleSha256: await hash("../src/lib/character-styles.ts"), fixtureSha256: await hash("../data/character-evaluation-inputs.json") };
}
export async function runCli(args: string[], dependencies?: { key?: string; fetcher?: Parameters<typeof runEvaluation>[0]["fetcher"]; log?: (line: string) => void }): Promise<number> {
  const log = dependencies?.log ?? console.log;
  const { options, jobs } = buildEvaluationJobs(args);
  const source = await provenance();
  if (!options.live) {
    log(JSON.stringify({ mode: "dry-run", cases: 240, characters: 8, models: MODELS.map((model) => model.id), plannedRequests: jobs.length, paidRequests: 0, fixtureValidation: "passed", qualityValidated: false, ...source }, null, 2));
    return 0;
  }
  const key = dependencies ? dependencies.key : process.env.OPENROUTER_API_KEY;
  if (!key) throw new CliError("OPENROUTER_API_KEY is required for --live; no request was started.");
  const outPath = resolve(options.out ?? `evaluation-output/${source.promptVersion}-${source.styleSha256.slice(0, 12)}-${source.fixtureSha256.slice(0, 12)}.json`);
  const result = await runEvaluation({ outPath, key, jobs, provenance: source, fetcher: dependencies?.fetcher });
  log(`Model POST attempts: ${result.modelPostAttempts}; language successes: ${result.languageSuccesses}; audit pending: ${result.auditPending}; verified audits: ${result.rows.filter((row) => row.auditStatus === "verified").length}; halted: ${result.halted}.`);
  log(`Synthetic results: ${outPath}. Quality scores remain unevaluated.`);
  return result.halted ? 1 : 0;
}
if (import.meta.main) {
  try { process.exitCode = await runCli(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof CliError ? error.message : "Evaluation stopped before further requests. Existing output is never replaced; inspect the pending/error journal. No automatic retry."); process.exitCode = 1; }
}
