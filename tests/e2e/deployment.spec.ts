import { expect, test } from "@playwright/test";

test("deployment serves PWA and artwork within its own base path", async ({ page, baseURL }) => {
  const base = new URL(baseURL!);
  await page.goto("./?table=12");
  await expect(page.locator('.welcome-picture img')).toBeVisible();
  await expect.poll(() => page.locator('.welcome-picture img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const manifestURL = await page.locator('link[rel="manifest"]').evaluate((link: HTMLLinkElement) => link.href);
  expect(new URL(manifestURL).pathname).toBe(`${base.pathname}manifest.webmanifest`);
  const response = await page.request.get(manifestURL);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/json|manifest/);
  const manifest = await response.json();
  expect(manifest.description).toBe('Less screen. More together.');
  expect(new URL(manifest.start_url, manifestURL).pathname).toBe(base.pathname);
  expect(new URL(manifest.scope, manifestURL).pathname).toBe(base.pathname);
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, manifestURL);
    expect(url.pathname.startsWith(base.pathname)).toBe(true);
    const asset = await page.request.get(url.href);
    expect(asset.ok()).toBe(true);
    expect(asset.headers()['content-type']).toContain('image/png');
  }
  for (const [file, type] of [['favicon.svg', 'image/svg'], ['dining-evening.webp', 'image/webp'], ['dining-evening-small.webp', 'image/webp'], ['sw.js', 'javascript']]) {
    const asset = await page.request.get(new URL(file, base).href);
    expect(asset.ok(), file).toBe(true);
    expect(asset.headers()['content-type'], file).toContain(type);
  }
  const registration = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { scope: reg.scope, script: reg.active?.scriptURL };
  });
  expect(registration.scope).toBe(base.href);
  expect(registration.script).toBe(new URL('sw.js', base).href);
});
