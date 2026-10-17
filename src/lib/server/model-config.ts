export interface ModelConfig {
  readonly promptPrice: number;
  readonly completionPrice: number;
  readonly provider?: "anthropic" | "openai" | "google-ai-studio";
  readonly supportsReasoning: boolean;
}

// Standard endpoints were checked against OpenRouter's official catalogue.
// Price caps use USD per million tokens; every request fee is capped at zero.
export const MODEL_CONFIGS = Object.freeze({
  "qwen/qwen3.5-9b": Object.freeze({ promptPrice: 0.10, completionPrice: 0.15, supportsReasoning: true }),
  "anthropic/claude-haiku-5.5": Object.freeze({ promptPrice: 0.10, completionPrice: 0.50, provider: "anthropic", supportsReasoning: true }),
  "openai/gpt-5.4-nano": Object.freeze({ promptPrice: 0.20, completionPrice: 1.25, provider: "openai", supportsReasoning: true }),
  "google/gemini-2.5-flash": Object.freeze({ promptPrice: 0.30, completionPrice: 2.50, provider: "google-ai-studio", supportsReasoning: true }),
  "google/gemini-2.5-flash-lite": Object.freeze({ promptPrice: 0.10, completionPrice: 0.40, provider: "google-ai-studio", supportsReasoning: true }),
  "openai/gpt-4.1-mini": Object.freeze({ promptPrice: 0.40, completionPrice: 1.60, provider: "openai", supportsReasoning: false }),
} as const satisfies Record<string, ModelConfig>);

export type ModelId = keyof typeof MODEL_CONFIGS;

// Candidate selection remains internal; change this only after the comparison.
export const DEFAULT_MODEL_ID: ModelId = "anthropic/claude-haiku-5.5";

export function getModelConfig(id: ModelId): ModelConfig | undefined {
  return Object.hasOwn(MODEL_CONFIGS, id) ? MODEL_CONFIGS[id] : undefined;
}
