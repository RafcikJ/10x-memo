/**
 * DTO (Data Transfer Object) and Command Model Types
 *
 * This file contains type definitions for data structures used in API communication.
 * All types are derived from the database schema defined in src/db/database.types.ts
 * and aligned with the API specification in .ai/api-plan.md
 */

import type { Database } from "./db/database.types";

// ============================================================================
// Database Entity Types (Base Types)
// ============================================================================

export type ProfileEntity = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type ListEntity = Database["public"]["Tables"]["lists"]["Row"];
export type ListInsert = Database["public"]["Tables"]["lists"]["Insert"];
export type ListUpdate = Database["public"]["Tables"]["lists"]["Update"];

export type ListItemEntity = Database["public"]["Tables"]["list_items"]["Row"];
export type ListItemInsert = Database["public"]["Tables"]["list_items"]["Insert"];
export type ListItemUpdate = Database["public"]["Tables"]["list_items"]["Update"];

export type TestEntity = Database["public"]["Tables"]["tests"]["Row"];
export type TestInsert = Database["public"]["Tables"]["tests"]["Insert"];

export type AIUsageDailyEntity = Database["public"]["Tables"]["ai_usage_daily"]["Row"];

// Note: Events table is for post-MVP analytics
// export type EventEntity = Database['public']['Tables']['events']['Row'];
// export type EventInsert = Database['public']['Tables']['events']['Insert'];

// ============================================================================
// Enum Types
// ============================================================================

// Note: event_name enum is for post-MVP analytics
// export type EventName = Database['public']['Enums']['event_name'];
export type ListSource = Database["public"]["Enums"]["list_source"];
export type NounCategory = Database["public"]["Enums"]["noun_category"];

// ============================================================================
// Profile DTOs
// ============================================================================

/**
 * Profile DTO for reading user profile data
 * Maps to: GET /rest/v1/profiles
 */
export type ProfileDTO = ProfileEntity;

/**
 * Create Profile DTO for first-time profile setup
 * Maps to: POST /rest/v1/profiles
 */
export type CreateProfileDTO = Pick<ProfileInsert, "theme_preference" | "locale" | "timezone">;

/**
 * Update Profile DTO for updating user preferences
 * Maps to: PATCH /rest/v1/profiles
 */
export type UpdateProfileDTO = Partial<CreateProfileDTO>;

// ============================================================================
// List DTOs
// ============================================================================

/**
 * List DTO for reading list metadata
 * Maps to: GET /rest/v1/lists
 */
export type ListDTO = ListEntity;

/**
 * List with Items DTO for reading list with all its items
 * Maps to: GET /rest/v1/lists?id=eq.{uuid}&select=*,items:list_items(*)
 */
export type ListWithItemsDTO = ListEntity & {
  items: ListItemEntity[];
};

/**
 * Create List DTO for creating a new word list
 * Maps to: POST /rest/v1/lists
 *
 * Validation:
 * - name: 1-80 characters (after trim)
 * - source: "manual" or "ai"
 * - category: required if source="ai", null if source="manual"
 */
export type CreateListDTO = Pick<ListInsert, "name" | "source" | "category">;

/**
 * Update List DTO for updating list properties
 * Maps to: PATCH /rest/v1/lists?id=eq.{uuid}
 *
 * Note: Only name can be updated after creation
 * Cannot change source, category, or test-related fields
 */
export type UpdateListDTO = Partial<Pick<ListUpdate, "name">>;

/**
 * Create List with Items Request DTO
 * Maps to: POST /api/lists
 *
 * Creates a new list along with its items in a single transaction
 *
 * Validation:
 * - name: 1-80 characters (after trim)
 * - source: "manual" or "ai"
 * - category: required if source="ai", null if source="manual"
 * - items: array of 1-200 items with unique positions
 * - each item.position: 1-200
 * - each item.display: 1-80 characters (after trim)
 */
export interface CreateListWithItemsDTO {
  name: string;
  source: ListSource;
  category?: NounCategory | null;
  items: GeneratedListItem[];
}

/**
 * Create List with Items Response DTO
 * Returned by: POST /api/lists
 */
export interface CreateListWithItemsResponseDTO {
  success: true;
  list: ListWithItemsDTO;
}

// ============================================================================
// List Item DTOs
// ============================================================================

/**
 * List Item DTO for reading individual list items
 * Maps to: GET /rest/v1/list_items?list_id=eq.{uuid}
 */
export type ListItemDTO = ListItemEntity;

/**
 * Create List Item DTO for adding words to a list
 * Maps to: POST /rest/v1/list_items
 *
 * Validation:
 * - position: 1-200 (unique per list)
 * - display: 1-80 characters (after trim)
 * - normalized: auto-generated by database trigger (not sent by client)
 */
export type CreateListItemDTO = Pick<ListItemInsert, "list_id" | "position" | "display">;

/**
 * Update List Item DTO for modifying existing items
 * Maps to: PATCH /rest/v1/list_items?id=eq.{uuid}
 *
 * Note: Cannot update after first_tested_at is set
 * Note: normalized is auto-generated by database trigger (not sent by client)
 */
export type UpdateListItemDTO = Partial<Pick<ListItemUpdate, "position" | "display">>;

// ============================================================================
// Test DTOs
// ============================================================================

/**
 * Test DTO for reading test completion records
 * Maps to: GET /rest/v1/tests
 */
export type TestDTO = TestEntity;

/**
 * Complete Test Command for submitting test results
 * Maps to: POST /rest/v1/rpc/complete_test
 *
 * Validation:
 * - List must have at least 5 items
 * - correct + wrong must equal total items in list
 * - score is calculated automatically: floor(100 * correct / items_count)
 *
 * Side effects:
 * - Creates immutable test record
 * - Updates list.last_score, last_tested_at, last_correct, last_wrong
 * - Sets list.first_tested_at if null (locks list editing)
 */
export interface CompleteTestCommand {
  p_list_id: string;
  p_correct: number;
  p_wrong: number;
  p_completed_at?: string;
}

/**
 * Complete Test Response
 * Returned by: POST /rest/v1/rpc/complete_test
 */
export type CompleteTestResponse = TestEntity;

// ============================================================================
// AI Generation DTOs
// ============================================================================

/**
 * Generate List Request DTO for AI word list generation
 * Maps to: POST /api/ai/generate-list
 *
 * Validation:
 * - category: one of defined NounCategory values
 * - count: 10-50 (inclusive)
 * - Enforces 5 generations per day per user limit
 */
export interface GenerateListRequestDTO {
  category: NounCategory;
  count: number;
}

/**
 * Generated List Item represents a single word from AI generation
 */
export interface GeneratedListItem {
  position: number;
  display: string;
}

/**
 * Generate List Response DTO
 * Returned by: POST /api/ai/generate-list
 */
export interface GenerateListResponseDTO {
  success: true;
  items: GeneratedListItem[];
}

/**
 * AI Quota DTO for daily generation limit tracking
 * Returned by: GET /rest/v1/rpc/consume_ai_generation
 */
export interface AIQuotaDTO {
  used: number;
  remaining: number;
  limit: number;
  reset_at: string;
}

// ============================================================================
// Touch List Command
// ============================================================================

/**
 * Touch List Command for updating last_accessed_at timestamp
 * Maps to: POST /rest/v1/rpc/touch_list
 *
 * Use cases:
 * - User opens list detail view
 * - User starts reviewing list for study
 * - Supports "recently used" dashboard sorting
 */
export interface TouchListCommand {
  p_list_id: string;
}

/**
 * Touch List Response
 * Returned by: POST /rest/v1/rpc/touch_list
 */
export type TouchListResponse = ListEntity;

// ============================================================================
// Account Management DTOs
// ============================================================================

/**
 * Delete Account Command for permanent account deletion
 * Maps to: DELETE /api/account
 *
 * Validation:
 * - confirmation must equal "DELETE" (case-sensitive)
 *
 * Side effects:
 * - Deletes user from auth.users (cascades to all tables)
 * - Invalidates all user sessions
 * - Operation is irreversible (GDPR compliant)
 */
export interface DeleteAccountCommand {
  confirmation: string;
}

/**
 * Delete Account Response
 * Returned by: DELETE /api/account
 */
export interface DeleteAccountResponse {
  success: true;
  message: string;
}

// ============================================================================
// Analytics/Event DTOs (Post-MVP)
// ============================================================================

// Note: Analytics is not part of MVP and will be implemented in future iterations

// ============================================================================
// Common Response Types
// ============================================================================

/**
 * Generic Success Response
 */
export interface SuccessResponse {
  success: true;
}

/**
 * Generic Error Response for custom API endpoints
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Supabase Error Response
 */
export interface SupabaseErrorResponse {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

// ============================================================================
// Validation Error Types
// ============================================================================

/**
 * Validation Error Details
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation Error Response
 */
export type ValidationErrorResponse = ErrorResponse & {
  error: "validation_error";
  details: {
    errors: ValidationError[];
  };
};

// ============================================================================
// Rate Limit Types
// ============================================================================

/**
 * Rate Limit Error Response
 */
export type RateLimitErrorResponse = ErrorResponse & {
  error: "rate_limit_exceeded";
  reset_at?: string;
  retry_after?: number;
};

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination Parameters for list queries
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Pagination Metadata from Content-Range header
 */
export interface PaginationMeta {
  start: number;
  end: number;
  total: number;
}

// ============================================================================
// Auth Types (for completeness)
// ============================================================================

/**
 * Magic Link Request for passwordless authentication
 * Maps to: POST /auth/v1/magiclink
 */
export interface MagicLinkRequest {
  email: string;
}

/**
 * Current User Info
 * Returned by: POST /auth/v1/user
 */
export interface CurrentUserDTO {
  id: string;
  email: string;
  confirmed_at: string;
  created_at: string;
}

// ============================================================================
// OpenRouter Chat Completions DTOs
// ============================================================================

/**
 * Chat Message Role
 */
export type ChatMessageRole = "system" | "user" | "assistant";

/**
 * Chat Message
 * Represents a single message in a conversation
 */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

/**
 * Model Parameters for Chat Completion
 */
export interface ChatModelParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * JSON Schema Response Format (for structured outputs)
 * Uses OpenRouter's json_schema format with strict mode
 */
export interface JSONSchemaResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

/**
 * Chat Completion Request DTO
 * For basic chat completions without structured output
 * Maps to internal OpenRouter chat service
 */
export interface ChatCompletionRequestDTO {
  systemPrompt?: string;
  messages: ChatMessage[];
  model?: string;
  params?: ChatModelParams;
}

/**
 * Chat Completion Response DTO
 * Returned by chat completion endpoints
 */
export interface ChatCompletionResponseDTO {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Structured Completion Request DTO
 * For chat completions with enforced JSON schema output
 */
export interface StructuredCompletionRequestDTO<TSchemaName extends string = string> {
  systemPrompt?: string;
  messages: ChatMessage[];
  responseFormat: JSONSchemaResponseFormat;
  model?: string;
  params?: ChatModelParams;
}

/**
 * Structured Completion Response DTO
 * Returned by structured completion endpoints
 * @template T - The expected type of the parsed JSON response
 */
export interface StructuredCompletionResponseDTO<T = unknown> {
  value: T;
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * OpenRouter-specific Error Response
 */
export type OpenRouterErrorResponse = ErrorResponse & {
  error: "ai_service_error" | "ai_invalid_output" | "ai_schema_mismatch" | "ai_timeout" | "upstream_rate_limited";
  retry_after?: number;
};
