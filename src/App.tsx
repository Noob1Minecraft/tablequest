import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Heart,
  MessageCircle,
  Minus,
  Pause,
  Play,
  Plus,
  QrCode,
  Smartphone,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wine,
  House,
  PartyPopper,
  MoreHorizontal,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { translate, detectLocale } from "./i18n";
import type { Key } from "./i18n";
import type { Company, Game, Locale, Mode } from "./types";
import {
  advance,
  initialGame,
  quests,
  readStorage,
  restoreGame,
  roundSeconds,
  saveStorage,
  secondsLeft,
} from "./game";
import { createSession, demoSession, restoreDemo } from "./session";
import { Modal, QRModal } from "./components/Modal";
import { Welcome } from "./components/Welcome";
import { ScoreBoard, TeamFields } from "./components/Teams";

const companyIcons = {
  friends: Users,
  couple: Heart,
  family: House,
  party: PartyPopper,
};
const modeIcons = { connect: MessageCircle, fun: Sparkles, battle: Swords };
const companies: Company[] = ["friends", "couple", "family", "party"];
const modes: Mode[] = ["connect", "fun", "battle"];
const params = new URLSearchParams(location.search);
const isDemo = params.get("demo") === "true";
const initialDemoMode = params.get("mode") === "battle" ? "battle" : "fun";
const storageKey = isDemo ? "tablequest.demo.game" : "tablequest.game";
const tableNumber = params
  .get("table")
  ?.replace(/[^\p{L}\p{N} -]/gu, "")
  .slice(0, 20);

export default function App() {
  const [locale, setLocale] = useState<Locale>(() =>
    detectLocale(readStorage("tablequest.language"), navigator.languages),
  );
  const [game, setGame] = useState<Game>(() =>
    isDemo
      ? restoreDemo(readStorage(storageKey), initialDemoMode)
      : restoreGame(readStorage(storageKey)),
  );
  const [showWelcome, setShowWelcome] = useState(!isDemo);
  const [storageOkay, setStorageOkay] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [rating, setRating] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<"yes" | "maybe" | "no" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const main = useRef<HTMLElement>(null);
  const t = (key: Key, values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const screen = showWelcome ? "welcome" : game.screen;
  const active =
    game.questIds.length > 0 &&
    !["result", "feedback", "welcome"].includes(game.screen);
  const current = quests.find((q) => q.id === game.questIds[game.round]);
  const left = secondsLeft(game, now);
  const team = (i: 0 | 1) => game.teams[i] || t(i === 0 ? "teamA" : "teamB");
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    document.documentElement.lang = locale;
    if (!saveStorage("tablequest.language", locale)) setStorageOkay(false);
  }, [locale]);
  useEffect(() => {
    if (!saveStorage(storageKey, game)) setStorageOkay(false);
  }, [game]);
  useEffect(() => {
    if (screen !== "timer") return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [screen]);
  useEffect(() => {
    main.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen, game.round]);
  function patch(values: Partial<Game>) {
    setGame((g) => ({ ...g, ...values }));
  }
  function resetFeedback() {
    setRating(null);
    setRepeat(null);
    setSubmitted(false);
  }
  function fresh() {
    if (isDemo) {
      switchDemo("fun");
      setResetOpen(false);
      return;
    }
    setGame({ ...initialGame(), screen: "context" });
    setShowWelcome(false);
    setResetOpen(false);
    setError(false);
    resetFeedback();
  }
  function start() {
    try {
      setGame(createSession(game, isDemo));
      setError(false);
      resetFeedback();
    } catch {
      setError(true);
    }
  }
  function switchDemo(mode: Mode) {
    const link = new URL(location.href);
    link.searchParams.set("mode", mode);
    history.replaceState(null, "", link);
    setGame(demoSession(mode));
    setShowWelcome(false);
    setMenuOpen(false);
    resetFeedback();
  }
  function differentMode() {
    setGame({
      ...initialGame(),
      screen: "mode",
      company: game.company,
      players: game.players,
      minutes: game.minutes,
      mode: game.mode,
      teams: game.teams,
    });
    resetFeedback();
  }
  function beginTimer() {
    const stamp = Date.now();
    setNow(stamp);
    patch({
      screen: "timer",
      deadline: stamp + roundSeconds(game) * 1000,
      remaining: roundSeconds(game),
    });
  }
  function finishRound() {
    setGame((g) =>
      g.screen !== "timer"
        ? g
        : g.mode === "battle"
          ? { ...g, screen: "score", deadline: null }
          : advance(g),
    );
  }
  function pauseTimer() {
    const stamp = Date.now();
    setNow(stamp);
    setGame((g) => ({
      ...g,
      remaining: secondsLeft(g, stamp),
      deadline: g.deadline === null ? stamp + g.remaining * 1000 : null,
    }));
  }
  function headerBack() {
    if (screen === "context") setShowWelcome(true);
    else if (screen === "mode") patch({ screen: "context" });
    else if (screen === "teams") patch({ screen: "mode" });
    else setResetOpen(true);
  }
  const setup = ["context", "mode", "teams"].includes(screen);
  const completed = ["result", "feedback"].includes(screen);
  const scoreBoard = <ScoreBoard game={game} team={team} />;
  const teamFields = (
    <TeamFields game={game} t={t} change={(teams) => patch({ teams })} />
  );
  const modeDescription = (mode: Mode) =>
    mode === "battle"
      ? game.minutes === 10
        ? t("battleDescFive")
        : t("battleDesc", { rounds: 3 })
      : t(`${mode}Desc`);
  return (
    <div className={`app-shell screen-${screen}`} data-design="after-hours">
      <a className="skip" href="#main">
        {t("skip")}
      </a>
      <header className="header">
        <button
          className="brand"
          onClick={() => setShowWelcome(true)}
          aria-label="TableQuest"
        >
          <span className="brand-mark">
            t<span>q</span>
          </span>
          <span>
            TableQuest<span className="brand-dot">.</span>
          </span>
        </button>
        <span className="header-tagline">{t("tagline")}</span>
        <div className="header-controls">
          <label className="language">
            <span className="sr-only">{t("language")}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
              <option value="en">English</option>
            </select>
          </label>
          <button
            className="icon-button menu-trigger"
            onClick={() => setMenuOpen(true)}
            aria-label={t("menu")}
          >
            <MoreHorizontal size={22} />
          </button>
        </div>
      </header>
      {isDemo ? (
        <nav className="demo-bar" aria-label={t("demoTitle")}>
          <span>{t("demoTitle")}</span>
          <button
            aria-pressed={game.mode === "fun"}
            onClick={() => switchDemo("fun")}
          >
            Fun
          </button>
          <button
            aria-pressed={game.mode === "battle"}
            onClick={() => switchDemo("battle")}
          >
            Team Battle
          </button>
          <a
            href={`${import.meta.env.BASE_URL}${tableNumber ? `?table=${encodeURIComponent(tableNumber)}` : ""}`}
          >
            {t("guestMode")}
          </a>
        </nav>
      ) : null}
      {!storageOkay ? (
        <div className="notice" role="status">
          {t("storageWarning")}
        </div>
      ) : null}
      <main id="main" ref={main} tabIndex={-1}>
        {screen === "welcome" ? (
          <Welcome
            t={t}
            table={tableNumber}
            active={active}
            start={active ? () => setShowWelcome(false) : fresh}
            fresh={() => setResetOpen(true)}
          />
        ) : (
          <section className={`game-area ${screen}-area`}>
            <div className="game-top">
              <button className="text-button" onClick={headerBack}>
                <ArrowLeft size={16} />
                {t(setup ? "back" : "fresh")}
              </button>
              <span>
                {setup
                  ? `${t("step")} ${screen === "context" ? "01" : "02"} / 02`
                  : completed
                    ? t("endCaption")
                    : t("round", {
                        current: game.round + 1,
                        total: game.questIds.length,
                      })}
              </span>
            </div>
            {!completed ? (
              <div
                className={setup ? "step-track" : "round-track"}
                aria-hidden="true"
              >
                {(setup ? ["one", "two"] : game.questIds).map((id, i) => (
                  <span
                    key={id}
                    className={
                      (
                        setup
                          ? i === 0 || screen !== "context"
                          : i <= game.round
                      )
                        ? "filled"
                        : ""
                    }
                  />
                ))}
              </div>
            ) : null}
            {screen === "context" ? (
              <>
                <div className="screen-heading">
                  <span className="eyebrow">
                    01 <span className="label-line" /> {t("onePhone")}
                  </span>
                  <h1>{t("contextTitle")}</h1>
                  <p>{t("contextDesc")}</p>
                </div>
                <div className="company-grid">
                  {companies.map((c) => {
                    const Icon = companyIcons[c];
                    return (
                      <button
                        key={c}
                        className={`company-card ${game.company === c ? "selected" : ""}`}
                        aria-pressed={game.company === c}
                        aria-label={t(c)}
                        onClick={() =>
                          patch({
                            company: c,
                            players: c === "couple" ? 2 : game.players,
                          })
                        }
                      >
                        <Icon
                          className="company-symbol"
                          size={27}
                          strokeWidth={1.3}
                        />
                        <span className="company-title">{t(c)}</span>
                        <span className="company-character">
                          {t(`${c}Desc`)}
                        </span>
                        <span className="selection-dot">
                          {game.company === c ? <Check size={12} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="settings-panel">
                  <div className="setup-row player-row">
                    <h2>{t("players")}</h2>
                    <div
                      className="player-choices"
                      role="group"
                      aria-label={t("players")}
                    >
                      {[2, 3, 4, 5, 6].map((n) => (
                        <button
                          key={n}
                          className={
                            (n === 6 ? game.players >= 6 : game.players === n)
                              ? "active"
                              : ""
                          }
                          aria-pressed={
                            n === 6 ? game.players >= 6 : game.players === n
                          }
                          aria-label={
                            n === 6
                              ? t("morePlayers")
                              : t("playerOption", { count: n })
                          }
                          onClick={() => patch({ players: n })}
                        >
                          {n === 6 ? "6+" : n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {game.players >= 6 ? (
                    <div className="large-group">
                      <span>{t("exactPlayers")}</span>
                      <div className="stepper">
                        <button
                          aria-label={t("fewer")}
                          disabled={game.players <= 6}
                          onClick={() => patch({ players: game.players - 1 })}
                        >
                          <Minus size={16} />
                        </button>
                        <output>{game.players}</output>
                        <button
                          aria-label={t("more")}
                          disabled={game.players >= 8}
                          onClick={() => patch({ players: game.players + 1 })}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="setup-row">
                    <h2>{t("time")}</h2>
                    <div className="segmented">
                      {([5, 10] as const).map((n) => (
                        <button
                          key={n}
                          className={game.minutes === n ? "active" : ""}
                          aria-pressed={game.minutes === n}
                          onClick={() => patch({ minutes: n })}
                        >
                          {n} {t("minutesShort")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="action-zone">
                  <button
                    className="button primary full"
                    onClick={() =>
                      patch({
                        screen: "mode",
                        mode:
                          game.players < 4 && game.mode === "battle"
                            ? "connect"
                            : game.mode,
                      })
                    }
                  >
                    {t("next")}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}
            {screen === "mode" ? (
              <>
                <div className="screen-heading">
                  <span className="eyebrow">
                    02 <span className="label-line" /> TABLEQUEST
                  </span>
                  <h1>{t("modeTitle")}</h1>
                  <p>{t("modeDesc")}</p>
                </div>
                <div className="mode-list">
                  {modes.map((mode, i) => {
                    const Icon = modeIcons[mode];
                    return (
                      <button
                        key={mode}
                        disabled={mode === "battle" && game.players < 4}
                        aria-describedby={
                          mode === "battle" && game.players < 4
                            ? "battle-min"
                            : undefined
                        }
                        className={`mode-card ${mode} ${game.mode === mode ? "selected" : ""}`}
                        aria-pressed={game.mode === mode}
                        onClick={() => patch({ mode })}
                      >
                        <span className="mode-number">0{i + 1}</span>
                        <span className="mode-icon">
                          <Icon size={29} strokeWidth={1.2} />
                        </span>
                        <span className="mode-content">
                          <span className="eyebrow">{t(`${mode}Tag`)}</span>
                          <strong>{t(mode)}</strong>
                          <span>{modeDescription(mode)}</span>
                        </span>
                        <span className="selection-dot">
                          {game.mode === mode ? <Check size={12} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {game.players < 4 ? (
                  <p className="fine-print" id="battle-min">
                    {t("battleMin")}
                  </p>
                ) : null}
                {game.mode === "battle" ? (
                  <details className="team-settings">
                    <summary>
                      {t("teamSettings")}
                      <ChevronDown size={16} />
                    </summary>
                    <p>{t("teamsDesc")}</p>
                    {teamFields}
                  </details>
                ) : null}
                <div className="summary-chips">
                  <span>{t(game.company)}</span>
                  <span>
                    {game.players} {t("peopleShort")}
                  </span>
                  <span>
                    {game.minutes} {t("minutesShort")}
                  </span>
                </div>
                {error ? <p role="alert">{t("noQuests")}</p> : null}
                <div className="action-zone">
                  <button className="button primary full" onClick={start}>
                    {t("begin")}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}
            {screen === "teams" ? (
              <>
                <div className="screen-heading">
                  <h1>{t("teamsTitle")}</h1>
                  <p>{t("teamsDesc")}</p>
                </div>
                {teamFields}
                <button
                  className="button primary full"
                  onClick={() =>
                    patch({
                      screen: "quest",
                      teams: [game.teams[0].trim(), game.teams[1].trim()],
                    })
                  }
                >
                  {t("begin")}
                  <ArrowRight size={18} />
                </button>
              </>
            ) : null}
            {screen === "quest" && current ? (
              <>
                <div className={`quest-card ${game.mode}`}>
                  <div className="quest-top">
                    <span className="mode-label">{t(game.mode)}</span>
                    <span>
                      <Clock3 size={14} />
                      {roundSeconds(game)} {t("secondsShort")}
                    </span>
                  </div>
                  <span className="quest-title">{current.title[locale]}</span>
                  <h1>{current.prompt[locale]}</h1>
                  <p className="quest-instruction">
                    {current.instruction[locale]}
                  </p>
                  <div className="quest-foot">
                    <span className="tiny-star">✧</span>
                    {t("instruction")}
                  </div>
                </div>
                {game.mode === "battle" ? scoreBoard : null}
                <div className="action-zone">
                  <button className="button primary full" onClick={beginTimer}>
                    {t("go")}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}
            {screen === "timer" ? (
              <div className="timer-screen">
                <span
                  className={`phone-symbol ${left > 0 && game.deadline !== null ? "breathing" : ""}`}
                >
                  <Smartphone size={29} strokeWidth={1.2} />
                </span>
                <h1>{t(left === 0 ? "timeUp" : "phoneDown")}</h1>
                <p>{t(left === 0 ? "timeUpDesc" : "timerDesc")}</p>
                <div
                  className="timer-ring"
                  style={
                    {
                      "--progress": `${(left / roundSeconds(game)) * 100}%`,
                    } as CSSProperties
                  }
                >
                  <div>
                    <span
                      className="timer-digits"
                      role="timer"
                      aria-label={`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
                    >
                      {Math.floor(left / 60)}:
                      {String(left % 60).padStart(2, "0")}
                    </span>
                    <span>
                      {t(
                        game.deadline === null && left > 0
                          ? "paused"
                          : "timerCaption",
                      )}
                    </span>
                  </div>
                </div>
                <div className="sr-only" role="status">
                  {left === 0 ? t("timeUp") : ""}
                </div>
                <div className="timer-actions">
                  {left > 0 ? (
                    <button
                      className="text-button pause-button"
                      onClick={pauseTimer}
                    >
                      {game.deadline === null ? (
                        <Play size={15} />
                      ) : (
                        <Pause size={15} />
                      )}{" "}
                      {t(game.deadline === null ? "continue" : "pause")}
                    </button>
                  ) : null}
                  <button
                    className={`button ${left === 0 ? "primary" : "secondary"}`}
                    onClick={finishRound}
                  >
                    {t(
                      left > 0
                        ? "done"
                        : game.mode === "battle"
                          ? "scoreTitle"
                          : game.round + 1 === game.questIds.length
                            ? "finish"
                            : "nextRound",
                    )}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            ) : null}
            {screen === "score" ? (
              <>
                <div className="screen-heading centered-heading">
                  <span className="eyebrow">TEAM BATTLE</span>
                  <h1>{t("scoreTitle")}</h1>
                  <p>{t("scoreDesc")}</p>
                </div>
                {scoreBoard}
                <div className="score-actions">
                  {([0, 1] as const).map((i) => (
                    <button
                      key={i}
                      className={`button secondary team-${i}`}
                      onClick={() => setGame((g) => advance(g, i))}
                    >
                      <span>{team(i)}</span>
                      <span>+1</span>
                    </button>
                  ))}
                </div>
                <button
                  className="text-button centered"
                  onClick={() => setGame((g) => advance(g, "draw"))}
                >
                  {t("draw")}
                </button>
              </>
            ) : null}
            {screen === "result" ? (
              <>
                <div className={`memory-card ${game.mode}`}>
                  <div className="memory-top">
                    <span>TABLEQUEST</span>
                    <span className="mode-label">{t(game.mode)}</span>
                  </div>
                  <div className="memory-seal">
                    <Wine size={25} strokeWidth={1.2} />
                  </div>
                  <div className="screen-heading result-heading">
                    <span className="eyebrow">{t("resultTag")}</span>
                    <h1>
                      {game.mode === "battle"
                        ? game.scores[0] === game.scores[1]
                          ? t("tied")
                          : t("winner", {
                              team: team(
                                game.scores[0] > game.scores[1] ? 0 : 1,
                              ),
                            })
                        : t(game.mode === "fun" ? "crewFun" : "crewConnect")}
                    </h1>
                    <p>{t("resultTitle")}</p>
                  </div>
                  {game.mode === "battle" ? scoreBoard : null}
                  <div className="stats">
                    <div>
                      <strong>{game.questIds.length}</strong>
                      <span>{t("completed")}</span>
                    </div>
                    <div>
                      <strong>
                        {Math.max(
                          1,
                          Math.round(
                            ((game.finishedAt ?? Date.now()) -
                              (game.startedAt ?? Date.now())) /
                              60000,
                          ),
                        )}
                      </strong>
                      <span>{t("together")}</span>
                    </div>
                    <div>
                      <strong>{game.players}</strong>
                      <span>{t("peopleShort")}</span>
                    </div>
                  </div>
                  <div className="memory-signoff">
                    <span className="tiny-star">✧</span>
                    {t("endCaption")}
                  </div>
                </div>
                <details className="recap-details">
                  <summary>
                    {t("recap")}
                    <ChevronDown size={17} />
                  </summary>
                  <ul className="recap-list">
                    {game.questIds.map((id) => (
                      <li key={id}>
                        <CheckCircle2 size={16} />
                        {quests.find((q) => q.id === id)?.title[locale]}
                      </li>
                    ))}
                  </ul>
                </details>
                <div className="reward-card">
                  <Trophy size={23} strokeWidth={1.3} />
                  <div>
                    <h2>{t("reward")}</h2>
                    <p>{t("rewardDesc")}</p>
                    <small>{t("rewardNote")}</small>
                  </div>
                </div>
                <div className="result-actions">
                  <button className="button primary full" onClick={start}>
                    {t("again")}
                    <RotateCcw size={17} />
                  </button>
                  <button
                    className="button secondary full"
                    onClick={differentMode}
                  >
                    {t("otherMode")}
                    <ArrowRight size={17} />
                  </button>
                  <button
                    className="text-button centered"
                    onClick={() => patch({ screen: "feedback" })}
                  >
                    {t("finishExperience")}
                  </button>
                </div>
              </>
            ) : null}
            {screen === "feedback" ? (
              <>
                <div className="screen-heading centered-heading">
                  <span className="memory-seal">
                    <Heart size={25} strokeWidth={1.2} />
                  </span>
                  <h1>{t(submitted ? "thanks" : "feedbackTitle")}</h1>
                  <p>{t(submitted ? "tagline" : "feedbackDesc")}</p>
                </div>
                {submitted ? (
                  <button
                    className="button primary full"
                    onClick={() => setShowWelcome(true)}
                  >
                    {t("home")}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (rating === null || repeat === null) return;
                      const feedbackKey = isDemo
                        ? "tablequest.demo.feedback"
                        : "tablequest.feedback";
                      const previous = readStorage(feedbackKey);
                      const saved = saveStorage(feedbackKey, [
                        ...(Array.isArray(previous) ? previous.slice(-49) : []),
                        {
                          rating,
                          repeat,
                          locale,
                          mode: game.mode,
                          date: new Date().toISOString(),
                        },
                      ]);
                      if (saved) setSubmitted(true);
                      else setStorageOkay(false);
                    }}
                  >
                    <fieldset className="rating-fieldset">
                      <legend className="sr-only">{t("feedbackTitle")}</legend>
                      <div className="rating-options">
                        {(
                          ["ratingGood", "ratingOkay", "ratingBad"] as const
                        ).map((key, i) => (
                          <button
                            type="button"
                            key={key}
                            aria-pressed={rating === 2 - i}
                            className={rating === 2 - i ? "selected" : ""}
                            onClick={() => setRating(2 - i)}
                          >
                            {t(key)}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="repeat-fieldset">
                      <legend>{t("repeat")}</legend>
                      <div className="repeat-options">
                        {(["yes", "maybe", "no"] as const).map((key) => (
                          <button
                            type="button"
                            className={`button secondary ${repeat === key ? "selected" : ""}`}
                            key={key}
                            aria-pressed={repeat === key}
                            onClick={() => setRepeat(key)}
                          >
                            {t(key)}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <p className="fine-print">{t("localFeedback")}</p>
                    <button
                      className="button primary full"
                      disabled={rating === null || repeat === null}
                    >
                      {t("submit")}
                      <Check size={17} />
                    </button>
                  </form>
                )}
              </>
            ) : null}
          </section>
        )}
      </main>
      <footer>
        <span className="footer-star" aria-hidden="true">
          ✧
        </span>
        <span>{t("footer")}</span>
        <span className="footer-wordmark">TABLEQUEST</span>
      </footer>
      {menuOpen ? (
        <Modal
          title={t("menu")}
          close={() => setMenuOpen(false)}
          closeLabel={t("close")}
        >
          <h3 className="menu-heading">{t("aboutTitle")}</h3>
          <p>{t("aboutBody")}</p>
          <div className="menu-links">
            <button
              className="button secondary full"
              onClick={() => {
                setMenuOpen(false);
                setQrOpen(true);
              }}
            >
              <QrCode size={18} />
              {t("qr")}
              <ArrowRight size={16} />
            </button>
            <a
              className="text-button"
              href={`${import.meta.env.BASE_URL}?demo=true`}
            >
              {t("demoFun")}
            </a>
            <a
              className="text-button"
              href={`${import.meta.env.BASE_URL}?demo=true&mode=battle`}
            >
              {t("demoBattle")}
            </a>
          </div>
          {offlineReady ? (
            <p className="fine-print">{t("offlineReady")}</p>
          ) : null}
          {needRefresh ? (
            <button
              className="button secondary full"
              onClick={() => void updateServiceWorker(true)}
            >
              {t("updateButton")}
            </button>
          ) : null}
        </Modal>
      ) : null}
      {qrOpen ? <QRModal t={t} close={() => setQrOpen(false)} /> : null}
      {resetOpen ? (
        <Modal
          title={t("restartTitle")}
          close={() => setResetOpen(false)}
          closeLabel={t("close")}
        >
          <p>{t("restartDesc")}</p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setResetOpen(false)}
            >
              {t("cancel")}
            </button>
            <button className="button primary" onClick={fresh}>
              {t("confirm")}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
