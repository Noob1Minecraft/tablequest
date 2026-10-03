import { test, expect, type Page } from "@playwright/test";
import { dictionaries } from "../../src/i18n";

async function start(
  page: Page,
  language: "ru" | "kk" | "en" = "en",
  mode = "Connect",
) {
  const t = dictionaries[language];
  await page.goto("/");
  await page.getByRole("combobox").selectOption(language);
  await page.getByRole("button", { name: t.start, exact: true }).click();
  await page.getByRole("button", { name: t.next, exact: true }).click();
  await page.getByRole("button", { name: new RegExp(mode) }).click();
  await page.getByRole("button", { name: t.begin, exact: true }).click();
  if (mode === "Team Battle")
    await page.getByRole("button", { name: t.begin, exact: true }).click();
}

for (const language of ["ru", "kk", "en"] as const) {
  test(`complete ${language} game, language preservation and feedback`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const t = dictionaries[language];
    await start(page, language);
    for (let round = 0; round < 3; round++) {
      await expect(page.locator(".quest-card h1")).not.toBeEmpty();
      await page.getByRole("button", { name: t.go, exact: true }).click();
      await page.getByRole("button", { name: t.pause, exact: true }).click();
      if (round === 0) {
        const time = await page.getByRole("timer").textContent();
        await page.reload();
        await expect(page.getByRole("combobox")).toHaveValue(language);
        await page.getByRole("button", { name: t.resume, exact: true }).click();
        await expect(page.getByRole("timer")).toHaveText(time!);
        const savedBefore = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("tablequest.game")!),
        );
        await page
          .getByRole("combobox")
          .selectOption(language === "en" ? "kk" : "en");
        await page.getByRole("combobox").selectOption(language);
        const savedAfter = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("tablequest.game")!),
        );
        expect(savedAfter).toEqual(savedBefore);
      }
      await page.getByRole("button", { name: t.done, exact: true }).click();
    }
    await expect(page.locator(".recap-list li")).toHaveCount(3);
    await page.getByRole("button", { name: t.feedback, exact: true }).click();
    await page.getByRole("button", { name: t.ratingGood }).click();
    await page.getByRole("button", { name: t.yes, exact: true }).click();
    await page.getByRole("button", { name: t.submit, exact: true }).click();
    await expect(page.getByRole("heading", { name: t.thanks })).toBeVisible();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("tablequest.feedback")!).length,
      ),
    ).toBe(1);
    expect(errors).toEqual([]);
  });
}
test("battle scoring, draw, reward, restart", async ({ page }) => {
  await start(page, "en", "Team Battle");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Got it, let’s go" }).click();
    await page.getByRole("button", { name: "We’re ready" }).click();
    await page
      .getByRole("button", {
        name: i === 1 ? "Draw" : "Team A",
        exact: i === 1,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Team A wins!" }),
  ).toBeVisible();
  await expect(page.locator(".score-board strong")).toHaveText(["3", "1"]);
  await expect(
    page.getByText("Demo reward. No restaurant discounts or gifts included."),
  ).toBeVisible();
  await page.getByRole("button", { name: "One more adventure" }).click();
  await expect(
    page.getByRole("heading", { name: "Who’s at the table?" }),
  ).toBeVisible();
});
test("Fun, 10 minutes, couple restrictions and timer expiry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("combobox").selectOption("en");
  await page.getByRole("button", { name: "Bring everyone together" }).click();
  await page.getByRole("button", { name: "Couple", exact: true }).click();
  await page.getByRole("button", { name: "10 min", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Team Battle/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /JUST FOR LAUGHS/ }).click();
  await page.getByRole("button", { name: "Start the adventure" }).click();
  await page.clock.install();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Got it, let’s go" }).click();
    if (i === 0) {
      await page.clock.fastForward(91000);
      await expect(
        page.getByRole("heading", { name: "Time’s up!" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Next round" }).click();
    } else await page.getByRole("button", { name: "We’re ready" }).click();
  }
  await expect(page.locator(".recap-list li")).toHaveCount(5);
});
test("offline reload and all languages available", async ({
  page,
  context,
}) => {
  await start(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Continue game" }).click();
  for (const lang of ["kk", "ru", "en"]) {
    await page.getByRole("combobox").selectOption(lang);
    await expect(page.locator(".quest-card h1")).not.toBeEmpty();
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
  }
  await page.getByRole("button", { name: "Got it, let’s go" }).click();
  await page.getByRole("button", { name: "We’re ready" }).click();
  await expect(page.locator(".quest-card")).toBeVisible();
});
test("QR generation and local URL rejection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox").selectOption("en");
  await page.getByRole("button", { name: "QR for your table" }).click();
  await page
    .getByRole("textbox", { name: "Website link" })
    .fill("https://localhost/test");
  await expect(
    page.getByText("Enter a public HTTPS link, not localhost."),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Website link" })
    .fill("https://example.com/tablequest/?table=12");
  await expect(
    page.getByRole("link", { name: "Download QR code" }),
  ).toHaveAttribute("href", /^data:image\/svg/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("responsive layouts and screenshots", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("combobox").selectOption("ru");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/welcome-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole("button", { name: dictionaries.ru.start }).click();
  await page.getByRole("button", { name: "Далее", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/modes-mobile.png", fullPage: true });
});
