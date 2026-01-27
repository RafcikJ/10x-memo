# API Endpoint Testing Guide

## Endpoint: POST /api/ai/generate-list

### Prerequisites

1. **Environment Variables** - Create `.env` file with:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=your-openrouter-api-key
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_APP_URL=http://localhost:4321
```

2. **Database Setup** - Run migrations:
```bash
npx supabase db push
```

3. **Install Dependencies**:
```bash
npm install
```

4. **Start Dev Server**:
```bash
npm run dev
```

### Testing Steps

#### 1. Get Authentication Token

First, you need to authenticate and get a Bearer token. Use Supabase magic link or create a test user.

```bash
# Using curl to request magic link
curl -X POST "https://your-project.supabase.co/auth/v1/magiclink" \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{
    "email": "test@example.com"
  }'
```

Check your email and extract the token from the magic link, or use Supabase Dashboard to create a session.

#### 2. Test Successful Generation

```bash
curl -X POST "http://localhost:4321/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "category": "animals",
    "count": 20
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "items": [
    { "position": 1, "display": "Cat" },
    { "position": 2, "display": "Dog" },
    ...
  ]
}
```

#### 3. Test Validation Errors

**Invalid Category:**
```bash
curl -X POST "http://localhost:4321/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "category": "invalid_category",
    "count": 20
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "errors": [
      {
        "field": "category",
        "message": "Invalid category. Must be one of: animals, food, household_items, transport, jobs"
      }
    ]
  }
}
```

**Invalid Count (too low):**
```bash
curl -X POST "http://localhost:4321/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "category": "animals",
    "count": 5
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "errors": [
      {
        "field": "count",
        "message": "count must be at least 10"
      }
    ]
  }
}
```

**Invalid Count (too high):**
```bash
curl -X POST "http://localhost:4321/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "category": "animals",
    "count": 100
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "errors": [
      {
        "field": "count",
        "message": "count must be at most 50"
      }
    ]
  }
}
```

#### 4. Test Unauthorized Access

```bash
curl -X POST "http://localhost:4321/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "animals",
    "count": 20
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

#### 5. Test Rate Limit

Make 6 requests in succession to trigger rate limit:

```bash
# Requests 1-5 should succeed
for i in {1..5}; do
  echo "Request $i:"
  curl -X POST "http://localhost:4321/api/ai/generate-list" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -d '{
      "category": "animals",
      "count": 10
    }'
  echo "\n---\n"
done

# Request 6 should fail with 429
echo "Request 6 (should fail):"
curl -X POST "http://localhost:4321/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "category": "animals",
    "count": 10
  }'
```

**Expected Response for 6th Request (429 Too Many Requests):**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Daily AI generation limit exceeded (5/day)",
  "reset_at": "2026-01-28T00:00:00.000Z"
}
```

### Verification Checklist

- [ ] Successful generation returns 200 with items array
- [ ] Items have correct structure (position, display)
- [ ] Item count matches requested count
- [ ] Invalid category returns 400 validation error
- [ ] Count < 10 returns 400 validation error
- [ ] Count > 50 returns 400 validation error
- [ ] Missing auth token returns 401 unauthorized
- [ ] 6th request in same UTC day returns 429 rate limit
- [ ] Rate limit resets at UTC midnight
- [ ] All categories work (animals, food, household_items, transport, jobs)

### Debugging

**Check Logs:**
```bash
# Server logs will show:
[AI Generate] Request from user: <user-id>
[AI Generate] Generating 20 animals
[AI Generate] Quota consumed. Remaining: 4/5
[AI Generate] Successfully generated 20 items
```

**Check Database:**
```sql
-- Check quota usage
SELECT * FROM ai_usage_daily WHERE user_id = '<user-id>';

-- Should show:
-- user_id | day_utc    | used | created_at | updated_at
-- <uuid>  | 2026-01-27 | 1    | ...        | ...
```

### Common Issues

**1. OpenRouter API Key Missing:**
```json
{
  "error": "ai_service_error",
  "message": "Failed to generate list. Please try again.",
  "retry_after": 30
}
```
**Solution:** Set `OPENROUTER_API_KEY` in `.env`

**2. Supabase Connection Error:**
```json
{
  "error": "quota_check_failed",
  "message": "Failed to verify generation quota. Please try again."
}
```
**Solution:** Check `SUPABASE_URL` and `SUPABASE_KEY` in `.env`

**3. RPC Function Not Found:**
```
PostgresError: function public.consume_ai_generation() does not exist
```
**Solution:** Run migration: `npx supabase db push`

### Next Steps

After successful testing:
1. ✅ Verify all validation rules
2. ✅ Test rate limiting behavior
3. ✅ Test with different categories
4. ✅ Monitor OpenRouter API usage
5. ✅ Prepare for frontend integration
