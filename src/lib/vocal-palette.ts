import type { CharacterId } from "./characters";

export type VocalCharacterId = "chiikawa" | "usagi" | "kurimanju" | "furuhonya";

// Newly authored product choices, not canonical dialogue or transcriptions.
// Furuhonya remains provisional because direct subtitle evidence is limited.
const palettes = {
  chiikawa: Object.freeze([
    "와아…!", "으으… 응…!", "에…?", "아…? 아아…!", "와아…! 헤헤…",
    "응…! 에헤…", "하아…", "아니!", "에헤…", "헤헤…",
    "와…!", "아아…!", "으으…", "으…!", "어…?",
    "응…!", "하아… 으…", "에헤… 에…?", "와아…! 에…?", "으으… 하아…",
  ]),
  usagi: Object.freeze([
    "야하—!", "우… 우라!", "하…?", "하? 야하…?", "우라—!",
    "야하!", "우우…", "우! 우우—!", "우라!", "하아…",
    "우…", "하!", "아…?", "야하…! 하…?", "우라…! 우…?",
    "우우… 하아…", "우…!", "하아…?", "야하…", "하… 우…",
  ]),
  kurimanju: Object.freeze([
    "하아—…!", "흐으… 하!", "허…?", "허…? 후!", "후! 하아—…!",
    "후우…", "하아아…", "허!", "하아…", "후…",
    "흐음…", "음…?", "흐으…", "허…!", "후… 허…?",
    "흐으… 후우…", "음…", "후우…!", "하…?", "하아… 후…",
  ]),
  furuhonya: Object.freeze([
    "헤…", "으… 응…", "어…?", "어…? 아…!", "아아…! 헤…",
    "응…", "후우…", "으으!", "아…!", "헤헤…",
    "으…", "음…?", "어어…?", "아…?", "응…!",
    "후…", "헤… 어…?", "아…! 음…?", "으… 후우…", "음…",
  ]),
} satisfies Record<VocalCharacterId, readonly string[]>;

export function isVocalCharacterId(characterId: CharacterId): characterId is VocalCharacterId {
  return Object.hasOwn(palettes, characterId);
}

export function getVocalPalette(characterId: CharacterId): readonly string[] | undefined {
  return isVocalCharacterId(characterId) ? palettes[characterId] : undefined;
}
