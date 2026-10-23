import { expect, test } from "bun:test";
import fixtures from "../data/character-evaluation-inputs.json";
import { characters, type CharacterId } from "../src/lib/characters";
import { getCharacterStyle, selectCharacterExamples } from "../src/lib/character-styles";
import { getVocalPalette, isVocalCharacterId } from "../src/lib/vocal-palette";

test("only the four nonverbal characters expose bounded, distinct enum choices", () => {
  for (const character of characters) {
    const palette = getVocalPalette(character.id);
    expect(isVocalCharacterId(character.id)).toBe(character.speechType === "vocal");
    if (character.speechType !== "vocal") {
      expect(palette).toBeUndefined();
      continue;
    }
    expect(palette).toBeDefined();
    expect(palette!.length).toBeGreaterThanOrEqual(16);
    expect(palette!.length).toBeLessThanOrEqual(24);
    expect(new Set(palette).size).toBe(palette!.length);
    expect(Buffer.byteLength(JSON.stringify(palette), "utf8")).toBeLessThanOrEqual(1024);
    for (const line of palette!) {
      expect(Array.from(line).length).toBeLessThanOrEqual(48);
      expect(line.trim().split(/\s+/).length).toBeLessThanOrEqual(3);
      expect(line).not.toMatch(/\uFFFD|[\[\](){}]|([가-힣])\1{4}/);
    }
  }
  for (const key of ["__proto__", "constructor", "toString"]) {
    expect(isVocalCharacterId(key as CharacterId)).toBe(false);
    expect(getVocalPalette(key as CharacterId)).toBeUndefined();
  }
});

for (const [id, material] of [
  ["chiikawa", /^[아어에으와응하헤…!?.,\s—~]+$/],
  ["usagi", /^[야하아우라…!?.,\s—~]+$/],
  ["kurimanju", /^[하아후우허흐으음…!?.,\s—~]+$/],
  ["furuhonya", /^[아어으음응후우헤…!?.,\s—~]+$/],
] as const) {
  test(`${id} enum choices contain no lexical escape beyond the single Chiikawa refusal`, () => {
    for (const line of getVocalPalette(id)!) {
      if (id === "chiikawa" && line === "아니!") continue;
      expect(line).toMatch(material);
    }
  });
}

test("plain preview and selected vocal demonstrations are all native enum members", () => {
  for (const character of characters) {
    const palette = getVocalPalette(character.id);
    if (!palette) continue;
    const examples = getCharacterStyle(character.id).examples.concat(
      fixtures.cases.filter(item => item.characterId === character.id)
        .flatMap(item => selectCharacterExamples(character.id, item.text)),
    );
    for (const example of examples) expect(palette).toContain(example.output);
  }
});
