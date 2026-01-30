import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom environment for DOM testing
    environment: "jsdom",

    // Global test setup file
    setupFiles: ["./tests/setup/vitest.setup.ts"],

    // Include test files
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],

    // Exclude directories
    exclude: ["node_modules", "dist", ".astro", "tests/e2e/**"],

    // Global test configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/**",
        "**/.astro/**",
        "src/env.d.ts",
        "src/db/database.types.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },

    // Test timeout
    testTimeout: 10000,

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },

  // Path resolution
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
