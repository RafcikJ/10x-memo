# Supabase Edge Functions

## Overview

This directory contains Supabase Edge Functions for secure server-side operations.

## Functions

### `delete-account`

Securely deletes user account using service_role privileges.

**Why Edge Function?**

- Service role key is isolated from application code
- Runs on Supabase infrastructure with proper security
- No risk of exposing service_role in client bundle

**Endpoint:** `POST /functions/v1/delete-account`

**Authentication:** Bearer token (JWT from Supabase Auth)

**Request:**

```json
{
  "confirmation": "USUŃ"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Konto zostało trwale usunięte"
}
```

**Response (Error):**

```json
{
  "error": "validation_error",
  "message": "Nieprawidłowe potwierdzenie. Wpisz dokładnie: USUŃ"
}
```

## Deployment

### Prerequisites

1. Install Supabase CLI:

```bash
npm install -g supabase
```

2. Login to Supabase:

```bash
supabase login
```

3. Link to your project:

```bash
supabase link --project-ref your-project-ref
```

### Deploy Function

```bash
# Deploy the function
supabase functions deploy delete-account

# Set required environment secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Verify Deployment

```bash
# List all functions
supabase functions list

# View logs
supabase functions logs delete-account

# Test function
curl -X POST https://your-project.supabase.co/functions/v1/delete-account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmation":"USUŃ"}'
```

## Local Development

### Run Functions Locally

```bash
# Start Supabase locally (includes Edge Functions)
supabase start

# Serve functions locally
supabase functions serve delete-account

# Function will be available at:
# http://localhost:54321/functions/v1/delete-account
```

### Testing Locally

```bash
# Get a test JWT token from your local Supabase
# (login via your app, check browser localStorage)

# Test the function
curl -X POST http://localhost:54321/functions/v1/delete-account \
  -H "Authorization: Bearer YOUR_LOCAL_JWT" \
  -H "Content-Type: application/json" \
  -d '{"confirmation":"USUŃ"}'
```

## Monitoring

### View Logs

```bash
# Real-time logs
supabase functions logs delete-account --tail

# Recent logs
supabase functions logs delete-account
```

### Common Issues

**Issue:** "Unauthorized"

- **Cause:** Invalid or missing JWT token
- **Fix:** Ensure Authorization header contains valid Bearer token

**Issue:** "Environment variable not set"

- **Cause:** Missing secrets
- **Fix:** Set all required secrets with `supabase secrets set`

**Issue:** "Function not found"

- **Cause:** Function not deployed or project not linked
- **Fix:** Re-run `supabase link` and `supabase functions deploy`

## Security Considerations

1. **Service Role Key**: Never expose in client code
2. **JWT Validation**: Function validates JWT before any operations
3. **Confirmation Required**: Must match exact text "USUŃ"
4. **CORS**: Configured for browser requests
5. **Rate Limiting**: Inherits Supabase Auth rate limits

## Related Documentation

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Auth Integration Guide](../../AUTH_INTEGRATION.md)
- [Auth Spec](../../.ai/auth-spec.md)
