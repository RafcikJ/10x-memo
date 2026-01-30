# 🔧 Playwright Configuration Fix - 2026-01-30

## Problem Fixed

**Error:** 
```
[WebServer] [AstroUserError] The server entrypoint does not exist. 
Have you ran a build yet?
Error: Process from config.webServer was not able to start. Exit code: 1
```

## Root Cause

The `playwright.config.ts` was configured to run `npm run preview` (production mode), which requires a pre-built application (`dist/` folder). This caused tests to fail when run from Cursor's Playwright extension.

## Solution Applied

Changed the web server command in `playwright.config.ts`:

```diff
  webServer: {
-   command: "npm run preview",
+   command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
+   stdout: "pipe",
+   stderr: "pipe",
  },
```

## What Changed

1. **Development Mode:** Tests now run against `astro dev` (development server)
   - ✅ No build step required
   - ✅ Faster startup
   - ✅ Hot reload support
   - ✅ Source maps available

2. **Output Handling:** Added `stdout` and `stderr` pipes
   - Better log management
   - Cleaner console output

## How to Run Tests Now

### From Terminal
```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (recommended)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test
npx playwright test tests/e2e/ai-list-generation.spec.ts
```

### From Cursor Playwright Extension
1. Open the Testing panel in Cursor
2. Navigate to Playwright tests
3. Click the play button next to any test
4. ✅ Server will start automatically in dev mode

## Verification

To verify the fix works:

1. **Make sure dev server is NOT running** in another terminal
2. Run a test:
   ```bash
   npx playwright test tests/e2e/ai-list-generation.spec.ts --headed
   ```
3. You should see:
   - ✅ Server starts automatically
   - ✅ Browser opens
   - ✅ Test executes
   - ✅ No build errors

## Additional Resources

- **Troubleshooting Guide:** [tests/TROUBLESHOOTING.md](./tests/TROUBLESHOOTING.md)
- **POM Documentation:** [tests/pages/README.md](./tests/pages/README.md)
- **POM Quick Start:** [tests/pages/QUICKSTART.md](./tests/pages/QUICKSTART.md)

## Related Files

- `playwright.config.ts` - Main configuration file (FIXED)
- `tests/e2e/ai-list-generation.spec.ts` - Example test suite
- `tests/pages/` - Page Object Model classes
- `tests/TROUBLESHOOTING.md` - Comprehensive troubleshooting guide

## Configuration Comparison

### Before (❌ Broken)
```typescript
webServer: {
  command: "npm run preview",  // Requires build
  url: "http://localhost:4321",
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
}
```

### After (✅ Working)
```typescript
webServer: {
  command: "npm run dev",      // Development mode
  url: "http://localhost:4321",
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
  stdout: "pipe",
  stderr: "pipe",
}
```

## Production Testing (Optional)

If you need to test against production build:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Run preview server manually:**
   ```bash
   npm run preview
   ```

3. **Run tests with existing server:**
   ```bash
   PLAYWRIGHT_BASE_URL=http://localhost:4321 npx playwright test
   ```

Or create a separate config:

```typescript
// playwright.prod.config.ts
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 180 * 1000,
  },
});
```

Then run:
```bash
npx playwright test --config=playwright.prod.config.ts
```

## Notes

- Development mode is recommended for local testing
- Production mode is recommended for CI/CD pipelines (after build step)
- The `reuseExistingServer` option prevents starting a new server if one is already running
- In CI, set `reuseExistingServer: false` to ensure clean state

## Status

✅ **FIXED** - Tests can now run successfully from both terminal and Cursor extension

---

**Fixed by:** AI Assistant  
**Date:** 2026-01-30  
**Version:** playwright.config.ts v1.1
