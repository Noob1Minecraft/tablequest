import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:4173",
    browserName: "chromium",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  reporter: "list",
});
