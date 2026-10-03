export type Locale = "ru" | "kk" | "en";
export type Mode = "connect" | "fun" | "battle";
export type Company = "friends" | "couple" | "family" | "party";
export type Localized = Record<Locale, string>;
export interface Quest {
  id: string;
  title: Localized;
  text: Localized;
  modes: Mode[];
  category: (Company | "any")[];
  minPlayers: number;
  maxPlayers: number;
}
export type Screen =
  | "welcome"
  | "context"
  | "mode"
  | "teams"
  | "quest"
  | "timer"
  | "score"
  | "result"
  | "feedback";
export interface Game {
  version: 1;
  screen: Screen;
  company: Company;
  players: number;
  minutes: 5 | 10;
  mode: Mode;
  questIds: string[];
  round: number;
  scores: [number, number];
  teams: [string, string];
  deadline: number | null;
  remaining: number;
  startedAt: number | null;
  finishedAt: number | null;
}
