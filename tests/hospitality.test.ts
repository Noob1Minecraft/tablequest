import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  feedbackCSV,
  feedbackSummary,
  readFeedback,
  submitFeedback,
} from "../src/features/feedback/model";
import type { FeedbackRecord } from "../src/features/feedback/model";
import { postFeedback, webhookURL } from "../src/integrations/feedback/webhook";
import { MockPosAdapter } from "../src/integrations/pos/MockPosAdapter";
import {
  eligibleMoment,
  momentOffer,
} from "../src/features/restaurantMoment/RestaurantMoment";
import { demoSession } from "../src/session";
import { hospitalityCopy } from "../src/features/copy";
const record: FeedbackRecord = {
  id: "test",
  rating: 2,
  answer: "yes",
  metric: "connection-v1",
  company: "friends",
  stars: 4,
  category: "content",
  comment: "A warm evening",
  repeat: "yes",
  locale: "en",
  mode: "fun",
  date: "2026-10-03T12:00:00Z",
  tableId: "12",
  venue: "demo",
};
let memory: Map<string, string>;
beforeEach(() => {
  memory = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("feedback storage and delivery", () => {
  it("saves locally with no network by default", async () => {
    const fetcher = vi.fn();
    const r = await submitFeedback(record, false, null, fetcher);
    expect(r).toEqual({ localSaved: true, delivery: "local" });
    expect(readFeedback(false)).toEqual([record]);
    expect(feedbackCSV(readFeedback(false))).toContain(
      "company,metric,answer,repeat",
    );
    expect(feedbackCSV(readFeedback(false))).toContain(
      '"friends","connection-v1","yes","yes"',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("retains local copy when webhook rejects request", async () => {
    const r = await submitFeedback(
      record,
      false,
      "https://example.com/feedback",
      vi.fn().mockResolvedValue({ ok: false }),
    );
    expect(r.delivery).toBe("failed");
    expect(readFeedback(false)).toHaveLength(1);
  });
  it("retains local copy on offline or CORS failure", async () => {
    expect(
      (
        await submitFeedback(
          record,
          false,
          "https://example.com/feedback",
          vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
        )
      ).delivery,
    ).toBe("failed");
    expect(readFeedback(false)[0].comment).toBe(record.comment);
  });
  it("sends JSON with explicit rating and context, without credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    expect(
      (
        await submitFeedback(
          record,
          false,
          "https://example.com/feedback",
          fetcher,
        )
      ).delivery,
    ).toBe("sent");
    const options = fetcher.mock.calls[0][1];
    expect(options.credentials).toBe("omit");
    expect(JSON.parse(options.body)).toMatchObject({
      timestamp: record.date,
      language: "en",
      rating: 4,
      satisfaction: 2,
      tableId: "12",
      venue: "demo",
    });
  });
  it("isolates demo and never sends it to webhook", async () => {
    const f = vi.fn();
    await submitFeedback(record, true, "https://example.com/feedback", f);
    expect(f).not.toHaveBeenCalled();
    expect(readFeedback(false)).toEqual([]);
    expect(readFeedback(true)).toHaveLength(1);
  });
  it("reports blocked storage and avoids remote-only surprises", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw Error("Quota");
      },
    });
    const f = vi.fn();
    expect(
      (await submitFeedback(record, false, "https://example.com/feedback", f))
        .localSaved,
    ).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("caps records at 50 and replaces the same session", async () => {
    for (let i = 0; i < 55; i++)
      await submitFeedback({ ...record, id: String(i) }, false, null);
    await submitFeedback({ ...record, id: "54", stars: 5 }, false, null);
    expect(readFeedback(false)).toHaveLength(50);
    expect(readFeedback(false).at(-1)?.stars).toBe(5);
  });
  it("reads legacy answers without manufacturing a five-star rating", () => {
    memory.set(
      "tablequest.feedback",
      JSON.stringify([
        {
          rating: 2,
          repeat: "yes",
          locale: "ru",
          mode: "connect",
          date: record.date,
        },
        { rating: 8 },
      ]),
    );
    const rows = readFeedback(false);
    expect(rows).toHaveLength(1);
    expect(rows[0].answer).toBe(null);
    expect(rows[0].metric).toBe("legacy-evening");
    expect(feedbackSummary(rows).average).toBe(null);
  });
  it("ignores corrupted storage", () => {
    memory.set("tablequest.feedback", "{");
    expect(readFeedback(false)).toEqual([]);
  });
  it("exports multiline comments safely for spreadsheets", () => {
    const csv = feedbackCSV([{ ...record, comment: '=SUM(1,2)\n"test"' }]);
    expect(csv).toContain('"\'=SUM(1,2)\n""test"""');
  });
  it("counts categories and averages explicit ratings only", () => {
    expect(
      feedbackSummary([
        record,
        { ...record, id: "2", stars: null, category: null },
      ]),
    ).toMatchObject({
      total: 2,
      rated: 1,
      average: 4,
      categories: { content: 1 },
    });
  });
  it("accepts only HTTPS endpoints without URL credentials", () => {
    expect(webhookURL("")).toBe(null);
    expect(webhookURL("http://example.com")).toBe(null);
    expect(webhookURL("https://user:secret@example.com")).toBe(null);
    expect(webhookURL("https://example.com/hook")).toBe(
      "https://example.com/hook",
    );
  });
  it("bounds slow webhook requests", async () => {
    vi.useFakeTimers();
    const f = vi.fn(
      (_url, opts) =>
        new Promise<Response>((_resolve, reject) =>
          opts.signal.addEventListener("abort", () => reject(Error("aborted"))),
        ),
    );
    const pending = postFeedback(
      "https://example.com/hook",
      record,
      f as typeof fetch,
    );
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toBe("failed");
  });
});
describe("hospitality prototype", () => {
  it("uses a deterministic mock with no network call", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const adapter = new MockPosAdapter();
    expect(
      await adapter.sendOrder({
        sessionId: "demo",
        tableId: "12",
        venue: "demo",
        offer: "dessert",
      }),
    ).toEqual({
      success: true,
      orderId: "DEMO-1024",
      provider: "Mock POS",
      demo: true,
    });
    expect(f).not.toHaveBeenCalled();
  });
  it("does not offer moments before recap or without opt-in", () => {
    const g = demoSession();
    expect(eligibleMoment(g, true)).toBe(false);
    const done = { ...g, screen: "result" as const, finishedAt: Date.now() };
    expect(eligibleMoment(done, false)).toBe(false);
    expect(eligibleMoment(done, true)).toBe(true);
  });
  it("selects a contextual offer", () => {
    const g = demoSession();
    expect(momentOffer(g)).toBe("dessert");
    expect(momentOffer({ ...g, company: "couple" })).toBe("coffee");
    expect(momentOffer({ ...g, mode: "battle" })).toBe("mocktail");
  });
  it("has full translations for all new UI", () => {
    for (const l of ["ru", "kk", "en"] as const) {
      expect(Object.keys(hospitalityCopy[l]).sort()).toEqual(
        Object.keys(hospitalityCopy.en).sort(),
      );
      expect(Object.values(hospitalityCopy[l]).every((v) => v.trim())).toBe(
        true,
      );
    }
  });
});
