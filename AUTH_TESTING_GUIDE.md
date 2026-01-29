# Auth Integration - Testing Guide

## Quick Test Checklist

### Prerequisites

```bash
# 1. Ensure env variables are set
cp .env.example .env
# Edit .env with your Supabase credentials

# 2. Apply Supabase migrations (includes delete_current_user_account())
# If you use Supabase CLI linked to the project:
supabase db push

# 3. Configure Supabase Auth
# - Go to Authentication > URL Configuration
# - Add: http://localhost:3000/auth/callback
# - Set Site URL: http://localhost:3000

# 4. Start dev server
npm run dev
```

### Test 1: Magic Link Login Flow ✨

**Steps:**

1. Open http://localhost:3000
2. Enter valid email address
3. Click "Wyślij link do logowania"
4. Check your email inbox
5. Click the magic link
6. Should redirect to `/dashboard`

**Expected Results:**

- ✅ Email sent confirmation
- ✅ Redirect to `/auth/check-email?email=...`
- ✅ Countdown timer shows 60s
- ✅ Magic link email received
- ✅ Click link → `/auth/callback?code=...`
- ✅ Auto redirect to `/dashboard`
- ✅ User authenticated (check user menu)

**Debug:**

```bash
# Check server logs
# Look for: "[send-magic-link]" and "[callback]" logs

# Check Supabase logs
# Dashboard > Authentication > Users (should see new user)
```

### Test 2: Check Email Page with Resend 📧

**Steps:**

1. Complete Test 1 steps 1-3
2. On check-email page, wait for countdown to reach 0
3. Click "Wyślij ponownie"
4. Should send new magic link

**Expected Results:**

- ✅ Countdown starts at 60s
- ✅ "Wyślij ponownie" button disabled during countdown
- ✅ Button enabled when countdown = 0
- ✅ Click resend → shows "Wysyłam..."
- ✅ Success message: "Link został wysłany ponownie!"
- ✅ Countdown resets to 60s

### Test 3: Rate Limiting 🚦

**Steps:**

1. Open http://localhost:3000
2. Submit email 6 times quickly (< 1 minute)
3. 6th request should be blocked

**Expected Results:**

- ✅ First 5 requests: Success
- ✅ 6th request: Error message
- ✅ Shows: "Przekroczono limit prób. Spróbuj ponownie za X sekund."
- ✅ Form disabled with retry countdown

**Debug:**

```bash
# Check rate limiter stats (add to endpoint for debugging)
# Should see entries in emailIpStore and ipStore
```

### Test 4: Error Scenarios ❌

#### A. Invalid Email Format

1. Enter "invalid-email"
2. Try to submit

**Expected:**

- ✅ Shows: "Nieprawidłowy format email"
- ✅ Submit button disabled or blocked at API level

**Fixed Issue:** Initial validation schema incorrectly required full URL for redirectTo. Now accepts both relative paths (`/dashboard`) and full URLs (`http://...`).

#### B. Expired Magic Link

1. Get magic link email
2. Wait 1+ hour (or manipulate DB)
3. Click expired link

**Expected:**

- ✅ Redirect to `/?error=link_expired`
- ✅ Shows: "Link wygasł. Poproś o nowy link do logowania."

#### C. Reused Magic Link

1. Login successfully with magic link
2. Click the same link again

**Expected:**

- ✅ Redirect to `/?error=link_used`
- ✅ Shows: "Ten link został już użyty..."

### Test 5: Logout Flow 🚪

**Steps:**

1. Login successfully (Test 1)
2. Navigate to dashboard
3. Click user menu (top right)
4. Click "Wyloguj się"

**Expected Results:**

- ✅ Shows loading state: "Wylogowywanie..."
- ✅ Redirect to `/`
- ✅ Landing page shows (not authenticated)
- ✅ Can login again immediately

**Debug:**

```bash
# Check browser cookies (DevTools > Application > Cookies)
# Should see Supabase auth cookies removed
```

### Test 6: Delete Account Flow 🗑️

**Steps:**

1. Login successfully
2. Navigate to `/profile`
3. Scroll to "Danger Zone"
4. Click "Usuń konto"
5. Type "USUŃ" in confirmation input
6. Click "Usuń konto" button

**Expected Results:**

- ✅ Modal opens with warning
- ✅ Delete button disabled until "USUŃ" typed
- ✅ Shows loading: "Usuwam..."
- ✅ Redirect to `/?deleted=true`
- ✅ Success message: "Twoje konto zostało trwale usunięte..."
- ✅ Cannot login with same email (account deleted)

**Debug:**

```bash
# Check Supabase Dashboard
# Authentication > Users (user should be deleted)

# Check database
# profiles, lists, tests should cascade delete
```

### Test 7: Protected Routes 🔒

**Steps:**

1. Logout (if logged in)
2. Try to access `/dashboard` directly
3. Try to access `/profile` directly
4. Try to access `/lists/[id]` directly

**Expected Results:**

- ✅ All should redirect to `/?redirect=/intended-url`
- ✅ After login, should redirect to intended URL

### Test 8: Session Persistence 💾

**Steps:**

1. Login successfully
2. Close browser tab
3. Open new tab to http://localhost:3000
4. Should still be logged in (redirect to dashboard)
5. Wait 30 days (or manipulate JWT expiry)
6. Session should expire

**Expected Results:**

- ✅ Session persists across browser sessions
- ✅ Auto-refresh works (Supabase handles)
- ✅ After 30 days → redirect to login

### Test 9: Testing Mode (Dev Only) 🧪

**Steps:**

1. Set `.env`:

```bash
DISABLE_AUTH_FOR_TESTING=true
TEST_USER_EMAIL=test@example.com
```

2. Restart dev server
3. Access any page

**Expected Results:**

- ✅ Console shows: "⚠️ [Auth Middleware] TESTING MODE ACTIVE (dev only)"
- ✅ Test user auto-created/logged in
- ✅ All protected routes accessible
- ✅ Does NOT work in production build

**Cleanup:**

```bash
# Remove or set to false
DISABLE_AUTH_FOR_TESTING=false
```

## Automated Testing (Future)

### Example Playwright Test

```typescript
// tests/auth/magic-link.spec.ts
import { test, expect } from "@playwright/test";

test("magic link login flow", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // Fill email
  await page.fill('input[type="email"]', "test@example.com");
  await page.click('button:has-text("Wyślij link")');

  // Should redirect to check-email
  await expect(page).toHaveURL(/check-email/);

  // TODO: Mock email service to get magic link
  // For now, manual testing required
});
```

## Performance Benchmarks

### Expected Response Times (localhost)

- Magic Link Send: < 500ms
- Callback Processing: < 300ms
- Logout: < 200ms
- Delete Account: < 500ms

### Load Testing

```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/send-magic-link \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done

# Should see 429 after 5th request
```

## Security Checklist

- [ ] Cookies have HttpOnly flag
- [ ] Cookies have Secure flag (production)
- [ ] Cookies have SameSite=Lax
- [ ] Rate limiting works (5 req/15min)
- [ ] Magic links expire after 1 hour
- [ ] Magic links are one-time use
- [ ] Service role key not exposed in client
- [ ] Delete requires confirmation text
- [ ] Testing mode only in development

## Common Issues

### Issue: "Link wygasł" immediately

**Cause:** System clock mismatch
**Fix:** Sync system time with NTP

### Issue: Rate limit not working

**Cause:** In-memory store cleared on restart
**Fix:** Expected behavior for MVP; use Redis for production

### Issue: Delete account fails

**Cause:** Migration not applied / function missing / user not authenticated
**Fix:** Apply migrations (`supabase db push`), check logs for `[delete-account]`, verify `delete_current_user_account()` exists in DB

### Issue: Emails not sending

**Cause:** SMTP not configured
**Fix:** Configure SMTP in Supabase Dashboard > Project Settings > Auth

## Next Steps

After completing manual tests:

1. Document any issues in GitHub Issues
2. Add Playwright E2E tests for critical flows
3. Set up CI/CD pipeline for automated testing
4. Monitor production logs for auth failures

---

**Testing Status:** ✅ Manual testing ready  
**Automated Tests:** ⏳ TODO  
**Last Updated:** 2026-01-29
