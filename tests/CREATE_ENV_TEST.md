# Creating .env.test Files

## 📝 Instructions

Since `.env` files are gitignored, you need to create them manually.

### 1. Create .env.test (Project Root)

Create file: `.env.test` in project root with this content:

```env
# Test Environment Variables
# This file contains test-specific configuration

# ===================================
# PLAYWRIGHT E2E TESTS
# ===================================

PLAYWRIGHT_BASE_URL=http://localhost:4321
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_BROWSER=chromium
PLAYWRIGHT_HEADED=false
PLAYWRIGHT_SLOWMO=0

# ===================================
# SUPABASE (LOCAL INSTANCE)
# ===================================

# Default local Supabase keys (work out of the box)
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# ===================================
# TEST USER CREDENTIALS
# ===================================

TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!

# ===================================
# OPENROUTER API (Optional)
# ===================================

OPENROUTER_API_KEY=

# ===================================
# TEST DATABASE
# ===================================

TEST_DATABASE_NAME=test_db
TEST_CLEANUP_ENABLED=true

# ===================================
# DEBUGGING
# ===================================

DEBUG=false
VERBOSE=false
SAVE_TRACES=on-first-retry
SAVE_SCREENSHOTS=only-on-failure
SAVE_VIDEOS=retain-on-failure
```

### 2. Create .env.test.local (Optional, Project Root)

For personal overrides and secrets:

```env
# Personal Test Configuration
# This file is gitignored - safe for secrets

# Enable debugging
PLAYWRIGHT_HEADED=true
PLAYWRIGHT_SLOWMO=500
DEBUG=true

# Your actual Supabase keys (from: npx supabase start)
PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here

# Your OpenRouter API key (if testing AI)
OPENROUTER_API_KEY=your-api-key-here
```

## 🚀 Quick Command

### Windows (PowerShell)
```powershell
# Create .env.test
@"
PLAYWRIGHT_BASE_URL=http://localhost:4321
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_BROWSER=chromium
PLAYWRIGHT_HEADED=false
PLAYWRIGHT_SLOWMO=0
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!
OPENROUTER_API_KEY=
TEST_DATABASE_NAME=test_db
TEST_CLEANUP_ENABLED=true
DEBUG=false
VERBOSE=false
SAVE_TRACES=on-first-retry
SAVE_SCREENSHOTS=only-on-failure
SAVE_VIDEOS=retain-on-failure
"@ | Out-File -FilePath .env.test -Encoding UTF8
```

### Linux/Mac (Bash)
```bash
cat > .env.test << 'EOF'
PLAYWRIGHT_BASE_URL=http://localhost:4321
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_BROWSER=chromium
PLAYWRIGHT_HEADED=false
PLAYWRIGHT_SLOWMO=0
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!
OPENROUTER_API_KEY=
TEST_DATABASE_NAME=test_db
TEST_CLEANUP_ENABLED=true
DEBUG=false
VERBOSE=false
SAVE_TRACES=on-first-retry
SAVE_SCREENSHOTS=only-on-failure
SAVE_VIDEOS=retain-on-failure
EOF
```

## ✅ Verification

### 1. Check if files were created

```bash
# List files
ls -la .env.test*

# Should show:
# .env.test (created)
# .env.test.local (optional)
```

### 2. Ensure dotenv is installed

The test configuration requires the `dotenv` package:

```bash
# Check if installed
npm list dotenv

# If not installed, install it:
npm install -D dotenv
```

## 🔄 Getting Supabase Keys

1. Start local Supabase:
```bash
npx supabase start
```

2. Copy the keys from output:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Update `.env.test.local`:
```env
PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-here>
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>
```

## 🎯 Testing Configuration

Run this test to verify config is loaded:

```bash
npm run test:e2e
```

If config is not loaded, check:
1. File is in project root (not in `tests/`)
2. File name is exactly `.env.test` (no .txt)
3. Encoding is UTF-8
4. No syntax errors in file

## 📚 More Information

- [ENV_TEST_SETUP.md](./ENV_TEST_SETUP.md) - Complete configuration guide
- [test.config.ts](./test.config.ts) - Configuration loader source
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

---

**Note:** The default Supabase keys in `.env.test` are public demo keys that work with local Supabase out of the box. They are safe to commit to git as they only work locally.
