/**
 * Astro Middleware - Authentication with SSR Support
 *
 * Handles authentication and injects Supabase client + user into context.locals
 * for use in API routes and pages.
 *
 * Uses @supabase/ssr for proper cookie-based session management
 */

import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../db/supabase.client.ts";
import type { User } from "@supabase/supabase-js";

let cachedTestUser: User | null = null;

export const onRequest = defineMiddleware(async (context, next) => {
  // ============================================================================
  // TESTING MODE: Only available in development with explicit env var
  // ============================================================================

  const isTestingMode = import.meta.env.DEV && import.meta.env.DISABLE_AUTH_FOR_TESTING === "true";

  if (isTestingMode) {
    console.warn("⚠️  [Auth Middleware] TESTING MODE ACTIVE (dev only)");

    // Create test user with Supabase Auth for RLS compatibility
    const desiredEmail = import.meta.env.TEST_USER_EMAIL || "test@example.com";
    const password = "Test1234!Test1234!";

    if (!cachedTestUser) {
      // Try to get or create test user
      const supabase = createSupabaseServerClient(context.cookies, context.request.headers);

      const signIn = await supabase.auth.signInWithPassword({
        email: desiredEmail,
        password,
      });

      if (signIn.data.user) {
        cachedTestUser = signIn.data.user;
      } else {
        // Create test user if doesn't exist
        const signUp = await supabase.auth.signUp({
          email: desiredEmail,
          password,
        });

        if (signUp.data.user) {
          cachedTestUser = signUp.data.user;
        } else {
          console.error("[Auth Middleware] Failed to create test user:", signUp.error);
        }
      }
    }

    // Inject test client and user
    context.locals.supabase = createSupabaseServerClient(context.cookies, context.request.headers);
    context.locals.user = cachedTestUser;

    if (cachedTestUser) {
      console.log(`[Auth Middleware] Using test user: ${cachedTestUser.email}`);
    }

    return next();
  }

  // ============================================================================
  // NORMAL MODE: Production authentication with SSR
  // ============================================================================

  try {
    // Create SSR-aware Supabase client
    const supabase = createSupabaseServerClient(context.cookies, context.request.headers);

    // Inject into context for use in routes
    context.locals.supabase = supabase;

    // Get authenticated user from session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("[Auth Middleware] Error getting user:", error.message);

      // If user from JWT doesn't exist (e.g., account was deleted), clear session
      if (error.message.includes("User from sub claim in JWT does not exist")) {
        await supabase.auth.signOut();
      }

      context.locals.user = null;
      return next();
    }

    // Inject user into context (null if not authenticated)
    context.locals.user = user || null;
  } catch (err) {
    console.error("[Auth Middleware] Unexpected error:", err);
    context.locals.user = null;
  }

  return next();
});
