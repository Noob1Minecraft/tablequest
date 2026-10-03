import { useRef, useState } from "react";
import type { Game, Locale } from "../../types";
import { readStorage, saveStorage } from "../../game";
import { MockPosAdapter } from "../../integrations/pos/MockPosAdapter";
import { hospitalityCopy } from "../copy";
import { restaurant } from "../../config/restaurant";

export function momentOffer(game: Game) {
  return game.company === "couple"
    ? "coffee"
    : game.mode === "battle"
      ? "mocktail"
      : "dessert";
}
export function eligibleMoment(game: Game, enabled: boolean) {
  return (
    enabled &&
    game.screen === "result" &&
    game.questIds.length >= 3 &&
    game.finishedAt !== null
  );
}
export function RestaurantMoment({
  game,
  locale,
  tableId,
  venue,
  demo,
}: {
  game: Game;
  locale: Locale;
  tableId: string;
  venue: string;
  demo: boolean;
}) {
  const c = hospitalityCopy[locale];
  const key = demo ? "tablequest.demo.moments" : "tablequest.moments";
  const sessionId = `${game.startedAt}:${game.mode}`;
  const [claimed, setClaimed] = useState(() => {
    const stored = readStorage(key);
    return Array.isArray(stored) && stored.includes(sessionId);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const lock = useRef(false);
  async function request() {
    if (lock.current || claimed) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      await new MockPosAdapter().sendOrder({
        sessionId,
        tableId,
        venue,
        offer: momentOffer(game),
      });
      const old = readStorage(key);
      const ids = Array.isArray(old)
        ? old.filter((v): v is string => typeof v === "string").slice(-49)
        : [];
      if (!saveStorage(key, [...new Set([...ids, sessionId])]))
        throw new Error("Storage unavailable");
      setClaimed(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <aside
      className="hospitality-card restaurant-moment"
      aria-label={restaurant.restaurantMomentTitle[locale]}
    >
      <span className="eyebrow">{c.demo}</span>
      {restaurant.logo && (
        <img
          className="restaurant-logo"
          src={`${import.meta.env.BASE_URL}${restaurant.logo}`}
          alt=""
        />
      )}
      <p className="fine-print">{restaurant.restaurantName}</p>
      <h2>{restaurant.restaurantMomentTitle[locale]}</h2>
      <h3>{restaurant.rewardName[locale]}</h3>
      <p>{restaurant.restaurantMomentText[locale]}</p>
      {claimed ? (
        <p role="status">{c.receipt} · DEMO-1024</p>
      ) : (
        <button className="button secondary" disabled={busy} onClick={request}>
          {busy ? c.pending : c.request}
        </button>
      )}
      <p className="fine-print">{c.notSent}</p>
      {error && <p role="alert">{c.failed}</p>}
    </aside>
  );
}
