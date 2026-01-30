/**
 * List Preview Component (Page Object)
 * 
 * Represents the list preview section with draft items and save functionality
 * 
 * Usage:
 * ```ts
 * const preview = new ListPreviewComponent(page);
 * await preview.waitForPreview();
 * await preview.setListName('My List');
 * await preview.save();
 * ```
 */

import { type Page, type Locator, expect } from '@playwright/test';

export interface ListItem {
  position: number;
  text: string;
}

export class ListPreviewComponent {
  readonly page: Page;

  // Preview section
  readonly previewSection: Locator;
  readonly previewTitle: Locator;
  readonly listNameInput: Locator;
  readonly itemsContainer: Locator;
  readonly saveButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Selectors using data-test-id
    this.previewSection = page.locator('[data-test-id="list-preview-section"]');
    this.previewTitle = page.locator('[data-test-id="list-preview-word-count"]');
    this.listNameInput = page.locator('[data-test-id="list-name-input"]');
    this.itemsContainer = page.locator('[data-test-id="list-preview-items"]');
    this.saveButton = page.locator('[data-test-id="list-save-button"]');
    this.errorMessage = page.locator('[data-test-id="list-save-error"]');
  }

  /**
   * Wait for preview section to appear
   */
  async waitForPreview(timeout = 10000) {
    await this.previewSection.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if preview is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.previewSection.isVisible();
  }

  /**
   * Get word count from preview title
   * Extracts number from "Podgląd listy (X słówek)"
   */
  async getWordCount(): Promise<number> {
    const titleText = await this.previewTitle.textContent();
    const match = titleText?.match(/\((\d+) słówek\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Set list name
   */
  async setListName(name: string) {
    await this.listNameInput.fill(name);
    await expect(this.listNameInput).toHaveValue(name);
  }

  /**
   * Get current list name value
   */
  async getListName(): Promise<string> {
    return await this.listNameInput.inputValue();
  }

  /**
   * Get all list items
   */
  async getItems(): Promise<ListItem[]> {
    const items: ListItem[] = [];
    const itemElements = await this.itemsContainer.locator('[data-test-id^="list-item-"]').all();

    for (const item of itemElements) {
      const testId = await item.getAttribute('data-test-id');
      const position = parseInt(testId?.replace('list-item-', '') || '0', 10);
      const text = await item.locator('span').nth(1).textContent();
      
      items.push({
        position,
        text: text?.trim() || '',
      });
    }

    return items;
  }

  /**
   * Get specific item by position
   */
  async getItem(position: number): Promise<ListItem | null> {
    const itemLocator = this.page.locator(`[data-test-id="list-item-${position}"]`);
    
    if (!(await itemLocator.isVisible())) {
      return null;
    }

    const text = await itemLocator.locator('span').nth(1).textContent();
    return {
      position,
      text: text?.trim() || '',
    };
  }

  /**
   * Remove item by position
   */
  async removeItem(position: number) {
    const itemLocator = this.page.locator(`[data-test-id="list-item-${position}"]`);
    const deleteButton = itemLocator.locator('button[aria-label^="Usuń"]');

    const initialCount = await this.getItemCount();
    await deleteButton.click();

    // IMPORTANT:
    // The UI reindexes positions after removal, so `list-item-${position}` may still exist
    // (it becomes the next item). Instead of waiting for detachment, wait for the count/title to update.
    await expect.poll(() => this.getItemCount(), { timeout: 5000 }).toBe(initialCount - 1);
    await expect(this.previewTitle).toContainText(`(${initialCount - 1} słówek)`);
  }

  /**
   * Get item count
   */
  async getItemCount(): Promise<number> {
    const items = await this.itemsContainer.locator('[data-test-id^="list-item-"]').count();
    return items;
  }

  /**
   * Click save button
   */
  async save() {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
  }

  /**
   * Check if save button is disabled
   */
  async isSaveDisabled(): Promise<boolean> {
    return !(await this.saveButton.isEnabled());
  }

  /**
   * Check if save is in progress
   */
  async isSaving(): Promise<boolean> {
    const buttonText = await this.saveButton.textContent();
    return buttonText?.includes('Zapisywanie') || false;
  }

  /**
   * Get error message
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
   * Verify preview content
   */
  async verifyPreview(expectedWordCount: number, expectedListName?: string) {
    await expect(this.previewSection).toBeVisible();
    
    const actualCount = await this.getWordCount();
    expect(actualCount).toBe(expectedWordCount);

    if (expectedListName) {
      const actualName = await this.getListName();
      expect(actualName).toBe(expectedListName);
    }
  }

  /**
   * Complete save flow: set name and save
   */
  async saveAs(name: string) {
    await this.setListName(name);
    await this.save();
  }
}
