/**
 * Supabase Client Configuration
 *
 * Exports configured Supabase client instances:
 * - supabaseClient: Public client with anon key (use in most cases)
 * - supabaseAdmin: Service role client for admin operations (use with caution)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types.ts";

// Environment variables
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (for authenticated users, RLS enforced)
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Admin client (for server-side operations, bypasses RLS)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Type exports for use in services
export type SupabaseClient = typeof supabaseClient;
export type SupabaseAdmin = typeof supabaseAdmin;
