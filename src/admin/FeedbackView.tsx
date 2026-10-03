import { useState } from "react";
import type { Locale } from "../types";
import { hospitalityCopy } from "../features/copy";
import { dictionaries } from "../i18n";
import {
  categories,
  readFeedback,
  feedbackSummary,
  feedbackCSV,
} from "../features/feedback/model";
export default function FeedbackView({ locale }: { locale: Locale }) {
  const [demo, setDemo] = useState(false);
  const c = hospitalityCopy[locale];
  const records = readFeedback(demo);
  const stats = feedbackSummary(records);
  function download() {
    const url = URL.createObjectURL(
      new Blob([feedbackCSV(records)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `tablequest-${demo ? "demo" : "guest"}-feedback.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="local-admin">
      <span className="eyebrow">DEMO</span>
      <h1>{c.admin}</h1>
      <p>{c.adminNote}</p>
      <a className="text-button" href={import.meta.env.BASE_URL}>
        {c.back}
      </a>
      <div className="admin-tabs">
        <button
          className="button secondary"
          aria-pressed={!demo}
          onClick={() => setDemo(false)}
        >
          {c.normal}
        </button>
        <button
          className="button secondary"
          aria-pressed={demo}
          onClick={() => setDemo(true)}
        >
          {c.demoData}
        </button>
      </div>
      <dl className="admin-stats">
        <div>
          <dt>{c.total}</dt>
          <dd>{stats.total}</dd>
        </div>
        <div>
          <dt>{c.average}</dt>
          <dd>{stats.average?.toFixed(1) ?? "—"}</dd>
        </div>
        <div>
          <dt>{c.rated}</dt>
          <dd>{stats.rated}</dd>
        </div>
      </dl>
      <ul className="category-counts">
        {categories.map((k) => (
          <li key={k}>
            {c[k]}: {stats.categories[k]}
          </li>
        ))}
      </ul>
      <button
        className="button secondary"
        disabled={!records.length}
        onClick={download}
      >
        {c.export}
      </button>
      {!records.length && <p>{c.empty}</p>}
      <div className="feedback-records">
        {records
          .slice()
          .reverse()
          .map((r) => (
            <article key={r.id} className="hospitality-card">
              <time dateTime={r.date}>
                {new Date(r.date).toLocaleString(locale)}
              </time>
              <dl>
                <div>
                  <dt>{c.table}</dt>
                  <dd>{r.tableId || c.unknown}</dd>
                </div>
                <div>
                  <dt>{c.venue}</dt>
                  <dd>{r.venue || c.unknown}</dd>
                </div>
                <div>
                  <dt>{c.language}</dt>
                  <dd>{r.locale.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>{c.mode}</dt>
                  <dd>
                    {r.mode === "battle"
                      ? "Team Battle"
                      : r.mode === "fun"
                        ? "Fun"
                        : "Connect"}
                  </dd>
                </div>
                <div>
                  <dt>
                    {r.metric === "connection-v1"
                      ? dictionaries[locale].feedbackTitle
                      : c.satisfaction}
                  </dt>
                  <dd>{[c.bad, c.okay, c.good][r.rating]}</dd>
                </div>
                <div>
                  <dt>{c.stars}</dt>
                  <dd>{r.stars ?? "—"}</dd>
                </div>
              </dl>
              {r.category && <p>{c[r.category]}</p>}
              {r.comment && <p className="saved-comment">{r.comment}</p>}
            </article>
          ))}
      </div>
    </section>
  );
}
