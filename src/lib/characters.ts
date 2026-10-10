export const characters = [
  { id: "chiikawa", name: "치이카와", englishName: "Chiikawa", description: "조그만 소리로 전하는 다정한 마음", tint: "#fde0ec", speechType: "vocal", fidelityNote: "짧은 소리로 감정을 표현해요. 문장의 정보는 줄어들 수 있어요.", shortExample: "와아…!" },
  { id: "hachiware", name: "하치와레", englishName: "Hachiware", description: "밝고 솔직하게, 함께 해보자는 마음", tint: "#dcecfa", speechType: "verbal", fidelityNote: "밝고 다정한 한국어 표현으로 재해석해요.", shortExample: "같이 해보면 되겠지!" },
  { id: "usagi", name: "우사기", englishName: "Usagi", description: "신나는 마음을 담은 힘찬 외침", tint: "#fef7d6", speechType: "vocal", fidelityNote: "짧은 외침으로 감정을 표현해요. 문장의 정보는 줄어들 수 있어요.", shortExample: "야하—!" },
  { id: "kurimanju", name: "쿠리만쥬", englishName: "Kurimanju", description: "느긋하게 내쉬는 한숨과 만족감", tint: "#ffe8d4", speechType: "vocal", fidelityNote: "호흡과 감탄 중심으로 표현해요. 문장의 정보는 줄어들 수 있어요.", shortExample: "후우… 하아…" },
  { id: "momonga", name: "모몽가", englishName: "Momonga", description: "귀여운 건 알아줘! 당당한 어리광", tint: "#e6e0f5", speechType: "verbal", fidelityNote: "귀여운 척하는 어리광을 한국어로 재해석해요.", shortExample: "나도 칭찬해줘!" },
  { id: "rakko", name: "랏코", englishName: "Rakko", description: "차분하고 믿음직한 선배의 한마디", tint: "#d9f3e1", speechType: "verbal", fidelityNote: "차분하고 단정한 한국어 표현으로 재해석해요.", shortExample: "차근차근 해보자." },
  { id: "shisa", name: "시사", englishName: "Shisa", description: "공손하게, 열심히 전하는 마음", tint: "#fef7d6", speechType: "verbal", fidelityNote: "정중한 말끝을 살려 한국어로 재해석해요.", shortExample: "열심히 해볼게요~!" },
  { id: "furuhonya", name: "후루혼야", englishName: "Furuhonya", description: "수줍고 조심스러운 작은 반응", tint: "#fde0ec", speechType: "vocal", fidelityNote: "자료가 적어 짧고 조심스러운 반응으로 표현해요.", shortExample: "어…! 응…" },
] as const;

export const CHARACTERS = characters;

export type CharacterId = (typeof characters)[number]["id"];
export type Character = (typeof characters)[number];

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && characters.some((character) => character.id === value);
}

export function getCharacter(id: CharacterId): Character {
  return characters.find((character) => character.id === id)!;
}
