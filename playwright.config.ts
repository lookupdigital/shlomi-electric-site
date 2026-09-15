import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

// Loads .env.local so the test can read Supabase and E2E settings the same way the app does.
loadEnvConfig(process.cwd());

const port = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    // Locally, set PLAYWRIGHT_CHANNEL=chrome to use the installed Google Chrome instead of downloading browsers.
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    // Runs the production build (`npm run build` first).
    command: `npm run start -- -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
