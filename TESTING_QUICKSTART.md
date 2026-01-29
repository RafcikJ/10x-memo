# 🚀 Testing Quick Start

Get started with testing in 5 minutes!

## ⚡ Super Quick Start

```bash
# 1. Run unit tests
npm run test:unit

# 2. Run tests in watch mode (recommended for development)
npm run test:unit:watch

# 3. Run tests with UI
npm run test:unit:ui
```

That's it! You're ready to write tests. 🎉

## 📝 Write Your First Test

Create a file `src/components/MyComponent.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

Run it:

```bash
npm run test:unit
```

## 🎭 E2E Testing Quick Start

```bash
# 1. Build the app
npm run build

# 2. Run E2E tests (will start preview server automatically)
npm run test:e2e
```

## 📚 Example Tests

Check these files for examples:

- **Unit Tests:** `tests/unit/example.test.tsx`
- **Service Tests:** `tests/unit/services/example-service.test.ts`
- **Integration Tests:** `tests/integration/example-integration.test.ts`
- **E2E Tests:** `tests/e2e/example.spec.ts`

## 🧰 Useful Commands

```bash
# Unit Tests
npm run test:unit              # Run once
npm run test:unit:watch        # Watch mode
npm run test:unit:ui           # UI mode
npm run test:coverage          # With coverage

# E2E Tests
npm run test:e2e               # Run all E2E tests
npm run test:e2e:ui            # UI mode
npm run test:e2e:debug         # Debug mode
npm run test:e2e:report        # View last report

# Run All
npm run test:all               # Unit + E2E
```

## 💡 Pro Tips

### For Unit Tests:
1. Use `it.only()` to run a single test
2. Use `describe.skip()` to skip a test group
3. Use `--ui` flag for visual test runner
4. Use `--coverage` to see what's tested

### For E2E Tests:
1. Use `--debug` to step through tests
2. Use `--ui` for interactive mode
3. Check `playwright-report/` for failure details
4. Use `page.pause()` to pause during test

## 🗂️ Where to Put Tests

```
Unit Tests:
├── tests/unit/                    # General unit tests
├── tests/unit/components/         # Component tests
├── tests/unit/services/           # Service/logic tests
└── src/**/*.test.tsx              # Co-located with components

Integration Tests:
└── tests/integration/             # Tests with database/APIs

E2E Tests:
└── tests/e2e/                     # End-to-end tests
```

## 🎯 Testing Checklist

When writing a new feature:

- [ ] Write unit tests for logic/services
- [ ] Write component tests for UI
- [ ] Write integration test if using API/database
- [ ] Write E2E test for critical user flows
- [ ] Run `npm run test:all` before committing

## 🔧 Need Help?

- **Full Setup Guide:** [TESTING_ENVIRONMENT.md](./TESTING_ENVIRONMENT.md)
- **Database Testing:** [tests/TEST_DATABASE.md](./tests/TEST_DATABASE.md)
- **Environment Setup:** [tests/ENV_SETUP.md](./tests/ENV_SETUP.md)
- **Detailed Docs:** [tests/TEST_SETUP.md](./tests/TEST_SETUP.md)

## 🐛 Common Issues

### Tests fail with "Cannot find module"
**Solution:** Check your import paths use `@/` alias

### E2E tests timeout
**Solution:** Build app first with `npm run build`

### Database tests fail
**Solution:** Start local Supabase with `npx supabase start`

## 📖 Next Steps

1. ✅ Run example tests to verify setup
2. ✅ Read through example test files
3. ✅ Write tests for your first component
4. ✅ Set up database testing (optional)
5. ✅ Configure CI/CD to run tests

---

**Happy Testing! 🧪**
