/**
 * Dashboard Page Object Model
 * 
 * Represents the /dashboard page with list cards
 * 
 * Usage:
 * ```ts
 * const dashboard = new DashboardPage(page);
 * await dashboard.goto();
 * const card = await dashboard.findListByName('My List');
 * await card.click();
 * ```
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { ListCardComponent } from './components/ListCardComponent';

export class DashboardPage {
  readonly page: Page;

  // Main elements
  readonly dashboardGrid: Locator;
  readonly listCountText: Locator;
  readonly cardsContainer: Locator;
  readonly emptyDashboard: Locator;

  // Actions
  readonly createListButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Selectors using data-test-id
    this.dashboardGrid = page.locator('[data-test-id="dashboard-grid"]');
    this.listCountText = page.locator('[data-test-id="dashboard-list-count"]');
    this.cardsContainer = page.locator('[data-test-id="dashboard-cards-container"]');
    this.emptyDashboard = page.locator('text=Nie masz jeszcze żadnych list'); // fallback

    // Create list button
    this.createListButton = page.getByRole('link', { name: /nowa lista/i });
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if dashboard has any lists
   */
  async hasLists(): Promise<boolean> {
    return await this.dashboardGrid.isVisible();
  }

  /**
   * Check if empty dashboard is shown
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyDashboard.isVisible();
  }

  /**
   * Get number of lists from dashboard counter
   */
  async getListCount(): Promise<number> {
    if (await this.isEmpty()) {
      return 0;
    }

    const text = await this.listCountText.textContent();
    // Extract number from "X lista/listy/list"
    const match = text?.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get all list cards
   */
  async getListCards(): Promise<ListCardComponent[]> {
    const cardElements = await this.page.locator('[data-test-id="list-card"]').all();
    return cardElements.map((element) => new ListCardComponent(this.page, element));
  }

  /**
   * Find list card by name
   */
  async findListByName(name: string): Promise<ListCardComponent | null> {
    const cards = await this.getListCards();
    
    for (const card of cards) {
      const cardName = await card.getName();
      if (cardName === name) {
        return card;
      }
    }
    
    return null;
  }

  /**
   * Find list card by ID
   */
  async findListById(id: string): Promise<ListCardComponent | null> {
    const cardLocator = this.page.locator(`[data-test-id="list-card"][data-list-id="${id}"]`);
    
    if (!(await cardLocator.isVisible())) {
      return null;
    }
    
    return new ListCardComponent(this.page, cardLocator);
  }

  /**
   * Get first list card
   */
  async getFirstCard(): Promise<ListCardComponent | null> {
    const cardLocator = this.page.locator('[data-test-id="list-card"]').first();
    
    if (!(await cardLocator.isVisible())) {
      return null;
    }
    
    return new ListCardComponent(this.page, cardLocator);
  }

  /**
   * Click create new list button
   */
  async clickCreateList() {
    await this.createListButton.click();
    await this.page.waitForURL('**/lists/new');
  }

  /**
   * Wait for dashboard to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    
    // Wait for either dashboard grid or empty state
    await Promise.race([
      this.dashboardGrid.waitFor({ state: 'visible', timeout: 5000 }),
      this.emptyDashboard.waitFor({ state: 'visible', timeout: 5000 }),
    ]);
  }

  /**
   * Verify list appears on dashboard
   */
  async verifyListExists(name: string, wordCount?: number, category?: string) {
    const card = await this.findListByName(name);
    expect(card).not.toBeNull();

    if (card) {
      const actualName = await card.getName();
      expect(actualName).toBe(name);

      if (wordCount !== undefined) {
        const actualCount = await card.getWordCount();
        expect(actualCount).toBe(wordCount);
      }

      if (category) {
        const actualCategory = await card.getCategory();
        expect(actualCategory?.toLowerCase()).toContain(category.toLowerCase());
      }
    }
  }

  /**
   * Wait for new list to appear (polling)
   */
  async waitForNewList(name: string, timeout = 10000): Promise<ListCardComponent | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const card = await this.findListByName(name);
      if (card) {
        return card;
      }
      
      await this.page.waitForTimeout(500);
      await this.page.reload();
    }
    
    return null;
  }
}
