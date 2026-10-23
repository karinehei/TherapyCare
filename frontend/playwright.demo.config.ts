import { defineConfig, devices } from "@playwright/test";

/**
 * Browser checks against the BUILT Pages demo (no Django / Postgres).
 * Run: npm run build:demo && npm run test:e2e:demo
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/demo*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173/TherapyCare/",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview:demo",
    url: "http://127.0.0.1:4173/TherapyCare/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
