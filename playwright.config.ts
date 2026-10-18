import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:14273",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command:
        "pnpm --filter @kamod-dnd/example-editor-blocks build && pnpm --filter @kamod-dnd/example-editor-blocks preview",
      url: "http://localhost:14273",
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command:
        "pnpm --filter @kamod-dnd/example-kanban build && pnpm --filter @kamod-dnd/example-kanban preview",
      url: "http://localhost:14274",
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
