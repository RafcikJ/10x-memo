/**
 * Playwright Global Setup
 * Runs once before all tests
 */

import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log(`Starting tests with baseURL: ${baseURL}`);

  // You can add global setup logic here, for example:
  // - Setup test database
  // - Start external services
  // - Authenticate and save storage state

  return async () => {
    // Global teardown logic
    console.log("Tests completed");
  };
}

export default globalSetup;
