/**
 * API Error Response Helpers
 *
 * Provides type-safe factory functions for creating consistent error responses
 * across all custom API endpoints
 */

import type { ErrorResponse, RateLimitErrorResponse, ValidationError } from "@/types";
import type { ZodError } from "zod";

/**
 * Generic error response factory
 *
 * @param error - Error code/type identifier
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional error details
 * @returns Response object with JSON error body
 */
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

/**
 * Validation error response factory
 *
 * Creates a 400 Bad Request response with field-level validation errors
 *
 * @param message - General validation error message
 * @param fields - Map of field names to error messages
 * @returns Response object with validation error details
 *
 * @example
 * ```ts
 * return validationErrorResponse('Invalid request data', {
 *   count: 'count must be between 10 and 50',
 *   category: 'category is required'
 * });
 * ```
 */
export function validationErrorResponse(message: string, fields: Record<string, string>): Response {
  const errors: ValidationError[] = Object.entries(fields).map(([field, msg]) => ({
    field,
    message: msg,
  }));

  return errorResponse("validation_error", message, 400, { errors });
}

/**
 * Rate limit error response factory
 *
 * Creates a 429 Too Many Requests response with reset time information
 *
 * @param message - Human-readable rate limit message
 * @param resetAt - ISO 8601 timestamp when limit resets
 * @returns Response object with rate limit error
 *
 * @example
 * ```ts
 * return rateLimitErrorResponse(
 *   'Daily AI generation limit exceeded (5/day)',
 *   '2026-01-27T00:00:00Z'
 * );
 * ```
 */
export function rateLimitErrorResponse(message: string, resetAt: string): Response {
  const body: RateLimitErrorResponse = {
    error: "rate_limit_exceeded",
    message,
    reset_at: resetAt,
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000)),
    },
  });
}

/**
 * Unauthorized error response factory
 *
 * Creates a 401 Unauthorized response
 *
 * @param message - Optional custom message (default: "Authentication required")
 * @returns Response object with unauthorized error
 */
export function unauthorizedResponse(message = "Authentication required"): Response {
  return errorResponse("unauthorized", message, 401);
}

/**
 * AI service error response factory
 *
 * Creates a 500 Internal Server Error for AI generation failures
 *
 * @param retryAfter - Optional seconds to wait before retry
 * @returns Response object with AI service error
 */
export function aiServiceErrorResponse(retryAfter = 30): Response {
  return new Response(
    JSON.stringify({
      error: "ai_service_error",
      message: "Failed to generate list. Please try again.",
      retry_after: retryAfter,
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}

/**
 * Extracts Zod validation errors into field-message map
 *
 * @param zodError - Zod validation error
 * @returns Map of field paths to error messages
 *
 * @example
 * ```ts
 * try {
 *   schema.parse(data);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     return validationErrorResponse(
 *       'Invalid request data',
 *       extractZodErrors(error)
 *     );
 *   }
 * }
 * ```
 */
export function extractZodErrors(zodError: ZodError): Record<string, string> {
  if (!zodError?.errors) return {};

  return Object.fromEntries(zodError.errors.map((e) => [e.path.join(".") || "root", e.message]));
}
