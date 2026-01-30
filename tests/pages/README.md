# Page Object Model (POM) Documentation

## 📚 Overview

This directory contains Page Object Model (POM) classes for E2E testing with Playwright. The POM pattern provides a clean, maintainable way to interact with UI elements in tests.

## 🏗️ Structure

```
tests/pages/
├── index.ts                           # Central exports
├── README.md                          # This file
├── ListCreatorPage.ts                 # /lists/new page
├── DashboardPage.ts                   # /dashboard page
└── components/
    ├── AiGeneratorFormComponent.ts    # AI generation form
    ├── ListPreviewComponent.ts        # List preview & save
    └── ListCardComponent.ts           # Dashboard list card
```

## 📄 Page Objects

### 1. ListCreatorPage

Represents the `/lists/new` page with AI generator and list preview.

**Usage:**
```typescript
import { ListCreatorPage } from '../pages';

const listCreator = new ListCreatorPage(page);
await listCreator.goto();

// Full flow
await listCreator.generateAndSaveList('food', 15, 'My Food List');

// Step by step
await listCreator.aiGenerator.selectCategory('animals');
await listCreator.aiGenerator.setWordCount(20);
await listCreator.aiGenerator.generate();
await listCreator.listPreview.waitForPreview();
await listCreator.listPreview.saveAs('Animal List');
```

**Key Methods:**
- `goto()` - Navigate to page
- `generateAndSaveList(category, wordCount, name)` - Complete flow
- `generateListPreview(category, wordCount)` - Generate without saving
- `getRemainingQuota()` - Get AI quota
- `switchToAiMode()` / `switchToManualMode()` - Change creation mode

**Sub-components:**
- `aiGenerator: AiGeneratorFormComponent`
- `listPreview: ListPreviewComponent`

---

### 2. DashboardPage

Represents the `/dashboard` page with list cards.

**Usage:**
```typescript
import { DashboardPage } from '../pages';

const dashboard = new DashboardPage(page);
await dashboard.goto();

// Find and interact with lists
const card = await dashboard.findListByName('My List');
await card?.click();

// Verify list exists
await dashboard.verifyListExists('My List', 15, 'food');

// Get all cards
const cards = await dashboard.getListCards();
console.log(`Found ${cards.length} lists`);
```

**Key Methods:**
- `goto()` - Navigate to dashboard
- `hasLists()` - Check if any lists exist
- `isEmpty()` - Check if empty state shown
- `getListCount()` - Get count from UI
- `getListCards()` - Get all card components
- `findListByName(name)` - Find specific card
- `findListById(id)` - Find card by ID
- `verifyListExists(name, wordCount?, category?)` - Verify list data
- `clickCreateList()` - Navigate to list creator

---

### 3. AiGeneratorFormComponent

Represents the AI generation form component.

**Usage:**
```typescript
import { AiGeneratorFormComponent } from '../pages/components/AiGeneratorFormComponent';

const aiForm = new AiGeneratorFormComponent(page);

// Fill and generate
await aiForm.selectCategory('food');
await aiForm.setWordCount(20);
await aiForm.generate();

// Or use convenience method
await aiForm.fillAndGenerate('food', 20);

// Check state
const quota = await aiForm.getRemainingQuota();
const hasError = await aiForm.hasError();
```

**Key Methods:**
- `selectCategory(category)` - Select from dropdown
- `setWordCount(count)` - Set slider value (10-50)
- `generate()` - Click generate and wait
- `fillAndGenerate(category, count)` - Convenience method
- `getRemainingQuota()` - Get quota number
- `hasQuotaWarning()` - Check if quota is 0
- `getErrorMessage()` - Get error text
- `isLoading()` - Check loading state

**Categories:**
- `'animals'` - Zwierzęta
- `'food'` - Jedzenie
- `'household_items'` - Przedmioty domowe
- `'transport'` - Transport
- `'jobs'` - Zawody

---

### 4. ListPreviewComponent

Represents the list preview section with draft items.

**Usage:**
```typescript
import { ListPreviewComponent } from '../pages/components/ListPreviewComponent';

const preview = new ListPreviewComponent(page);

await preview.waitForPreview();
await preview.setListName('My List');

// Inspect items
const items = await preview.getItems();
const wordCount = await preview.getWordCount();

// Modify items
await preview.removeItem(1);

// Save
await preview.save();
```

**Key Methods:**
- `waitForPreview(timeout?)` - Wait for section to appear
- `isVisible()` - Check visibility
- `getWordCount()` - Get count from title
- `setListName(name)` - Set list name
- `getListName()` - Get current name
- `getItems()` - Get all items as array
- `getItem(position)` - Get specific item
- `removeItem(position)` - Delete item
- `getItemCount()` - Count items
- `save()` - Click save button
- `saveAs(name)` - Set name and save
- `verifyPreview(wordCount, name?)` - Verify data

**Types:**
```typescript
interface ListItem {
  position: number;
  text: string;
}
```

---

### 5. ListCardComponent

Represents a single list card on dashboard.

**Usage:**
```typescript
import { ListCardComponent } from '../pages/components/ListCardComponent';

// Usually obtained from DashboardPage
const card = await dashboard.getFirstCard();

// Get data
const name = await card.getName();
const count = await card.getWordCount();
const category = await card.getCategory();
const score = await card.getLastScore();

// Interact
await card.click(); // Navigate to test
await card.hover();

// Verify
await card.verify({
  name: 'My List',
  wordCount: 15,
  category: 'food',
});
```

**Key Methods:**
- `getId()` - Get list ID
- `getName()` - Get list name
- `getWordCount()` - Get word count
- `getCategory()` - Get category (null if none)
- `getLastScore()` - Get score percentage (null if none)
- `hasProgress()` - Check if progress bar visible
- `click()` - Navigate to test page
- `getUrl()` - Get link href
- `verify(expectedData)` - Verify card data
- `screenshot(path?)` - Take screenshot

---

## 🎯 Complete Example Test

```typescript
import { test, expect } from '@playwright/test';
import { ListCreatorPage, DashboardPage } from '../pages';

test('Complete AI list generation flow', async ({ page }) => {
  // Setup
  const listCreator = new ListCreatorPage(page);
  const dashboard = new DashboardPage(page);
  const uniqueName = `Test ${Date.now()}`;

  // Step 1: Navigate to list creator
  await listCreator.goto();

  // Step 2: Select category
  await listCreator.aiGenerator.selectCategory('food');

  // Step 3: Set word count
  await listCreator.aiGenerator.setWordCount(15);

  // Step 4: Verify displayed count
  const displayedCount = await listCreator.aiGenerator.getDisplayedWordCount();
  expect(displayedCount).toBe(15);

  // Step 5: Generate list
  await listCreator.aiGenerator.generate();

  // Step 6: Wait for preview
  await listCreator.listPreview.waitForPreview();

  // Step 7: Verify preview word count
  const previewCount = await listCreator.listPreview.getWordCount();
  expect(previewCount).toBe(15);

  // Step 8: Set list name
  await listCreator.listPreview.setListName(uniqueName);

  // Step 9: Save list
  await listCreator.listPreview.save();

  // Step 10: Wait for redirect
  await page.waitForURL('**/dashboard');

  // Step 11: Verify on dashboard
  await dashboard.waitForLoad();
  
  // Step 12: Find card
  const card = await dashboard.findListByName(uniqueName);
  expect(card).not.toBeNull();

  // Step 13: Verify card data
  await card?.verify({
    name: uniqueName,
    wordCount: 15,
    category: 'jedzenie',
  });
});
```

## 🔧 Best Practices

### 1. Use Page Objects in Tests
```typescript
// ✅ Good
const listCreator = new ListCreatorPage(page);
await listCreator.aiGenerator.selectCategory('food');

// ❌ Bad
await page.locator('[data-test-id="ai-category-select"]').selectOption('food');
```

### 2. Chain Related Actions
```typescript
// ✅ Good
await listCreator.generateAndSaveList('food', 15, 'My List');

// ⚠️ Acceptable for detailed tests
await listCreator.aiGenerator.fillAndGenerate('food', 15);
await listCreator.listPreview.saveAs('My List');
```

### 3. Use Type-Safe Selectors
```typescript
// ✅ Good - uses data-test-id
this.categorySelect = page.locator('[data-test-id="ai-category-select"]');

// ⚠️ Avoid - fragile
this.categorySelect = page.locator('select').first();
```

### 4. Verify State Changes
```typescript
// ✅ Good
await listCreator.aiGenerator.setWordCount(20);
const displayed = await listCreator.aiGenerator.getDisplayedWordCount();
expect(displayed).toBe(20);

// ❌ Bad - no verification
await listCreator.aiGenerator.setWordCount(20);
```

### 5. Handle Async Operations
```typescript
// ✅ Good
await listCreator.listPreview.waitForPreview();
const items = await listCreator.listPreview.getItems();

// ❌ Bad - might fail
const items = await listCreator.listPreview.getItems();
```

## 🧪 Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/ai-list-generation.spec.ts

# Run in UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Generate test code
npx playwright codegen http://localhost:4321
```

## 📊 Coverage

Current POM coverage:
- ✅ List Creator Page (`/lists/new`)
- ✅ Dashboard Page (`/dashboard`)
- ✅ AI Generator Form Component
- ✅ List Preview Component
- ✅ List Card Component
- ⏳ Test Runner Page (`/lists/[id]/test`) - TODO
- ⏳ Auth Pages (`/`, `/auth/callback`) - TODO

## 🔗 Related Files

- Test specs: `tests/e2e/*.spec.ts`
- Playwright config: `playwright.config.ts`
- Test helpers: `tests/helpers/playwright-utils.ts`
- Components with data-test-id:
  - `src/components/AiGeneratorForm.tsx`
  - `src/components/ListCreator.tsx`
  - `src/components/ListCard.astro`
  - `src/components/DashboardGrid.astro`

## 🐛 Troubleshooting

### Tests fail with "locator not found"
- Check if component uses correct `data-test-id` attribute
- Verify authentication state (some pages require login)
- Add wait conditions: `await locator.waitFor({ state: 'visible' })`

### Flaky tests
- Use built-in waits: `waitForPreview()`, `waitForLoad()`
- Avoid `page.waitForTimeout()` when possible
- Use `expect(locator).toBeVisible()` instead of checking manually

### Can't find newly created list
- Use `waitForNewList(name)` which includes polling
- Ensure proper navigation: `await page.waitForURL('**/dashboard')`
- Check network: `await page.waitForLoadState('networkidle')`

## 📝 Contributing

When adding new pages:
1. Create page class in `tests/pages/`
2. Create component classes in `tests/pages/components/`
3. Add exports to `tests/pages/index.ts`
4. Write example test in `tests/e2e/`
5. Update this README

### Page Object Template

```typescript
import { type Page, type Locator, expect } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly myElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myElement = page.locator('[data-test-id="my-element"]');
  }

  async goto() {
    await this.page.goto('/my-path');
    await this.page.waitForLoadState('networkidle');
  }

  async myAction() {
    await this.myElement.click();
  }

  async getMyData(): Promise<string> {
    return await this.myElement.textContent() || '';
  }
}
```
