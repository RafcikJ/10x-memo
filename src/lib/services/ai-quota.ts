/**
 * AI Generation Quota Management Service
 *
 * Manages daily AI generation limits (5 per user per UTC day).
 * Provides both consuming and non-consuming quota checks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIQuotaDTO } from "@/types";
import type { Database } from "@/db/database.types";

/**
 * Daily generation limit per user
 */
export const AI_GENERATION_DAILY_LIMIT = 5;

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetAt: string
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Consume one AI generation from user's daily quota
 *
 * This function has side effects - it increments the usage counter.
 * Call this BEFORE performing AI generation to ensure quota is available.
 *
 * @param supabase - Supabase client instance
 * @returns Quota information (used, remaining, limit, reset_at)
 * @throws RateLimitError if daily limit exceeded
 * @throws Error on database errors
 *
 * @example
 * ```ts
 * try {
 *   const quota = await consumeAIQuota(supabase);
 *   console.log(`Remaining: ${quota.remaining}/5`);
 *   // Proceed with AI generation
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     console.log(`Limit exceeded. Resets at: ${error.resetAt}`);
 *   }
 * }
 * ```
 */
export async function consumeAIQuota(supabase: SupabaseClient<Database>): Promise<AIQuotaDTO> {
  const { data, error } = await supabase.rpc("consume_ai_generation").returns<AIQuotaDTO>();

  // Handle rate limit error (P0001 = raise_exception)
  if (error) {
    if (error.code === "P0001") {
      // Extract reset time from hint
      const resetAt = extractResetTimeFromHint(error.hint) || getNextMidnightUTC();
      throw new RateLimitError(error.message, resetAt);
    }

    // Other database errors
    throw new Error(`Failed to check AI quota: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from consume_ai_generation");
  }

  return data;
}

/**
 * Check available AI quota WITHOUT consuming it
 *
 * Useful for displaying quota in UI without decrementing the counter.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check quota for
 * @returns Quota information
 *
 * @example
 * ```ts
 * const quota = await checkAIQuota(supabase, user.id);
 * if (quota.remaining > 0) {
 *   // Show "Generate List" button
 * } else {
 *   // Show "Limit reached. Resets at {quota.reset_at}"
 * }
 * ```
 */
export async function checkAIQuota(supabase: SupabaseClient<Database>, userId: string): Promise<AIQuotaDTO> {
  const dayUTC = getCurrentUTCDate();

  // Query current usage without incrementing
  const { data, error } = await supabase
    .from("ai_usage_daily")
    .select("used")
    .eq("user_id", userId)
    .eq("day_utc", dayUTC)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check AI quota: ${error.message}`);
  }

  const used = data?.used || 0;
  const remaining = Math.max(0, AI_GENERATION_DAILY_LIMIT - used);
  const resetAt = getNextMidnightUTC();

  return {
    used,
    remaining,
    limit: AI_GENERATION_DAILY_LIMIT,
    reset_at: resetAt,
  };
}

/**
 * Get current UTC date in YYYY-MM-DD format
 *
 * @returns Current date in UTC timezone
 */
function getCurrentUTCDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get next midnight UTC as ISO 8601 string
 *
 * @returns ISO timestamp of next UTC midnight
 */
export function getNextMidnightUTC(): string {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return tomorrow.toISOString();
}

/**
 * Extract reset time from PostgreSQL hint message
 *
 * @param hint - PostgreSQL error hint
 * @returns Extracted ISO timestamp or null
 */
function extractResetTimeFromHint(hint?: string): string | null {
  if (!hint) return null;

  // Expected format: "Limit resets at 2026-01-27T00:00:00Z"
  const match = hint.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
  return match ? match[1] : null;
}
