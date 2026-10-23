export interface ProviderRoutingPolicy {
  readonly only?: readonly string[];
  readonly sort?: 'price';
  readonly require_parameters: true;
  readonly allow_fallbacks: false;
  readonly max_price: Readonly<{ prompt: number | string; completion: number | string; request: 0 | '0' }>;
}

export interface ModelConfig {
  readonly promptPrice: number;
  readonly completionPrice: number;
  readonly provider?: "anthropic" | "openai" | "google-ai-studio";
  readonly supportsReasoning: boolean;
  readonly wirePolicy?: Readonly<{ reasoning: Readonly<{ effort: 'none' }>; provider: ProviderRoutingPolicy }>;
  readonly responsePolicy?: Readonly<{ models: readonly string[]; provider: string; reasoningTokens: 0 }>;
}

// Standard endpoints were checked against OpenRouter's official catalogue.
// Price caps use USD per million tokens; every request fee is capped at zero.
const miniWirePolicy = Object.freeze({
  reasoning: Object.freeze({ effort: 'none' as const }),
  provider: Object.freeze({
    only: Object.freeze(['openai']), require_parameters: true as const, allow_fallbacks: false as const,
    max_price: Object.freeze({ prompt: '0.75', completion: '4.50', request: '0' as const }),
  }),
});
const miniResponsePolicy = Object.freeze({
  models: Object.freeze(['openai/gpt-5.4-mini', 'openai/gpt-5.4-mini-20260317']),
  provider: 'OpenAI', reasoningTokens: 0 as const,
});

export const MODEL_CONFIGS = Object.freeze({
  "qwen/qwen3.5-9b": Object.freeze({ promptPrice: 0.10, completionPrice: 0.15, supportsReasoning: true }),
  "anthropic/claude-haiku-5.5": Object.freeze({ promptPrice: 0.10, completionPrice: 0.50, provider: "anthropic", supportsReasoning: true }),
  "openai/gpt-5.4-nano": Object.freeze({ promptPrice: 0.20, completionPrice: 1.25, provider: "openai", supportsReasoning: true }),
  "google/gemini-2.5-flash": Object.freeze({ promptPrice: 0.30, completionPrice: 2.50, provider: "google-ai-studio", supportsReasoning: true }),
  "google/gemini-2.5-flash-lite": Object.freeze({ promptPrice: 0.10, completionPrice: 0.40, provider: "google-ai-studio", supportsReasoning: true }),
  "openai/gpt-4.1-mini": Object.freeze({ promptPrice: 0.40, completionPrice: 1.60, provider: "openai", supportsReasoning: false }),
  "openai/gpt-5.4-mini": Object.freeze({ promptPrice: 0.75, completionPrice: 4.50, provider: "openai", supportsReasoning: true, wirePolicy: miniWirePolicy, responsePolicy: miniResponsePolicy }),
} as const satisfies Record<string, ModelConfig>);

export type ModelId = keyof typeof MODEL_CONFIGS;

// Candidate selection remains internal; change this only after the comparison.
export const DEFAULT_MODEL_ID: ModelId = "anthropic/claude-haiku-5.5";
export const SPOKEN_MODEL_ID: ModelId = "openai/gpt-5.4-mini";

export function getModelConfig(id: ModelId): ModelConfig | undefined {
  return Object.hasOwn(MODEL_CONFIGS, id) ? MODEL_CONFIGS[id] : undefined;
}
