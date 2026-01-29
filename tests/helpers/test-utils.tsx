/**
 * Test Utilities
 * Custom render functions and test helpers
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Custom render function with common providers
 * Extend this as needed with your app's providers (Context, Router, etc.)
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Add your providers here if needed
  // const Wrapper = ({ children }: { children: React.ReactNode }) => {
  //   return (
  //     <YourProvider>
  //       {children}
  //     </YourProvider>
  //   );
  // };

  return render(ui, { ...options });
}

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create mock fetch response
 */
export function createMockResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as Response;
}

/**
 * Create mock error response
 */
export function createMockErrorResponse(message: string, status = 400): Response {
  return createMockResponse({ error: message }, status);
}

// Re-export everything from testing-library
export * from '@testing-library/react';
