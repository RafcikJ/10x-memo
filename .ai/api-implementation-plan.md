# Complete API Implementation Plan

## Table of Contents

1. [Overview](#1-overview)
2. [Custom Astro API Endpoints](#2-custom-astro-api-endpoints)
   - 2.1 [POST /api/ai/generate-list](#21-post-apiaigenerate-list)
   - 2.2 [DELETE /api/account](#22-delete-apiaccount)
3. [PostgreSQL RPC Functions](#3-postgresql-rpc-functions)
   - 3.1 [touch_list](#31-touch_list)
   - 3.2 [complete_test](#32-complete_test)
   - 3.3 [consume_ai_generation](#33-consume_ai_generation)
4. [Supabase-Managed Endpoints Configuration](#4-supabase-managed-endpoints-configuration)
   - 4.1 [Authentication Endpoints](#41-authentication-endpoints)
   - 4.2 [Profile Management](#42-profile-management)
   - 4.3 [List Management](#43-list-management)
   - 4.4 [List Items Management](#44-list-items-management)
   - 4.5 [Test Management](#45-test-management)
5. [Common Implementation Patterns](#5-common-implementation-patterns)
6. [Testing Strategy](#6-testing-strategy)

---

## 1. Overview

This document provides comprehensive implementation guidance for all API endpoints in the word list learning application. The API follows a hybrid architecture:

**Architecture Components:**

- **Custom Astro API Routes** (`/api/*`): Complex business logic, AI integration
- **PostgreSQL RPC Functions**: Atomic database operations with business rules
- **Supabase PostgREST** (`/rest/v1/*`): Automatic CRUD with Row Level Security
- **Supabase Auth** (`/auth/v1/*`): Magic link authentication

**Key Principles:**

1. Security-first: All endpoints require authentication, RLS enforces data isolation
2. Validation: Zod schemas for all inputs
3. Error handling: Early returns, guard clauses, consistent error responses
4. Service layer: Extract business logic from route handlers
5. Type safety: Leverage TypeScript DTOs throughout

---

## 2. Custom Astro API Endpoints

### 2.1 POST /api/ai/generate-list

#### Overview

Generates a word list using AI (OpenRouter.ai) with daily quota enforcement (5/day per user). Returns word list for client-side review before saving.

#### Request Details

- **Method:** POST
- **URL:** `/api/ai/generate-list`
- **Authentication:** Required (Bearer token)
- **Content-Type:** application/json

**Parameters:**

- Required:
  - `category` (NounCategory): One of ["animals", "food", "household_items", "transport", "jobs"]
  - `count` (number): Integer between 10 and 50

**Request Body:**

```json
{
  "category": "animals",
  "count": 20
}
```

#### Utilized Types

```typescript
import type {
  GenerateListRequestDTO,
  GenerateListResponseDTO,
  GeneratedListItem,
  ErrorResponse,
  RateLimitErrorResponse,
  NounCategory,
} from "@/types";
```

#### Response Details

**Success Response (200 OK):**

```json
{
  "success": true,
  "items": [
    {"position": 1, "display": "Cat"},
    {"position": 2, "display": "Dog"},
    ...
  ]
}
```

**Error Responses:**

- **400 Bad Request:** Invalid parameters

```json
{
  "error": "validation_error",
  "message": "count must be between 10 and 50"
}
```

- **401 Unauthorized:** Missing/invalid authentication

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

- **429 Too Many Requests:** Daily limit exceeded

```json
{
  "error": "rate_limit_exceeded",
  "message": "daily ai generation limit exceeded (5/day)",
  "reset_at": "2026-01-27T00:00:00Z"
}
```

- **500 Internal Server Error:** AI service failure

```json
{
  "error": "ai_service_error",
  "message": "Failed to generate list. Please try again.",
  "retry_after": 30
}
```

#### Data Flow

1. **Authentication Check**
   - Extract user from `context.locals.supabase.auth.getUser()`
   - Return 401 if unauthenticated

2. **Input Validation (Zod)**
   - Validate category enum
   - Validate count range (10-50)
   - Return 400 with field-specific errors

3. **Quota Check**
   - Call `consume_ai_generation()` RPC
   - Return 429 if limit exceeded
   - Decrement available quota

4. **AI Generation**
   - Call OpenRouter.ai API with category-specific prompt
   - Request exactly `count` words
   - Set timeout (30 seconds)

5. **Content Filtering**
   - Check for profanity (basic filter)
   - Validate completeness (received count matches requested)
   - Retry once if incomplete (max 1 retry)

6. **Response Construction**
   - Map AI response to `GeneratedListItem[]`
   - Add position numbers (1..N)
   - Return success response

#### Security Considerations

**Authentication:**

- Verify JWT token via `context.locals.supabase.auth.getUser()`
- Reject requests without valid session
- Use service role client for RPC calls

**Rate Limiting:**

- Enforce 5 generations per user per UTC day
- Atomic quota consumption via RPC
- Return clear reset time to client

**Input Sanitization:**

- Validate category against enum (prevents injection)
- Sanitize count parameter (integer coercion)
- Trim whitespace from AI responses

**AI Safety:**

- Profanity filtering on outputs
- Content validation (ensure appropriate results)
- Error message sanitization (no internal details leaked)

**Data Privacy:**

- No user data sent to AI provider
- Only category and count transmitted
- No logging of generated content

#### Error Handling

**Validation Errors:**

```typescript
if (!validCategories.includes(category)) {
  return new Response(
    JSON.stringify({
      error: "validation_error",
      message: "Invalid category",
    }),
    { status: 400 }
  );
}
```

**Rate Limit Errors:**

```typescript
try {
  await supabase.rpc("consume_ai_generation");
} catch (error) {
  if (error.code === "P0001") {
    return new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        message: error.message,
        reset_at: getNextMidnightUTC(),
      }),
      { status: 429 }
    );
  }
}
```

**AI Service Errors:**

```typescript
try {
  const response = await openRouterClient.generate(prompt);
} catch (error) {
  console.error("[AI Generation Error]", error);
  return new Response(
    JSON.stringify({
      error: "ai_service_error",
      message: "Failed to generate list. Please try again.",
      retry_after: 30,
    }),
    { status: 500 }
  );
}
```

**Incomplete Results:**

```typescript
if (generatedItems.length < count) {
  // Retry once
  const retryResponse = await openRouterClient.generate(prompt);
  if (retryResponse.length < count) {
    return new Response(
      JSON.stringify({
        error: "ai_incomplete_error",
        message: `Only ${retryResponse.length}/${count} words generated. Please try again.`,
      }),
      { status: 500 }
    );
  }
}
```

#### Performance Considerations

**Caching Strategy:**

- Cache common category requests (10-30 min TTL)
- Use Redis/memory cache with key: `ai:${userId}:${category}:${dayUTC}`
- Serve cached results for same-day repeat requests

**Timeout Management:**

- Set 30-second timeout on AI requests
- Return 500 with retry message on timeout
- Log timeout events for monitoring

**Concurrent Request Handling:**

- Atomic quota consumption prevents race conditions
- Database-level locking ensures consistency
- No queue needed (synchronous processing acceptable)

**Response Size:**

- Typical response: ~2-5 KB (20 words)
- No compression needed at this scale
- JSON response fits in single TCP packet

#### Implementation Steps

1. **Create Zod validation schema** (`src/lib/validation/ai.ts`)
   - Define `GenerateListRequestSchema`
   - Export validation function

2. **Create AI service** (`src/lib/services/ai-generator.ts`)
   - Implement OpenRouter.ai client
   - Define category-specific prompts
   - Implement retry logic
   - Add profanity filter
   - Export `generateWordList()` function

3. **Create API route handler** (`src/pages/api/ai/generate-list.ts`)
   - Set `export const prerender = false`
   - Implement POST handler
   - Add authentication check
   - Call validation schema
   - Call quota consumption RPC
   - Call AI service
   - Return formatted response

4. **Add error response helpers** (`src/lib/utils/api-errors.ts`)
   - Create `errorResponse()` factory
   - Create `rateLimitResponse()` factory
   - Export type-safe helpers

5. **Add tests** (`src/pages/api/ai/generate-list.test.ts`)
   - Test successful generation
   - Test validation errors
   - Test rate limit enforcement
   - Test AI service failure handling
   - Test incomplete result handling

6. **Add monitoring/logging**
   - Log AI request duration
   - Log quota consumption
   - Track generation success/failure rates

---

### 2.2 DELETE /api/account

#### Overview

Permanently deletes user account with all associated data. Requires explicit confirmation. Cascades to all user tables (profiles, lists, items, tests, AI usage). GDPR-compliant data erasure.

#### Request Details

- **Method:** DELETE
- **URL:** `/api/account`
- **Authentication:** Required (Bearer token)
- **Content-Type:** application/json

**Parameters:**

- Required:
  - `confirmation` (string): Must equal "DELETE" (case-sensitive)

**Request Body:**

```json
{
  "confirmation": "DELETE"
}
```

#### Utilized Types

```typescript
import type { DeleteAccountCommand, DeleteAccountResponse, ErrorResponse } from "@/types";
```

#### Response Details

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Responses:**

- **400 Bad Request:** Invalid confirmation

```json
{
  "error": "confirmation_required",
  "message": "Type DELETE to confirm account deletion"
}
```

- **401 Unauthorized:** Not authenticated

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

- **500 Internal Server Error:** Deletion failed

```json
{
  "error": "deletion_failed",
  "message": "Failed to delete account. Please try again."
}
```

#### Data Flow

1. **Authentication Check**
   - Get authenticated user from session
   - Return 401 if not authenticated

2. **Input Validation**
   - Verify confirmation === "DELETE" (case-sensitive)
   - Return 400 if mismatch

3. 3. **Account Deletion**
   - Use admin/service role client
   - Call `supabase.auth.admin.deleteUser(userId)`
   - Database CASCADE handles all related data

4. **Session Invalidation**
   - Revoke all refresh tokens
   - Clear session cookie
   - Return success response

5. **Post-deletion Cleanup** (background)
   - Anonymize logs after retention period
   - Remove cached data

#### Security Considerations

**Authentication:**

- Require valid authenticated session
- No delegation or proxy deletion allowed
- Session must be recent (< 5 minutes for sensitive operation)

**Confirmation Requirement:**

- Exact string match "DELETE" (case-sensitive)
- Prevents accidental deletion
- UI should show strong confirmation modal

**Authorization:**

- User can only delete own account
- No admin override in MVP
- Service role used only for auth.admin API

**Audit Trail:**

- Record user_id and timestamp in system logs
- Retain anonymized deletion logs per GDPR (30 days)

**Cascade Integrity:**

- Database foreign keys ensure complete deletion
- Verify cascade defined: `ON DELETE CASCADE`
- No orphaned records left behind

#### Error Handling

**Validation Errors:**

```typescript
if (body.confirmation !== "DELETE") {
  return new Response(
    JSON.stringify({
      error: "confirmation_required",
      message: "Type DELETE to confirm account deletion",
    }),
    { status: 400 }
  );
}
```

**Authentication Errors:**

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) {
  return new Response(
    JSON.stringify({
      error: "unauthorized",
      message: "Authentication required",
    }),
    { status: 401 }
  );
}
```

**Deletion Errors:**

```typescript
try {
  await supabaseAdmin.auth.admin.deleteUser(user.id);
} catch (error) {
  console.error("[Account Deletion Error]", error);
  return new Response(
    JSON.stringify({
      error: "deletion_failed",
      message: "Failed to delete account. Please try again.",
    }),
    { status: 500 }
  );
}
```

#### Performance Considerations

**Database Load:**

- Single API call triggers cascade deletion
- Database handles referential integrity
- Typical deletion: < 500ms for standard user data

**Concurrency:**

- Deletion is idempotent (safe to retry)
- No race conditions (single user operation)
- Lock not needed (atomic delete)

**Background Jobs:**

- No immediate background jobs needed
- Log anonymization runs on schedule (daily)
- Cached data expires naturally (TTL)

#### Implementation Steps

1. **Create Zod validation schema** (`src/lib/validation/account.ts`)
   - Define `DeleteAccountSchema`
   - Validate confirmation string

2. **Create account service** (`src/lib/services/account.ts`)
   - Implement `deleteAccount(userId: string)`
   - Use admin client for deletion
   - Handle error cases
   - Export service function

3. **Create API route handler** (`src/pages/api/account.ts`)
   - Set `export const prerender = false`
   - Implement DELETE handler
   - Add authentication check
   - Validate confirmation string
   - Call account service
   - Clear session cookies
   - Return success response

4. **Add session management helper** (`src/lib/utils/session.ts`)
   - Create `clearSessionCookies()` function
   - Handle all auth-related cookies

5. **Add tests** (`src/pages/api/account.test.ts`)
   - Test successful deletion
   - Test invalid confirmation
   - Test unauthenticated access
   - Test deletion failure handling

6. **Add monitoring**
   - Log deletion operations to system logs
   - Track deletion rate
   - Monitor for anomalies

---

## 3. PostgreSQL RPC Functions

### 3.1 touch_list

#### Overview

Updates the `last_accessed_at` timestamp for a list when user views or interacts with it. Used for "recently used" sorting on dashboard. Implements owner-only access control.

#### Function Signature

```sql
CREATE OR REPLACE FUNCTION public.touch_list(p_list_id uuid)
RETURNS public.lists
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
```

#### Parameters

- **p_list_id** (uuid, required): ID of the list to touch

#### Return Type

Returns updated `public.lists` row

#### Utilized Types

```typescript
import type { TouchListCommand, TouchListResponse, ListEntity } from "@/types";
```

#### Business Logic

1. **Authorization Check**
   - Verify list belongs to `auth.uid()`
   - Raise exception if not owner

2. **Update Timestamp**
   - Set `last_accessed_at = now()`
   - Use `WHERE id = p_list_id AND user_id = auth.uid()`

3. **Return Updated Row**
   - Return entire list record
   - Include all fields for client cache update

#### Implementation

```sql
CREATE OR REPLACE FUNCTION public.touch_list(p_list_id uuid)
RETURNS public.lists
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_list public.lists;
BEGIN
  -- Guard: Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.lists
    WHERE id = p_list_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'list not found or access denied'
      USING ERRCODE = 'P0001';
  END IF;

  -- Update last_accessed_at
  UPDATE public.lists
  SET last_accessed_at = now()
  WHERE id = p_list_id
  RETURNING * INTO v_list;

  RETURN v_list;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.touch_list(uuid) TO authenticated;
```

#### Security Considerations

**SECURITY DEFINER:**

- Function runs with creator privileges
- Bypasses RLS policies
- Manual authorization check required

**Authorization:**

- Owner-only access enforced
- Check `user_id = auth.uid()`
- Explicit exception on unauthorized access

**SQL Injection:**

- UUID parameter type prevents injection
- No dynamic SQL execution
- Safe parameter binding

#### Error Handling

**List Not Found:**

```sql
RAISE EXCEPTION 'list not found or access denied'
  USING ERRCODE = 'P0001';
```

**Client Handling:**

```typescript
try {
  await supabase.rpc("touch_list", { p_list_id: listId });
} catch (error) {
  if (error.code === "P0001") {
    // Handle not found or access denied
  }
}
```

#### Performance Considerations

**Index Usage:**

- Uses `lists_pkey` (id PRIMARY KEY)
- Fast point lookup
- No table scan needed

**Write Performance:**

- Single-row update
- No triggers on `last_accessed_at` change
- < 10ms typical execution

**Concurrency:**

- Safe for concurrent calls
- Last write wins (acceptable for access tracking)
- No locks needed

#### Usage Example

**TypeScript Client:**

```typescript
import { TouchListCommand } from "@/types";

async function trackListAccess(listId: string) {
  const command: TouchListCommand = {
    p_list_id: listId,
  };

  const { data, error } = await supabase.rpc("touch_list", command);

  if (error) throw error;
  return data; // Updated list record
}
```

#### Implementation Steps

1. **Create migration** (`supabase/migrations/[timestamp]_create_touch_list_function.sql`)
   - Define function as shown above
   - Add comments for documentation
   - Grant permissions

2. **Test function** (SQL)
   - Test successful touch
   - Test unauthorized access
   - Test non-existent list

3. **Add TypeScript wrapper** (`src/lib/services/lists.ts`)
   - Export `touchList(listId: string)` function
   - Handle errors gracefully

---

### 3.2 complete_test

#### Overview

Records completed test results, updates list statistics, and enforces list editing lock on first test. Implements atomic transaction with validation guards. Core business logic function.

#### Function Signature

```sql
CREATE OR REPLACE FUNCTION public.complete_test(
  p_list_id uuid,
  p_correct integer,
  p_wrong integer,
  p_completed_at timestamptz DEFAULT now()
)
RETURNS public.tests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
```

#### Parameters

- **p_list_id** (uuid, required): ID of the list being tested
- **p_correct** (integer, required): Number of correct answers (>= 0)
- **p_wrong** (integer, required): Number of wrong answers (>= 0)
- **p_completed_at** (timestamptz, optional): Test completion timestamp (defaults to now())

#### Return Type

Returns created `public.tests` row

#### Utilized Types

```typescript
import type { CompleteTestCommand, CompleteTestResponse, TestEntity } from "@/types";
```

#### Business Logic

1. **Authorization Check**
   - Verify list belongs to `auth.uid()`
   - Raise exception if not owner

2. **Item Count Validation**
   - Get actual item count from `list_items`
   - Verify >= 5 items (minimum test threshold)
   - Verify `p_correct + p_wrong = items_count`

3. **Score Calculation**
   - `score = floor(100.0 * p_correct / items_count)`
   - Ensure 0-100 range

4. **Insert Test Record**
   - Create immutable test record in `tests` table
   - Record all parameters and calculated score

5. **Update List Statistics**
   - Set `first_tested_at` if NULL (locks editing)
   - Update `last_score`, `last_tested_at`, `last_correct`, `last_wrong`

6. **Return Test Record**
   - Return created test for client confirmation

#### Implementation

```sql
CREATE OR REPLACE FUNCTION public.complete_test(
  p_list_id uuid,
  p_correct integer,
  p_wrong integer,
  p_completed_at timestamptz DEFAULT now()
)
RETURNS public.tests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_items_count integer;
  v_score smallint;
  v_test public.tests;
BEGIN
  -- Guard: Verify ownership
  SELECT user_id INTO v_user_id
  FROM public.lists
  WHERE id = p_list_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'list not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'access denied'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard: Get and validate item count
  SELECT count(*) INTO v_items_count
  FROM public.list_items
  WHERE list_id = p_list_id;

  IF v_items_count < 5 THEN
    RAISE EXCEPTION 'list must have at least 5 items to complete a test'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard: Validate correct + wrong = total
  IF p_correct + p_wrong != v_items_count THEN
    RAISE EXCEPTION 'correct + wrong must equal total items in list (expected: %, got: %)',
      v_items_count, p_correct + p_wrong
      USING ERRCODE = 'P0001';
  END IF;

  -- Calculate score
  v_score := floor(100.0 * p_correct / v_items_count)::smallint;

  -- Insert test record
  INSERT INTO public.tests (
    user_id,
    list_id,
    completed_at,
    items_count,
    correct,
    wrong,
    score
  ) VALUES (
    auth.uid(),
    p_list_id,
    p_completed_at,
    v_items_count,
    p_correct,
    p_wrong,
    v_score
  )
  RETURNING * INTO v_test;

  -- Update list statistics
  UPDATE public.lists
  SET
    first_tested_at = COALESCE(first_tested_at, p_completed_at),
    last_score = v_score,
    last_tested_at = p_completed_at,
    last_correct = p_correct,
    last_wrong = p_wrong
  WHERE id = p_list_id;

  RETURN v_test;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_test(uuid, integer, integer, timestamptz) TO authenticated;
```

#### Security Considerations

**SECURITY DEFINER:**

- Runs with creator privileges
- Bypasses RLS for atomic updates
- Manual authorization enforced

**Authorization:**

- Owner-only access verified
- Check `user_id = auth.uid()`
- Explicit error on unauthorized access

**Data Validation:**

- Min 5 items enforced
- Consistency check (correct + wrong = total)
- Score calculation validated

**Immutability:**

- Test records write-once
- No UPDATE/DELETE allowed via RLS
- Audit trail preserved

#### Error Handling

**List Not Found:**

```sql
RAISE EXCEPTION 'list not found'
  USING ERRCODE = 'P0001';
```

**Minimum Items Validation:**

```sql
RAISE EXCEPTION 'list must have at least 5 items to complete a test'
  USING ERRCODE = 'P0001';
```

**Consistency Validation:**

```sql
RAISE EXCEPTION 'correct + wrong must equal total items in list (expected: %, got: %)',
  v_items_count, p_correct + p_wrong
  USING ERRCODE = 'P0001';
```

**Client Handling:**

```typescript
try {
  await supabase.rpc("complete_test", {
    p_list_id: listId,
    p_correct: correctCount,
    p_wrong: wrongCount,
  });
} catch (error) {
  if (error.code === "P0001") {
    // Handle validation errors
    showError(error.message);
  }
}
```

#### Performance Considerations

**Transaction Isolation:**

- Single transaction for all operations
- Atomic commit/rollback
- No partial state possible

**Index Usage:**

- `lists_pkey` for list lookup
- `list_items_list_position_idx` for count
- Fast execution (< 50ms typical)

**Locking:**

- Row-level locks only
- No table locks
- Concurrent tests on different lists allowed

**Write Volume:**

- Inserts: 1 row (tests)
- Updates: 1 row (lists)
- Minimal overhead

#### Usage Example

**TypeScript Client:**

```typescript
import { CompleteTestCommand, CompleteTestResponse } from "@/types";

async function submitTestResults(
  listId: string,
  correctCount: number,
  wrongCount: number
): Promise<CompleteTestResponse> {
  const command: CompleteTestCommand = {
    p_list_id: listId,
    p_correct: correctCount,
    p_wrong: wrongCount,
  };

  const { data, error } = await supabase.rpc("complete_test", command);

  if (error) throw error;
  return data;
}
```

#### Implementation Steps

1. **Create migration** (`supabase/migrations/[timestamp]_create_complete_test_function.sql`)
   - Define function as shown above
   - Add comprehensive comments
   - Grant permissions

2. **Test function** (SQL)
   - Test successful completion
   - Test < 5 items error
   - Test incorrect sum error
   - Test unauthorized access
   - Test score calculation

3. **Add TypeScript wrapper** (`src/lib/services/tests.ts`)
   - Export `completeTest()` function
   - Handle validation errors
   - Provide user-friendly error messages

---

### 3.3 consume_ai_generation

#### Overview

Checks and consumes AI generation quota (5 per UTC day). Implements atomic increment with limit enforcement. Returns remaining quota information for client UI.

**Important**: This is an RPC function with **side effects** (increments usage counter). It must be called via **POST /rest/v1/rpc/consume_ai_generation**, not GET. The function atomically checks the limit and increments the counter in a single transaction.

**Checking quota without consuming**: To display remaining quota in UI without incrementing the counter, query the `ai_usage_daily` table directly:

```typescript
const { data } = await supabase
  .from("ai_usage_daily")
  .select("used")
  .eq("user_id", userId)
  .eq("day_utc", getCurrentUTCDate())
  .single();

const remaining = 5 - (data?.used || 0);
```

#### Function Signature

```sql
CREATE OR REPLACE FUNCTION public.consume_ai_generation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
```

#### Parameters

None (uses `auth.uid()` and current UTC date)

#### Return Type

Returns JSONB with quota information:

```json
{
  "used": 3,
  "remaining": 2,
  "limit": 5,
  "reset_at": "2026-01-27T00:00:00Z"
}
```

#### Utilized Types

```typescript
import type { AIQuotaDTO } from "@/types";
```

#### Business Logic

1. **Get Current UTC Day**
   - Calculate `day_utc = (now() at time zone 'utc')::date`

2. **Upsert Daily Record**
   - Insert or update `ai_usage_daily` for (user_id, day_utc)
   - Lock row with `FOR UPDATE`

3. **Check Limit**
   - If `used >= 5`: raise rate limit exception
   - Include reset time in error hint

4. **Increment Usage**
   - Increment `used` by 1
   - Update `updated_at` timestamp

5. **Calculate Reset Time**
   - `reset_at = (day_utc + 1)::timestamptz at time zone 'UTC'`

6. **Return Quota Info**
   - Return used, remaining, limit, reset_at as JSONB

#### Implementation

```sql
CREATE OR REPLACE FUNCTION public.consume_ai_generation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_day_utc date;
  v_used integer;
  v_remaining integer;
  v_reset_at timestamptz;
BEGIN
  -- Get current UTC day
  v_day_utc := (now() at time zone 'utc')::date;
  v_reset_at := (v_day_utc + 1)::timestamptz;

  -- Upsert and lock row
  INSERT INTO public.ai_usage_daily (user_id, day_utc, used)
  VALUES (auth.uid(), v_day_utc, 0)
  ON CONFLICT (user_id, day_utc)
  DO UPDATE SET updated_at = now()
  RETURNING used INTO v_used;

  -- Check limit
  IF v_used >= 5 THEN
    RAISE EXCEPTION 'daily ai generation limit exceeded (5/day)'
      USING
        ERRCODE = 'P0001',
        HINT = format('Limit resets at %s', v_reset_at);
  END IF;

  -- Increment usage
  UPDATE public.ai_usage_daily
  SET used = used + 1, updated_at = now()
  WHERE user_id = auth.uid() AND day_utc = v_day_utc
  RETURNING used INTO v_used;

  v_remaining := 5 - v_used;

  -- Return quota info
  RETURN jsonb_build_object(
    'used', v_used,
    'remaining', v_remaining,
    'limit', 5,
    'reset_at', v_reset_at
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.consume_ai_generation() TO authenticated;
```

#### Security Considerations

**SECURITY DEFINER:**

- Runs with creator privileges
- Direct table access (bypasses RLS)
- Automatic user isolation via `auth.uid()`

**Authorization:**

- Implicit: uses `auth.uid()` for user identification
- No cross-user access possible
- No additional checks needed

**Atomic Operations:**

- UPSERT prevents race conditions
- Row-level locking ensures consistency
- Transaction guarantees atomicity

**Rate Limit Enforcement:**

- Hard limit at database level
- Cannot be bypassed by client
- Resistant to concurrent request attacks

#### Error Handling

**Rate Limit Exceeded:**

```sql
RAISE EXCEPTION 'daily ai generation limit exceeded (5/day)'
  USING
    ERRCODE = 'P0001',
    HINT = format('Limit resets at %s', v_reset_at);
```

**Client Handling:**

```typescript
try {
  const { data } = await supabase.rpc("consume_ai_generation");
  console.log(`Remaining: ${data.remaining}`);
} catch (error) {
  if (error.code === "P0001") {
    // Extract reset_at from hint
    showRateLimitError(error.hint);
  }
}
```

#### Performance Considerations

**Concurrent Access:**

- Row-level lock prevents race conditions
- Other users not blocked
- < 10ms typical execution

**Index Usage:**

- Primary key `(user_id, day_utc)` for fast lookup
- Single-row operation
- No table scan

**Write Volume:**

- 1 write per generation attempt
- Max 5 writes per user per day
- Negligible load

**Daily Cleanup:**

- Old records auto-expire (optional cleanup job)
- Keep last 30 days for audit purposes
- No manual deletion needed

#### Usage Example

**Check Quota Before AI Call:**

```typescript
async function checkAIQuota(): Promise<AIQuotaDTO> {
  const { data, error } = await supabase.rpc("consume_ai_generation");

  if (error) {
    if (error.code === "P0001") {
      throw new RateLimitError(error.message, error.hint);
    }
    throw error;
  }

  return data as AIQuotaDTO;
}
```

**Display Quota in UI:**

```typescript
const quota = await checkAIQuota();
console.log(`${quota.remaining} generations remaining today`);
console.log(`Resets at ${new Date(quota.reset_at).toLocaleString()}`);
```

#### Implementation Steps

1. **Create migration** (`supabase/migrations/[timestamp]_create_consume_ai_generation_function.sql`)
   - Define function as shown above
   - Add comments
   - Grant permissions

2. **Test function** (SQL)
   - Test successful consumption (1st call)
   - Test quota tracking (2nd-4th calls)
   - Test rate limit (6th call)
   - Test UTC day boundary reset

3. **Add TypeScript wrapper** (`src/lib/services/ai-quota.ts`)
   - Export `consumeAIQuota()` function
   - Export `checkAIQuota()` (non-consuming check)
   - Handle rate limit errors

4. **Add UI helpers** (`src/lib/utils/quota.ts`)
   - Format reset time for display
   - Calculate time until reset
   - Create quota progress component

---

## 4. Supabase-Managed Endpoints Configuration

### 4.1 Authentication Endpoints

These endpoints are managed by Supabase Auth and require configuration, not custom implementation.

#### POST /auth/v1/magiclink

**Configuration Required:**

- Enable magic link in Supabase dashboard
- Configure email templates
- Set redirect URL for callback

**Email Template Variables:**

```html
<h2>Log in to Word Lists</h2>
<p>Click the link below to log in:</p>
<p><a href="{{ .ConfirmationURL }}">Log in</a></p>
<p>This link expires in 1 hour.</p>
```

**Rate Limiting:**

- 3 requests per email per 60 seconds (built-in)
- 10 requests per IP per 60 seconds (built-in)

**Client Usage:**

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: "user@example.com",
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

#### GET /auth/v1/callback

**Configuration Required:**

- Set authorized redirect URLs in Supabase dashboard
- Add `${APP_URL}/auth/callback` to allowed URLs

**Implementation:** Create page at `src/pages/auth/callback.astro`

```astro
---
const { searchParams } = Astro.url;
const token = searchParams.get("token");
const type = searchParams.get("type");

if (token && type === "magiclink") {
  // Supabase client will automatically handle token exchange
  // Redirect to dashboard
  return Astro.redirect("/dashboard");
}

// Error case
return Astro.redirect("/login?error=invalid_token");
---
```

#### POST /auth/v1/logout

**Client Usage:**

```typescript
await supabase.auth.signOut();
// Redirect to login page
```

#### POST /auth/v1/user

**Client Usage:**

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
```

### 4.2 Profile Management

#### RLS Policies Required

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can create own profile
CREATE POLICY "Users can create own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete own profile
CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

#### Client Usage Examples

**GET Profile:**

```typescript
const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
```

**POST Profile:**

```typescript
const { data, error } = await supabase.from("profiles").insert({
  theme_preference: "dark",
  locale: "pl-PL",
  timezone: "Europe/Warsaw",
});
```

**PATCH Profile:**

```typescript
const { data, error } = await supabase.from("profiles").update({ theme_preference: "light" }).eq("user_id", user.id);
```

### 4.3 List Management

#### RLS Policies Required

```sql
-- Enable RLS
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view own lists
CREATE POLICY "Users can view own lists"
ON public.lists FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can create own lists
CREATE POLICY "Users can create own lists"
ON public.lists FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update own lists
CREATE POLICY "Users can update own lists"
ON public.lists FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete own lists
CREATE POLICY "Users can delete own lists"
ON public.lists FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

#### Trigger: Enforce 50 Lists Limit

```sql
CREATE OR REPLACE FUNCTION check_lists_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT count(*) FROM public.lists WHERE user_id = NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'maximum number of lists per user exceeded (50)'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_lists_limit
BEFORE INSERT ON public.lists
FOR EACH ROW
EXECUTE FUNCTION check_lists_limit();
```

#### Client Usage Examples

**GET Lists (Dashboard):**

```typescript
const { data, error } = await supabase
  .from("lists")
  .select("*")
  .order("last_accessed_at", { ascending: false, nullsFirst: false })
  .limit(50);
```

**GET Single List with Items:**

```typescript
const { data, error } = await supabase
  .from("lists")
  .select(
    `
    *,
    items:list_items(*)
  `
  )
  .eq("id", listId)
  .order("position", { foreignTable: "list_items" })
  .single();
```

**POST List:**

```typescript
const { data, error } = await supabase
  .from("lists")
  .insert({
    name: "My Animals",
    source: "manual",
    category: null,
  })
  .select()
  .single();
```

**PATCH List:**

```typescript
const { data, error } = await supabase
  .from("lists")
  .update({ name: "Updated Name" })
  .eq("id", listId)
  .select()
  .single();
```

**DELETE List:**

```typescript
const { error } = await supabase.from("lists").delete().eq("id", listId);
```

### 4.4 List Items Management

#### RLS Policies Required

```sql
-- Enable RLS
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view items from own lists
CREATE POLICY "Users can view items from own lists"
ON public.list_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id
    AND lists.user_id = auth.uid()
  )
);

-- INSERT: Users can add items to own lists
CREATE POLICY "Users can add items to own lists"
ON public.list_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id
    AND lists.user_id = auth.uid()
  )
);

-- UPDATE: Users can update items in own lists
CREATE POLICY "Users can update items in own lists"
ON public.list_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id
    AND lists.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id
    AND lists.user_id = auth.uid()
  )
);

-- DELETE: Users can delete items from own lists
CREATE POLICY "Users can delete items from own lists"
ON public.list_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id
    AND lists.user_id = auth.uid()
  )
);
```

#### Trigger: Prevent Editing After First Test

```sql
CREATE OR REPLACE FUNCTION prevent_list_items_edit_after_test()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_first_tested_at timestamptz;
BEGIN
  -- Get first_tested_at from list
  SELECT first_tested_at INTO v_first_tested_at
  FROM public.lists
  WHERE id = COALESCE(NEW.list_id, OLD.list_id);

  -- If list has been tested, prevent modification
  IF v_first_tested_at IS NOT NULL THEN
    RAISE EXCEPTION 'cannot modify list items after first test has been completed'
      USING
        ERRCODE = 'P0001',
        HINT = 'list has been tested and is now locked';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER prevent_items_edit_after_test
BEFORE INSERT OR UPDATE OR DELETE ON public.list_items
FOR EACH ROW
EXECUTE FUNCTION prevent_list_items_edit_after_test();
```

#### Trigger: Auto-generate Normalized Text

```sql
CREATE OR REPLACE FUNCTION normalize_display_text()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.normalized := lower(
    trim(
      regexp_replace(
        unaccent(NEW.display),
        '\s+',
        ' ',
        'g'
      )
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_normalized_text
BEFORE INSERT OR UPDATE OF display ON public.list_items
FOR EACH ROW
EXECUTE FUNCTION normalize_display_text();
```

#### Client Usage Examples

**GET Items:**

```typescript
const { data, error } = await supabase.from("list_items").select("*").eq("list_id", listId).order("position");
```

**POST Item:**

```typescript
const { data, error } = await supabase
  .from("list_items")
  .insert({
    list_id: listId,
    position: 3,
    display: "Elephant",
  })
  .select()
  .single();
```

**POST Multiple Items (Batch):**

```typescript
const items = words.map((word, index) => ({
  list_id: listId,
  position: index + 1,
  display: word,
}));

const { data, error } = await supabase.from("list_items").insert(items).select();
```

**PATCH Item:**

```typescript
const { data, error } = await supabase
  .from("list_items")
  .update({ display: "African Elephant", position: 5 })
  .eq("id", itemId)
  .select()
  .single();
```

**DELETE Item:**

```typescript
const { error } = await supabase.from("list_items").delete().eq("id", itemId);
```

### 4.5 Test Management

#### RLS Policies Required

```sql
-- Enable RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view own test history
CREATE POLICY "Users can view own test history"
ON public.tests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Denied (use complete_test RPC only)
-- This ensures business logic is enforced

-- UPDATE/DELETE: Denied (immutable audit trail)
```

#### Client Usage Examples

**GET Test History (All):**

```typescript
const { data, error } = await supabase
  .from("tests")
  .select("*")
  .eq("user_id", user.id)
  .order("completed_at", { ascending: false })
  .limit(20);
```

**GET Test History (By List):**

```typescript
const { data, error } = await supabase
  .from("tests")
  .select("*")
  .eq("list_id", listId)
  .order("completed_at", { ascending: false });
```

**Submit Test (via RPC):**

```typescript
const { data, error } = await supabase.rpc("complete_test", {
  p_list_id: listId,
  p_correct: 17,
  p_wrong: 3,
});
```

---

## 5. Common Implementation Patterns

### 5.1 Authentication Middleware

**Location:** `src/middleware/index.ts`

```typescript
import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { supabase } = context.locals;

  // Get authenticated user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[Auth Middleware Error]", error);
  }

  // Attach user to context
  context.locals.user = user;

  return next();
};
```

### 5.2 Service Layer Pattern

**Structure:**

```
src/lib/services/
  ├── ai-generator.ts    # OpenRouter.ai integration
  ├── ai-quota.ts        # Quota management
  ├── account.ts         # Account operations
  ├── lists.ts           # List operations
  ├── tests.ts           # Test operations
  └── index.ts           # Barrel export
```

**Example Service:**

```typescript
// src/lib/services/lists.ts
import type { SupabaseClient } from "@/db/supabase.client";
import type { ListWithItemsDTO } from "@/types";

export class ListService {
  constructor(private supabase: SupabaseClient) {}

  async getListWithItems(listId: string): Promise<ListWithItemsDTO> {
    const { data, error } = await this.supabase
      .from("lists")
      .select("*, items:list_items(*)")
      .eq("id", listId)
      .order("position", { foreignTable: "list_items" })
      .single();

    if (error) throw error;
    return data;
  }

  async touchList(listId: string): Promise<void> {
    const { error } = await this.supabase.rpc("touch_list", { p_list_id: listId });

    if (error) throw error;
  }
}
```

### 5.3 Validation with Zod

**Structure:**

```
src/lib/validation/
  ├── ai.ts           # AI generation schemas
  ├── account.ts      # Account schemas
  ├── lists.ts        # List schemas
  ├── tests.ts        # Test schemas
  └── index.ts        # Barrel export
```

**Example Schema:**

```typescript
// src/lib/validation/ai.ts
import { z } from "zod";

export const GenerateListRequestSchema = z.object({
  category: z.enum(["animals", "food", "household_items", "transport", "jobs"]),
  count: z.number().int().min(10).max(50),
});

export function validateGenerateListRequest(data: unknown) {
  return GenerateListRequestSchema.parse(data);
}
```

### 5.4 Error Response Helpers

**Location:** `src/lib/utils/api-errors.ts`

```typescript
import type { ErrorResponse, RateLimitErrorResponse } from "@/types";

export function errorResponse(
  error: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  const body: ErrorResponse = {
    error,
    message,
    ...(details && { details }),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function validationErrorResponse(message: string, fields: Record<string, string>): Response {
  return errorResponse("validation_error", message, 400, {
    errors: Object.entries(fields).map(([field, msg]) => ({
      field,
      message: msg,
    })),
  });
}

export function rateLimitErrorResponse(message: string, resetAt: string): Response {
  const body: RateLimitErrorResponse = {
    error: "rate_limit_exceeded",
    message,
    reset_at: resetAt,
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
}

export function unauthorizedResponse(message = "Authentication required"): Response {
  return errorResponse("unauthorized", message, 401);
}
```

### 5.5 API Route Template

**Template:** `src/pages/api/[endpoint].ts`

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { errorResponse, validationErrorResponse, unauthorizedResponse } from "@/lib/utils/api-errors";

export const prerender = false;

// Define request schema
const RequestSchema = z.object({
  // ... fields
});

export const POST: APIRoute = async (context) => {
  const { locals } = context;
  const { supabase, user } = locals;

  // Guard: Authentication
  if (!user) {
    return unauthorizedResponse();
  }

  // Parse and validate request body
  let body;
  try {
    const rawBody = await context.request.json();
    body = RequestSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(
        "Invalid request data",
        Object.fromEntries(error.errors.map((e) => [e.path.join("."), e.message]))
      );
    }
    return errorResponse("invalid_json", "Invalid JSON", 400);
  }

  // Business logic
  try {
    // ... implementation

    return new Response(
      JSON.stringify({
        success: true,
        // ... data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Endpoint Error]", error);
    return errorResponse("internal_error", "An error occurred. Please try again.", 500);
  }
};
```

### 5.6 Supabase Client Initialization

**Location:** `src/db/supabase.client.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabase;
```

**Service Role Client (for admin operations):**

```typescript
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Test RPC Functions:**

```sql
-- Test: touch_list success
BEGIN;
SELECT plan(3);

-- Setup
INSERT INTO auth.users (id, email) VALUES ('test-user-id', 'test@example.com');
INSERT INTO public.lists (id, user_id, name, source)
VALUES ('test-list-id', 'test-user-id', 'Test List', 'manual');

-- Execute
SET request.jwt.claims.sub = 'test-user-id';
SELECT public.touch_list('test-list-id');

-- Assert
SELECT is_not_null(
  (SELECT last_accessed_at FROM public.lists WHERE id = 'test-list-id'),
  'last_accessed_at should be set'
);

SELECT finish();
ROLLBACK;
```

**Test API Routes:**

```typescript
// src/pages/api/ai/generate-list.test.ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "./generate-list";

describe("POST /api/ai/generate-list", () => {
  it("should return 401 when not authenticated", async () => {
    const context = {
      locals: { user: null, supabase: mockSupabase },
      request: new Request("http://localhost/api/ai/generate-list", {
        method: "POST",
        body: JSON.stringify({ category: "animals", count: 20 }),
      }),
    };

    const response = await POST(context);
    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid category", async () => {
    const context = {
      locals: { user: mockUser, supabase: mockSupabase },
      request: new Request("http://localhost/api/ai/generate-list", {
        method: "POST",
        body: JSON.stringify({ category: "invalid", count: 20 }),
      }),
    };

    const response = await POST(context);
    expect(response.status).toBe(400);
  });

  // ... more tests
});
```

### 6.2 Integration Tests

**Test Complete Flow:**

```typescript
describe("AI List Generation Flow", () => {
  it("should generate, save, and test a list", async () => {
    // 1. Login
    const { user } = await supabase.auth.signInWithOtp({
      email: "test@example.com",
    });

    // 2. Generate list
    const generateResponse = await fetch("/api/ai/generate-list", {
      method: "POST",
      headers: { Authorization: `Bearer ${user.access_token}` },
      body: JSON.stringify({ category: "animals", count: 20 }),
    });
    expect(generateResponse.status).toBe(200);
    const { items } = await generateResponse.json();

    // 3. Save list
    const { data: list } = await supabase
      .from("lists")
      .insert({ name: "Test Animals", source: "ai", category: "animals" })
      .select()
      .single();

    // 4. Save items
    await supabase.from("list_items").insert(
      items.map((item, i) => ({
        list_id: list.id,
        position: i + 1,
        display: item.display,
      }))
    );

    // 5. Complete test
    const { data: test } = await supabase.rpc("complete_test", {
      p_list_id: list.id,
      p_correct: 18,
      p_wrong: 2,
    });

    expect(test.score).toBe(90);

    // 6. Verify list locked
    const { error } = await supabase.from("list_items").insert({
      list_id: list.id,
      position: 21,
      display: "New Item",
    });

    expect(error.code).toBe("P0001");
  });
});
```

### 6.3 Critical Path Checklist

**Must-Pass Tests:**

1. ✓ Magic link login → session creation → authenticated request
2. ✓ Create manual list → add items → save
3. ✓ Generate AI list → save → verify quota consumed
4. ✓ Complete test (min 5 items) → verify first_tested_at set → verify edit lock
5. ✓ Delete list → verify cascade to items and tests
6. ✓ Delete account → verify cascade to all user data
7. ✓ AI generation limit (6th request fails with 429)
8. ✓ List limit (51st list fails with 409)

### 6.4 Manual Testing Script

```bash
#!/bin/bash
# manual-test.sh

echo "1. Testing magic link authentication..."
curl -X POST http://localhost:4321/auth/v1/magiclink \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

echo "2. Testing AI generation (requires auth token)..."
curl -X POST http://localhost:4321/api/ai/generate-list \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"category": "animals", "count": 20}'

echo "3. Testing rate limit (6th request)..."
for i in {1..6}; do
  echo "Request $i..."
  curl -X POST http://localhost:4321/api/ai/generate-list \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"category": "food", "count": 10}'
  sleep 1
done

# ... more tests
```

---

## 7. Implementation Checklist

### Phase 1: Database Setup

- [ ] Create all database tables (migration)
- [ ] Create enum types
- [ ] Add constraints and checks
- [ ] Create indexes
- [ ] Enable RLS on all tables
- [ ] Create RLS policies
- [ ] Create triggers (list limit, item lock, normalization)
- [ ] Create RPC functions (touch_list, complete_test, consume_ai_generation)
- [ ] Test migrations on local Supabase

### Phase 2: Type System

- [ ] Generate database types (`supabase gen types typescript`)
- [ ] Review and validate `src/types.ts`
- [ ] Ensure all DTOs align with API spec

### Phase 3: Core Infrastructure

- [ ] Set up Supabase client (`src/db/supabase.client.ts`)
- [ ] Create authentication middleware (`src/middleware/index.ts`)
- [ ] Create validation schemas (`src/lib/validation/`)
- [ ] Create error response helpers (`src/lib/utils/api-errors.ts`)
- [ ] Set up environment variables

### Phase 4: Services Layer

- [ ] Create AI generator service (`src/lib/services/ai-generator.ts`)
- [ ] Create AI quota service (`src/lib/services/ai-quota.ts`)
- [ ] Create account service (`src/lib/services/account.ts`)
- [ ] Create list service (`src/lib/services/lists.ts`)
- [ ] Create test service (`src/lib/services/tests.ts`)

### Phase 5: Custom API Endpoints

- [ ] Implement POST /api/ai/generate-list
- [ ] Implement DELETE /api/account
- [ ] Test endpoints with Postman/curl
- [ ] Add error handling
- [ ] Add logging

### Phase 6: Frontend Integration

- [ ] Create auth callback page (`src/pages/auth/callback.astro`)
- [ ] Create API client hooks (React Query)
- [ ] Implement authentication flow
- [ ] Test all user flows

### Phase 7: Testing

- [ ] Write unit tests for services
- [ ] Write integration tests for API routes
- [ ] Write SQL tests for RPC functions
- [ ] Run critical path checklist
- [ ] Perform load testing (optional)

### Phase 8: Deployment Preparation

- [ ] Set up environment variables in production
- [ ] Configure Supabase production instance
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Create Docker image
- [ ] Deploy to DigitalOcean
- [ ] Test production endpoints

---

## Document Metadata

- **Version:** 1.0
- **Date:** 2026-01-26
- **Status:** Complete Implementation Guide
- **Target:** MVP Development Team
- **Next Review:** After implementation phase

---

## Notes

**Key Implementation Priorities:**

1. Database schema and RPC functions (foundation)
2. Authentication and middleware (security)
3. Custom API endpoints (core features)
4. Testing (quality assurance)

**Common Pitfalls to Avoid:**

- Forgetting to enable RLS on tables
- Not granting execute permissions on RPC functions
- Mixing client and service role incorrectly
- Skipping input validation
- Inadequate error handling
- Missing index creation

**Development Workflow:**

1. Start local Supabase: `npx supabase start`
2. Run migrations: `npx supabase db push`
3. Generate types: `npx supabase gen types typescript`
4. Start dev server: `npm run dev`
5. Test endpoints: Use Postman or curl
6. Run tests: `npm test`

**Useful Commands:**

```bash
# Generate database types
npx supabase gen types typescript --local > src/db/database.types.ts

# Reset local database
npx supabase db reset

# View local database
npx supabase db diff

# Run migrations
npx supabase migration up
```
