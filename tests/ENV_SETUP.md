# Environment Variables Setup for Tests

## 📋 Overview

Tests may require environment variables for:
- Supabase connection (local instance)
- OpenRouter API (for integration tests)
- Base URLs for E2E tests

## 🔧 Setup Instructions

### 1. Create Local Environment File

Create a file named `.env.test.local` in the `tests/` directory:

```bash
# From project root
touch tests/.env.test.local
```

### 2. Add Test Credentials

Edit `tests/.env.test.local` with the following:

```env
# Local Supabase (get these from: npx supabase start)
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-here>
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>

# OpenRouter API (optional - for AI integration tests)
OPENROUTER_API_KEY=<your-test-api-key>

# Base URL for E2E tests (optional - defaults to localhost:4321)
PLAYWRIGHT_BASE_URL=http://localhost:4321
```

### 3. Get Supabase Keys

Start local Supabase to get the keys:

```bash
npx supabase start
```

Output will include:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Copy these values to your `.env.test.local` file.

## 🚀 Usage

### In Unit/Integration Tests

```typescript
// Environment variables are automatically loaded
import { createTestSupabaseClient } from './helpers/supabase-test-client';

const client = createTestSupabaseClient();
// Uses PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY
```

### In E2E Tests

```typescript
// Playwright uses PLAYWRIGHT_BASE_URL from config
// Set in playwright.config.ts or via env var
```

## 🔒 Security Notes

1. **Never commit** `.env.test.local` - it's in `.gitignore`
2. **Use test keys only** - not production credentials
3. **Local Supabase only** - never point tests to production database
4. **Low limits** - use OpenRouter keys with spending limits

## 📝 Example Files

- `.env.test.example` - Template with all variables
- Copy and rename to `.env.test.local`
- Fill in actual values

## ✅ Verification

Test your setup:

```bash
# Start local Supabase
npx supabase start

# Run integration tests
npm run test:unit -- tests/integration/supabase.test.ts

# Should connect successfully
```

## 🐛 Troubleshooting

### Issue: "Cannot connect to Supabase"

**Check:**
1. Is Supabase running? `npx supabase status`
2. Are URLs correct in `.env.test.local`?
3. Are keys copied correctly (no extra spaces)?

### Issue: "Environment variables not loading"

**Solution:**
- Restart test process
- Verify file is named exactly `.env.test.local`
- Check file is in `tests/` directory

### Issue: "API rate limit exceeded"

**Solution:**
- Use MSW mocks instead of real API calls
- Check OpenRouter key has sufficient credits
- Reduce number of API tests

## 🔗 Related Documentation

- [Test Setup Guide](./TEST_SETUP.md)
- [Database Testing](./TEST_DATABASE.md)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
