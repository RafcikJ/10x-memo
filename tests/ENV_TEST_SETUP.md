# Test Environment Configuration Guide

## 📋 Overview

Test configuration is managed through a centralized system that supports multiple layers:

1. **Default values** - Defined in `tests/test.config.ts`
2. **`.env.test`** - Project test defaults (committed to git)
3. **`.env.test.local`** - User-specific overrides (gitignored)
4. **Environment variables** - Runtime overrides (highest priority)

## 🚀 Quick Start

### 1. Create Local Configuration

Create `.env.test` in project root:

```bash
# Copy example file
cp .env.test.example .env.test
```

### 2. Add User-Specific Overrides (Optional)

Create `.env.test.local` for personal settings:

```bash
touch .env.test.local
```

Example `.env.test.local`:
```env
# Override for slower debugging
PLAYWRIGHT_SLOWMO=500
PLAYWRIGHT_HEADED=true

# Your local Supabase keys
PUBLIC_SUPABASE_ANON_KEY=your-actual-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

### 3. Get Supabase Keys

Start local Supabase to get keys:

```bash
npx supabase start
```

Output includes:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Add these to `.env.test.local`.

## 📁 Configuration Files

### `.env.test` (Committed)
Default test configuration for the whole team.

**What to include:**
- ✅ Default URLs and ports
- ✅ Default timeouts
- ✅ Test database names
- ✅ Default Supabase demo keys (local only)
- ✅ Feature flags

**What NOT to include:**
- ❌ Real API keys
- ❌ Production credentials
- ❌ Personal preferences

### `.env.test.local` (Gitignored)
Personal overrides and secrets.

**What to include:**
- ✅ Your local Supabase keys
- ✅ Your OpenRouter API key (if testing AI)
- ✅ Personal debugging preferences
- ✅ Local port changes

**What NOT to include:**
- ❌ Production secrets
- ❌ Team-wide defaults

### `tests/test.config.ts` (Committed)
TypeScript configuration loader.

**Features:**
- Type-safe configuration
- Environment variable loading
- Default fallbacks
- Export for use in tests

## 🔧 Available Configuration Options

### Playwright E2E Tests

```env
# Base URL for E2E tests
PLAYWRIGHT_BASE_URL=http://localhost:4321

# Test timeout (milliseconds)
PLAYWRIGHT_TIMEOUT=30000

# Browser to use (chromium, firefox, webkit)
PLAYWRIGHT_BROWSER=chromium

# Show browser (true/false)
PLAYWRIGHT_HEADED=false

# Slow down actions for debugging (milliseconds)
PLAYWRIGHT_SLOWMO=0

# Screenshots (on, off, only-on-failure)
SAVE_SCREENSHOTS=only-on-failure

# Videos (on, off, retain-on-failure)
SAVE_VIDEOS=retain-on-failure

# Traces (on, off, on-first-retry, retain-on-failure)
SAVE_TRACES=on-first-retry
```

### Supabase Configuration

```env
# Local Supabase instance
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Test Users

```env
# Regular test user
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Admin test user
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!
```

### API Configuration

```env
# OpenRouter API (for AI integration tests)
OPENROUTER_API_KEY=your-key-here
```

### Database

```env
# Test database name
TEST_DATABASE_NAME=test_db

# Clean database between tests (true/false)
TEST_CLEANUP_ENABLED=true
```

### Debugging

```env
# Enable debug logs (true/false)
DEBUG=false

# Verbose output (true/false)
VERBOSE=false
```

## 💻 Usage in Tests

### E2E Tests (Playwright)

Configuration is automatically loaded via `playwright.config.ts`:

```typescript
// No imports needed - config is global
test('my test', async ({ page }) => {
  // baseURL, timeout, etc. are pre-configured
  await page.goto('/dashboard');
});
```

### Unit/Integration Tests

Import configuration directly:

```typescript
import { testConfig } from './test.config';

// Access configuration
console.log('Base URL:', testConfig.e2e.baseURL);
console.log('Supabase URL:', testConfig.supabase.url);
console.log('Test user:', testConfig.testUsers.regular.email);
```

### Page Objects

```typescript
import { testConfig } from '../test.config';

export class MyPage {
  constructor(page: Page) {
    this.page = page;
  }
  
  async goto() {
    // Use configured base URL
    await this.page.goto(testConfig.e2e.baseURL);
  }
}
```

## 🔄 Configuration Priority

When multiple sources define the same variable:

```
Environment Variables  (highest priority)
        ↓
.env.test.local
        ↓
.env.test
        ↓
test.config.ts defaults  (lowest priority)
```

Example:
```bash
# .env.test
PLAYWRIGHT_TIMEOUT=30000

# .env.test.local
PLAYWRIGHT_TIMEOUT=60000

# Environment variable
export PLAYWRIGHT_TIMEOUT=90000

# Result: 90000 (env var wins)
```

## 🧪 Testing Your Configuration

### Check Loaded Values

```typescript
// tests/config-check.test.ts
import { test } from '@playwright/test';
import { testConfig } from './test.config';

test('Check configuration', () => {
  console.log('E2E Config:', testConfig.e2e);
  console.log('Supabase Config:', testConfig.supabase);
  console.log('Test Users:', testConfig.testUsers);
});
```

Run:
```bash
npx playwright test config-check.test.ts
```

### Override at Runtime

```bash
# Override base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e

# Enable headed mode
PLAYWRIGHT_HEADED=true npm run test:e2e:ui

# Slow down for debugging
PLAYWRIGHT_SLOWMO=1000 PLAYWRIGHT_HEADED=true npm run test:e2e
```

## 📝 Example Configurations

### Development (Default)
```env
# .env.test
PLAYWRIGHT_BASE_URL=http://localhost:4321
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_HEADED=false
```

### Debugging
```env
# .env.test.local
PLAYWRIGHT_HEADED=true
PLAYWRIGHT_SLOWMO=500
DEBUG=true
VERBOSE=true
```

### CI/CD
```env
# Set in GitHub Actions
PLAYWRIGHT_TIMEOUT=60000
TEST_CLEANUP_ENABLED=true
CI=true
```

### Production Testing
```env
# .env.test.production
PLAYWRIGHT_BASE_URL=https://staging.example.com
PLAYWRIGHT_TIMEOUT=60000
TEST_CLEANUP_ENABLED=false
```

## 🔒 Security Best Practices

1. **Never commit secrets**
   - Use `.env.test.local` for real keys
   - `.env.test.local` is in `.gitignore`

2. **Use test keys only**
   - Never point tests at production
   - Use local Supabase instance
   - Use OpenRouter keys with spending limits

3. **Rotate keys regularly**
   - Test keys should be rotated
   - Don't share keys in chat/docs

4. **Validate environment**
   ```typescript
   if (testConfig.supabase.url.includes('production')) {
     throw new Error('Cannot run tests against production!');
   }
   ```

## 🐛 Troubleshooting

### Configuration not loading

**Check:**
1. File name is exactly `.env.test` (no .txt extension)
2. File is in project root (not in `tests/`)
3. Restart test process after changes
4. Check for syntax errors (no quotes needed for values)

### Environment variables not working

**Solutions:**
```bash
# Print loaded config
node -e "require('./tests/test.config.js').default.e2e"

# Check if file exists
ls -la .env.test

# Check file encoding (should be UTF-8)
file .env.test
```

### Supabase connection fails

**Check:**
1. Is Supabase running? `npx supabase status`
2. Are keys correct in `.env.test.local`?
3. Is URL correct? Should be `http://127.0.0.1:54321`

## 🔗 Related Documentation

- [Playwright Configuration](../playwright.config.ts)
- [Test Config Source](./test.config.ts)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Environment Setup (Legacy)](./ENV_SETUP.md)

## 📦 Files Structure

```
projekt_zaliczeniowy/
├── .env.test                 # Team defaults (committed)
├── .env.test.example         # Template file
├── .env.test.local           # User secrets (gitignored)
├── playwright.config.ts      # Loads from test.config
└── tests/
    ├── test.config.ts        # Central configuration
    └── ENV_TEST_SETUP.md     # This file
```

---

**Last Updated:** 2026-01-30
**Version:** 1.0
