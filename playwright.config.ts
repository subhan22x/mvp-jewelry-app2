import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "line",
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-name-builder",
      grep: /Name builder flow/,
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    }
  ]
});
