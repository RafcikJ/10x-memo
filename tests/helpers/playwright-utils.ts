/**
 * Playwright Test Utilities
 * Helper functions for E2E tests
 */

import { Page, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Run accessibility audit on page
 */
export async function checkAccessibility(
  page: Page,
  options?: {
    detailedReport?: boolean;
    includedImpacts?: string[];
  }
) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

  if (options?.detailedReport) {
    console.log("Accessibility violations:", results.violations);
  }

  expect(results.violations).toEqual([]);
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Login helper for authenticated routes
 */
export async function login(page: Page, email: string) {
  await page.goto("/");
  await page.fill('input[type="email"]', email);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await waitForPageLoad(page);
}

/**
 * Take screenshot with consistent naming
 */
export async function takeScreenshot(page: Page, name: string, options?: { fullPage?: boolean }) {
  await page.screenshot({
    path: `tests/e2e/screenshots/${name}.png`,
    fullPage: options?.fullPage ?? true,
  });
}

/**
 * Check if element is visible in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}
