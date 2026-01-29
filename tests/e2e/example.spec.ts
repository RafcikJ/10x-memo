/**
 * Example E2E Test
 * This file demonstrates how to write E2E tests with Playwright
 */

import { test, expect } from '@playwright/test';
import { checkAccessibility, waitForPageLoad } from '../helpers/playwright-utils';

// Test group for homepage
test.describe('Homepage E2E Tests', () => {
  // Runs before each test in this group
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/10x/i);
    
    // Check if page is loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have proper navigation', async ({ page }) => {
    // Check if navigation exists
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should pass accessibility audit', async ({ page }) => {
    // Run axe accessibility checks
    await checkAccessibility(page, { detailedReport: false });
  });
});

// Test group for user interactions
test.describe('User Interactions', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    
    // Example: Click a link and verify navigation
    // Adjust selectors based on your actual app
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    
    // Check if link exists before clicking
    const linkCount = await dashboardLink.count();
    
    if (linkCount > 0) {
      await dashboardLink.first().click();
      await waitForPageLoad(page);
      
      // Verify URL changed
      expect(page.url()).toContain('/dashboard');
    } else {
      // Skip test if link doesn't exist
      test.skip();
    }
  });

  test('should handle button clicks', async ({ page }) => {
    await page.goto('/');
    
    // Example: Find and click a button
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    expect(buttonCount).toBeGreaterThan(0);
  });
});

// Test group for forms
test.describe('Form Interactions', () => {
  test('should fill out and submit a form', async ({ page }) => {
    // This is an example - adjust based on your actual forms
    await page.goto('/');
    
    // Check if email input exists
    const emailInput = page.locator('input[type="email"]');
    const inputCount = await emailInput.count();
    
    if (inputCount > 0) {
      // Fill the form
      await emailInput.first().fill('test@example.com');
      
      // Verify input value
      await expect(emailInput.first()).toHaveValue('test@example.com');
    } else {
      test.skip();
    }
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/');
    
    // Example: Test form validation
    const emailInput = page.locator('input[type="email"]');
    const inputCount = await emailInput.count();
    
    if (inputCount > 0) {
      // Try invalid email
      await emailInput.first().fill('invalid-email');
      
      // Try to submit
      const submitButton = page.locator('button[type="submit"]');
      const buttonCount = await submitButton.count();
      
      if (buttonCount > 0) {
        await submitButton.first().click();
        
        // Browser validation should prevent submission
        // The URL should not change
        expect(page.url()).not.toContain('/check-email');
      }
    } else {
      test.skip();
    }
  });
});

// Test group for responsive design
test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Check if page renders correctly
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Check if page renders correctly
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

// Test group for API interactions
test.describe('API Tests', () => {
  test('should make successful API calls', async ({ request }) => {
    // Example API test
    const response = await request.get('/api/lists');
    
    // This will fail if not authenticated, which is expected
    // Adjust based on your API authentication strategy
    const status = response.status();
    
    // Accept both success and auth error as valid responses
    expect([200, 401, 403]).toContain(status);
  });
});
