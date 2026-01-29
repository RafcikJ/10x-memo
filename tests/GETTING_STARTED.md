# 🎓 Getting Started with Testing

A practical guide to start testing this project.

## 📍 You Are Here

You've got a complete testing environment set up. This guide will help you:
1. Verify everything works
2. Understand the test structure
3. Write your first real test
4. Run tests effectively

## ✅ Step 1: Verify Setup (2 minutes)

### Run Example Tests

```bash
# Terminal 1: Unit tests
npm run test:unit:watch
```

You should see:
```
✓ tests/unit/example.test.tsx (8 tests)
✓ tests/unit/services/example-service.test.ts (9 tests)
```

✅ **If tests pass, your unit testing is ready!**

### Try E2E Tests

```bash
# Build first
npm run build

# Run E2E
npm run test:e2e
```

✅ **If tests pass, your E2E testing is ready!**

## 📖 Step 2: Understand Test Structure (5 minutes)

### Where Tests Live

```
Your Project
├── src/
│   └── components/
│       └── Button.tsx              👈 Your component
└── tests/
    ├── unit/
    │   └── components/
    │       └── Button.test.tsx     👈 Your test
    ├── integration/
    └── e2e/
        └── button-flow.spec.ts     👈 E2E test
```

### Test Types Explained

| Type | What It Tests | Example |
|------|---------------|---------|
| **Unit** | Single component/function in isolation | Button renders correctly |
| **Integration** | Multiple parts working together | Form submits to API |
| **E2E** | Full user journey | User logs in and creates list |

## ✏️ Step 3: Write Your First Test (10 minutes)

Let's test a real component from your project!

### Example: Test the Button Component

**File:** `tests/unit/components/Button.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
  });

  it('should handle clicks', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should support variants', () => {
    render(<Button variant="destructive">Delete</Button>);
    
    const button = screen.getByRole('button');
    // Check if variant class is applied
    expect(button.className).toContain('destructive');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Can't click</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

**Run it:**

```bash
npm run test:unit -- tests/unit/components/Button.test.tsx
```

### Example: Test a Service

**File:** `tests/unit/services/ai-quota.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkQuota, consumeQuota } from '@/lib/services/ai-quota';

describe('AI Quota Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check remaining quota', async () => {
    // Mock Supabase response
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { remaining_quota: 5 },
              error: null,
            }),
          }),
        }),
      }),
    };

    // Test quota check
    // Implementation depends on your actual service
    expect(true).toBe(true); // Placeholder
  });
});
```

### Example: E2E Test

**File:** `tests/e2e/create-list.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Create List Flow', () => {
  test('should create a manual list', async ({ page }) => {
    await page.goto('/');
    
    // Login (if needed)
    // await login(page, 'test@example.com');
    
    // Navigate to create list
    await page.goto('/lists/new');
    
    // Switch to manual mode
    await page.click('[data-testid="manual-mode"]');
    
    // Enter list name
    await page.fill('input[name="name"]', 'Test List');
    
    // Paste items
    await page.fill('textarea', 'Apple\nBanana\nCherry');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify list appears
    await expect(page.locator('text=Test List')).toBeVisible();
  });
});
```

## 🎯 Step 4: Run Tests Effectively (5 minutes)

### Development Workflow

**Best practice:** Keep tests running in watch mode

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Tests in watch mode
npm run test:unit:watch
```

**Why?** Tests re-run automatically when you change code. Instant feedback!

### Before Committing

```bash
# Run all tests
npm run test:all

# Check coverage
npm run test:coverage

# Open coverage report
open coverage/index.html
```

### Debugging Failed Tests

**Unit Tests:**

```bash
# Run single test file
npm run test:unit -- tests/unit/components/Button.test.tsx

# Run single test by name
npm run test:unit -- -t "should handle clicks"

# UI mode for debugging
npm run test:unit:ui
```

**E2E Tests:**

```bash
# Debug mode (step through test)
npm run test:e2e:debug

# UI mode (visual debugging)
npm run test:e2e:ui

# See last report
npm run test:e2e:report
```

## 🎨 Test Patterns for This Project

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  it('should...', async () => {
    // Setup user interaction
    const user = userEvent.setup();
    
    // Render
    render(<MyComponent />);
    
    // Find elements (prefer accessible queries)
    const button = screen.getByRole('button', { name: 'Click me' });
    const input = screen.getByLabelText('Email');
    
    // Interact
    await user.type(input, 'test@example.com');
    await user.click(button);
    
    // Assert
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

### Testing with Supabase

```typescript
import { createTestSupabaseClient } from '../helpers/supabase-test-client';

describe('Lists API', () => {
  it('should fetch user lists', async () => {
    const client = createTestSupabaseClient();
    
    const { data, error } = await client
      .from('lists')
      .select('*')
      .eq('user_id', 'test-user-id');
    
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

### Testing with MSW (Mock API)

```typescript
import { setupMockServer } from '../mocks/server';

// Enable MSW
setupMockServer();

describe('AI Generation', () => {
  it('should generate list with OpenRouter', async () => {
    // MSW will intercept the request
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Generate nouns' }),
    });
    
    const data = await response.json();
    expect(data.choices).toBeDefined();
  });
});
```

## 📚 Common Test Scenarios

### ✅ Testing Forms

```typescript
it('should validate email', async () => {
  const user = userEvent.setup();
  render(<AuthForm />);
  
  // Invalid email
  await user.type(screen.getByLabelText('Email'), 'invalid');
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  
  // Should show error
  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});
```

### ✅ Testing Navigation

```typescript
test('should navigate to dashboard', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Dashboard');
  await expect(page).toHaveURL('/dashboard');
});
```

### ✅ Testing Authentication

```typescript
test('should login with magic link', async ({ page }) => {
  await page.goto('/');
  
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/auth/check-email');
  await expect(page.locator('text=Check your email')).toBeVisible();
});
```

## 🎯 Your Testing Checklist

When adding a new feature:

- [ ] Write unit tests for logic/services
- [ ] Write component tests for UI elements
- [ ] Write integration test if using API
- [ ] Write E2E test for critical user flows
- [ ] Run `npm run test:coverage` to check coverage
- [ ] Run `npm run test:all` before pushing

## 🆘 Need Help?

### Quick References
- `TESTING_QUICKSTART.md` - 5-minute guide
- `TESTING_ENVIRONMENT.md` - Full overview
- `tests/TEST_SETUP.md` - Detailed docs
- `tests/TEST_DATABASE.md` - Database testing
- Example tests in `tests/unit/`, `tests/e2e/`

### External Resources
- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Docs](https://playwright.dev/)
- [MSW Docs](https://mswjs.io/)

## 🚀 Next Steps

1. ✅ Run example tests
2. ✅ Pick a component to test
3. ✅ Write your first test
4. ✅ Set up watch mode
5. ✅ Add tests to your workflow

---

**You're ready to start testing! 🎊**

*Keep tests simple, focused, and fast. Test behavior, not implementation.*
