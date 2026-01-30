import { defineConfig, devices } from "@playwright/test";
import { e2eConfig } from "./tests/test.config";

/**
 * Playwright E2E Testing Configuration
 * See https://playwright.dev/docs/test-configuration
 *
 * Configuration is loaded from:
 * 1. .env.test (default test config)
 * 2. .env.test.local (user-specific overrides)
 * 3. Environment variables
 */
export default defineConfig({
  // Test directory
  testDir: "./tests/e2e",

  // Maximum time one test can run
  timeout: e2eConfig.timeout,

  // Test execution configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: e2eConfig.baseURL,

    // Collect trace on first retry
    trace: e2eConfig.trace,

    // Screenshot on failure
    screenshot: e2eConfig.screenshot,

    // Video on failure
    video: e2eConfig.video,

    // Action timeout
    actionTimeout: 10 * 1000,

    // Slow down actions (useful for debugging)
    launchOptions: {
      slowMo: e2eConfig.slowMo,
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: e2eConfig.webServer.command,
    url: e2eConfig.webServer.url,
    reuseExistingServer: e2eConfig.webServer.reuseExistingServer,
    timeout: e2eConfig.webServer.timeout,
    stdout: "pipe",
    stderr: "pipe",
    // Pass test environment variables to Astro dev server
    env: {
      // Testing mode flags
      DISABLE_AUTH_FOR_TESTING: process.env.DISABLE_AUTH_FOR_TESTING || "true",
      DISABLE_AI_QUOTA_FOR_TESTING: process.env.DISABLE_AI_QUOTA_FOR_TESTING || "true",
      
      // Test user configuration
      TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || "test@playwright.test",
      TEST_USER_ID: process.env.TEST_USER_ID || "00000000-0000-0000-0000-000000000001",
      
      // Supabase configuration
      PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || "",
      PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY || "",
      // Server-side (legacy) names used by `src/db/supabase.client.ts` in some environments
      SUPABASE_URL: process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || "",
      SUPABASE_KEY: process.env.SUPABASE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      
      // OpenRouter API (for AI generation tests)
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
      
      // App configuration
      PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || "http://localhost:4321",
    },
  },
});
