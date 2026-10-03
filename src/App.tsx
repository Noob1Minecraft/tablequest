import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coffee,
  Heart,
  Laugh,
  MessageCircle,
  Minus,
  Pause,
  Play,
  Plus,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Swords,
  Trophy,
  Users,
  WifiOff,
  X,
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
  selectQuests,
} from "./game";
import { Modal, QRModal } from "./components/Modal";

const companyIcons = { friends: "👋", couple: "💛", family: "🏡", party: "🎉" };
const modeIcons = { connect: MessageCircle, fun: Laugh, battle: Swords };
const companies: Company[] = ["friends", "couple", "family", "party"];
const modes: Mode[] = ["connect", "fun", "battle"];
const resumeGame = () => restoreGame(readStorage("tablequest.game"));

export default function App() {
  const [locale, setLocale] = useState<Locale>(() =>
    detectLocale(readStorage("tablequest.language"), navigator.languages),
  );
  const [game, setGame] = useState<Game>(resumeGame);
  const [showWelcome, setShowWelcome] = useState(true);
  const [storageOkay, setStorageOkay] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [qrOpen, setQrOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [rating, setRating] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<"yes" | "maybe" | "no" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const main = useRef<HTMLElement>(null);
  const t = (key: Key, params?: Record<string, string | number>) =>
    translate(locale, key, params);
  const screen = showWelcome ? "welcome" : game.screen;
  const active =
    game.questIds.length > 0 &&
    !["result", "feedback", "welcome"].includes(game.screen);
  const current = quests.find((q) => q.id === game.questIds[game.round]);
  const left = secondsLeft(game, now);
  const team = (index: 0 | 1) =>
    game.teams[index] || t(index === 0 ? "teamA" : "teamB");
  const tableNumber = new URLSearchParams(location.search)
    .get("table")
    ?.replace(/[^\p{L}\p{N} -]/gu, "")
    .slice(0, 20);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    document.documentElement.lang = locale;
    if (!saveStorage("tablequest.language", locale)) setStorageOkay(false);
  }, [locale]);
  useEffect(() => {
    if (!saveStorage("tablequest.game", game)) setStorageOkay(false);
  }, [game]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
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
  function fresh() {
    setGame({ ...initialGame(), screen: "context" });
    setShowWelcome(false);
    setResetOpen(false);
    setSubmitted(false);
    setRating(null);
    setRepeat(null);
    setError(false);
  }
  function start() {
    try {
      const ids = selectQuests(
        game.company,
        game.mode,
        game.players,
        game.minutes,
      );
      patch({
        questIds: ids,
        round: 0,
        scores: [0, 0],
        screen: game.mode === "battle" ? "teams" : "quest",
        remaining: roundSeconds(game),
        deadline: null,
        startedAt: Date.now(),
        finishedAt: null,
      });
      setError(false);
    } catch {
      setError(true);
    }
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
  const headerBack = () => {
    if (screen === "context") setShowWelcome(true);
    else if (screen === "mode") patch({ screen: "context" });
    else if (screen === "teams") patch({ screen: "mode" });
    else setResetOpen(true);
  };
  const scoreBoard = (
    <div className="score-board">
      <div>
        <span>{team(0)}</span>
        <strong>{game.scores[0]}</strong>
      </div>
      <span className="score-divider">:</span>
      <div>
        <span>{team(1)}</span>
        <strong>{game.scores[1]}</strong>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
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
      </header>
      {!storageOkay ? (
        <div className="notice" role="status">
          {t("storageWarning")}
        </div>
      ) : null}
      {!online ? (
        <div className="notice" role="status">
          <WifiOff size={16} />
          {t("offline")}
        </div>
      ) : null}
      <main id="main" ref={main} tabIndex={-1}>
        {screen === "welcome" ? (
          <>
            <section className="welcome">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="live-dot" />
                  {tableNumber
                    ? t("table", { number: tableNumber })
                    : t("label")}
                </div>
                <h1>{t("hero")}</h1>
                <p className="hero-description">{t("intro")}</p>
                <div className="hero-actions">
                  <button
                    className="button primary"
                    onClick={active ? () => setShowWelcome(false) : fresh}
                  >
                    {t(active ? "resume" : "start")}
                    <ArrowRight size={20} />
                  </button>
                  {active ? (
                    <button
                      className="text-button"
                      onClick={() => setResetOpen(true)}
                    >
                      {t("fresh")}
                    </button>
                  ) : null}
                </div>
                <div className="hero-meta">
                  <span>
                    <Clock3 size={16} />
                    5–10 {t("minutesShort")}
                  </span>
                  <span>
                    <Users size={16} />
                    2–8 {t("peopleShort")}
                  </span>
                </div>
              </div>
              <div className="table-scene" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <div className="scene-spark">✳</div>
                <div className="floating-tag">
                  <span>✦</span> {t("onePhone")}
                </div>
                <div className="menu-card">
                  <div className="menu-top">
                    <span>TABLEQUEST</span>
                    <span>01 / ∞</span>
                  </div>
                  <div className="menu-label">{t("cardTag")}</div>
                  <div className="menu-title">{t("cardTitle")}</div>
                  <div className="plate">
                    <div className="plate-inner">
                      <span className="face-eye left" />
                      <span className="face-eye right" />
                      <span className="face-smile" />
                    </div>
                  </div>
                  <div className="menu-bottom">
                    {t("cardNote")}
                    <Sparkles size={20} />
                  </div>
                </div>
                <div className="small-card">
                  <Heart size={25} />
                  <span>{t("tagline")}</span>
                </div>
                <div className="scene-leaf">✳</div>
              </div>
            </section>
            <section className="how-section">
              <div className="section-label">
                {t("how")}
                <span>01 — 03</span>
              </div>
              <div className="how-grid">
                {(
                  [
                    ["how1", "how1desc", MessageCircle],
                    ["how2", "how2desc", Sparkles],
                    ["how3", "how3desc", Smartphone],
                  ] as const
                ).map(([title, desc, Icon], i) => (
                  <div className="how-item" key={title}>
                    <span className={`how-icon tone-${i}`}>
                      <Icon size={23} />
                    </span>
                    <div>
                      <h3>{t(title)}</h3>
                      <p>{t(desc)}</p>
                    </div>
                    <span className="how-number">0{i + 1}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section
            className={`game-area ${screen === "timer" ? "timer-area" : ""}`}
          >
            <div className="game-top">
              <button className="text-button" onClick={headerBack}>
                <ArrowLeft size={17} />
                {t(
                  ["context", "mode", "teams"].includes(screen)
                    ? "back"
                    : "fresh",
                )}
              </button>
              <span>
                {["context", "mode", "teams"].includes(screen)
                  ? `${t("step")} ${screen === "context" ? "01" : "02"} / 02`
                  : t("round", {
                      current: game.round + 1,
                      total: game.questIds.length,
                    })}
              </span>
            </div>
            {["context", "mode", "teams"].includes(screen) ? (
              <div className="step-track">
                <span className="filled" />
                <span className={screen !== "context" ? "filled" : ""} />
              </div>
            ) : (
              <div className="round-track">
                {game.questIds.map((id, i) => (
                  <span key={id} className={i <= game.round ? "filled" : ""} />
                ))}
              </div>
            )}
            {screen === "context" ? (
              <>
                <div className="screen-heading">
                  <span className="eyebrow">01 / TABLEQUEST</span>
                  <h1>{t("contextTitle")}</h1>
                  <p>{t("contextDesc")}</p>
                </div>
                <div className="company-grid">
                  {companies.map((c) => (
                    <button
                      key={c}
                      className={`company-card ${game.company === c ? "selected" : ""}`}
                      aria-pressed={game.company === c}
                      onClick={() =>
                        patch({
                          company: c,
                          players: c === "couple" ? 2 : game.players,
                        })
                      }
                    >
                      <span className="company-emoji" aria-hidden="true">
                        {companyIcons[c]}
                      </span>
                      <span>{t(c)}</span>
                      <span className="selection-dot">
                        {game.company === c ? <Check size={13} /> : null}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="setup-row">
                  <div>
                    <h3>{t("players")}</h3>
                    <span className="muted">2–8 {t("peopleShort")}</span>
                  </div>
                  <div className="stepper">
                    <button
                      aria-label={t("fewer")}
                      disabled={game.players <= 2}
                      onClick={() => patch({ players: game.players - 1 })}
                    >
                      <Minus size={18} />
                    </button>
                    <output>{game.players}</output>
                    <button
                      aria-label={t("more")}
                      disabled={game.players >= 8}
                      onClick={() => patch({ players: game.players + 1 })}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
                <div className="setup-row">
                  <h3>{t("time")}</h3>
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
                <p className="fine-print">{t("timeNote")}</p>
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
                  <ArrowRight size={19} />
                </button>
              </>
            ) : null}
            {screen === "mode" ? (
              <>
                <div className="screen-heading">
                  <span className="eyebrow">02 / TABLEQUEST</span>
                  <h1>{t("modeTitle")}</h1>
                  <p>{t("modeDesc")}</p>
                </div>
                <div className="mode-list">
                  {modes.map((mode) => {
                    const Icon = modeIcons[mode];
                    return (
                      <button
                        key={mode}
                        disabled={mode === "battle" && game.players < 4}
                        className={`mode-card ${mode} ${game.mode === mode ? "selected" : ""}`}
                        aria-pressed={game.mode === mode}
                        onClick={() => patch({ mode })}
                      >
                        <span className="mode-icon">
                          <Icon size={28} />
                        </span>
                        <span className="mode-content">
                          <span className="eyebrow">{t(`${mode}Tag`)}</span>
                          <strong>{t(mode)}</strong>
                          <span>{t(`${mode}Desc`)}</span>
                        </span>
                        <span className="selection-dot">
                          {game.mode === mode ? <Check size={14} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {game.players < 4 ? (
                  <p className="fine-print">{t("battleMin")}</p>
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
                <button className="button primary full" onClick={start}>
                  {t("begin")}
                  <Sparkles size={18} />
                </button>
              </>
            ) : null}
            {screen === "teams" ? (
              <>
                <div className="screen-heading">
                  <span className="big-symbol lavender">
                    <Swords />
                  </span>
                  <h1>{t("teamsTitle")}</h1>
                  <p>{t("teamsDesc")}</p>
                </div>
                <div className="teams-grid">
                  {([0, 1] as const).map((i) => (
                    <label className="team-field field" key={i}>
                      <strong>{t(i === 0 ? "teamA" : "teamB")}</strong>
                      <input
                        aria-label={`${t("teamName")} ${i === 0 ? "A" : "B"}`}
                        value={game.teams[i]}
                        placeholder={t(i === 0 ? "teamA" : "teamB")}
                        maxLength={24}
                        onChange={(e) => {
                          const names: [string, string] = [...game.teams];
                          names[i] = e.target.value;
                          patch({ teams: names });
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
                  <ArrowRight size={19} />
                </button>
              </>
            ) : null}
            {screen === "quest" && current ? (
              <>
                <div className={`quest-card ${game.mode}`}>
                  <div className="quest-top">
                    <span>{t(game.mode)}</span>
                    <span>
                      <Clock3 size={16} />
                      {roundSeconds(game)} {t("secondsShort")}
                    </span>
                  </div>
                  <span className="quest-spark" aria-hidden="true">
                    ✦
                  </span>
                  <h1>{current.title[locale]}</h1>
                  <p>{current.text[locale]}</p>
                  <div className="quest-foot">
                    <MessageCircle size={17} />
                    {t("instruction")}
                  </div>
                </div>
                {game.mode === "battle" ? scoreBoard : null}
                <button className="button primary full" onClick={beginTimer}>
                  {t("go")}
                  <ArrowRight size={19} />
                </button>
              </>
            ) : null}
            {screen === "timer" ? (
              <div className="timer-screen">
                <span className="phone-symbol">
                  <Smartphone size={30} />
                </span>
                <h1>{t(left === 0 ? "timeUp" : "phoneDown")}</h1>
                <p>{t(left === 0 ? "timeUpDesc" : "timerDesc")}</p>
                <div
                  className="timer-ring"
                  style={
                    {
                      "--progress": `${(left / roundSeconds(game)) * 100}%`,
                    } as React.CSSProperties
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
                        left === 0
                          ? "timeUp"
                          : game.deadline === null
                            ? "paused"
                            : "together",
                      )}
                    </span>
                  </div>
                </div>
                <div className="sr-only" role="status">
                  {left === 0 ? t("timeUp") : ""}
                </div>
                <div className="timer-actions">
                  {left > 0 ? (
                    <button className="button secondary" onClick={pauseTimer}>
                      {game.deadline === null ? (
                        <Play size={18} />
                      ) : (
                        <Pause size={18} />
                      )}
                      {t(game.deadline === null ? "continue" : "pause")}
                    </button>
                  ) : null}
                  <button className="button primary" onClick={finishRound}>
                    {t(
                      left > 0
                        ? "done"
                        : game.mode === "battle"
                          ? "scoreTitle"
                          : game.round + 1 === game.questIds.length
                            ? "finish"
                            : "nextRound",
                    )}
                    <Check size={18} />
                  </button>
                </div>
              </div>
            ) : null}
            {screen === "score" ? (
              <>
                <div className="screen-heading">
                  <span className="big-symbol peach">
                    <Trophy />
                  </span>
                  <h1>{t("scoreTitle")}</h1>
                  <p>{t("scoreDesc")}</p>
                </div>
                {scoreBoard}
                <div className="score-actions">
                  {([0, 1] as const).map((i) => (
                    <button
                      className="button secondary"
                      key={i}
                      onClick={() => setGame((g) => advance(g, i))}
                    >
                      {team(i)}
                      <Plus size={16} />1
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
                <div className="screen-heading result-heading">
                  <span className="big-symbol peach">
                    <Trophy size={32} />
                  </span>
                  <span className="eyebrow">{t("resultTag")}</span>
                  <h1>
                    {game.mode === "battle"
                      ? game.scores[0] === game.scores[1]
                        ? t("tied")
                        : t("winner", {
                            team: team(game.scores[0] > game.scores[1] ? 0 : 1),
                          })
                      : t("resultTitle")}
                  </h1>
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
                <h3 className="recap-title">{t("recap")}</h3>
                <ul className="recap-list">
                  {game.questIds.map((id) => (
                    <li key={id}>
                      <CheckCircle2 size={18} />
                      {quests.find((q) => q.id === id)?.title[locale]}
                    </li>
                  ))}
                </ul>
                <div className="reward-card">
                  <Sparkles size={28} />
                  <div>
                    <h3>{t("reward")}</h3>
                    <p>{t("rewardDesc")}</p>
                    <small>{t("rewardNote")}</small>
                  </div>
                </div>
                <button className="button primary full" onClick={fresh}>
                  {t("again")}
                  <ArrowRight size={19} />
                </button>
                <button
                  className="text-button centered"
                  onClick={() => patch({ screen: "feedback" })}
                >
                  {t("feedback")}
                </button>
              </>
            ) : null}
            {screen === "feedback" ? (
              <>
                <div className="screen-heading">
                  <span className="big-symbol peach">
                    <Heart />
                  </span>
                  <h1>{t(submitted ? "thanks" : "feedbackTitle")}</h1>
                  <p>{t(submitted ? "localFeedback" : "feedbackDesc")}</p>
                </div>
                {submitted ? (
                  <button
                    className="button primary full"
                    onClick={() => setShowWelcome(true)}
                  >
                    {t("home")}
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (rating === null || repeat === null) return;
                      const previous = readStorage("tablequest.feedback");
                      const saved = saveStorage("tablequest.feedback", [
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
                    <div className="rating-options">
                      {(["ratingBad", "ratingOkay", "ratingGood"] as const).map(
                        (key, i) => (
                          <button
                            className={rating === i ? "selected" : ""}
                            key={key}
                            type="button"
                            aria-pressed={rating === i}
                            onClick={() => setRating(i)}
                          >
                            <span aria-hidden="true">
                              {["😕", "🙂", "🤩"][i]}
                            </span>
                            {t(key)}
                          </button>
                        ),
                      )}
                    </div>
                    <h3>{t("repeat")}</h3>
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
                    <p className="fine-print">{t("localFeedback")}</p>
                    <button
                      className="button primary full"
                      disabled={rating === null || repeat === null}
                    >
                      {t("submit")}
                      <Check size={18} />
                    </button>
                  </form>
                )}
              </>
            ) : null}
          </section>
        )}
      </main>
      <footer>
        <span>
          <Coffee size={17} />
          {t("footer")}
        </span>
        <div className="footer-features">
          <span>
            <ShieldCheck size={15} />
            {t("noLogin")}
          </span>
          <span>
            <CheckCircle2 size={15} />
            {t("offlineFeature")}
          </span>
        </div>
        <button className="text-button" onClick={() => setQrOpen(true)}>
          <QrCode size={17} />
          {t("qr")}
          <ChevronRight size={15} />
        </button>
      </footer>
      {offlineReady || needRefresh ? (
        <aside className="pwa-toast" role="status">
          <span>{t(needRefresh ? "update" : "offlineReady")}</span>
          {needRefresh ? (
            <button onClick={() => void updateServiceWorker(true)}>
              {t("updateButton")}
            </button>
          ) : null}
          <button
            className="icon-button"
            aria-label={t("later")}
            onClick={() => {
              setOfflineReady(false);
              setNeedRefresh(false);
            }}
          >
            <X size={18} />
          </button>
        </aside>
      ) : null}
      {qrOpen ? <QRModal t={t} close={() => setQrOpen(false)} /> : null}
      {resetOpen ? (
        <Modal
          title={t("restartTitle")}
          close={() => setResetOpen(false)}
          closeLabel={t("close")}
        >
          <p>{t("restartDesc")}</p>
          <div className="timer-actions">
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
