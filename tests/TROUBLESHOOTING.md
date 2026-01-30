# 🔧 Playwright E2E Tests - Troubleshooting Guide

## Common Issues and Solutions

### ❌ Error: "The server entrypoint does not exist. Have you ran a build yet?"

**Full Error:**
```
[WebServer] [AstroUserError] The server entrypoint D:\...\dist\server\entry.mjs does not exist. 
Have you ran a build yet?
Error: Process from config.webServer was not able to start. Exit code: 1
```

**Cause:** Playwright config was trying to run `npm run preview` (production mode) which requires a built application.

**Solution:** ✅ Fixed in `playwright.config.ts`
- Changed `command: "npm run preview"` → `command: "npm run dev"`
- Now uses development server (no build required)

**Manual Fix (if needed):**
```typescript
// playwright.config.ts
webServer: {
  command: "npm run dev",  // ✅ Use dev mode
  url: "http://localhost:4321",
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
}
```

---

### ❌ Error: "Port 4321 is already in use"

**Cause:** Dev server is already running in another terminal.

**Solutions:**
1. **Stop the dev server** in other terminal (`Ctrl+C`)
2. **OR** Set `reuseExistingServer: true` in playwright.config.ts (already configured)
3. **OR** Kill the process:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :4321
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:4321 | xargs kill -9
   ```

**Note:** If Astro automatically uses a different port (e.g., 3001), tests will fail. Always ensure port 4321 is available before running E2E tests.

---

### ❌ Error: "Timeout waiting for http://localhost:4321"

**Cause:** Server takes too long to start or fails silently.

**Solutions:**
1. **Check if port is available:**
   ```bash
   npm run dev
   # Should start successfully
   ```

2. **Increase timeout** in playwright.config.ts:
   ```typescript
   webServer: {
     timeout: 180 * 1000,  // 3 minutes
   }
   ```

3. **Check server logs:**
   - Look for errors in terminal output
   - Check `.astro` folder for build errors

---

### ❌ Error: "No tests found"

**Cause:** Test directory path is incorrect or tests don't match pattern.

**Solutions:**
1. **Verify test directory:**
   ```typescript
   // playwright.config.ts
   testDir: "./tests/e2e",  // Must match your structure
   ```

2. **Check test file naming:**
   - Files must end with `.spec.ts` or `.test.ts`
   - Example: `ai-list-generation.spec.ts` ✅
   - Example: `my-test.ts` ❌

3. **List all tests:**
   ```bash
   npx playwright test --list
   ```

---

### ❌ Error: "Page object imports not found"

**Cause:** TypeScript can't resolve relative imports.

**Solutions:**
1. **Check import path:**
   ```typescript
   // ✅ Correct
   import { ListCreatorPage } from '../pages';
   
   // ❌ Wrong
   import { ListCreatorPage } from './pages';
   ```

2. **Verify file structure:**
   ```
   tests/
   ├── e2e/
   │   └── my-test.spec.ts
   └── pages/
       └── index.ts
   ```

3. **Check tsconfig.json paths** (if using path aliases)

---

### ❌ Error: "Cannot find module '@playwright/test'"

**Cause:** Playwright not installed or installed globally instead of locally.

**Solution:**
```bash
# Install Playwright locally
npm install -D @playwright/test

# Install browsers
npx playwright install chromium
```

---

### ❌ Tests pass locally but fail in CI

**Causes & Solutions:**

1. **Authentication state:**
   - Tests assume authenticated user
   - CI needs auth setup
   
   **Solution:** Create auth setup file
   ```typescript
   // tests/setup/auth.setup.ts
   import { test as setup } from '@playwright/test';
   
   setup('authenticate', async ({ page }) => {
     // Perform authentication
     await page.goto('/');
     // ... auth steps
     await page.context().storageState({ path: 'auth.json' });
   });
   ```

2. **Environment variables:**
   - Missing .env variables in CI
   
   **Solution:** Add secrets in GitHub Actions/CI platform

3. **Timing issues:**
   - CI is slower than local
   
   **Solution:** Increase timeouts, add more waits

---

### ❌ Error: "data-test-id selector not found"

**Cause:** 
- Component doesn't have the attribute
- Wrong selector name
- Element not yet rendered

**Solutions:**

1. **Verify attribute exists:**
   ```bash
   # Check source code
   grep -r "data-test-id=\"ai-generate-button\"" src/
   ```

2. **Add wait before action:**
   ```typescript
   await page.waitForSelector('[data-test-id="ai-generate-button"]');
   await page.locator('[data-test-id="ai-generate-button"]').click();
   ```

3. **Use Page Object Model** (recommended):
   ```typescript
   // ✅ POM handles waits automatically
   const listCreator = new ListCreatorPage(page);
   await listCreator.aiGenerator.generate();
   ```

4. **Check selector reference:**
   - See [SELECTORS.md](./pages/SELECTORS.md) for all available selectors

---

## 🏃 Quick Checks

### Before Running Tests

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Verify dev server works
npm run dev
# Should start on http://localhost:4321

# 4. Stop dev server (Ctrl+C)

# 5. Run tests
npm run test:e2e
```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (recommended for debugging)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/ai-list-generation.spec.ts

# Run specific test by name
npx playwright test -g "should generate AI list"

# Run in headed mode (see browser)
npx playwright test --headed

# Generate test code
npx playwright codegen http://localhost:4321
```

---

## 🔍 Debugging Tips

### 1. Enable Debug Mode
```bash
# Shows Playwright Inspector
npx playwright test --debug
```

### 2. Slow Down Tests
```typescript
test('my test', async ({ page }) => {
  await page.pause(); // Pause execution
  // OR
  test.slow(); // Triple the timeout
});
```

### 3. View Trace
```bash
# After test failure
npx playwright show-trace trace.zip
```

### 4. Check Screenshots
```
playwright-report/
└── screenshots/
    └── test-name-failed.png
```

### 5. Console Logs
```typescript
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
```

### 6. Network Logs
```typescript
page.on('request', request => 
  console.log('>>', request.method(), request.url())
);
```

---

## 📊 Configuration Checklist

- [x] ✅ `playwright.config.ts` uses `npm run dev`
- [x] ✅ Tests in `tests/e2e/*.spec.ts`
- [x] ✅ Page Objects in `tests/pages/`
- [x] ✅ Base URL: `http://localhost:4321`
- [x] ✅ Browser: Chromium
- [x] ✅ Timeout: 30 seconds
- [x] ✅ Retries: 0 (local), 2 (CI)
- [ ] ⏳ Authentication setup (if needed)
- [ ] ⏳ CI/CD configuration (if needed)

---

## 🆘 Still Having Issues?

### 1. Check Dependencies
```bash
npm ls @playwright/test
# Should show version
```

### 2. Clear Cache
```bash
# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Clear Playwright cache
npx playwright cache clear
npx playwright install chromium
```

### 3. Update Playwright
```bash
npm install -D @playwright/test@latest
npx playwright install chromium
```

### 4. Check Node Version
```bash
node --version
# Should be >= 18.x
```

### 5. Verbose Logging
```bash
DEBUG=pw:api npx playwright test
```

---

## 📚 Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [POM Documentation](./pages/README.md)
- [Test Selectors Reference](./pages/SELECTORS.md)
- [Quick Start Guide](./pages/QUICKSTART.md)

---

## 🐛 Reporting Issues

When reporting issues, include:

1. **Error message** (full stack trace)
2. **Command used** (e.g., `npm run test:e2e`)
3. **Environment:**
   - OS and version
   - Node version (`node --version`)
   - Playwright version (`npx playwright --version`)
4. **Test file** (if specific test fails)
5. **Screenshots/traces** (if available)

---

**Last Updated:** 2026-01-30
**Config Version:** playwright.config.ts v1.1
