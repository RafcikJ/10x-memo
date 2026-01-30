/**
 * List Creator Page Object Model
 *
 * Represents the /lists/new page with AI generator and list preview
 *
 * Usage:
 * ```ts
 * const listCreator = new ListCreatorPage(page);
 * await listCreator.goto();
 * await listCreator.generateAiList('food', 15);
 * await listCreator.saveList('My Food List');
 * ```
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { AiGeneratorFormComponent } from "./components/AiGeneratorFormComponent";
import { ListPreviewComponent } from "./components/ListPreviewComponent";

export class ListCreatorPage {
  readonly page: Page;
  readonly aiGenerator: AiGeneratorFormComponent;
  readonly listPreview: ListPreviewComponent;

  // Mode switcher
  readonly aiModeButton: Locator;
  readonly manualModeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.aiGenerator = new AiGeneratorFormComponent(page);
    this.listPreview = new ListPreviewComponent(page);

    // Mode switcher buttons
    this.aiModeButton = page.getByRole("button", { name: /AI/i });
    this.manualModeButton = page.getByRole("button", { name: /Ręcznie/i });
  }

  /**
   * Navigate to list creator page
   */
  async goto() {
    await this.page.goto("/lists/new");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Switch to AI mode
   */
  async switchToAiMode() {
    await this.aiModeButton.click();
    await expect(this.aiGenerator.categorySelect).toBeVisible();
  }

  /**
   * Switch to manual mode
   */
  async switchToManualMode() {
    await this.manualModeButton.click();
  }

  /**
   * Complete flow: Generate AI list and save it
   *
   * @param category - Category to generate (e.g., 'food', 'animals')
   * @param wordCount - Number of words to generate (10-50)
   * @param listName - Name for the list
   * @returns Generated list data
   */
  async generateAndSaveList(
    category: string,
    wordCount: number,
    listName: string
  ): Promise<{ name: string; wordCount: number; category: string }> {
    // Generate with AI
    await this.aiGenerator.selectCategory(category);
    await this.aiGenerator.setWordCount(wordCount);
    await this.aiGenerator.generate();

    // Wait for preview
    await this.listPreview.waitForPreview();

    // Verify word count matches
    const previewCount = await this.listPreview.getWordCount();
    expect(previewCount).toBe(wordCount);

    // Save list
    await this.listPreview.setListName(listName);
    await this.listPreview.save();

    // Wait for redirect to dashboard
    await this.page.waitForURL("**/dashboard", { timeout: 10000 });

    return {
      name: listName,
      wordCount: previewCount,
      category,
    };
  }

  /**
   * Generate list without saving
   */
  async generateListPreview(category: string, wordCount: number) {
    await this.aiGenerator.selectCategory(category);
    await this.aiGenerator.setWordCount(wordCount);
    await this.aiGenerator.generate();
    await this.listPreview.waitForPreview();
  }

  /**
   * Check if quota warning is displayed
   */
  async hasQuotaWarning(): Promise<boolean> {
    return await this.aiGenerator.hasQuotaWarning();
  }

  /**
   * Get remaining quota
   */
  async getRemainingQuota(): Promise<number> {
    return await this.aiGenerator.getRemainingQuota();
  }
}
