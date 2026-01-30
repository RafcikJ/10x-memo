/**
 * MSW Browser Setup for E2E Tests (Optional)
 */

import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

// Start worker for browser tests
export async function startMockWorker() {
  await worker.start({
    onUnhandledRequest: "warn",
  });
}
