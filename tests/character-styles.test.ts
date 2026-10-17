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
    expect(selected[0]?.input).toBe("그 물건을 나에게 돌려줘.");
  });

  test("thanks stays gratitude even when the giver mentions help", () => {
    const selected = selectCharacterExamples("momonga", "도와줘서 고마워. 나도 도와줄게.");
    expect(selected[0]?.input).toBe("도와줘서 고마워. 나도 너를 도와줄게.");
  });

  test("fear does not become joy through a negated positive phrase", () => {
    const selected = selectCharacterExamples("chiikawa", "좋아하는 상황이 아니야. 너무 무서워.");
    expect(selected[0]?.input).toBe("처음 하는 일이어서 조금 걱정돼.");
  });

  test("a mixed feeling receives both fear and joy with two bounded examples", () => {
    const selected = selectCharacterExamples("usagi", "기쁘기도 하지만 조금 무서워.", 2);
    expect(selected).toHaveLength(2);
    expect(selected.map((example) => example.input)).toContain("처음 하는 일이어서 조금 걱정돼.");
    expect(selected.map((example) => example.input)).toContain("오늘 일이 잘 풀려서 정말 기뻐.");
  });

  test("fear of another person's dislike is not the speaker's refusal", () => {
    const selected = selectCharacterExamples("hachiware", "친구가 나를 싫어할까 봐 걱정돼.");
    expect(selected[0]?.input).toBe("처음 하는 일이어서 조금 걱정돼.");
  });

  test("a worried speaker's explicit request keeps both intents in the bounded few-shot messages", () => {
    for (const text of [
      "조금 걱정돼. 그 물건을 나에게 돌려줘.",
      "혼자 가려니 무서워. 내일 나와 함께 가줄래?",
    ]) {
      const payload = buildPayload({ characterId: "hachiware", text });
      const inputs = payload.messages.filter((message) => message.role === "user").slice(0, -1)
        .map((message) => JSON.parse(message.content).inputText);
      expect(inputs[0]).toBe("그 물건을 나에게 돌려줘.");
      expect(inputs).toContain("처음 하는 일이어서 조금 걱정돼.");
      expect(inputs).toHaveLength(3);
      expect(JSON.parse(payload.messages.at(-1)!.content)).toEqual({ inputText: text });
    }
  });

  test("gratitude followed by refusal keeps refusal primary and includes gratitude", () => {
    const selected = selectCharacterExamples("shisa", "초대해 줘서 고마워. 그런데 오늘은 가지 않을래.");
    expect(selected[0]?.input).toBe("그건 싫어. 나는 하지 않을래.");
    expect(selected.map((example) => example.input)).toContain("도와줘서 고마워. 나도 너를 도와줄게.");
    expect(selected[0]?.output).toMatch(/하지 않을|안 할/);
  });

  test("fear alone stays fear without adding a request example", () => {
    const selected = selectCharacterExamples("hachiware", "처음 가는 곳이라 조금 걱정돼.");
    expect(selected[0]?.input).toBe("처음 하는 일이어서 조금 걱정돼.");
    expect(selected.map((example) => example.input)).not.toContain("그 물건을 나에게 돌려줘.");
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
        expect(Array.from(example.output).length).toBeLessThanOrEqual(48);
        expect(example.output).not.toMatch(/[\[\]()]/);
      }
    }
    for (const text of ["아".repeat(300), "😀".repeat(300)]) {
      const payload = buildPayload({ characterId: character.id, text });
      expect(Buffer.byteLength(JSON.stringify(payload.messages), "utf8")).toBeLessThanOrEqual(8192);
      expect(payload.messages.filter((message) => message.role === "assistant")).toHaveLength(3);
      expect(JSON.parse(payload.messages.at(-1)!.content)).toEqual({ inputText: text });
      expect(payload.model).toBe("anthropic/claude-haiku-5.5");
      expect(payload.max_tokens).toBe(256);
    }
  }
  for (const item of fixtures.cases) {
    if (!isCharacterId(item.characterId)) throw new Error(`Unknown fixture character: ${item.id}`);
    const payload = buildPayload({ characterId: item.characterId, text: item.text });
    expect(Buffer.byteLength(JSON.stringify(payload.messages), "utf8")).toBeLessThanOrEqual(8192);
  }
});

test("contrastive verbal examples retain the worried speaker and requested return", () => {
  for (const id of ["hachiware", "momonga", "rakko", "shisa"] as const) {
    const fear = selectCharacterExamples(id, "처음 하는 일이어서 조금 걱정돼.", 1)[0]!;
    expect(fear.input).toBe("처음 하는 일이어서 조금 걱정돼.");
    expect(fear.output).toMatch(/걱정/);
    expect(fear.output).not.toMatch(/괜찮(?:아(?:[.!…\s]|$)|을\s?거)|너는|네가|걱정하지|해보자/);
    const request = selectCharacterExamples(id, "그 물건을 나에게 돌려줘.", 1)[0]!;
    expect(request.input).toBe("그 물건을 나에게 돌려줘.");
    expect(request.output).toMatch(/물건/);
    expect(request.output).toMatch(/돌려/);
    expect(request.output).not.toMatch(/싫|안 할|하지 않을|필요해서/);
  }
});

test("new verbal examples keep the speaker's facts, plans, request and refusal", () => {
  for (const id of ["hachiware", "momonga", "rakko", "shisa"] as const) {
    const outputs = getCharacterStyle(id).examples.map((example) => example.output);
    expect(outputs[0]).toMatch(/오늘|일이.*오늘/);
    expect(outputs[0]).toMatch(/일.*(?:잘 풀|술술 풀|척척 풀|순조로)/);
    expect(outputs[0]).toMatch(/기뻐|기쁘|기분 좋/);
    expect(outputs[1]).toMatch(/실수/);
    expect(outputs[1]).toMatch(/속상|마음이 편치/);
    expect(outputs[1]).toMatch(/다시 해볼|한 번 더 해볼|한 번 더 해보/);
    expect(outputs[2]).toMatch(/처음/);
    expect(outputs[2]).toMatch(/걱정/);
    expect(outputs[3]).toMatch(/물건/);
    expect(outputs[3]).toMatch(/나한테|나에게|내게|저에게|제게/);
    expect(outputs[3]).toMatch(/돌려/);
    expect(outputs[3]).not.toMatch(/돌려줄게|돌려드릴게|좋아|알겠/);
    expect(outputs[4]).toMatch(/내가|제가|나,/);
    expect(outputs[4]).toMatch(/해냈/);
    expect(outputs[4]).toMatch(/칭찬|잘했다고/);
    expect(outputs[5]).toMatch(/도와|힘을 보태/);
    expect(outputs[5]).toMatch(/고마/);
    expect(outputs[5]).toMatch(/(?:나도|저도).*(?:도와|도움|힘을 보태|돕)/);
    expect(outputs[6]).toMatch(/오늘/);
    expect(outputs[6]).toMatch(/피곤|기운이.*빠|녹초/);
    expect(outputs[6]).toMatch(/쉬고 싶/);
    expect(outputs[7]).toMatch(/싫|마음에 들지/);
    expect(outputs[7]).toMatch(/하지 않을|안 할|하지 않겠|그건 안 해/);
    for (const output of outputs) expect(output).not.toMatch(/사장님|아침|시장|별 붙|하품|야옹|달까/);
  }
});

test("all vocal examples stay bounded without lexical dialogue or stage directions", () => {
  for (const id of ["chiikawa", "usagi", "kurimanju", "furuhonya"] as const) for (const example of getCharacterStyle(id).examples) {
    expect(Array.from(example.output).length).toBeLessThanOrEqual(48);
    const sounds = example.output.trim().split(/\s+/);
    expect(sounds.length).toBeGreaterThanOrEqual(1);
    expect(sounds.length).toBeLessThanOrEqual(4);
    expect(example.output).not.toMatch(/([가-힣])\1{4}|[\[\]()]|고마워|돌려|괜찮|싫어/);
  }
});

test("Momonga gratitude and refusal examples never import applause or touch demands", () => {
  for (const text of ["도와줘서 고마워. 나도 너를 도와줄게.", "그건 싫어. 나는 하지 않을래."]) {
    const payload = buildPayload({ characterId: "momonga", text });
    const primary = payload.messages.find((message) => message.role === "assistant")!.content;
    expect(primary).not.toMatch(/칭찬|쓰다듬|날 봐|감싸|돌려줘/);
    if (text.startsWith("도와")) {
      expect(primary).toMatch(/나도.*널.*도와줄/);
      expect(primary).toMatch(/고마워/);
    } else {
      expect(primary).toMatch(/안 할/);
      expect(primary).toMatch(/싫/);
      expect(primary).not.toMatch(/좋아|해줄게|알겠/);
    }
    expect(JSON.parse(payload.messages.at(-1)!.content)).toEqual({ inputText: text });
  }
});

test("Momonga's worried request repeats the requested return without reversing its direction", () => {
  const text = "조금 걱정돼. 그 물건을 나에게 돌려줘.";
  const payload = buildPayload({ characterId: "momonga", text });
  const users = payload.messages.filter((message) => message.role === "user").slice(0, -1)
    .map((message) => JSON.parse(message.content).inputText);
  const primary = payload.messages.find((message) => message.role === "assistant")!.content;
  expect(users[0]).toBe("그 물건을 나에게 돌려줘.");
  expect(users).toContain("처음 하는 일이어서 조금 걱정돼.");
  expect(primary).toMatch(/물건.*나한테.*돌려줘/);
  expect(primary.match(/돌려줘/g)?.length).toBeGreaterThanOrEqual(2);
  expect(primary).not.toMatch(/돌려줄게|필요해서|칭찬|쓰다듬|죽|바보/);
});

test("Momonga's mixed joy and fear keep both intents without an unrelated request example", () => {
  const text = "기쁘기도 하지만 조금 무서워.";
  const payload = buildPayload({ characterId: "momonga", text });
  const inputs = payload.messages.filter((message) => message.role === "user").slice(0, -1)
    .map((message) => JSON.parse(message.content).inputText);
  expect(inputs).toContain("처음 하는 일이어서 조금 걱정돼.");
  expect(inputs).toContain("오늘 일이 잘 풀려서 정말 기뻐.");
  expect(inputs).not.toContain("내가 해냈어! 나 좀 칭찬해줘.");
  expect(inputs).not.toContain("그 물건을 나에게 돌려줘.");
  expect(JSON.parse(payload.messages.at(-1)!.content)).toEqual({ inputText: text });
});
