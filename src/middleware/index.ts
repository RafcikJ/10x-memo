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

function createTestingSupabaseStub(user: User) {
  // Minimal, local-only stub to keep SSR pages working in Playwright testing mode
  // without requiring any Supabase environment variables.
  // IMPORTANT: This should never be used in production.
  const session = { user };

  return {
    auth: {
      async getSession() {
        return { data: { session }, error: null };
      },
      async getUser() {
        return { data: { user }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async exchangeCodeForSession(_code: string) {
        return { data: { session, user }, error: null };
      },
      async signInWithOtp(_args: unknown) {
        return { data: {}, error: null };
      },
    },
  } as unknown;
}

export const onRequest = defineMiddleware(async (context, next) => {
  // ============================================================================
  // TESTING MODE: Only available in development with explicit env var
  // ============================================================================

  const isTestingMode = import.meta.env.DEV && process.env.DISABLE_AUTH_FOR_TESTING === "true";

  if (isTestingMode) {
    console.warn("⚠️  [Auth Middleware] TESTING MODE ACTIVE (dev only)");

    // Create mock test user without Supabase authentication
    const testUserId = process.env.TEST_USER_ID || "00000000-0000-0000-0000-000000000001";
    const testUserEmail = process.env.TEST_USER_EMAIL || "test@playwright.test";

    if (!cachedTestUser) {
      // Create a mock user object that matches Supabase User type
      cachedTestUser = {
        id: testUserId,
        email: testUserEmail,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User;

      console.log(`[Auth Middleware] Created mock test user: ${cachedTestUser.email}`);
    }

    // Inject test client and mock user
    context.locals.supabase = createTestingSupabaseStub(cachedTestUser) as never;
    context.locals.user = cachedTestUser;

    console.log(`[Auth Middleware] Using mock test user: ${cachedTestUser.email}`);

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
