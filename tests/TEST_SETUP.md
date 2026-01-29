# Test Setup Documentation

This document provides comprehensive information about the testing setup for this project.

## 🛠️ Testing Stack

### Unit & Integration Tests
- **Vitest** - Fast unit test framework with native ESM support
- **@testing-library/react** - Testing utilities for React components
- **@testing-library/user-event** - Advanced user interaction simulation
- **@testing-library/jest-dom** - Custom DOM matchers
- **jsdom** - DOM implementation for Node.js
- **MSW (Mock Service Worker)** - API mocking library

### E2E Tests
- **Playwright** - Modern E2E testing framework
- **@axe-core/playwright** - Accessibility testing

## 📁 Directory Structure

```
tests/
├── setup/                 # Global setup files
│   ├── vitest.setup.ts   # Vitest global configuration
│   └── playwright.setup.ts # Playwright global setup
├── helpers/              # Test utilities and helpers
│   ├── test-utils.tsx    # React testing utilities
│   └── playwright-utils.ts # Playwright utilities
├── mocks/                # MSW mock handlers
│   ├── handlers.ts       # API mock definitions
│   ├── server.ts         # Node.js MSW server
│   └── browser.ts        # Browser MSW worker
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── e2e/                  # End-to-end tests
```

## 🚀 Getting Started

### 1. Install Dependencies

All testing dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Install Playwright Browsers

For E2E tests, install Chromium:

```bash
npm run playwright:install
```

### 3. Run Tests

#### Unit Tests
```bash
# Run once
npm run test:unit

# Watch mode
npm run test:unit:watch

# With UI
npm run test:unit:ui

# With coverage
npm run test:coverage
```

#### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# With UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# View report
npm run test:e2e:report
```

#### All Tests
```bash
npm run test:all
```

## 📝 Writing Tests

### Unit Tests

Create test files with `.test.ts` or `.test.tsx` extension:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Tests

Create test files with `.spec.ts` extension in `tests/e2e/`:

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
});
```

## 🎭 Mocking with MSW

### Setup Mock Handlers

Edit `tests/mocks/handlers.ts` to add your API mocks:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/data', () => {
    return HttpResponse.json({ data: 'mocked' });
  }),
];
```

### Use in Tests

```typescript
import { setupMockServer } from '../mocks/server';

setupMockServer();

describe('My Test', () => {
  it('should fetch data', async () => {
    const response = await fetch('/api/data');
    const data = await response.json();
    expect(data).toEqual({ data: 'mocked' });
  });
});
```

## 🎯 Best Practices

### Unit Tests
1. Test behavior, not implementation
2. Use descriptive test names
3. Follow AAA pattern (Arrange, Act, Assert)
4. Mock external dependencies
5. Keep tests isolated and independent

### E2E Tests
1. Use Page Object Model for reusability
2. Use locators over CSS selectors
3. Wait for elements properly
4. Test critical user journeys
5. Include accessibility checks

### General
1. Run tests before committing
2. Aim for meaningful coverage, not 100%
3. Keep tests fast and focused
4. Use proper test data
5. Clean up after tests

## 🔧 Configuration Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/setup/vitest.setup.ts` - Global Vitest setup
- `tests/setup/playwright.setup.ts` - Global Playwright setup

## 📊 Coverage

Coverage reports are generated in the `coverage/` directory:

```bash
npm run test:coverage
```

Open `coverage/index.html` in your browser to view the report.

## 🐛 Debugging

### Vitest
- Use `it.only()` to run a single test
- Use `console.log()` for quick debugging
- Use VS Code debugging with breakpoints

### Playwright
- Use `--debug` flag for step-by-step execution
- Use `page.pause()` to pause execution
- Check `playwright-report/` for failure screenshots

## 🔗 Useful Links

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Axe Accessibility](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)

## 📞 Support

If you encounter issues:
1. Check the example tests in `tests/unit/` and `tests/e2e/`
2. Review the helpers in `tests/helpers/`
3. Consult the official documentation
4. Ask the team for help
