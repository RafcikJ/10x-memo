/**
 * Astro Middleware
 *
 * Handles authentication and injects Supabase client + user into context.locals
 * for use in API routes and pages.
 */

import { defineMiddleware } from "astro:middleware";
import { supabaseAdmin, supabaseClient } from "../db/supabase.client.ts";
import type { Session, User } from "@supabase/supabase-js";

let cachedTestUser: User | null = null;
let cachedTestSession: Session | null = null;

export const onRequest = defineMiddleware(async (context, next) => {
  // ============================================================================
  // TESTING MODE: Bypass authentication (use with caution!)
  // ============================================================================

  const isTestingMode = import.meta.env.DISABLE_AUTH_FOR_TESTING === "true";

  if (isTestingMode) {
    console.warn("⚠️  [Auth Middleware] TESTING MODE ACTIVE - Authentication bypassed!");

    // In testing mode we still want DB writes to pass RLS + FK constraints.
    // So we create/sign-in a real Supabase Auth user (using anon key),
    // cache its session, and then use the authenticated client for requests.
    const desiredEmail = import.meta.env.TEST_USER_EMAIL || "test@example.com";
    const password = "Test1234!Test1234!";

    if (!cachedTestSession || !cachedTestUser) {
      // 1) Try sign-in first
      const signIn = await supabaseClient.auth.signInWithPassword({ email: desiredEmail, password });

      if (signIn.data.session && signIn.data.user) {
        cachedTestSession = signIn.data.session;
        cachedTestUser = signIn.data.user;
      } else {
        // 2) If not registered yet, sign up and then sign in
        const signUp = await supabaseClient.auth.signUp({ email: desiredEmail, password });

        if (signUp.error && signUp.error.status !== 400) {
          console.error("[Auth Middleware] Failed to sign up test user:", signUp.error);
        }

        const signInAgain = await supabaseClient.auth.signInWithPassword({ email: desiredEmail, password });

        if (signInAgain.error || !signInAgain.data.session || !signInAgain.data.user) {
          console.error("[Auth Middleware] Failed to sign in test user:", signInAgain.error);
        } else {
          cachedTestSession = signInAgain.data.session;
          cachedTestUser = signInAgain.data.user;
        }
      }
    }

    // Ensure the client is authenticated (so auth.uid() works for RLS policies).
    if (cachedTestSession) {
      await supabaseClient.auth.setSession({
        access_token: cachedTestSession.access_token,
        refresh_token: cachedTestSession.refresh_token,
      });
    }

    context.locals.supabase = supabaseClient;
    const testUser = cachedTestUser ?? {
      id: import.meta.env.TEST_USER_ID || "00000000-0000-0000-0000-000000000000",
      email: desiredEmail,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    context.locals.user = testUser;
    console.log(`[Auth Middleware] Using test user: ${testUser.email} (${testUser.id})`);

    return next();
  }

  // Inject Supabase client into context (RLS enforced)
  context.locals.supabase = supabaseClient;

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
