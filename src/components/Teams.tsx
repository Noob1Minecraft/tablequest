import type { Game } from "../types";
import type { T } from "./Modal";
export function ScoreBoard({
  game,
  team,
}: {
  game: Game;
  team: (index: 0 | 1) => string;
}) {
  return (
    <div className="score-board" aria-live="polite" aria-atomic="true">
      {([0, 1] as const).map((i) => (
        <div className={`team-score team-${i}`} key={i}>
          <span>{team(i)}</span>
          <strong key={game.scores[i]}>{game.scores[i]}</strong>
        </div>
      ))}
      <span className="score-divider" aria-hidden="true">
        VS
      </span>
    </div>
  );
}
export function TeamFields({
  game,
  t,
  change,
}: {
  game: Game;
  t: T;
  change: (teams: [string, string]) => void;
}) {
  return (
    <div className="teams-grid">
      {([0, 1] as const).map((i) => (
        <label className={`team-field field team-${i}`} key={i}>
          <strong>{t(i === 0 ? "teamA" : "teamB")}</strong>
          <input
            aria-label={`${t("teamName")} ${i === 0 ? "A" : "B"}`}
            value={game.teams[i]}
            placeholder={t(i === 0 ? "teamA" : "teamB")}
            maxLength={24}
            onChange={(e) => {
              const teams: [string, string] = [...game.teams];
              teams[i] = e.target.value;
              change(teams);
            }}
          />
          <span>
            {t("teamCount", {
              count:
                i === 0
                  ? Math.ceil(game.players / 2)
                  : Math.floor(game.players / 2),
            })}
          </span>
        </label>
      ))}
    </div>
  );
}
