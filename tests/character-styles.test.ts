import { describe, expect, test } from "bun:test";
import fixtures from "../data/character-evaluation-inputs.json";
import { characters, isCharacterId } from "../src/lib/characters";
import { CHARACTER_STYLE_VERSION, getCharacterStyle, selectCharacterExamples } from "../src/lib/character-styles";
import { buildPayload } from "../src/lib/server/provider";

describe("intent-sensitive example selection", () => {
  test("refusal remains primary when a positive phrase occurs first", () => {
    const selected = selectCharacterExamples("hachiware", "네가 좋아. 그래도 그건 싫어. 나는 안 할 거야.");
    expect(selected[0]?.input).toBe("그건 싫어. 나는 하지 않을래.");
  });

  test("an explicit help request selects a request rather than gratitude", () => {
    const selected = selectCharacterExamples("shisa", "조금만 도와줘. 부탁할게.");
    expect(selected[0]?.input).toBe("그 간식 나도 먹고 싶어.");
  });

  test("thanks stays gratitude even when the giver mentions help", () => {
    const selected = selectCharacterExamples("momonga", "도와줘서 고마워. 나도 도와줄게.");
    expect(selected[0]?.input).toBe("도와줘서 고마워. 나도 너를 도와줄게.");
  });

  test("fear does not become joy through a negated positive phrase", () => {
    const selected = selectCharacterExamples("chiikawa", "좋아하는 상황이 아니야. 너무 무서워.");
    expect(selected[0]?.input).toBe("저쪽에서 소리가 나서 조금 무서워.");
  });

  test("a mixed feeling receives both fear and joy with two bounded examples", () => {
    const selected = selectCharacterExamples("usagi", "기쁘기도 하지만 조금 무서워.", 2);
    expect(selected).toHaveLength(2);
    expect(selected.map((example) => example.input)).toContain("저쪽에서 소리가 나서 조금 무서워.");
    expect(selected.map((example) => example.input)).toContain("오늘 일이 잘 풀려서 정말 기뻐.");
  });

  test("fear of another person's dislike is not the speaker's refusal", () => {
    const selected = selectCharacterExamples("hachiware", "친구가 나를 싫어할까 봐 걱정돼.");
    expect(selected[0]?.input).toBe("저쪽에서 소리가 나서 조금 무서워.");
  });
});

test("all synthetic cases and maximum-length inputs preserve request boundaries", () => {
  expect(fixtures.promptVersion).toBe(CHARACTER_STYLE_VERSION);
  const ids = new Set(fixtures.cases.map((item) => item.id));
  expect(ids.size).toBe(240);
  for (const character of characters) {
    expect(fixtures.cases.filter((item) => item.characterId === character.id)).toHaveLength(30);
    const examples = getCharacterStyle(character.id).examples;
    expect(examples).toHaveLength(8);
    if (character.speechType === "vocal") {
      for (const example of examples) {
        expect(example.output.length).toBeLessThanOrEqual(32);
        expect(example.output).not.toMatch(/[\[\]()]/);
      }
    }
    for (const text of ["아".repeat(300), "😀".repeat(300)]) {
      const payload = buildPayload({ characterId: character.id, text });
      expect(Buffer.byteLength(JSON.stringify(payload.messages), "utf8")).toBeLessThanOrEqual(8192);
      expect(payload.messages.filter((message) => message.role === "assistant")).toHaveLength(3);
      expect(payload.messages.at(-1)).toEqual({ role: "user", content: text });
      expect(payload.model).toBe("qwen/qwen3.5-9b");
      expect(payload.max_tokens).toBe(256);
    }
  }
  for (const item of fixtures.cases) {
    if (!isCharacterId(item.characterId)) throw new Error(`Unknown fixture character: ${item.id}`);
    const payload = buildPayload({ characterId: item.characterId, text: item.text });
    expect(Buffer.byteLength(JSON.stringify(payload.messages), "utf8")).toBeLessThanOrEqual(8192);
  }
});
