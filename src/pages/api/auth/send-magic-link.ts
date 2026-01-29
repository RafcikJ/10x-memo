/**
 * API Endpoint: POST /api/auth/send-magic-link
 *
 * Sends a magic link (OTP) to user's email for passwordless authentication
 * Implements rate limiting and validation according to auth-spec.md
 */

import type { APIRoute } from "astro";
import { SendMagicLinkSchema } from "../../../lib/validation/auth.ts";
import { checkRateLimit } from "../../../lib/services/rate-limiter.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // ========================================================================
    // 1. Parse and validate request body
    // ========================================================================

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Nieprawidłowe dane żądania",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validation = SendMagicLinkSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: validation.error.errors[0].message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, redirectTo } = validation.data;

    // ========================================================================
    // 2. Rate limiting check
    // ========================================================================

    const rateLimitCheck = await checkRateLimit(request, email);

    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message: `Przekroczono limit prób. Spróbuj ponownie za ${rateLimitCheck.retryAfter} sekund.`,
          retry_after: rateLimitCheck.retryAfter,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // 3. Call Supabase Auth API to send magic link
    // ========================================================================

    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: {
        // Construct callback URL with redirect parameter
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      console.error("[send-magic-link] Supabase error:", error);

      // Map Supabase errors to user-friendly messages
      if (error.message.includes("rate limit") || error.message.includes("Email rate limit exceeded")) {
        return new Response(
          JSON.stringify({
            error: "rate_limit_exceeded",
            message: "Przekroczono limit wysyłki email. Spróbuj ponownie później.",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "server_error",
          message: "Nie udało się wysłać linku. Spróbuj ponownie.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // 4. Success response
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        message: `Link został wysłany na adres ${email}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[send-magic-link] Unexpected error:", err);

    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Wystąpił nieoczekiwany błąd.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
