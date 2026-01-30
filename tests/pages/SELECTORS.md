# Test Selectors Reference

Quick reference for all `data-test-id` selectors used in the application.

## 🎯 AI Generator Form

| Selector | Element | Component |
|----------|---------|-----------|
| `ai-category-select` | Category dropdown | `<select>` |
| `ai-word-count-slider` | Word count slider | `<input type="range">` |
| `ai-word-count-display` | Displayed count | `<span>` |
| `ai-quota-indicator` | Quota container | `<div>` |
| `ai-quota-remaining` | Quota text | `<span>` |
| `ai-generate-button` | Generate button | `<Button>` |
| `ai-error-message` | Error message | `<div>` |

**File:** `src/components/AiGeneratorForm.tsx`

---

## 📋 List Preview

| Selector | Element | Component |
|----------|---------|-----------|
| `list-preview-section` | Preview container | `<div>` |
| `list-preview-word-count` | Title with count | `<h2>` |
| `list-name-input` | List name input | `<input type="text">` |
| `list-preview-items` | Items container | `<div>` |
| `list-item-{position}` | Individual item | `<div>` (dynamic) |
| `list-save-error` | Save error message | `<div>` |
| `list-save-button` | Save button | `<button>` |

**File:** `src/components/ListCreator.tsx`

**Note:** `list-item-{position}` uses dynamic position numbers, e.g., `list-item-1`, `list-item-2`, etc.

---

## 📊 Dashboard

| Selector | Element | Component |
|----------|---------|-----------|
| `dashboard-grid` | Main dashboard container | `<div>` |
| `dashboard-list-count` | List count text | `<p>` |
| `dashboard-cards-container` | Cards grid container | `<div>` |

**File:** `src/components/DashboardGrid.astro`

---

## 🃏 List Card

| Selector | Element | Component | Attributes |
|----------|---------|-----------|------------|
| `list-card` | Card container | `<article>` | `data-list-id="{id}"` |
| `list-card-name` | List name | `<h3>` | |
| `list-card-word-count` | Word count | `<span>` | |
| `list-card-category` | Category | `<span>` | conditional |

**File:** `src/components/ListCard.astro`

**Note:** Cards also have `data-list-id` attribute with the list UUID.

---

## 🔍 Selector Usage Examples

### Playwright

```typescript
// AI Generator Form
await page.locator('[data-test-id="ai-category-select"]').selectOption('food');
await page.locator('[data-test-id="ai-word-count-slider"]').fill('15');
await page.locator('[data-test-id="ai-generate-button"]').click();

// List Preview
await page.locator('[data-test-id="list-name-input"]').fill('My List');
await page.locator('[data-test-id="list-save-button"]').click();

// Dashboard
const cards = await page.locator('[data-test-id="list-card"]').all();
const firstCard = page.locator('[data-test-id="list-card"]').first();
const cardName = await firstCard.locator('[data-test-id="list-card-name"]').textContent();

// Find card by list ID
const card = page.locator('[data-test-id="list-card"][data-list-id="uuid-here"]');

// Find specific list item
await page.locator('[data-test-id="list-item-3"]').waitFor();
```

### Using Page Object Model (Recommended)

```typescript
import { ListCreatorPage, DashboardPage } from '../pages';

// Much cleaner!
const listCreator = new ListCreatorPage(page);
await listCreator.aiGenerator.selectCategory('food');
await listCreator.aiGenerator.setWordCount(15);
await listCreator.aiGenerator.generate();

const dashboard = new DashboardPage(page);
const card = await dashboard.findListByName('My List');
```

---

## 🎨 Selector Patterns

### Pattern 1: Component-scoped selectors

```typescript
// Get all items within preview section
const preview = page.locator('[data-test-id="list-preview-section"]');
const items = preview.locator('[data-test-id^="list-item-"]');
```

### Pattern 2: Dynamic selectors

```typescript
// Access item by position
const position = 5;
const item = page.locator(`[data-test-id="list-item-${position}"]`);
```

### Pattern 3: Composite selectors

```typescript
// Find card by ID and get its name
const listId = 'abc-123';
const name = await page
  .locator(`[data-test-id="list-card"][data-list-id="${listId}"]`)
  .locator('[data-test-id="list-card-name"]')
  .textContent();
```

### Pattern 4: Starts-with selector

```typescript
// Get all list items (any position)
const allItems = page.locator('[data-test-id^="list-item-"]');
const count = await allItems.count();
```

---

## 🔒 Selector Stability

All selectors follow best practices:

✅ **Stable:** Use `data-test-id` attributes (won't break with styling changes)
✅ **Semantic:** Names describe the element's purpose
✅ **Unique:** Each selector targets a specific element
✅ **Documented:** All selectors are listed here

❌ **Avoid:**
- CSS class selectors (can change with styling)
- Complex XPath expressions (hard to maintain)
- Text-based selectors (break with translations)
- nth-child/nth-of-type (fragile)

---

## 📝 Adding New Selectors

When adding new `data-test-id` attributes:

1. **Follow naming convention:**
   ```
   {component}-{element}-{detail}
   
   Examples:
   - ai-category-select
   - list-preview-section
   - dashboard-cards-container
   ```

2. **Use kebab-case** (lowercase with dashes)

3. **Make it descriptive** but concise

4. **Update this document** with new selectors

5. **Create/update POM class** if needed

---

## 🧪 Testing Checklist

When writing E2E tests, ensure:

- [ ] Use `data-test-id` selectors (not classes or IDs)
- [ ] Prefer Page Object Model over direct selectors
- [ ] Add waits for dynamic content (`waitFor`, `waitForSelector`)
- [ ] Handle loading states properly
- [ ] Verify state changes after actions
- [ ] Use unique identifiers for test data (e.g., `Date.now()`)

---

## 🔗 Related Documentation

- [Page Object Model Documentation](./README.md)
- [POM Quick Start Guide](./QUICKSTART.md)
- [E2E Test Examples](../e2e/ai-list-generation.spec.ts)
- [Component Files with selectors](../../src/components/)

---

## 🆘 Troubleshooting

### Selector not found
1. Check if element is visible: `await locator.waitFor({ state: 'visible' })`
2. Verify authentication state (protected pages)
3. Check if element is conditional (error messages, categories)
4. Use Playwright Inspector: `npx playwright test --debug`

### Wrong element selected
1. Check for duplicate selectors (shouldn't happen with proper naming)
2. Scope to parent container first
3. Use `.first()` or `.nth(n)` if multiple matches expected

### Flaky selectors
1. Add proper waits before interaction
2. Wait for network idle: `await page.waitForLoadState('networkidle')`
3. Use built-in expect matchers: `await expect(locator).toBeVisible()`
