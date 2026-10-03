import { initialGame, restoreGame, selectQuests } from "./game";
import type { Game, Mode } from "./types";

/** Same engine, separate deterministic content for a predictable jury pitch. */
export function createSession(
  settings: Game,
  demo = false,
  now = Date.now(),
): Game {
  const questIds = demo
    ? settings.mode === "battle"
      ? ["b1", "b2", "b6"]
      : settings.mode === "connect"
        ? ["c1", "c2", "c5"]
        : ["f1", "f2", "f4"]
    : selectQuests(
        settings.company,
        settings.mode,
        settings.players,
        settings.minutes,
      );
  return {
    ...settings,
    screen: "quest",
    questIds,
    round: 0,
    scores: [0, 0],
    teams: [settings.teams[0].trim(), settings.teams[1].trim()],
    remaining: settings.minutes === 5 ? 60 : 90,
    deadline: null,
    startedAt: now,
    finishedAt: null,
  };
}
export function demoSession(mode: Mode = "fun", now = Date.now()): Game {
  return createSession(
    { ...initialGame(), mode, company: "friends", players: 4, minutes: 5 },
    true,
    now,
  );
}
export function restoreDemo(value: unknown, mode: Mode): Game {
  const saved = restoreGame(value);
  return saved.questIds.length > 0 &&
    saved.minutes === 5 &&
    saved.players === 4 &&
    saved.mode === mode
    ? saved
    : demoSession(mode);
}
