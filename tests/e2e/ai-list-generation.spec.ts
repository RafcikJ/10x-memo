/**
 * AI List Generation E2E Test
 *
 * Tests the complete flow:
 * 1. Generate AI list
 * 2. Verify preview
 * 3. Save list
 * 4. Verify on dashboard
 */

import { test, expect } from "@playwright/test";
import { ListCreatorPage, DashboardPage } from "../pages";

test.describe("AI List Generation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Note: This assumes user is already authenticated
    // In real scenario, use auth setup from playwright.setup.ts
    await page.goto("/");
  });

  test("should generate AI list with selected category and word count", async ({ page }) => {
    const listCreator = new ListCreatorPage(page);
    await listCreator.goto();

    // Step 1: Select category
    await listCreator.aiGenerator.selectCategory("food");

    // Step 2: Set word count
    await listCreator.aiGenerator.setWordCount(15);

    // Step 3: Verify displayed count matches
    const displayedCount = await listCreator.aiGenerator.getDisplayedWordCount();
    expect(displayedCount).toBe(15);

    // Step 4: Generate list
    await listCreator.aiGenerator.generate();

    // Step 5: Wait for preview
    await listCreator.listPreview.waitForPreview();

    // Step 6: Verify word count in preview matches
    const previewCount = await listCreator.listPreview.getWordCount();
    expect(previewCount).toBe(15);

    // Step 7: Verify items are displayed
    const items = await listCreator.listPreview.getItems();
    expect(items.length).toBe(15);
  });

  test("should save list and verify on dashboard", async ({ page }) => {
    const listCreator = new ListCreatorPage(page);
    const dashboard = new DashboardPage(page);

    // Generate unique list name
    const uniqueListName = `Test List ${Date.now()}`;

    // Navigate and generate list
    await listCreator.goto();
    await listCreator.aiGenerator.fillAndGenerate("animals", 20);

    // Wait for preview
    await listCreator.listPreview.waitForPreview();

    // Verify preview data
    await listCreator.listPreview.verifyPreview(20);

    // Set list name and save
    await listCreator.listPreview.saveAs(uniqueListName);

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard");

    // Verify list appears on dashboard
    await dashboard.waitForLoad();
    await dashboard.verifyListExists(uniqueListName, 20, "animals");
  });

  test("should complete full flow using convenience method", async ({ page }) => {
    const listCreator = new ListCreatorPage(page);
    const dashboard = new DashboardPage(page);

    const uniqueListName = `Full Flow ${Date.now()}`;

    await listCreator.goto();

    // Use convenience method for complete flow
    const listData = await listCreator.generateAndSaveList("transport", 10, uniqueListName);

    // Verify returned data
    expect(listData.name).toBe(uniqueListName);
    expect(listData.wordCount).toBe(10);
    expect(listData.category).toBe("transport");

    // Verify on dashboard
    const card = await dashboard.findListByName(uniqueListName);
    expect(card).not.toBeNull();

    if (card) {
      await card.verify({
        name: uniqueListName,
        wordCount: 10,
        category: "transport",
      });
    }
  });

  test("should display quota information", async ({ page }) => {
    const listCreator = new ListCreatorPage(page);
    await listCreator.goto();

    // Check quota is displayed
    const quota = await listCreator.aiGenerator.getRemainingQuota();
    expect(quota).toBeGreaterThanOrEqual(0);
    expect(quota).toBeLessThanOrEqual(5);

    // Verify quota indicator is visible
    await expect(listCreator.aiGenerator.quotaIndicator).toBeVisible();
  });

  test("should handle list item removal", async ({ page }) => {
    const listCreator = new ListCreatorPage(page);
    await listCreator.goto();

    // Generate list
    await listCreator.aiGenerator.fillAndGenerate("jobs", 10);
    await listCreator.listPreview.waitForPreview();

    // Get initial count
    const initialCount = await listCreator.listPreview.getItemCount();
    expect(initialCount).toBe(10);

    // Remove first item
    await listCreator.listPreview.removeItem(1);

    // Verify count decreased
    const newCount = await listCreator.listPreview.getItemCount();
    expect(newCount).toBe(9);

    // Verify word count in title updated
    const displayedCount = await listCreator.listPreview.getWordCount();
    expect(displayedCount).toBe(9);
  });

  test("should validate required list name when empty", async ({ page }) => {
    const listCreator = new ListCreatorPage(page);
    await listCreator.goto();

    // Generate list
    await listCreator.aiGenerator.fillAndGenerate("household_items", 10);
    await listCreator.listPreview.waitForPreview();

    // Leave name empty and save
    await listCreator.listPreview.setListName("");
    await listCreator.listPreview.save();

    // Should still save with default name (based on date)
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("should persist selected category across generation", async ({ page }) => {
    const listCreator = new ListCreatorPage(page);
    await listCreator.goto();

    // Select category
    await listCreator.aiGenerator.selectCategory("food");

    // Generate
    await listCreator.aiGenerator.fillAndGenerate("food", 10);
    await listCreator.listPreview.waitForPreview();

    // Category should still be 'food' in the select
    await expect(listCreator.aiGenerator.categorySelect).toHaveValue("food");
  });
});

test.describe("Dashboard List Cards", () => {
  test("should display all list information on card", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Check if dashboard has lists
    const hasLists = await dashboard.hasLists();

    if (hasLists) {
      const firstCard = await dashboard.getFirstCard();
      expect(firstCard).not.toBeNull();

      if (firstCard) {
        // Verify card has required data
        const name = await firstCard.getName();
        expect(name).toBeTruthy();

        const wordCount = await firstCard.getWordCount();
        expect(wordCount).toBeGreaterThan(0);

        // Card should be clickable
        await expect(firstCard.card).toBeVisible();
      }
    }
  });

  test("should navigate to list test on card click", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const hasLists = await dashboard.hasLists();

    if (hasLists) {
      const firstCard = await dashboard.getFirstCard();

      if (firstCard) {
        const listId = await firstCard.getId();
        await firstCard.click();

        // Should navigate to test page
        await page.waitForURL(`**/lists/${listId}/test`);
      }
    }
  });

  test("should show correct list count", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    if (await dashboard.hasLists()) {
      const countText = await dashboard.getListCount();
      const cards = await dashboard.getListCards();

      expect(countText).toBe(cards.length);
    }
  });
});
