import { test, expect, type Page } from "@playwright/test";
import { dictionaries } from "../../src/i18n";
const en = dictionaries.en;

async function start(
  page: Page,
  language: "ru" | "kk" | "en" = "en",
  mode = "Connect",
) {
  const t = dictionaries[language];
  await page.goto("./");
  await expect(page.locator('[data-design="after-hours"]')).toBeVisible();
  await page.getByRole("combobox").selectOption(language);
  await expect(page.locator(".welcome h1 span")).toHaveText(t.heroLead);
  await expect(page.locator(".welcome h1 em")).toHaveText(t.hero);
  await page.getByRole("button", { name: t.start, exact: true }).click();
  await page.getByRole("button", { name: t.next, exact: true }).click();
  await page.getByRole("button", { name: new RegExp(mode) }).click();
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
    await page
      .getByRole("button", { name: t.finishExperience, exact: true })
      .click();
    await page
      .locator(".rating-options")
      .getByRole("button", { name: t.ratingGood, exact: true })
      .click();
    await page
      .locator(".repeat-options")
      .getByRole("button", { name: t.yes, exact: true })
      .click();
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
    await page.getByRole("button", { name: en.go }).click();
    await page.getByRole("button", { name: en.done }).click();
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
  await expect(page.getByText(en.rewardNote)).toBeVisible();
  await page.getByRole("button", { name: en.again }).click();
  await expect(page.locator(".quest-card h1")).toBeVisible();
});
test("Fun, 10 minutes, couple restrictions and timer expiry", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("combobox").selectOption("en");
  await page.getByRole("button", { name: en.start }).click();
  await page.getByRole("button", { name: "Couple", exact: true }).click();
  await page.getByRole("button", { name: "10 min", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Team Battle/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: new RegExp(en.funTag) }).click();
  await page.getByRole("button", { name: en.begin }).click();
  await page.clock.install();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: en.go }).click();
    if (i === 0) {
      await page.clock.fastForward(91000);
      await expect(
        page.getByRole("heading", { name: en.timeUp }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Next round" }).click();
    } else await page.getByRole("button", { name: en.done }).click();
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
  await page.getByRole("button", { name: en.go }).click();
  await page.getByRole("button", { name: en.done }).click();
  await expect(page.locator(".quest-card")).toBeVisible();
});
test("QR generation and local URL rejection", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("combobox").selectOption("en");
  await page.getByRole("button", { name: en.menu, exact: true }).click();
  await page.getByRole("button", { name: "QR for your table" }).click();
  await page
    .getByRole("textbox", { name: "Website link" })
    .fill("https://localhost/test");
  await expect(
    page.getByText("Enter a public HTTPS link, not localhost."),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Website link" })
    .fill("https://tablequest-pink.vercel.app/?table=12");
  await expect(
    page.getByRole("link", { name: "Download QR code" }),
  ).toHaveAttribute("href", /^data:image\/svg/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("responsive layouts and screenshots", async ({ page }) => {
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
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

test("table query, compact group choices, optional team names", async ({
  page,
}) => {
  await page.goto("./?table=12");
  await page.getByRole("combobox").selectOption("ru");
  await expect(page.getByText("Стол 12", { exact: true })).toBeVisible();
  await page.getByRole("combobox").selectOption("kk");
  await expect(page.getByText("12-үстел", { exact: true })).toBeVisible();
  await page.getByRole("combobox").selectOption("en");
  await expect(page.getByText("Table 12", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: en.qr })).toHaveCount(0);
  await page.getByRole("button", { name: en.start, exact: true }).click();
  await page.getByRole("button", { name: en.morePlayers, exact: true }).click();
  await page.getByRole("button", { name: en.more, exact: true }).click();
  await expect(page.locator("output")).toHaveText("7");
  await page.getByRole("button", { name: en.next, exact: true }).click();
  await page.getByRole("button", { name: /Team Battle/ }).click();
  await page.locator(".team-settings summary").click();
  await page.getByRole("textbox", { name: "Team name A" }).fill("Amber");
  await page.getByRole("textbox", { name: "Team name B" }).fill("Olive");
  await expect(page.getByText("Players: 4", { exact: true })).toBeVisible();
  await expect(page.getByText("Players: 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: en.begin, exact: true }).click();
  await expect(page.locator(".quest-card")).toBeVisible();
  await expect(page.locator(".team-score>span")).toHaveText(["Amber", "Olive"]);
});

test("jury demo is deterministic, isolated, recoverable and reaches recap", async ({
  page,
}) => {
  await start(page);
  const saved = await page.evaluate(() =>
    localStorage.getItem("tablequest.game"),
  );
  await page.goto("./?demo=true");
  await expect(page.locator(".quest-card h1")).toHaveText(
    "One story. One word at a time.",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("tablequest.game")),
  ).toBe(saved);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: en.go, exact: true }).click();
    await page.getByRole("button", { name: en.done, exact: true }).click();
  }
  await expect(page.locator(".memory-card")).toBeVisible();
  await page
    .locator(".demo-bar")
    .getByRole("button", { name: "Team Battle", exact: true })
    .click();
  await expect(page.locator(".quest-card h1")).toHaveText(
    "One letter. How many foods can you name?",
  );
  await page.getByRole("button", { name: en.go, exact: true }).click();
  await page.getByRole("button", { name: en.done, exact: true }).click();
  await page.getByRole("button", { name: "Team A +1" }).click();
  await expect(page.locator(".score-board strong")).toHaveText(["1", "0"]);
  // Query explicitly selects battle; reloading resumes this mode's active game.
  await page.goto("./?demo=true&mode=battle");
  await expect(page.locator(".score-board strong")).toHaveText(["1", "0"]);
  await page.reload();
  await expect(page.locator(".score-board strong")).toHaveText(["1", "0"]);
  expect(
    await page.evaluate(() => localStorage.getItem("tablequest.game")),
  ).toBe(saved);
  await page.goto("./");
  await page.getByRole("button", { name: en.resume, exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("tablequest.game")),
  ).toBe(saved);
});

test("recap actions preserve group, clear scores and allow another mode", async ({
  page,
}) => {
  await start(page);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: en.go, exact: true }).click();
    await page.getByRole("button", { name: en.done, exact: true }).click();
  }
  await page.getByRole("button", { name: en.otherMode, exact: true }).click();
  await expect(page.getByRole("heading", { name: en.modeTitle })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(en.funTag) }).click();
  await page.getByRole("button", { name: en.begin, exact: true }).click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tablequest.game")!),
  );
  expect(state.mode).toBe("fun");
  expect(state.players).toBe(4);
  expect(state.scores).toEqual([0, 0]);
});

test("offline artwork, icons and demo remain available with no technical banners", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.getByRole("combobox").selectOption("en");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator(".welcome-picture img")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".welcome-picture img")
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  const cached = await page.evaluate(async () => {
    const r = await fetch(new URL("icon-192.png", location.href));
    return r.ok;
  });
  expect(cached).toBe(true);
  await expect(page.getByText(en.offline, { exact: true })).toHaveCount(0);
  await expect(page.getByText(en.offlineReady, { exact: true })).toHaveCount(0);
  await page.goto("./?demo=true&mode=battle");
  await expect(page.locator(".quest-card")).toBeVisible();
});

for (const width of [320, 390, 768, 1440])
  test(`all screens fit RU KK EN at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 844 });
    await start(page, "en", "Team Battle");
    async function check(stage: string) {
      for (const lang of ["ru", "kk", "en"]) {
        await page.getByRole("combobox").selectOption(lang);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${stage} ${lang}`,
        ).toBe(true);
        const clipped = await page
          .locator("main button")
          .evaluateAll((buttons) =>
            buttons
              .filter((b) => {
                const r = b.getBoundingClientRect();
                return (
                  r.width > 0 &&
                  (r.left < 0 || r.right > innerWidth || r.height < 43)
                );
              })
              .map((b) => b.textContent),
          );
        expect(clipped).toEqual([]);
      }
      await page.screenshot({
        path: `artifacts/redesign-${width}-${stage}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
    await check("quest");
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: en.go, exact: true }).click();
      if (i === 0) await check("timer");
      await page.getByRole("button", { name: en.done, exact: true }).click();
      if (i === 0) await check("score");
      await page.getByRole("button", { name: "Team A +1" }).click();
    }
    await check("recap");
    await page
      .getByRole("button", { name: en.finishExperience, exact: true })
      .click();
    await check("feedback");
  });

test("keyboard focus, reduced motion and legacy recovery", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.getByRole("button", { name: en.go, exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("timer")).toBeVisible();
  expect(
    await page
      .locator(".phone-symbol")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: en.menu, exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: en.menu, exact: true }),
  ).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: en.resume, exact: true }).click();
  await expect(page.getByRole("timer")).toBeVisible();
});
