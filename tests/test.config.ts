/**
 * Test Configuration
 * Central configuration for all tests (unit, integration, E2E)
 *
 * Priority (highest to lowest):
 * 1. Environment variables
 * 2. .env.test.local (user-specific, not committed)
 * 3. .env.test (default test config, committed)
 * 4. Defaults in this file
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables in order
config({ path: resolve(process.cwd(), ".env.test") });
config({ path: resolve(process.cwd(), ".env.test.local"), override: true });

/**
 * Playwright E2E Test Configuration
 */
export const e2eConfig = {
  /** Base URL for E2E tests */
  baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4321",

  /** Test timeout in milliseconds */
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || "30000", 10),

  /** Browser to use */
  browser: (process.env.PLAYWRIGHT_BROWSER || "chromium") as "chromium" | "firefox" | "webkit",

  /** Show browser (headed mode) */
  headed: process.env.PLAYWRIGHT_HEADED === "true",

  /** Slow down actions (useful for debugging) */
  slowMo: parseInt(process.env.PLAYWRIGHT_SLOWMO || "0", 10),

  /** Web server configuration */
  webServer: {
    command: "npm run dev -- --port 4321",
    url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
  },

  /** Screenshot settings */
  screenshot: (process.env.SAVE_SCREENSHOTS || "only-on-failure") as "on" | "off" | "only-on-failure",

  /** Video settings */
  video: (process.env.SAVE_VIDEOS || "retain-on-failure") as "on" | "off" | "retain-on-failure",

  /** Trace settings */
  trace: (process.env.SAVE_TRACES || "on-first-retry") as "on" | "off" | "retain-on-failure" | "on-first-retry",
};

/**
 * Supabase Test Configuration
 */
export const supabaseConfig = {
  /** Supabase URL (local instance) */
  url: process.env.PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",

  /** Supabase anonymous key */
  anonKey:
    process.env.PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",

  /** Supabase service role key (admin) */
  serviceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
};

/**
 * Test User Configuration
 */
export const testUsers = {
  /** Regular test user */
  regular: {
    email: process.env.TEST_USER_EMAIL || "test@example.com",
    password: process.env.TEST_USER_PASSWORD || "TestPassword123!",
  },

  /** Admin test user */
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || "admin@example.com",
    password: process.env.TEST_ADMIN_PASSWORD || "AdminPassword123!",
  },
};

/**
 * API Test Configuration
 */
export const apiConfig = {
  /** OpenRouter API key (for AI tests) */
  openRouterKey: process.env.OPENROUTER_API_KEY || "",

  /** Whether to use real API or mocks */
  useMocks: !process.env.OPENROUTER_API_KEY,
};

/**
 * Test Database Configuration
 */
export const dbConfig = {
  /** Database name for tests */
  name: process.env.TEST_DATABASE_NAME || "test_db",

  /** Whether to clean database between tests */
  cleanupEnabled: process.env.TEST_CLEANUP_ENABLED !== "false",
};

/**
 * Debug Configuration
 */
export const debugConfig = {
  /** Enable debug logs */
  debug: process.env.DEBUG === "true",

  /** Verbose output */
  verbose: process.env.VERBOSE === "true",
};

/**
 * Complete test configuration
 */
export const testConfig = {
  e2e: e2eConfig,
  supabase: supabaseConfig,
  testUsers,
  api: apiConfig,
  db: dbConfig,
  debug: debugConfig,
};

export default testConfig;
