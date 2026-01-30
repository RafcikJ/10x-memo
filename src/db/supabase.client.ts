/**
 * Supabase Client Configuration with SSR Support
 *
 * Implements @supabase/ssr for proper cookie-based authentication
 * Exports configured Supabase client instances:
 * - createSupabaseServerClient: Factory for SSR client (use in Astro context)
 * - supabaseAdmin: Service role client for admin operations (use with caution)
 */

import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types.ts";

interface SupabaseEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
}

function readSupabaseEnv(): SupabaseEnv {
  // Environment variables:
  // - prefer import.meta.env (Astro/Vite)
  // - fallback to process.env (Node runtime / tests)
  // NOTE:
  // - Frontend/test config uses PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY
  // - Some environments use SUPABASE_URL / SUPABASE_KEY (legacy naming)
  const supabaseUrl =
    import.meta.env.PUBLIC_SUPABASE_URL ||
    process.env.PUBLIC_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseAnonKey =
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
    process.env.PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_KEY ||
    process.env.SUPABASE_KEY;

  const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // IMPORTANT: do not throw at module import time.
    // Astro middleware imports this module during dev server startup, and in CI we
    // may intentionally not provide Supabase config (e.g. lint/typecheck).
    throw new Error(
      [
        "[Supabase] Missing configuration.",
        "Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY (recommended),",
        "or SUPABASE_URL and SUPABASE_KEY (legacy).",
      ].join(" ")
    );
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

/**
 * Cookie options for Supabase Auth
 * - HttpOnly: Prevents XSS attacks
 * - Secure: HTTPS only in production
 * - SameSite: CSRF protection
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parse Cookie header into array of name/value pairs
 * Required by @supabase/ssr getAll() interface
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create Supabase server client with SSR support
 * Use this in Astro pages, API routes, and middleware
 *
 * @example
 * ```ts
 * const supabase = createSupabaseServerClient(Astro.cookies, Astro.request.headers);
 * const { data } = await supabase.auth.getUser();
 * ```
 */
export function createSupabaseServerClient(cookies: AstroCookies, headers: Headers) {
  const { supabaseUrl, supabaseAnonKey } = readSupabaseEnv();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, { ...cookieOptions, ...options }));
      },
    },
  });
}

/**
 * Admin client (bypasses RLS, use only for admin operations)
 * This client should NEVER be exposed to client-side code
 */
export function createSupabaseAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = readSupabaseEnv();

  if (!supabaseServiceRoleKey) {
    throw new Error("[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY for admin client.");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Type exports for use in services
export type SupabaseClient = ReturnType<typeof createSupabaseServerClient>;
export type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;
