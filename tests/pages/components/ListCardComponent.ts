/**
 * List Card Component (Page Object)
 *
 * Represents a single list card on the dashboard
 *
 * Usage:
 * ```ts
 * const card = new ListCardComponent(page, cardLocator);
 * await card.click();
 * const name = await card.getName();
 * ```
 */

import { type Page, type Locator, expect } from "@playwright/test";

export class ListCardComponent {
  readonly page: Page;
  readonly card: Locator;

  // Card elements
  readonly nameElement: Locator;
  readonly wordCountElement: Locator;
  readonly categoryElement: Locator;
  readonly progressBar: Locator;
  readonly lastScoreText: Locator;

  constructor(page: Page, cardLocator: Locator) {
    this.page = page;
    this.card = cardLocator;

    // Nested elements within card
    this.nameElement = cardLocator.locator('[data-test-id="list-card-name"]');
    this.wordCountElement = cardLocator.locator('[data-test-id="list-card-word-count"]');
    this.categoryElement = cardLocator.locator('[data-test-id="list-card-category"]');
    this.progressBar = cardLocator.locator('[role="progressbar"]');
    this.lastScoreText = cardLocator.locator("text=/Ostatni wynik/").locator("..");
  }

  /**
   * Get list ID from data attribute
   */
  async getId(): Promise<string | null> {
    return await this.card.getAttribute("data-list-id");
  }

  /**
   * Get list name
   */
  async getName(): Promise<string> {
    const text = await this.nameElement.textContent();
    return text?.trim() || "";
  }

  /**
   * Get word count
   * Extracts number from "X słówko/słówka/słów"
   */
  async getWordCount(): Promise<number> {
    const text = await this.wordCountElement.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get category (returns null if no category)
   */
  async getCategory(): Promise<string | null> {
    try {
      if (await this.categoryElement.isVisible({ timeout: 1000 })) {
        const text = await this.categoryElement.textContent();
        return text?.trim() || null;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Get last score percentage (returns null if no score)
   */
  async getLastScore(): Promise<number | null> {
    try {
      if (await this.lastScoreText.isVisible({ timeout: 1000 })) {
        const text = await this.lastScoreText.textContent();
        const match = text?.match(/(\d+)%/);
        return match ? parseInt(match[1], 10) : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Check if progress bar is visible
   */
  async hasProgress(): Promise<boolean> {
    return await this.progressBar.isVisible();
  }

  /**
   * Click the card to navigate to test
   */
  async click() {
    const link = this.card.locator("a").first();
    await link.click();
  }

  /**
   * Get card link URL
   */
  async getUrl(): Promise<string | null> {
    const link = this.card.locator("a").first();
    return await link.getAttribute("href");
  }

  /**
   * Hover over card
   */
  async hover() {
    await this.card.hover();
  }

  /**
   * Check if card is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.card.isVisible();
  }

  /**
   * Verify card data
   */
  async verify(expectedData: { name?: string; wordCount?: number; category?: string; hasScore?: boolean }) {
    if (expectedData.name !== undefined) {
      const name = await this.getName();
      expect(name).toBe(expectedData.name);
    }

    if (expectedData.wordCount !== undefined) {
      const count = await this.getWordCount();
      expect(count).toBe(expectedData.wordCount);
    }

    if (expectedData.category !== undefined) {
      const category = await this.getCategory();
      expect(category?.toLowerCase()).toContain(expectedData.category.toLowerCase());
    }

    if (expectedData.hasScore !== undefined) {
      const hasProgress = await this.hasProgress();
      expect(hasProgress).toBe(expectedData.hasScore);
    }
  }

  /**
   * Take screenshot of this card
   */
  async screenshot(path?: string) {
    return await this.card.screenshot({ path });
  }
}
