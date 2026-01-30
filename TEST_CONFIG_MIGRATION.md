# Test Configuration Migration Guide

## 🎉 What Changed?

We've migrated from scattered environment variables to a centralized test configuration system.

### Before (Old Way)
- Environment variables set manually
- No type safety
- Hard to discover what's available
- Configuration scattered across files

### After (New Way) ✅
- Centralized `tests/test.config.ts`
- Type-safe configuration
- Single source of truth
- Layered overrides (.env.test, .env.test.local, env vars)

## 📁 New File Structure

```
projekt_zaliczeniowy/
├── .env.test                    # 🆕 Team defaults (to be created)
├── .env.test.local              # 🆕 User secrets (optional, gitignored)
├── playwright.config.ts         # ✅ Updated to use test.config
└── tests/
    ├── test.config.ts           # 🆕 Central configuration
    ├── ENV_TEST_SETUP.md        # 🆕 Configuration guide
    ├── CREATE_ENV_TEST.md       # 🆕 Setup instructions
    └── ENV_SETUP.md             # 📝 Legacy guide (still valid)
```

## 🚀 Quick Migration Steps

### Step 0: Install dotenv

The configuration system requires the `dotenv` package:

```bash
npm install -D dotenv
```

### Step 1: Create .env.test

Follow instructions in [tests/CREATE_ENV_TEST.md](./tests/CREATE_ENV_TEST.md)

**Quick command (Windows PowerShell):**
```powershell
# Run from project root
. .\tests\CREATE_ENV_TEST.md  # See file for copy-paste commands
```

**Quick command (Linux/Mac):**
```bash
# Run from project root
cat tests/CREATE_ENV_TEST.md  # See file for copy-paste commands
```

### Step 2: (Optional) Create .env.test.local

For personal overrides:

```env
# .env.test.local
PLAYWRIGHT_HEADED=true
PLAYWRIGHT_SLOWMO=500
DEBUG=true
```

### Step 3: Run Tests

```bash
npm run test:e2e
```

Configuration is now loaded automatically!

## 📊 Configuration Comparison

### Old Way (Still Works)
```bash
# Set env vars manually
export PLAYWRIGHT_BASE_URL=http://localhost:4321
export PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
npm run test:e2e
```

### New Way (Recommended) ✅
```bash
# Configuration loaded from .env.test
npm run test:e2e

# Override if needed
PLAYWRIGHT_HEADED=true npm run test:e2e
```

## 🔧 What's Configurable?

### Playwright Settings
```typescript
import { testConfig } from './tests/test.config';

testConfig.e2e.baseURL         // Base URL
testConfig.e2e.timeout         // Test timeout
testConfig.e2e.browser         // Browser choice
testConfig.e2e.headed          // Show browser
testConfig.e2e.slowMo          // Slow down actions
```

### Supabase Settings
```typescript
testConfig.supabase.url        // Supabase URL
testConfig.supabase.anonKey    // Anonymous key
testConfig.supabase.serviceRoleKey  // Admin key
```

### Test Users
```typescript
testConfig.testUsers.regular.email     // Test user email
testConfig.testUsers.regular.password  // Test user password
testConfig.testUsers.admin.email       // Admin email
testConfig.testUsers.admin.password    // Admin password
```

### API Configuration
```typescript
testConfig.api.openRouterKey   // OpenRouter API key
testConfig.api.useMocks        // Use mocks vs real API
```

## 📝 Usage Examples

### In E2E Tests
```typescript
// Configuration is automatic via playwright.config.ts
test('my test', async ({ page }) => {
  // baseURL, timeout, etc. are pre-configured
  await page.goto('/dashboard');
});
```

### In Page Objects
```typescript
import { testConfig } from '../test.config';

export class MyPage {
  async waitForLoad() {
    await this.page.waitForTimeout(
      testConfig.debug.verbose ? 1000 : 0
    );
  }
}
```

### In Setup Files
```typescript
import { testConfig } from './test.config';

// Create test user
const { email, password } = testConfig.testUsers.regular;
await createUser(email, password);
```

## 🎯 Benefits

### 1. Type Safety
```typescript
// ✅ Autocomplete works
testConfig.e2e.baseURL

// ❌ Typo caught at compile time
testConfig.e2e.baseUrl  // Error!
```

### 2. Documentation
```typescript
// Hover over any config to see docs
testConfig.e2e.timeout  // Shows: "Test timeout in milliseconds"
```

### 3. Defaults
```typescript
// No need to set everything
// Sensible defaults are provided
testConfig.e2e.headed  // false by default
```

### 4. Layered Overrides
```
.env.test          → Team defaults
.env.test.local    → Your preferences
Environment vars   → Runtime overrides
```

## 🔄 Migration Checklist

- [ ] Read [ENV_TEST_SETUP.md](./tests/ENV_TEST_SETUP.md)
- [ ] Create `.env.test` in project root
- [ ] (Optional) Create `.env.test.local` for secrets
- [ ] Start local Supabase: `npx supabase start`
- [ ] Copy Supabase keys to `.env.test.local`
- [ ] Run tests: `npm run test:e2e`
- [ ] Verify configuration loaded correctly
- [ ] Update team documentation if needed

## 🆘 Troubleshooting

### Tests still work without .env.test?

✅ **That's correct!** Default values in `test.config.ts` ensure tests work out of the box.

### Need to debug configuration?

```typescript
// Add to any test file
import { testConfig } from './test.config';
console.log('Loaded config:', testConfig);
```

### Environment variables not loading?

1. Check file is in project root (not in `tests/`)
2. File name is exactly `.env.test`
3. Restart test process after changes
4. Check for syntax errors (no quotes needed)

### Want to use old method?

✅ **Still supported!** You can continue setting environment variables manually. The new system adds convenience, not requirements.

## 📚 Additional Resources

- **[ENV_TEST_SETUP.md](./tests/ENV_TEST_SETUP.md)** - Complete configuration guide
- **[CREATE_ENV_TEST.md](./tests/CREATE_ENV_TEST.md)** - Step-by-step setup
- **[test.config.ts](./tests/test.config.ts)** - Configuration source code
- **[playwright.config.ts](./playwright.config.ts)** - Playwright integration
- **[TROUBLESHOOTING.md](./tests/TROUBLESHOOTING.md)** - Common issues

## 🎓 Best Practices

### Do ✅
- Use `.env.test` for team defaults
- Use `.env.test.local` for secrets
- Commit `.env.test` to git (no secrets)
- Use testConfig in code (type-safe)
- Override at runtime for specific needs

### Don't ❌
- Don't commit `.env.test.local`
- Don't put production secrets in any .env file
- Don't hardcode URLs in test files
- Don't ignore the type system

## 🚀 Next Steps

1. **Read the guides** - [ENV_TEST_SETUP.md](./tests/ENV_TEST_SETUP.md)
2. **Create your config** - [CREATE_ENV_TEST.md](./tests/CREATE_ENV_TEST.md)
3. **Run tests** - `npm run test:e2e`
4. **Customize** - Add `.env.test.local` for your needs

---

**Migration Date:** 2026-01-30  
**Version:** 1.0  
**Status:** ✅ Complete and backwards compatible
