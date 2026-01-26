# REST API Plan

## Executive Summary

This document outlines the REST API design for a word list learning application with AI-powered generation capabilities. The API follows RESTful principles and leverages Supabase's Backend-as-a-Service (BaaS) architecture, combining automatic PostgREST endpoints with custom RPC functions and business logic endpoints.

**Technology Stack:**
- Backend: Supabase (PostgreSQL + PostgREST + Auth)
- API Endpoints: Astro 5 API routes (`/src/pages/api/*`)
- Authentication: Supabase Auth (Magic Link)
- AI Integration: OpenRouter.ai

**Key Architecture Decisions:**
1. **Hybrid Approach**: Use Supabase's automatic CRUD endpoints for simple operations, custom Astro API routes for complex business logic
2. **Security First**: All endpoints require authentication; Row Level Security (RLS) enforces data isolation
3. **Rate Limiting**: Enforce AI generation limits (5/day), list creation limits (50/user)
4. **Immutable Audit Trail**: Test results are write-once, read-many
5. **Optimistic Locking**: Post-test list editing restrictions enforced at database level

---

## 1. Resources

### Core Domain Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| **Profile** | `public.profiles` | User preferences (theme, locale, timezone) |
| **List** | `public.lists` | Word lists with metadata and test results |
| **ListItem** | `public.list_items` | Individual words within a list (position-ordered) |
| **Test** | `public.tests` | Immutable test completion records |
| **AIUsage** | `public.ai_usage_daily` | Daily AI generation quota tracking |
| **Event** | `public.events` | Analytics telemetry (write-only) |

### Authentication Resources

| Resource | Provider | Description |
|----------|----------|-------------|
| **Auth Session** | Supabase Auth | Magic link authentication flow |
| **User** | `auth.users` | Managed by Supabase Auth |

---

## 2. Endpoints

### 2.1 Authentication & Authorization

#### **POST /auth/v1/magiclink** (Supabase)
**Description**: Request magic link for passwordless login  
**Request Body**:
```json
{
  "email": "user@example.com",
  }
}
```
**Success Response** (200 OK):
```json
{
  "success": true,
}
```
**Error Responses**:
- `400 Bad Request`: Invalid email format

**Business Rules**:
- Magic link expires after 1 hour
- Link is single-use (one-time token)

---

#### **GET /auth/v1/callback** (Supabase)
**Description**: Handle magic link callback and establish session  
**Query Parameters**:
- `token` (string, required): One-time verification token
- `type` (string): "magiclink"

**Success Response**: Redirect to application with session cookie  
**Error Response**: Redirect to login with error parameter

**Business Rules**:
- New login invalidates all previous sessions for that user
- Session TTL: 30 days
- Refresh token issued for session renewal

---

#### **POST /auth/v1/logout** (Supabase)
**Description**: End current session  
**Headers**: `Authorization: Bearer {access_token}`

**Success Response** (200 OK):
```json
{
  "success": true
}
```

---

#### **POST /auth/v1/user** (Supabase)
**Description**: Get current authenticated user  
**Headers**: `Authorization: Bearer {access_token}`

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "confirmed_at": "2026-01-26T10:00:00Z",
  "created_at": "2026-01-20T10:00:00Z"
}
```

---

### 2.2 Profile Management

#### **GET /rest/v1/profiles**
**Description**: Get current user's profile (automatic via PostgREST + RLS)  
**Headers**: 
- `Authorization: Bearer {access_token}`
- `apikey: {supabase_anon_key}`

**Query Parameters**:
- `select` (string): Column selection (e.g., "*" or "theme_preference,locale")

**Success Response** (200 OK):
```json
{
  "user_id": "uuid",
  "theme_preference": "dark",
  "locale": "pl-PL",
  "timezone": "Europe/Warsaw",
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-26T10:00:00Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Profile not yet created

---

#### **POST /rest/v1/profiles**
**Description**: Create user profile (first-time setup)  
**Headers**: Authorization + apikey  
**Request Body**:
```json
{
  "theme_preference": "system",
  "locale": "pl-PL",
  "timezone": "Europe/Warsaw"
}
```

**Validation Rules**:
- `user_id`: Must match `auth.uid()` (enforced by RLS)
- `theme_preference`: One of ["system", "light", "dark"]
- `locale`: Valid locale string (default: "pl-PL")
- `timezone`: Valid IANA timezone (optional)

**Success Response** (201 Created):
```json
{
  "user_id": "uuid",
  "theme_preference": "system",
  "locale": "pl-PL",
  "timezone": "Europe/Warsaw",
  "created_at": "2026-01-26T10:00:00Z",
  "updated_at": "2026-01-26T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `409 Conflict`: Profile already exists

---

#### **PATCH /rest/v1/profiles**
**Description**: Update user preferences  
**Headers**: Authorization + apikey  
**Query Parameters**: `user_id=eq.{uuid}` (matches current user)  
**Request Body** (partial update):
```json
{
  "theme_preference": "dark",
}
```

**Success Response** (200 OK): Updated profile object

**Error Responses**:
- `400 Bad Request`: Invalid preference value
- `404 Not Found`: Profile doesn't exist

---

### 2.3 List Management

#### **GET /rest/v1/lists**
**Description**: Get user's word lists with filtering and sorting  
**Headers**: Authorization + apikey

**Query Parameters**:
- `select` (string): Columns to return (e.g., "*, items:list_items(*)")
- `order` (string): Sort order (e.g., "last_accessed_at.desc.nullslast")
- `limit` (integer): Pagination limit (default: 50, max: 100)
- `offset` (integer): Pagination offset

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Animals",
    "source": "ai",
    "category": "animals",
    "first_tested_at": "2026-01-25T10:00:00Z",
    "last_score": 85,
    "last_tested_at": "2026-01-26T09:00:00Z",
    "last_correct": 17,
    "last_wrong": 3,
    "last_accessed_at": "2026-01-26T10:00:00Z",
    "created_at": "2026-01-20T10:00:00Z",
  }
]
```

**Headers** (pagination):
- `Content-Range`: "0-49/120" (range and total count)

**Common Sort Patterns**:
- Recently used: `?order=last_accessed_at.desc.nullslast`
- Recently tested: `?order=last_tested_at.desc.nullslast`
- Recently created: `?order=created_at.desc`

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `400 Bad Request`: Invalid query parameters

---

#### **GET /rest/v1/lists?id=eq.{uuid}**
**Description**: Get single list by ID (with items)  
**Headers**: Authorization + apikey  
**Query Parameters**:
- `id=eq.{uuid}`: Filter by list ID
- `select=*,items:list_items(*)`: Include items with position ordering

**Success Response** (200 OK):
```json
[{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Animals",
  "source": "ai",
  "category": "animals",
  "first_tested_at": null,
  "last_score": null,
  "last_tested_at": null,
  "last_correct": null,
  "last_wrong": null,
  "last_accessed_at": "2026-01-26T10:00:00Z",
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-26T10:00:00Z",
  "items": [
    {
      "id": "uuid",
      "list_id": "uuid",
      "position": 1,
      "display": "Cat",
    },
    {
      "id": "uuid",
      "list_id": "uuid",
      "position": 2,
      "display": "Dog",
    }
  ]
}]
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `404 Not Found`: List doesn't exist or access denied (RLS)

---

#### **POST /rest/v1/lists**
**Description**: Create new word list (manual or AI-generated)  
**Headers**: Authorization + apikey  
**Request Body**:
```json
{
  "name": "My Animals",
  "source": "manual",
  "category": null,
}
```

**Validation Rules**:
- `name`: 1-80 characters (after trimming)
- `source`: "manual" or "ai"
- `category`: Required if source="ai", must be null if source="manual"
- `category`: One of ["animals", "food", "household_items", "transport", "jobs"]
- `user_id`: Automatically set to `auth.uid()`
- Enforces 50 lists per user limit (trigger)

**Success Response** (201 Created):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "My Animals",
  "source": "manual",
  "category": null,
  "first_tested_at": null,
  "last_score": null,
  "last_tested_at": null,
  "last_correct": null,
  "last_wrong": null,
  "last_accessed_at": null,
  "created_at": "2026-01-26T10:00:00Z",
  "updated_at": "2026-01-26T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
```json
{
  "code": "23514",
  "message": "name must be between 1 and 80 characters"
}
```
- `409 Conflict`: List limit exceeded (50 lists)
```json
{
  "code": "P0001",
  "message": "maximum number of lists per user exceeded (50)",
}
```

---

#### **PATCH /rest/v1/lists?id=eq.{uuid}**
**Description**: Update list (name, story)  
**Headers**: Authorization + apikey  
**Request Body** (partial):
```json
{
  "name": "Updated Name",
}
```

**Validation Rules**:
- `name`: 1-80 characters (if provided)
- Cannot change `source` or `category` after creation
- Can update `name` even after first test
- Cannot modify `first_tested_at`, `last_*` fields directly

**Success Response** (200 OK): Updated list object

**Error Responses**:
- `400 Bad Request`: Validation error
- `404 Not Found`: List not found or access denied

---

#### **DELETE /rest/v1/lists?id=eq.{uuid}**
**Description**: Hard delete list (cascades to items and tests)  
**Headers**: Authorization + apikey

**Success Response** (204 No Content)

**Error Responses**:
- `404 Not Found`: List not found or access denied

**Business Rules**:
- Requires confirmation in UI (modal with explicit confirm action)
- Cascades to `list_items` and `tests` (defined in DB schema)
- Operation is irreversible

---

#### **POST /rest/v1/rpc/touch_list**
**Description**: Update last_accessed_at timestamp  
**Headers**: Authorization + apikey  
**Request Body**:
```json
{
  "p_list_id": "uuid"
}
```

**Success Response** (200 OK):
```json
{
  "success": true
}
```

**Error Responses**:
- `404 Not Found`: `{"code": "P0001", "message": "list not found or access denied"}`

**Use Cases**:
- User opens list detail view
- User starts reviewing list for study
- Supports "recently used" dashboard sorting

---

### 2.4 List Items Management

#### **GET /rest/v1/list_items?list_id=eq.{uuid}**
**Description**: Get items for a specific list (ordered by position)  
**Headers**: Authorization + apikey

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "list_id": "uuid",
    "position": 1,
    "display": "Cat",
    "normalized": "cat",
  },
  {
    "id": "uuid",
    "list_id": "uuid",
    "position": 2,
    "display": "Dog",
    "normalized": "dog",
  }
]
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: List doesn't belong to user (RLS)

---

#### **POST /rest/v1/list_items**
**Description**: Add single item to list  
**Headers**: Authorization + apikey  
**Request Body**:
```json
{
  "list_id": "uuid",
  "position": 3,
  "display": "Dog",
  "normalized": "dog",
}
```

**Validation Rules**:
- `position`: 1-200 (unique per list)
- `display`: 1-80 characters (after trimming)
- `normalized`: Auto-generated by trigger (lowercase, no diacritics)
- Cannot add items after `first_tested_at` is set (blocked by trigger)

**Success Response** (201 Created):
```json
{
  "list_id": "uuid",
  "position": 3,
  "display": "Elephant",
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `409 Conflict`: Position already exists
```json
{
  "code": "23505",
  "message": "duplicate key violates unique constraint",
  "details": "Key (list_id, position) already exists"
}
```
- `403 Forbidden`: List has been tested (locked)
```json
{
  "code": "P0001",
  "message": "cannot modify list items after first test has been completed",
  "hint": "list has been tested and is now locked"
}
```

---

#### **PATCH /rest/v1/list_items?id=eq.{uuid}**
**Description**: Update item (display text or position)  
**Headers**: Authorization + apikey  
**Request Body**:
```json
{
  "display": "Elephant (African)",
  "normalized": "elephantafrican",
  "position": 5
}
```

**Validation Rules**:
- Same as POST
- Cannot modify after `first_tested_at` is set

**Success Response** (200 OK): Updated item object

**Error Responses**:
- `400 Bad Request`: Validation error
- `403 Forbidden`: List has been tested (locked)
- `409 Conflict`: New position already exists

---

#### **DELETE /rest/v1/list_items?id=eq.{uuid}**
**Description**: Remove item from list  
**Headers**: Authorization + apikey

**Success Response** (204 No Content)

**Error Responses**:
- `403 Forbidden`: List has been tested (locked)
- `404 Not Found`: Item not found or access denied

---

### 2.5 Test Management

#### **GET /rest/v1/tests?user_id=eq.{uuid}&order=completed_at.desc**
**Description**: Get user's test history  
**Headers**: Authorization + apikey

**Query Parameters**:
- `list_id=eq.{uuid}`: Filter by specific list
- `limit`: Pagination limit

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "list_id": "uuid",
    "completed_at": "2026-01-26T09:00:00Z",
    "items_count": 20,
    "correct": 17,
    "wrong": 3,
    "score": 85,
    "created_at": "2026-01-26T09:00:00Z"
  }
]
```

**Error Responses**:
- `401 Unauthorized`: Authentication required

---

#### **POST /rest/v1/rpc/complete_test**
**Description**: Submit completed test results  
**Headers**: Authorization + apikey  
**Request Body**:
```json
{
  "p_list_id": "uuid",
  "p_correct": 17,
  "p_wrong": 3,
}
```

**Validation Rules**:
- `p_correct + p_wrong` must equal total items in list
- List must belong to authenticated user
- `p_completed_at`: now()

**Success Response** (200 OK):
```json
{
  "success": true
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
```json
{
  "code": "P0001",
  "message": "list must have at least 5 items to complete a test",
}
```
```json
{
  "code": "P0001",
  "message": "correct + wrong must equal total items in list",
}
```
- `404 Not Found`: List not found or access denied

**Side Effects**:
- Creates immutable test record in `tests` table
- Updates `lists.last_score`, `last_tested_at`, `last_correct`, `last_wrong`
- Sets `lists.first_tested_at` if null (locks list editing)

---

### 2.6 AI Generation

#### **POST /api/ai/generate-list**
**Description**: Generate word list using AI (custom Astro endpoint)  
**Headers**: 
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "category": "animals",
  "count": 20
}
```

**Validation Rules**:
- `category`: One of ["animals", "food", "household_items", "transport", "jobs"]
- `count`: Integer between 10 and 50
- Enforces 5 generations per day limit (UTC-based)

**Success Response** (200 OK):
```json
{
  "success": true,
  "items": [
    {"position": 1, "display": "Cat"},
    {"position": 2, "display": "Dog"},
    ...
  ],
}
```

**Error Responses**:
- `400 Bad Request`: Invalid parameters
```json
{
  "error": "validation_error",
  "message": "count must be between 10 and 50",
}
```
- `429 Too Many Requests`: Daily limit exceeded
```json
{
  "error": "rate_limit_exceeded",
  "message": "daily ai generation limit exceeded (5/day)",
```
- `500 Internal Server Error`: AI service unavailable
```json
{
  "error": "ai_service_error",
  "message": "Failed to generate list. Please try again.",
  "retry_after": 30
}
```

**Implementation Notes**:
- Calls `consume_ai_generation()` RPC before AI request
- Uses OpenRouter.ai API for generation
- Implements content filtering (profanity check)
- Retries once if AI returns incomplete results

---

#### **GET /rest/v1/rpc/consume_ai_generation**
**Description**: Check and consume AI generation quota (can be used for quota check without consumption)  
**Headers**: Authorization + apikey

**Success Response** (200 OK):
```json
{
  "used": 2,
  "remaining": 3,
  "limit": 5,
  "reset_at": "2026-01-27T00:00:00Z"
}
```

**Error Responses**:
- `429 Too Many Requests`: Limit exceeded
```json
{
  "code": "P0001",
  "message": "daily ai generation limit exceeded (5/day)",
}
```

---

### 2.8 Account Management

#### **DELETE /api/account**
**Description**: Delete user account (custom Astro endpoint)  
**Headers**: 
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "confirmation": "DELETE"
}
```

**Validation Rules**:
- `confirmation`: Must equal "DELETE" (case-sensitive)
- Requires authenticated session

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Confirmation text doesn't match
```json
{
  "error": "confirmation_required",
  "message": "Type DELETE to confirm account deletion"
}
```
- `401 Unauthorized`: Authentication required

**Implementation Steps**:
1. Verify confirmation text
2. Log `delete_account` event
3. Delete user from `auth.users` (cascades to all tables via FK)
4. Invalidate all user sessions
5. Anonymize user in logs (according to retention policy ~30 days)

**Business Rules**:
- UI must show strong confirmation (modal with "DELETE" text input or double-click)
- Operation is irreversible
- Deletes all user data: profiles, lists, list_items, tests, ai_usage_daily, events
- Complies with GDPR right to erasure

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Method**: Supabase Auth with Magic Link (passwordless)

**Flow**:
1. User enters email
2. System sends magic link via email
3. User clicks link (opens `/auth/callback?token=...`)
4. System validates token and creates session
5. New login invalidates all previous sessions

**Session Management**:
- **Token Type**: JWT (JSON Web Token)
- **Access Token TTL**: 1 hour
- **Refresh Token TTL**: 30 days
- **Storage**: HTTP-only cookie (secure, SameSite=Lax)
- **Refresh Strategy**: Automatic via Supabase client

**Rate Limiting**:
- Email requests: 3 per email per 60 seconds
- IP requests: 10 per IP per 60 seconds
- Magic link validity: 1 hour
- Magic link usage: One-time only

### 3.2 Authorization Strategy

**Row Level Security (RLS)**:
All data access is filtered by `user_id = auth.uid()` at the database level.

| Table | Policy | Rule |
|-------|--------|------|
| `profiles` | All operations | `user_id = auth.uid()` |
| `lists` | All operations | `user_id = auth.uid()` |
| `list_items` | All operations | List owner check via FK |
| `tests` | SELECT only | `user_id = auth.uid()` |
| `tests` | INSERT | Via RPC (`complete_test`) |
| `tests` | UPDATE/DELETE | Denied (immutable audit) |
| `ai_usage_daily` | SELECT | `user_id = auth.uid()` |
| `ai_usage_daily` | INSERT/UPDATE/DELETE | Via RPC only |
| `events` | All operations | Denied to client (service role only) |

**API Endpoint Authorization**:
- **Supabase endpoints** (`/rest/v1/*`, `/auth/v1/*`): Enforced by RLS + JWT validation
- **Custom Astro endpoints** (`/api/*`): Manual JWT validation + RLS passthrough

### 3.3 Security Headers

All responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

---

## 4. Validation and Business Logic

### 4.1 List Validation Rules

| Field | Rules |
|-------|-------|
| `name` | • 1-80 characters (after trim)<br>• Cannot be empty or whitespace-only |
| `source` | • Enum: "manual" or "ai"<br>• Cannot be changed after creation |
| `category` | • Required if source="ai"<br>• Must be null if source="manual"<br>• Enum: animals, food, household_items, transport, jobs |

**Business Logic**:
- **50 Lists Per User Limit**: Enforced by trigger on INSERT to `lists` table
- **Post-Test Lock**: After `first_tested_at` is set, list items cannot be modified (enforced by trigger)
- **Name and Story Editable**: Can be changed even after testing
- **Last Access Tracking**: Updated via `touch_list()` RPC when user views list

### 4.2 List Item Validation Rules

| Field | Rules |
|-------|-------|
| `position` | • Integer 1-200<br>• Unique within list<br>• Represents display order |
| `display` | • 1-80 characters (after trim)<br>• Cannot be empty<br>• Original user-entered text |
| `normalized` | • Auto-generated (lowercase, no diacritics, single spaces)<br>• Used for future search features<br>• Not editable directly |

**Business Logic**:
- **200 Items Per List Limit**: Enforced by CHECK constraint on position (1-200)
- **Duplicate Words Allowed**: No uniqueness constraint on normalized text
- **Edit Lock After Test**: Cannot INSERT/UPDATE/DELETE after `first_tested_at` is set
- **Normalization**: Automatic via trigger using `unaccent()` and regex

### 4.3 Test Validation Rules

| Field | Rules |
|-------|-------|
| `items_count` | • Must match list's actual item count<br>• Between 1 and 200 |
| `correct` | • Non-negative integer<br>• Must be <= items_count |
| `wrong` | • Non-negative integer<br>• Must be <= items_count |
| Consistency | • correct + wrong = items_count |
| `score` | • Calculated: floor(100 * correct / items_count)<br>• 0-100 range |

**Business Logic**:
- **Minimum Test Threshold**: List must have at least 5 items to test (enforced in `complete_test` RPC)
- **Full List Testing**: Test always includes all items (no partial tests in MVP)
- **Sequential Order**: Test iterates position 1 → N
- **Immutable Records**: Tests cannot be updated or deleted after creation
- **Interrupted Tests**: Don't overwrite previous results (only successful completion saved)
- **First Test Lock**: Sets `first_tested_at`, preventing further list edits

### 4.4 AI Generation Validation Rules

**List Generation**:
| Parameter | Rules |
|-----------|-------|
| `category` | • Required<br>• Enum: animals, food, household_items, transport, jobs |
| `count` | • Integer 10-50<br>• Default: 10 |
| Daily Limit | • 5 generations per user per UTC day<br>• Resets at midnight UTC |

**Business Logic**:
- **Quota Enforcement**: Via `consume_ai_generation()` RPC before AI call
- **Content Filtering**: Profanity check on AI outputs
- **Retry Strategy**: 1 retry if AI returns incomplete/invalid results
- **Error Handling**: Generic "Try again" message to user
- **Caching**: 10-30 min cache with seed per user/day (cost optimization)
- **Modal on Issues**: If X/Y words missing or invalid, show modal

### 4.5 Profile Validation Rules

| Field | Rules |
|-------|-------|
| `theme_preference` | • Enum: "system", "light", "dark"<br>• Default: "system" |
| `locale` | • Valid locale string<br>• Default: "pl-PL" |
| `timezone` | • Optional IANA timezone<br>• For display only (not business logic) |

**Business Logic**:
- Profile created automatically on first login or explicitly via POST
- Preferences stored in database (not localStorage)
- Theme preference used for UI rendering

### 4.6 Rate Limiting

| Endpoint/Operation | Limit | Window | Enforcement |
|-------------------|-------|--------|-------------|
| Magic link requests | 3 per email | 60 seconds | Supabase Auth |
| Magic link requests | 10 per IP | 60 seconds | Supabase Auth |
| AI list generation | 5 per user | UTC day | Database (ai_usage_daily) |
| API requests (general) | 100 per user | 60 seconds | Future: API Gateway |

### 4.7 Error Code Mapping

| HTTP Status | Supabase Error Code | Meaning |
|-------------|---------------------|---------|
| 400 | 23514 | CHECK constraint violation (validation) |
| 400 | 22001 | String too long |
| 401 | - | Invalid or missing JWT |
| 403 | - | RLS policy denial |
| 404 | - | Resource not found or access denied |
| 409 | 23505 | UNIQUE constraint violation |
| 409 | P0001 | Custom business rule violation (raised by RPC) |
| 429 | P0001 | Rate limit exceeded (in hint/detail) |
| 500 | - | Internal server error |

---

## 5. Data Flow Examples

### 5.1 AI List Creation Flow

```
1. GET /api/ai/quota
   → Check remaining generations
   
2. POST /api/ai/generate-list
   → Consume quota (consume_ai_generation RPC)
   → Call OpenRouter.ai
   → Filter/validate results
   → Return word list to client
   
3. [User reviews and optionally edits in UI]

4. POST /rest/v1/lists
   → Create list record (source="ai", category)
   
5. POST /rest/v1/list_items (batch)
   → Insert items with positions 1..N
   
6. POST /api/analytics/event (save_ai_list)
   → Track conversion
```

### 5.2 Test Completion Flow

```
1. POST /rest/v1/rpc/touch_list
   → Update last_accessed_at
   
2. GET /rest/v1/lists?id=eq.{uuid}&select=*,items:list_items(*)
   → Fetch list with items
   
3. [User completes test in UI]

4. POST /rest/v1/rpc/complete_test
   → Validate: min 5 items, correct+wrong=total
   → Insert test record
   → Update list: first_tested_at (if first time), last_score, etc.
   → Return test result
   
5. POST /api/analytics/event (complete_test)
   → Track completion
```

### 5.3 Manual List Creation Flow

```
1. [User enters/pastes words in UI]

2. [Frontend validates: profanity, deduplication, format]

3. POST /rest/v1/lists
   → Create list (source="manual", category=null)
   
4. POST /rest/v1/list_items (batch)
   → Insert items with positions
   
5. POST /api/analytics/event (create_list)
   → Track creation
```

### 5.4 Story Generation Flow

```
1. GET /rest/v1/lists?id=eq.{uuid}&select=*,items:list_items(*)
   → Fetch list with items
   
2. POST /api/ai/generate-story
   → words: ["Cat", "Dog", ...]
   → Call OpenRouter.ai with prompt
   → Validate: story contains all words in order
   → Filter profanity
   → Return story
   
3. PATCH /rest/v1/lists?id=eq.{uuid}
   → Update story field
   
4. [User can edit story inline]

5. PATCH /rest/v1/lists?id=eq.{uuid}
   → Save edited story
```

---

## 6. API Versioning

**Current Version**: v1

**Strategy**: URL-based versioning for custom endpoints
- Supabase endpoints: `/rest/v1/*`, `/auth/v1/*` (managed by Supabase)
- Custom endpoints: `/api/v1/*` (future-proofing)
- MVP: `/api/*` without version prefix (will add in post-MVP)

**Deprecation Policy** (post-MVP):
- 6 months notice for breaking changes
- `X-API-Version` header in responses
- `X-API-Deprecated` header for deprecated endpoints

---

## 7. Performance Considerations

### 7.1 Caching Strategy

| Resource | Strategy | TTL | Invalidation |
|----------|----------|-----|--------------|
| List metadata | Client-side (React Query) | 5 minutes | On mutation |
| List items | Client-side | Until mutation | On add/update/delete |
| AI quota | Client-side | 1 minute | On generation |
| Test history | Client-side | 10 minutes | On test completion |
| Profile | Client-side | Session duration | On update |

### 7.2 Database Query Optimization

**Indexes** (defined in migration):
- `lists_user_last_accessed_idx`: Dashboard recently used sorting
- `list_items_list_position_idx`: Fast item retrieval
- `tests_list_completed_idx`: Test history by list
- `tests_user_completed_idx`: Test history by user
- `lists_user_last_tested_idx`: Dashboard filter by last tested
- `lists_user_name_lower_idx`: List name search

**Query Patterns**:
- Use `select` parameter to fetch related data in single request
- Example: `?select=*,items:list_items(*)` (list with items)
- Prefer RPC functions for complex operations (atomic transactions)

### 7.3 Pagination

**Default Limits**:
- Lists: 50 per page (max 100)
- Test history: 20 per page (max 100)
- Items: No pagination (max 200 per list)

**Headers**:
- Response: `Content-Range: start-end/total`
- Request: `Range: start-end` or use `limit`/`offset` params

---

## 8. Error Handling Standards

### 8.1 Error Response Format

All errors follow consistent JSON structure:

**Supabase REST API errors**:
```json
{
  "code": "23514",
  "message": "new row violates check constraint",
  "details": "Failing row contains (...)",
}
```

**Custom Astro API errors**:
```json
{
  "error": "validation_error",
  "message": "Human-readable error message",
  "details": {
    "field": "additional context"
  },
}
```

### 8.2 Client Error Handling

**Retry Strategy**:
- Network errors: Exponential backoff (1s, 2s, 4s)
- 429 Rate Limit: Wait for `reset_at` time
- 500 Server Error: Retry once after 5s
- AI generation errors: Single retry with "Try again" message

**UI Error Display**:
- **Network errors**: "Connection lost. Retrying..."
- **Validation errors**: Inline field validation with specific messages
- **AI errors**: Generic "Try again" (per PRD minimalist UX)
- **Rate limits**: "Daily limit reached. Resets at [time]"

---

## 9. Testing Recommendations

### 9.1 Endpoint Testing Priorities

**Critical Path (Must-Pass Checklist)**:
1. ✓ Magic link login → session creation → authenticated request
2. ✓ Create manual list → add items → save
3. ✓ Generate AI list → save → verify quota consumed
4. ✓ Complete test (min 5 items) → verify first_tested_at set → verify edit lock
5. ✓ Delete list → verify cascade to items and tests
6. ✓ Delete account → verify cascade to all user data
7. ✓ AI generation limit (6th request fails with 429)
8. ✓ List limit (51st list fails with 409)

### 9.2 Test Scenarios

**Authentication**:
- Valid magic link → successful login
- Expired magic link → error
- Used magic link → error (one-time)
- Rate limit: 4th email request → 429

**List Management**:
- Create list with 0 items → allowed (draft mode)
- Create list with 201 items → 400 error
- Update list name after test → success
- Delete item after test → 403 forbidden

**AI Generation**:
- Generate with count=5 → 400 error (min 10)
- Generate 6th time in day → 429 error
- AI returns profanity → filtered/rejected
- AI returns 18/20 words → retry → modal if still incomplete

**Testing**:
- Test list with 4 items → 400 error (min 5)
- Submit correct+wrong ≠ total → 400 error
- Interrupted test → doesn't overwrite last_score

---

## 11. Appendices

### 11.1 Enum Reference

**list_source**:
- `manual`: User-created via paste/typing
- `ai`: AI-generated

**noun_category**:
- `animals`: Animals category
- `food`: Food and beverages
- `household_items`: Household objects
- `transport`: Transportation vehicles
- `jobs`: Professions and occupations

**event_name** (analytics):
- `open_app`, `view_dashboard_empty`, `start_ai_flow`
- `ai_generation_failed`, `ai_generation_succeeded`
- `generate_ai_list`, `save_ai_list`, `create_list`
- `add_item`, `start_test`, `complete_test`
- `list_saved`, `delete_list`, `delete_account`

### 11.2 Rate Limit Summary

| Operation | Limit | Scope | Reset |
|-----------|-------|-------|-------|
| Magic link email | 3 requests | Per email | 60 seconds |
| Magic link email | 10 requests | Per IP | 60 seconds |
| AI generation | 5 requests | Per user | Midnight UTC |
| List creation | 50 total | Per user | Never (hard limit) |
| Items per list | 200 total | Per list | Never (hard limit) |

### 11.3 Success Metrics Endpoints

**Metric 1**: 90% of users have >5 lists
- Track via: `GET /rest/v1/lists?user_id=eq.{uuid}` (count)
- Events: `create_list`, `list_saved`, `delete_list`

**Metric 2**: 70% of users use AI lists
- Track via: `GET /rest/v1/lists?user_id=eq.{uuid}&source=eq.ai` (count)
- Events: `save_ai_list` (conversion), `generate_ai_list` (funnel)

---

## Document Version

- **Version**: 1.0
- **Date**: 2026-01-26
- **Status**: Draft for MVP Implementation
- **Next Review**: After MVP deployment

---

## Contact & Feedback

For API questions or issues:
- Technical implementation: Backend team
- Business logic clarification: Product owner
- Security concerns: Security team

**Change Request Process**:
1. Document proposed change with rationale
2. Impact assessment (breaking/non-breaking)
3. Review with stakeholders
4. Update this document
5. Implement with appropriate versioning
