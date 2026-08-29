import { defineConfig, devices } from "@playwright/test";

const mode = process.env.PLAYWRIGHT_MODE ?? "offline";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch:
    mode === "live" ? /.*\.live\.spec\.ts/ : /.*\.offline\.spec\.ts/,
  fullyParallel: false,
  globalTimeout: 120_000,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
