import type { Locale, Mode, QuestContext } from "../../types";
import { readStorage, saveStorage } from "../../game";
import { postFeedback } from "../../integrations/feedback/webhook";
export const categories = [
  "content",
  "atmosphere",
  "usability",
  "restaurant",
] as const;
export type Category = (typeof categories)[number];
export interface FeedbackRecord {
  id: string;
  rating: number;
  answer: "yes" | "little" | "no" | null;
  metric: "connection-v1" | "legacy-evening";
  company: QuestContext | null;
  stars: number | null;
  category: Category | null;
  comment: string;
  repeat: "yes" | "maybe" | "no";
  locale: Locale;
  mode: Mode;
  date: string;
  tableId: string;
  venue: string;
}
export function feedbackKey(demo: boolean) {
  return demo ? "tablequest.demo.feedback" : "tablequest.feedback";
}
export function readFeedback(demo: boolean): FeedbackRecord[] {
  const value = readStorage(feedbackKey(demo));
  if (!Array.isArray(value)) return [];
  return value.slice(-50).flatMap((r, i) => {
    if (
      !r ||
      ![0, 1, 2].includes(r.rating) ||
      !["ru", "kk", "en"].includes(r.locale) ||
      !["connect", "fun", "battle"].includes(r.mode) ||
      typeof r.date !== "string" ||
      !Number.isFinite(Date.parse(r.date))
    )
      return [];
    return [
      {
        id: typeof r.id === "string" ? r.id : `legacy-${i}`,
        rating: r.rating,
        // Old evening-satisfaction responses must not become connection evidence.
        answer:
          r.metric === "connection-v1" &&
          ["yes", "little", "no"].includes(r.answer)
            ? r.answer
            : null,
        metric:
          r.metric === "connection-v1" ? "connection-v1" : "legacy-evening",
        company: ["friends", "couple", "family", "celebration"].includes(
          r.company,
        )
          ? r.company
          : null,
        stars:
          Number.isInteger(r.stars) && r.stars >= 1 && r.stars <= 5
            ? r.stars
            : null,
        category: categories.includes(r.category) ? r.category : null,
        comment: typeof r.comment === "string" ? r.comment.slice(0, 500) : "",
        repeat: ["yes", "maybe", "no"].includes(r.repeat) ? r.repeat : "maybe",
        locale: r.locale,
        mode: r.mode,
        date: r.date,
        tableId: typeof r.tableId === "string" ? r.tableId.slice(0, 20) : "",
        venue: typeof r.venue === "string" ? r.venue.slice(0, 40) : "",
      } as FeedbackRecord,
    ];
  });
}
export async function submitFeedback(
  record: FeedbackRecord,
  demo: boolean,
  endpoint: string | null,
  fetcher?: typeof fetch,
) {
  const previous = readFeedback(demo).filter((r) => r.id !== record.id);
  const localSaved = saveStorage(feedbackKey(demo), [
    ...previous.slice(-49),
    record,
  ]);
  if (!localSaved || demo || !endpoint)
    return { localSaved, delivery: "local" as const };
  const { date, locale, stars, rating, ...rest } = record;
  const delivery = await postFeedback(
    endpoint,
    {
      ...rest,
      timestamp: date,
      language: locale,
      rating: stars,
      satisfaction: rating,
    },
    fetcher,
  );
  return { localSaved, delivery };
}
export function feedbackSummary(records: FeedbackRecord[]) {
  const rated = records.filter((r) => r.stars !== null);
  return {
    total: records.length,
    rated: rated.length,
    average: rated.length
      ? rated.reduce((sum, r) => sum + r.stars!, 0) / rated.length
      : null,
    categories: Object.fromEntries(
      categories.map((c) => [
        c,
        records.filter((r) => r.category === c).length,
      ]),
    ),
  };
}
export function feedbackCSV(records: FeedbackRecord[]) {
  // Quote every cell and neutralize spreadsheet formulas in untrusted comments.
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return `"${(/^[\s]*[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`;
  };
  const columns = [
    "date",
    "tableId",
    "venue",
    "locale",
    "mode",
    "company",
    "metric",
    "answer",
    "repeat",
    "rating",
    "stars",
    "category",
    "comment",
  ] as const;
  return (
    "\uFEFF" +
    [
      columns.join(","),
      ...records.map((r) => columns.map((k) => cell(r[k])).join(",")),
    ].join("\r\n")
  );
}
