# Page Object Model - Quick Start Guide

## 🚀 5-Minute Quick Start

### 1. Import Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { ListCreatorPage, DashboardPage } from '../pages';
```

### 2. Create Your First Test

```typescript
test('Generate and save AI list', async ({ page }) => {
  // Initialize page objects
  const listCreator = new ListCreatorPage(page);
  const dashboard = new DashboardPage(page);

  // Navigate to list creator
  await listCreator.goto();

  // Generate list using convenience method
  const listName = `My List ${Date.now()}`;
  await listCreator.generateAndSaveList('food', 15, listName);

  // Verify on dashboard
  await dashboard.verifyListExists(listName, 15, 'food');
});
```

### 3. Run Test

```bash
npx playwright test tests/e2e/my-test.spec.ts --headed
```

---

## 📖 Common Patterns

### Pattern 1: Generate AI List

```typescript
test('Generate AI list', async ({ page }) => {
  const listCreator = new ListCreatorPage(page);
  await listCreator.goto();

  // Option A: Use convenience method (recommended)
  await listCreator.generateAndSaveList('animals', 20, 'Animals List');

  // Option B: Step by step (for detailed testing)
  await listCreator.aiGenerator.selectCategory('animals');
  await listCreator.aiGenerator.setWordCount(20);
  await listCreator.aiGenerator.generate();
  await listCreator.listPreview.waitForPreview();
  await listCreator.listPreview.saveAs('Animals List');
});
```

### Pattern 2: Verify Dashboard

```typescript
test('Verify list on dashboard', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  // Find and verify card
  const card = await dashboard.findListByName('My List');
  expect(card).not.toBeNull();

  await card?.verify({
    name: 'My List',
    wordCount: 15,
    category: 'food',
  });
});
```

### Pattern 3: Interact with List Items

```typescript
test('Modify list items', async ({ page }) => {
  const listCreator = new ListCreatorPage(page);
  await listCreator.goto();

  // Generate
  await listCreator.generateListPreview('food', 10);

  // Get items
  const items = await listCreator.listPreview.getItems();
  console.log('Generated items:', items);

  // Remove first item
  await listCreator.listPreview.removeItem(1);

  // Verify count
  const newCount = await listCreator.listPreview.getItemCount();
  expect(newCount).toBe(9);
});
```

### Pattern 4: Check Quota

```typescript
test('Check AI quota', async ({ page }) => {
  const listCreator = new ListCreatorPage(page);
  await listCreator.goto();

  const quota = await listCreator.getRemainingQuota();
  console.log(`Remaining quota: ${quota}/5`);

  expect(quota).toBeGreaterThanOrEqual(0);
  expect(quota).toBeLessThanOrEqual(5);
});
```

---

## 🎯 Real-World Example

```typescript
import { test, expect } from '@playwright/test';
import { ListCreatorPage, DashboardPage } from '../pages';

test.describe('Complete User Journey', () => {
  test('User creates multiple lists and verifies them', async ({ page }) => {
    const listCreator = new ListCreatorPage(page);
    const dashboard = new DashboardPage(page);

    // Create first list
    await listCreator.goto();
    const foodList = `Food ${Date.now()}`;
    await listCreator.generateAndSaveList('food', 15, foodList);

    // Verify first list on dashboard
    await dashboard.waitForLoad();
    await dashboard.verifyListExists(foodList, 15, 'jedzenie');

    // Create second list
    await dashboard.clickCreateList();
    const animalList = `Animals ${Date.now()}`;
    await listCreator.generateAndSaveList('animals', 20, animalList);

    // Verify both lists on dashboard
    await dashboard.waitForLoad();
    const cards = await dashboard.getListCards();
    expect(cards.length).toBeGreaterThanOrEqual(2);

    // Find and click first list
    const card = await dashboard.findListByName(foodList);
    await card?.click();

    // Should navigate to test page
    await page.waitForURL('**/test');
  });
});
```

---

## 🔍 Available Page Objects

| Page Object | Import | Description |
|-------------|--------|-------------|
| `ListCreatorPage` | `import { ListCreatorPage } from '../pages'` | `/lists/new` - Create new lists |
| `DashboardPage` | `import { DashboardPage } from '../pages'` | `/dashboard` - View all lists |
| `AiGeneratorFormComponent` | `import { AiGeneratorFormComponent } from '../pages'` | AI generation form |
| `ListPreviewComponent` | `import { ListPreviewComponent } from '../pages'` | List preview & save |
| `ListCardComponent` | `import { ListCardComponent } from '../pages'` | Individual list card |

---

## 📚 Key Methods Cheat Sheet

### ListCreatorPage
```typescript
await listCreator.goto()
await listCreator.generateAndSaveList(category, count, name)
await listCreator.generateListPreview(category, count)
await listCreator.getRemainingQuota()
await listCreator.switchToAiMode()
```

### DashboardPage
```typescript
await dashboard.goto()
await dashboard.hasLists()
await dashboard.getListCards()
await dashboard.findListByName(name)
await dashboard.verifyListExists(name, count, category)
await dashboard.clickCreateList()
```

### AiGeneratorFormComponent
```typescript
await aiForm.selectCategory('food')
await aiForm.setWordCount(15)
await aiForm.generate()
await aiForm.fillAndGenerate('food', 15)
await aiForm.getRemainingQuota()
```

### ListPreviewComponent
```typescript
await preview.waitForPreview()
await preview.setListName('My List')
await preview.getItems()
await preview.removeItem(1)
await preview.save()
await preview.saveAs('My List')
```

### ListCardComponent
```typescript
await card.getName()
await card.getWordCount()
await card.getCategory()
await card.click()
await card.verify({ name, wordCount, category })
```

---

## 🎬 Categories

Available noun categories:

```typescript
type NounCategory = 
  | 'animals'           // Zwierzęta
  | 'food'              // Jedzenie
  | 'household_items'   // Przedmioty domowe
  | 'transport'         // Transport
  | 'jobs'              // Zawody
```

---

## ⚡ Quick Tips

1. **Always use `data-test-id` selectors** - They're stable and reliable
2. **Use convenience methods** - `generateAndSaveList()` is faster than manual steps
3. **Wait for state** - Use `waitForPreview()`, `waitForLoad()` before assertions
4. **Unique names** - Use `Date.now()` for unique list names in tests
5. **Verify results** - Always check dashboard after creating lists

---

## 🔗 Next Steps

- Read full [README.md](./README.md) for detailed API documentation
- Check [ai-list-generation.spec.ts](../e2e/ai-list-generation.spec.ts) for more examples
- Learn about [Playwright best practices](https://playwright.dev/docs/best-practices)
- Explore [test helpers](../helpers/playwright-utils.ts) for utilities

---

## 🆘 Need Help?

**Common issues:**
- **Test timeout?** Add waits: `await page.waitForLoadState('networkidle')`
- **Element not found?** Check authentication state
- **Flaky tests?** Use built-in waits instead of `waitForTimeout()`

**Resources:**
- [Full POM Documentation](./README.md)
- [Playwright Docs](https://playwright.dev/)
- [Project Testing Guide](../README.md)
