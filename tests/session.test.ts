import { describe, expect, it } from "vitest";
import { demoSession, restoreDemo, createSession } from "../src/session";
import { initialGame, quests, restoreGame } from "../src/game";
describe("presentation sessions and content", () => {
  it("uses the requested demo settings and deterministic quests", () => {
    const fun = demoSession();
    expect(fun.players).toBe(4);
    expect(fun.minutes).toBe(5);
    expect(fun.company).toBe("friends");
    expect(fun.mode).toBe("fun");
    expect(fun.questIds).toEqual(["f1", "f2", "f4"]);
    expect(demoSession("battle").questIds).toEqual(["b1", "b2", "b6"]);
  });
  it("does not mutate existing settings or carry previous scores into replay", () => {
    const previous = {
      ...initialGame(),
      scores: [2, 1] as [number, number],
      players: 7,
    };
    const replay = createSession(previous);
    expect(previous.scores).toEqual([2, 1]);
    expect(replay.scores).toEqual([0, 0]);
    expect(replay.players).toBe(7);
  });
  it("restores old version-1 games despite content redesign", () => {
    const old = {
      ...initialGame(),
      questIds: ["c1", "c2", "c3"],
      screen: "timer" as const,
      startedAt: 1,
      deadline: 999999,
    };
    expect(restoreGame(old)).toEqual(old);
  });
  it("recovers a matching demo, rejects damaged saves", () => {
    const game = demoSession("battle");
    expect(restoreDemo(game, "battle")).toEqual(game);
    expect(restoreDemo({}, "fun").mode).toBe("fun");
  });
  it("keeps all 18 ids with short translated prompts and rules", () => {
    expect(quests.map((q) => q.id)).toEqual([
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
      "c6",
      "f1",
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
      "b1",
      "b2",
      "b3",
      "b4",
      "b5",
      "b6",
    ]);
    for (const q of quests)
      for (const lang of ["ru", "kk", "en"] as const) {
        expect(q.prompt[lang].length).toBeGreaterThan(10);
        expect(q.prompt[lang].length).toBeLessThan(100);
        expect(q.instruction[lang].length).toBeLessThan(245);
      }
  });
});
