import type { CharacterId } from './characters';
import { getVocalPalette, isVocalCharacterId, type VocalCharacterId } from './vocal-palette';

export interface CharacterOutput {
  content: unknown;
  finishReason?: unknown;
  nativeFinishReason?: unknown;
  refusal?: unknown;
}
export function buildVocalResponseFormat(characterId: CharacterId) {
  const palette = getVocalPalette(characterId);
  if (!palette) return undefined;
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: `chiitalk_vocal_${characterId}`,
      strict: true as const,
      schema: {
        type: 'object' as const,
        properties: { text: { type: 'string' as const, enum: [...palette] } },
        required: ['text'],
        additionalProperties: false as const,
      },
    },
  };
}
export type VocalResponseFormat = NonNullable<ReturnType<typeof buildVocalResponseFormat>>;
function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => sameJson(item, right[index]));
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
}
export function vocalCharacterIdFromFormat(format: unknown): VocalCharacterId {
  for (const id of ['chiikawa', 'usagi', 'kurimanju', 'furuhonya'] as const) {
    if (sameJson(format, buildVocalResponseFormat(id))) return id;
  }
  throw new Error('INVALID_VOCAL_FORMAT');
}
export function decodeCharacterOutput(characterId: CharacterId | undefined, output: CharacterOutput): string {
  const raw = output.content;
  if (typeof raw !== 'string' || !raw.trim() || raw.includes('\uFFFD') || new TextEncoder().encode(raw).length > 8192 || output.refusal != null) throw new Error('INVALID_CHARACTER_OUTPUT');
  if (characterId === undefined || !isVocalCharacterId(characterId)) {
    if (output.finishReason !== 'stop' || ['refusal','max_tokens','length'].includes(String(output.nativeFinishReason))) throw new Error('INVALID_CHARACTER_FINISH');
    return raw.trim();
  }
  if (output.finishReason !== 'stop' || ['refusal','max_tokens','length'].includes(String(output.nativeFinishReason))) throw new Error('INVALID_VOCAL_FINISH');
  const value: unknown = JSON.parse(raw);
  // Reject duplicate object members before JSON.parse can collapse them.
  if (!/^\s*\{\s*"(?:\\.|[^"\\])*"\s*:\s*"(?:\\.|[^"\\])*"\s*\}\s*$/u.test(raw)) throw new Error('INVALID_VOCAL_OUTPUT');
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, 'text')) throw new Error('INVALID_VOCAL_OUTPUT');
  const text = (value as Record<string, unknown>).text;
  if (typeof text !== 'string' || !getVocalPalette(characterId)!.includes(text)) throw new Error('INVALID_VOCAL_OUTPUT');
  return text;
}
