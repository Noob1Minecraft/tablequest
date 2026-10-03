import type { Locale } from "../../types";
import { categories } from "./model";
import type { Category } from "./model";
import { hospitalityCopy } from "../copy";
export interface Details {
  stars: number | null;
  category: Category | null;
  comment: string;
}
export const emptyDetails: Details = {
  stars: null,
  category: null,
  comment: "",
};
export function FeedbackDetails({
  locale,
  value,
  change,
}: {
  locale: Locale;
  value: Details;
  change: (v: Details) => void;
}) {
  const c = hospitalityCopy[locale];
  return (
    <details className="feedback-details">
      <summary>{c.improve}</summary>
      <p className="fine-print">{c.optional}</p>
      <fieldset>
        <legend>{c.stars}</legend>
        <div className="star-options">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="button secondary"
              aria-pressed={value.stars === n}
              onClick={() =>
                change({ ...value, stars: value.stars === n ? null : n })
              }
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="feedback-category">{c.category}</label>
        <select
          id="feedback-category"
          value={value.category ?? ""}
          onChange={(e) =>
            change({
              ...value,
              category: e.target.value ? (e.target.value as Category) : null,
            })
          }
        >
          <option value="">{c.none}</option>
          {categories.map((k) => (
            <option value={k} key={k}>
              {c[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="feedback-comment">{c.comment}</label>
        <textarea
          id="feedback-comment"
          maxLength={500}
          rows={3}
          value={value.comment}
          onChange={(e) => change({ ...value, comment: e.target.value })}
        />
      </div>
      <small>{value.comment.length}/500</small>
    </details>
  );
}
