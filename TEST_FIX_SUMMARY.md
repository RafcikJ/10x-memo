# Test Fix Summary

## Problem

During test execution, the following error occurred:

```
[Auth Middleware] Error getting user: Auth session missing!
TimeoutError: locator.selectOption: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-test-id="ai-category-select"]')
```

## Root Causes

### 1. Authentication Issue (FIXED ✅)
**Problem:** The middleware was using `import.meta.env` to check for test environment variables, but these are not available in server-side code in Astro.

**Solution:** Changed to use `process.env` instead:

**Files Modified:**
- `src/middleware/index.ts` - Changed authentication check to use `process.env.DISABLE_AUTH_FOR_TESTING`
- `src/middleware/index.ts` - Created mock test user instead of trying to authenticate with Supabase
- `playwright.config.ts` - Updated default test user email to `test@playwright.test`

### 2. AI Quota Check Issue (FIXED ✅)
**Problem:** The AI generation API was also using `import.meta.env` to check for testing mode.

**Solution:** Changed to use `process.env`:

**Files Modified:**
- `src/pages/api/ai/generate-list.ts` - Changed quota check bypass to use `process.env.DISABLE_AI_QUOTA_FOR_TESTING`

### 3. Database Schema Missing (REMAINING ❌)
**Problem:** Tests are failing when trying to save lists with error:

```
Could not find the table 'public.lists' in the schema cache
```

**Cause:** The tests are connecting to a Supabase instance that doesn't have the database schema/migrations applied.

**Solution Options:**

#### Option A: Use Local Supabase (Recommended)
1. Start local Supabase:
   ```bash
   npx supabase start
   ```

2. Verify migrations are applied:
   ```bash
   npx supabase db reset
   ```

3. Update `.env.test` with local Supabase credentials:
   ```env
   PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>
   ```

#### Option B: Mock Database Operations
Create mock implementations for database operations in testing mode (more complex, not recommended for E2E tests).

## Test Results

### Passing Tests (6/12) ✅
- ✅ should generate AI list with selected category and word count
- ✅ should display quota information
- ✅ should persist selected category across generation
- ✅ 3 other tests

### Failing Tests (4/12) ❌
All failing tests are related to saving lists to the database:
- ❌ should save list and verify on dashboard
- ❌ should complete full flow using convenience method
- ❌ should handle list item removal
- ❌ should validate required list name when empty

**Common Error:** Database table not found when calling `/api/lists` POST endpoint.

### Skipped Tests (2/12)
- ⏭️ should handle API errors gracefully
- ⏭️ should handle quota exceeded

## Next Steps

1. **Verify Supabase is running:**
   ```bash
   npx supabase status
   ```

2. **If not running, start it:**
   ```bash
   npx supabase start
   ```

3. **Apply migrations:**
   ```bash
   npx supabase db reset
   ```

4. **Update test environment variables** in `.env.test` or `.env.test.local`

5. **Re-run tests:**
   ```bash
   npx playwright test tests/e2e/ai-list-generation.spec.ts --project=chromium
   ```

## Files Modified

1. `src/middleware/index.ts`
   - Changed `import.meta.env.DISABLE_AUTH_FOR_TESTING` → `process.env.DISABLE_AUTH_FOR_TESTING`
   - Changed `import.meta.env.TEST_USER_EMAIL` → `process.env.TEST_USER_EMAIL`
   - Created mock user instead of authenticating with Supabase

2. `src/pages/api/ai/generate-list.ts`
   - Changed `import.meta.env.DISABLE_AI_QUOTA_FOR_TESTING` → `process.env.DISABLE_AI_QUOTA_FOR_TESTING`

3. `playwright.config.ts`
   - Updated default `TEST_USER_EMAIL` to `test@playwright.test`
   - Updated default `TEST_USER_ID` to `00000000-0000-0000-0000-000000000001`

## Technical Details

### Why `import.meta.env` Doesn't Work

In Astro:
- `import.meta.env` only exposes variables prefixed with `PUBLIC_` or explicitly configured in `astro.config.mjs`
- Server-side code (middleware, API routes) should use `process.env` for environment variables
- `import.meta.env` is meant for client-side code and build-time constants

### Mock User Approach

Instead of trying to authenticate a test user with Supabase (which requires email validation), we create a mock user object that matches the Supabase `User` type:

```typescript
cachedTestUser = {
  id: testUserId,
  email: testUserEmail,
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;
```

This allows tests to bypass authentication while still having a valid user object for RLS policies.

---

**Date:** 2026-01-30
**Status:** Partially Fixed (6/12 tests passing)
**Next Action:** Set up local Supabase with migrations
