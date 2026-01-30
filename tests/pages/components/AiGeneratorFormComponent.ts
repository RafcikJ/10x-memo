/**
 * AI Generator Form Component (Page Object)
 * 
 * Represents the AI generation form in ListCreator
 * 
 * Usage:
 * ```ts
 * const aiForm = new AiGeneratorFormComponent(page);
 * await aiForm.selectCategory('food');
 * await aiForm.setWordCount(20);
 * await aiForm.generate();
 * ```
 */

import { type Page, type Locator, expect } from '@playwright/test';

export type NounCategory = 'animals' | 'food' | 'household_items' | 'transport' | 'jobs';

export class AiGeneratorFormComponent {
  readonly page: Page;

  // Form elements
  readonly categorySelect: Locator;
  readonly wordCountSlider: Locator;
  readonly wordCountDisplay: Locator;
  readonly quotaIndicator: Locator;
  readonly quotaRemaining: Locator;
  readonly generateButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Selectors using data-test-id
    this.categorySelect = page.locator('[data-test-id="ai-category-select"]');
    this.wordCountSlider = page.locator('[data-test-id="ai-word-count-slider"]');
    this.wordCountDisplay = page.locator('[data-test-id="ai-word-count-display"]');
    this.quotaIndicator = page.locator('[data-test-id="ai-quota-indicator"]');
    this.quotaRemaining = page.locator('[data-test-id="ai-quota-remaining"]');
    this.generateButton = page.locator('[data-test-id="ai-generate-button"]');
    this.errorMessage = page.locator('[data-test-id="ai-error-message"]');
  }

  /**
   * Select a category from dropdown
   */
  async selectCategory(category: NounCategory) {
    await this.categorySelect.selectOption(category);
    await expect(this.categorySelect).toHaveValue(category);
  }

  /**
   * Set word count using slider
   * @param count - Number between 10 and 50
   */
  async setWordCount(count: number) {
    if (count < 10 || count > 50) {
      throw new Error('Word count must be between 10 and 50');
    }
    
    await this.wordCountSlider.fill(count.toString());
    
    // Verify display updates
    const displayText = await this.wordCountDisplay.textContent();
    expect(displayText?.trim()).toBe(count.toString());
  }

  /**
   * Click generate button and wait for completion
   */
  async generate() {
    await expect(this.generateButton).toBeEnabled();
    await this.generateButton.click();

    // Wait for loading state
    await expect(this.generateButton).toBeDisabled();
    
    // Wait for generation to complete (button re-enabled or error shown)
    await this.page.waitForTimeout(500); // Initial delay
    
    // Wait for either success (button enabled) or error
    await Promise.race([
      this.generateButton.waitFor({ state: 'attached', timeout: 30000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 30000 }),
    ]);
  }

  /**
   * Get current word count from slider
   */
  async getWordCount(): Promise<number> {
    const value = await this.wordCountSlider.inputValue();
    return parseInt(value, 10);
  }

  /**
   * Get displayed word count
   */
  async getDisplayedWordCount(): Promise<number> {
    const text = await this.wordCountDisplay.textContent();
    return parseInt(text?.trim() || '0', 10);
  }

  /**
   * Get remaining quota
   */
  async getRemainingQuota(): Promise<number> {
    const text = await this.quotaRemaining.textContent();
    // Extract number from "Pozostało X/5 generacji na dziś"
    const match = text?.match(/(\d+)\/5/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if quota warning is displayed (0 remaining)
   */
  async hasQuotaWarning(): Promise<boolean> {
    const quota = await this.getRemainingQuota();
    return quota === 0;
  }

  /**
   * Check if form is in loading state
   */
  async isLoading(): Promise<boolean> {
    return !(await this.generateButton.isEnabled());
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if error is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Wait until form is ready for interaction
   */
  async waitForReady() {
    await expect(this.categorySelect).toBeVisible();
    await expect(this.generateButton).toBeEnabled();
  }

  /**
   * Fill form and generate (convenience method)
   */
  async fillAndGenerate(category: NounCategory, wordCount: number) {
    await this.selectCategory(category);
    await this.setWordCount(wordCount);
    await this.generate();
  }
}
