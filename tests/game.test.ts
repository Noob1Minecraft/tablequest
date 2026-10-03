import { describe, expect, it } from "vitest";
import {
  advance,
  initialGame,
  quests,
  restoreGame,
  secondsLeft,
  selectQuests,
} from "../src/game";
import { detectLocale, dictionaries } from "../src/i18n";
import type { Company, Mode } from "../src/types";

describe("quest coverage", () => {
  for (const company of ["friends", "couple", "family", "party"] as Company[]) {
    for (const mode of ["connect", "fun", "battle"] as Mode[]) {
      for (const players of [2, 3, 4, 5, 6, 7, 8]) {
        if (mode === "battle" && players < 4) continue;
        it(`${company} / ${mode} / ${players}: 3 and 5 unique eligible quests`, () => {
          for (const minutes of [5, 10] as const) {
            const ids = selectQuests(company, mode, players, minutes);
            expect(new Set(ids).size).toBe(minutes === 5 ? 3 : 5);
            expect(
              ids.every((id) =>
                quests.find((q) => q.id === id)?.modes.includes(mode),
              ),
            ).toBe(true);
          }
        });
      }
    }
  }
  it("rejects underpopulated battle", () =>
    expect(() => selectQuests("couple", "battle", 2, 5)).toThrow());
  it("all quests have three complete translations", () => {
    expect(new Set(quests.map((q) => q.id)).size).toBe(quests.length);
    for (const quest of quests)
      for (const lang of ["ru", "kk", "en"] as const) {
        expect(quest.title[lang].length).toBeGreaterThan(3);
        expect(quest.text[lang].length).toBeGreaterThan(30);
      }
  });
});
describe("game recovery and scoring", () => {
  it("rejects corrupted saves", () => {
    for (const input of [
      null,
      {},
      { ...initialGame(), players: 99 },
      { ...initialGame(), screen: "quest" },
      { ...initialGame(), remaining: "60" },
      { ...initialGame(), teams: [null, null] },
    ])
      expect(restoreGame(input)).toEqual(initialGame());
  });
  it("restores valid active session and deadline", () => {
    const game = {
      ...initialGame(),
      screen: "timer" as const,
      startedAt: 1000,
      deadline: 61000,
      questIds: ["c1", "c2", "c3"],
    };
    expect(restoreGame(game)).toEqual(game);
    expect(secondsLeft(game, 31000)).toBe(30);
    expect(secondsLeft(game, 90000)).toBe(0);
  });
  it("scores wins and draws exactly once and reaches results", () => {
    let game = {
      ...initialGame(),
      mode: "battle" as const,
      screen: "score" as const,
      questIds: ["b1", "b2", "b3"],
      startedAt: 1000,
    };
    let next = advance(game, 0);
    expect(next.scores).toEqual([1, 0]);
    expect(advance(next, 0)).toEqual(next);
    next = advance({ ...next, screen: "score" }, "draw");
    next = advance({ ...next, screen: "score" }, 1, 5000);
    expect(next.scores).toEqual([2, 2]);
    expect(next.screen).toBe("result");
    expect(next.finishedAt).toBe(5000);
  });
});
describe("language", () => {
  it("respects saved choice and searches language preferences", () => {
    expect(detectLocale("kk", ["en-US"])).toBe("kk");
    expect(detectLocale(null, ["de-DE", "kk-KZ"])).toBe("kk");
    expect(detectLocale("bad", ["fr"])).toBe("ru");
  });
  it("dictionaries share keys and interpolation variables", () => {
    for (const lang of ["kk", "en"] as const) {
      expect(Object.keys(dictionaries[lang]).sort()).toEqual(
        Object.keys(dictionaries.ru).sort(),
      );
      for (const key of Object.keys(
        dictionaries.ru,
      ) as (keyof typeof dictionaries.ru)[]) {
        expect(
          (dictionaries[lang][key].match(/\{\w+\}/g) || []).sort(),
        ).toEqual((dictionaries.ru[key].match(/\{\w+\}/g) || []).sort());
      }
    }
  });
});
