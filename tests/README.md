# 🧪 Testing Documentation

## Quick Navigation

- **🚀 [Quick Start](../TESTING_QUICKSTART.md)** - Get started in 5 minutes
- **📖 [Getting Started Guide](./GETTING_STARTED.md)** - Practical step-by-step guide
- **🌍 [Environment Overview](../TESTING_ENVIRONMENT.md)** - Complete setup overview
- **📊 [Setup Summary](../TESTING_SUMMARY.md)** - What was configured
- **📝 [Detailed Setup](./TEST_SETUP.md)** - Comprehensive documentation
- **🗄️ [Database Testing](./TEST_DATABASE.md)** - Supabase testing guide
- **🔧 [Environment Setup](./ENV_SETUP.md)** - Environment variables
- **🆘 [Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## 📂 Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/         # React component tests
│   └── services/           # Service layer tests
├── integration/            # Integration tests
├── e2e/                    # End-to-end tests
├── pages/                  # 🆕 Page Object Model (POM)
│   ├── components/         # Reusable component POMs
│   ├── README.md          # Full POM documentation
│   └── QUICKSTART.md      # POM quick start guide
├── helpers/                # Test utilities
├── mocks/                  # MSW mock handlers
└── setup/                  # Global setup files
```

## 🎯 Test Types

| Type | Purpose | Example |
|------|---------|---------|
| **Unit** | Test individual components/functions | Button renders correctly |
| **Integration** | Test multiple parts together | Form submits to API |
| **E2E** | Test full user journeys | User creates and tests a list |

## 🚀 Running Tests

```bash
# Unit tests
npm run test:unit              # Run once
npm run test:unit:watch        # Watch mode (recommended)
npm run test:unit:ui           # UI mode
npm run test:coverage          # With coverage

# E2E tests
npm run test:e2e               # Run all E2E tests
npm run test:e2e:ui            # UI mode
npm run test:e2e:debug         # Debug mode

# All tests
npm run test:all               # Run everything
```

## 📚 Example Tests

Check these files for examples:

- `unit/example.test.tsx` - React component testing patterns
- `unit/services/example-service.test.ts` - Service testing patterns
- `unit/components/example-component.test.tsx` - Advanced component patterns
- `integration/example-integration.test.ts` - Integration with MSW
- `integration/supabase.test.ts` - Database testing
- `e2e/example.spec.ts` - E2E testing patterns
- **🆕 `e2e/ai-list-generation.spec.ts`** - Complete POM-based E2E tests

## 🛠️ Test Utilities

### React Testing
- `helpers/test-utils.tsx` - Custom render functions and utilities

### Playwright Testing
- `helpers/playwright-utils.ts` - E2E test helpers and accessibility checks
- **🆕 `pages/` - Page Object Model (POM)** - Maintainable E2E page abstractions

### Supabase Testing
- `helpers/supabase-test-client.ts` - Database test clients and helpers

### API Mocking
- `mocks/handlers.ts` - MSW request handlers
- `mocks/server.ts` - Node.js MSW server
- `mocks/browser.ts` - Browser MSW worker

## 📖 Documentation Index

### Getting Started
1. **[Quick Start](../TESTING_QUICKSTART.md)** ⚡ - Start here! (5 min)
2. **[Getting Started](./GETTING_STARTED.md)** 📖 - Practical guide (20 min)
3. **🆕 [POM Quick Start](./pages/QUICKSTART.md)** 🎯 - Page Object Model guide (5 min)
4. **🆕 [Test Config Setup](./ENV_TEST_SETUP.md)** ⚙️ - Environment configuration (10 min)

### Reference
4. **[Environment Overview](../TESTING_ENVIRONMENT.md)** 🌍 - What's available
5. **[Setup Summary](../TESTING_SUMMARY.md)** 📊 - What was done
6. **[Detailed Setup](./TEST_SETUP.md)** 📝 - Full documentation
7. **🆕 [POM Documentation](./pages/README.md)** 📚 - Complete POM API reference

### Specialized
8. **[Database Testing](./TEST_DATABASE.md)** 🗄️ - Supabase integration
9. **🆕 [Test Config System](./ENV_TEST_SETUP.md)** ⚙️ - Centralized configuration
10. **[Environment Setup (Legacy)](./ENV_SETUP.md)** 🔧 - Old credentials guide
11. **[Troubleshooting](./TROUBLESHOOTING.md)** 🆘 - Common issues and fixes

## 🎓 Learning Path

### Beginner
1. Read [Quick Start](../TESTING_QUICKSTART.md)
2. Run example tests
3. Read [Getting Started](./GETTING_STARTED.md)
4. Write your first test

### Intermediate
1. Study example tests
2. Learn test utilities in `helpers/`
3. Practice with MSW mocks
4. Write integration tests

### Advanced
1. Set up database testing
2. Write E2E test suites
3. Configure CI/CD
4. Optimize test performance

## 🔗 External Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Axe Accessibility](https://github.com/dequelabs/axe-core-npm)

---

## 📮 API Testing with Postman

For API testing documentation, see [Postman API Tests README](./POSTMAN_API_TESTS.md)
