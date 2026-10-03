import { test, expect, type Page } from "@playwright/test";
import { dictionaries } from "../../src/i18n";
import { hospitalityCopy } from "../../src/features/copy";
import { restaurant } from "../../src/config/restaurant";

async function recap(page: Page, business = true) {
  await page.goto(
    `./?demo=true${business ? "&business=true" : ""}&table=12&venue=pilot`,
  );
  await page.getByRole("combobox").selectOption("en");
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: dictionaries.en.go, exact: true })
      .click();
    await page
      .getByRole("button", { name: dictionaries.en.done, exact: true })
      .click();
  }
  await expect(page.locator(".memory-card")).toBeVisible();
}
for (const lang of ["ru", "kk", "en"] as const)
  test(`business moment, translated feedback and local admin ${lang}`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const c = hospitalityCopy[lang],
      t = dictionaries[lang];
    await page.setViewportSize({ width: 390, height: 844 });
    await recap(page);
    await page.getByRole("combobox").selectOption(lang);
    await expect(
      page.getByRole("heading", {
        name: restaurant.restaurantMomentTitle[lang],
        exact: true,
      }),
    ).toBeVisible();
    const before = await page.evaluate(() =>
      localStorage.getItem("tablequest.demo.game"),
    );
    await page.getByRole("combobox").selectOption(lang === "en" ? "kk" : "en");
    await page.getByRole("combobox").selectOption(lang);
    expect(
      await page.evaluate(() => localStorage.getItem("tablequest.demo.game")),
    ).toBe(before);
    await page.getByRole("button", { name: c.request }).click();
    await expect(page.getByText(c.receipt, { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByText(c.receipt, { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: c.request })).toHaveCount(0);
    await page.screenshot({
      path: `artifacts/moment-${lang}.png`,
      fullPage: true,
      animations: "disabled",
    });
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
    await page.getByText(c.improve, { exact: true }).click();
    await page
      .locator(".star-options")
      .getByRole("button", { name: "4", exact: true })
      .click();
    await page
      .getByLabel(c.category, { exact: true })
      .selectOption("atmosphere");
    await page
      .getByLabel(c.comment, { exact: true })
      .fill("A lovely evening <script>no code</script>");
    await page
      .getByRole("combobox", { name: t.language, exact: true })
      .selectOption(lang === "en" ? "kk" : "en");
    await page
      .getByRole("combobox", {
        name: dictionaries[lang === "en" ? "kk" : "en"].language,
        exact: true,
      })
      .selectOption(lang);
    await expect(page.getByLabel(c.comment, { exact: true })).toHaveValue(
      "A lovely evening <script>no code</script>",
    );
    await page.screenshot({
      path: `artifacts/feedback-details-${lang}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: t.submit, exact: true }).click();
    await expect(page.getByRole("heading", { name: t.thanks })).toBeVisible();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tablequest.demo.feedback")!),
    );
    expect(saved[0]).toMatchObject({
      tableId: "12",
      venue: "pilot",
      locale: lang,
      stars: 4,
      category: "atmosphere",
      answer: "yes",
      company: "friends",
      repeat: "yes",
      metric: "connection-v1",
      comment: "A lovely evening <script>no code</script>",
    });
    await page.goto("./?admin=true");
    await expect(page.getByRole("heading", { name: c.admin })).toBeVisible();
    await expect(page.getByText(c.empty)).toBeVisible();
    await page.getByRole("button", { name: c.demoData, exact: true }).click();
    await expect(
      page.getByText("A lovely evening <script>no code</script>", {
        exact: true,
      }),
    ).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: c.export }).click();
    expect((await download).suggestedFilename()).toBe(
      "tablequest-demo-feedback.csv",
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: `artifacts/admin-${lang}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
test("normal demo has no business interruption", async ({ page }) => {
  await recap(page, false);
  await expect(page.locator(".restaurant-moment")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: dictionaries.en.finishExperience,
      exact: true,
    }),
  ).toBeVisible();
});
test("business demo and admin chunk work offline after initial cache", async ({
  page,
  context,
}) => {
  await page.goto("./?demo=true&business=true");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await recap(page);
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: hospitalityCopy.en.request }).click();
  await expect(
    page.getByText(hospitalityCopy.en.receipt, { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/business-recap.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("./?admin=true");
  await expect(
    page.getByRole("heading", { name: hospitalityCopy.en.admin }),
  ).toBeVisible();
});
