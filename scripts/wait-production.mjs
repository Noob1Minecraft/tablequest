// Hosts deploy independently from the same push. Wait for the new release marker
// before testing so a slower build is not mistaken for an application failure.
const base = new URL(process.env.PLAYWRIGHT_BASE_URL);
for (let attempt = 0; attempt < 36; attempt++) {
  try {
    const url = new URL("release.json", base);
    url.searchParams.set("check", String(Date.now()));
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const manifest = await response.json();
    if (response.ok && manifest.release === "validation-v2") {
      console.log(`Ready: ${base.href}`);
      process.exit(0);
    }
  } catch {
    /* Service may still be publishing; bounded retry. */
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
throw new Error(`Updated deployment not available at ${base.href}`);
