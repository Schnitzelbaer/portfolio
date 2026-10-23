import { defineConfig, devices } from "@playwright/test";
import { COOKIE_SECRET, PASSWORD_HASH, PORT } from "./tests/e2e/helpers";

/**
 * e2e tests run against the real production build, served by scripts/preview-server.ts (a local
 * stand-in for Vercel). `npm run test:e2e` builds first. The test password and its hash live in
 * tests/e2e/helpers.ts; they are unrelated to the real password.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://portfolio.localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `tsx scripts/preview-server.ts --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/robots.txt`,
    reuseExistingServer: false,
    env: {
      LOCK_COOKIE_SECRET: COOKIE_SECRET,
      LOCK_PASSWORD_HASH: PASSWORD_HASH,
    },
  },
});
