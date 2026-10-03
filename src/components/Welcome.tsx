import { ArrowRight, Clock3, Users } from "lucide-react";
import type { T } from "./Modal";
export function Welcome({
  t,
  table,
  active,
  start,
  fresh,
}: {
  t: T;
  table?: string;
  active: boolean;
  start: () => void;
  fresh: () => void;
}) {
  return (
    <section className="welcome">
      <picture className="welcome-picture">
        <source
          media="(max-width: 600px)"
          srcSet={`${import.meta.env.BASE_URL}dining-evening-small.webp`}
        />
        <img
          src={`${import.meta.env.BASE_URL}dining-evening.webp`}
          alt=""
          width="1440"
          height="960"
          fetchPriority="high"
        />
      </picture>
      <div className="welcome-shade" />
      <div className="welcome-inner">
        <div className="eyebrow welcome-label">
          <span className="tiny-star">✧</span>
          <span>{table ? t("table", { number: table }) : t("label")}</span>
        </div>
        <h1>
          <span>{t("heroLead")}</span>
          <em>{t("hero")}</em>
        </h1>
        <p className="hero-description">{t("intro")}</p>
        <div className="hero-actions">
          <button className="button primary" onClick={start}>
            {t(active ? "resume" : "start")}
            <ArrowRight size={19} />
          </button>
          {active ? (
            <button className="text-button" onClick={fresh}>
              {t("fresh")}
            </button>
          ) : null}
        </div>
        <div className="hero-meta">
          <span>
            <Clock3 size={15} />
            5–10 {t("minutesShort")}
          </span>
          <span>
            <Users size={15} />
            2–8 {t("peopleShort")}
          </span>
        </div>
      </div>
      <div className="welcome-signature" aria-hidden="true">
        <span>TABLEQUEST</span>
        <span>✧</span>
        <span>{t("onePhone")}</span>
      </div>
    </section>
  );
}
