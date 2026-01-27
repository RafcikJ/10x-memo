/**
 * Astro Middleware
 *
 * Handles authentication and injects Supabase client + user into context.locals
 * for use in API routes and pages.
 */

import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client.ts";
import type { User } from "@supabase/supabase-js";

export const onRequest = defineMiddleware(async (context, next) => {
  // Inject Supabase client into context
  context.locals.supabase = supabaseClient;

  // ============================================================================
  // TESTING MODE: Bypass authentication (use with caution!)
  // ============================================================================

  const isTestingMode = import.meta.env.DISABLE_AUTH_FOR_TESTING === "true";

  if (isTestingMode) {
    console.warn("⚠️  [Auth Middleware] TESTING MODE ACTIVE - Authentication bypassed!");

    // Create a mock test user
    const testUser: User = {
      id: import.meta.env.TEST_USER_ID || "00000000-0000-0000-0000-000000000000",
      email: import.meta.env.TEST_USER_EMAIL || "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    context.locals.user = testUser;
    console.log(`[Auth Middleware] Using test user: ${testUser.email} (${testUser.id})`);

    return next();
  }

  // ============================================================================
  // NORMAL MODE: Regular authentication
  // ============================================================================

  // Get authenticated user from session
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("[Auth Middleware] Error getting user:", error.message);
  }

  // Inject user into context (null if not authenticated)
  context.locals.user = user || null;

  return next();
});
