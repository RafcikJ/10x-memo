/**
 * API Endpoint: POST /api/auth/logout
 *
 * Logs out the current user and clears their session
 * Idempotent - always returns success even if no session exists
 */

import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals, cookies }) => {
  try {
    // ========================================================================
    // 1. Sign out via Supabase Auth
    // ========================================================================

    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      console.error("[logout] Supabase error:", error);
      // Don't return error to user - logout should always succeed
      // Even if Supabase fails, we clear cookies below
    }

    // ========================================================================
    // 2. Clear auth cookies (redundant but ensures clean state)
    // ========================================================================

    // Supabase SSR handles cookie clearing, but we can be explicit
    // Note: Cookie names may vary based on Supabase version
    const cookieNames = [
      "sb-access-token",
      "sb-refresh-token",
      // Supabase @supabase/ssr uses different cookie names
      // Let Supabase handle it automatically through signOut()
    ];

    cookieNames.forEach((name) => {
      try {
        cookies.delete(name, { path: "/" });
      } catch {
        // Ignore errors - cookie may not exist
      }
    });

    // ========================================================================
    // 3. Success response (always, for idempotency)
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        message: "Wylogowano pomyślnie",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[logout] Unexpected error:", err);

    // Even on unexpected error, return success for idempotency
    // Logout should always allow user to proceed
    return new Response(
      JSON.stringify({
        success: true,
        message: "Wylogowano pomyślnie",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
