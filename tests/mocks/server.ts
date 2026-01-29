/**
 * MSW Server Setup for Node.js (Vitest)
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Enable API mocking before tests
export function setupMockServer() {
  // Start server before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  
  // Reset handlers after each test
  afterEach(() => server.resetHandlers());
  
  // Clean up after all tests
  afterAll(() => server.close());
}
