import data from "./data/quests.json";
import type { Game, Quest, Mode, Company } from "./types";
export const quests = data as Quest[];
export const initialGame = (): Game => ({
  version: 1,
  screen: "welcome",
  company: "friends",
  players: 4,
  minutes: 5,
  mode: "connect",
  questIds: [],
  round: 0,
  scores: [0, 0],
  teams: ["", ""],
  deadline: null,
  remaining: 60,
  startedAt: null,
  finishedAt: null,
});
export function selectQuests(
  company: Company,
  mode: Mode,
  players: number,
  minutes: 5 | 10,
  random = Math.random,
): string[] {
  // Keep the legacy saved-game value `party`; content uses `celebration`.
  const context = company === "party" ? "celebration" : company;
  const pool = quests.filter(
    (q) =>
      (q.category.includes("any") || q.category.includes(context)) &&
      q.modes.includes(mode) &&
      q.minPlayers <= players &&
      q.maxPlayers >= players,
  );
  const count = minutes === 5 ? 3 : 5;
  if (pool.length < count) throw new Error("noQuests");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Stable partition after shuffling: contextual tasks first, shared tasks fill
  // the longer session. Never fall back to another group's exclusive content.
  pool.sort(
    (a, b) =>
      Number(b.category.includes(context)) -
      Number(a.category.includes(context)),
  );
  return pool.slice(0, count).map((q) => q.id);
}
export const roundSeconds = (game: Game) => (game.minutes === 5 ? 60 : 90);
export function advance(
  game: Game,
  winner?: 0 | 1 | "draw",
  now = Date.now(),
): Game {
  if (game.screen !== "score" && game.screen !== "timer") return game;
  const scores: [number, number] = [...game.scores];
  if (winner === "draw") {
    scores[0]++;
    scores[1]++;
  } else if (winner !== undefined) scores[winner]++;
  const last = game.round + 1 >= game.questIds.length;
  return {
    ...game,
    scores,
    screen: last ? "result" : "quest",
    round: last ? game.round : game.round + 1,
    deadline: null,
    remaining: roundSeconds(game),
    finishedAt: last ? now : null,
  };
}
export function secondsLeft(game: Game, now = Date.now()) {
  return game.deadline === null
    ? game.remaining
    : Math.max(0, Math.ceil((game.deadline - now) / 1000));
}
export function restoreGame(value: unknown): Game {
  const fallback = initialGame();
  if (!value || typeof value !== "object") return fallback;
  const g = value as Game;
  const finite = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n);
  const timestamp = (n: unknown) => n === null || (finite(n) && n >= 0);
  if (
    g.version !== 1 ||
    ![
      "welcome",
      "context",
      "mode",
      "teams",
      "quest",
      "timer",
      "score",
      "result",
      "feedback",
    ].includes(g.screen) ||
    !["friends", "couple", "family", "party"].includes(g.company) ||
    !["connect", "fun", "battle"].includes(g.mode) ||
    !Number.isInteger(g.players) ||
    g.players < 2 ||
    g.players > 8 ||
    ![5, 10].includes(g.minutes)
  )
    return fallback;
  if (
    !Array.isArray(g.questIds) ||
    new Set(g.questIds).size !== g.questIds.length ||
    !g.questIds.every((id) =>
      quests.some(
        (q) =>
          q.id === id &&
          q.modes.includes(g.mode) &&
          q.minPlayers <= g.players &&
          q.maxPlayers >= g.players,
      ),
    )
  )
    return fallback;
  if (
    !Array.isArray(g.scores) ||
    g.scores.length !== 2 ||
    !g.scores.every((n) => Number.isInteger(n) && n >= 0 && n <= 5) ||
    !Array.isArray(g.teams) ||
    g.teams.length !== 2 ||
    !g.teams.every((n) => typeof n === "string" && n.length <= 24)
  )
    return fallback;
  if (
    !Number.isInteger(g.round) ||
    g.round < 0 ||
    !finite(g.remaining) ||
    g.remaining < 0 ||
    g.remaining > 90 ||
    !timestamp(g.deadline) ||
    !timestamp(g.startedAt) ||
    !timestamp(g.finishedAt)
  )
    return fallback;
  if (
    ["quest", "timer", "score", "result", "feedback"].includes(g.screen) &&
    (g.questIds.length !== (g.minutes === 5 ? 3 : 5) ||
      g.round >= g.questIds.length ||
      g.startedAt === null)
  )
    return fallback;
  if (
    g.mode === "battle" &&
    g.players < 4 &&
    !["welcome", "context", "mode"].includes(g.screen)
  )
    return fallback;
  return g;
}
export function readStorage(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
export function saveStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
