/// <reference types="astro/client" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: User | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly PUBLIC_APP_URL?: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly DISABLE_AUTH_FOR_TESTING?: string;
  readonly DISABLE_AI_QUOTA_FOR_TESTING?: string;
  readonly TEST_USER_ID?: string;
  readonly TEST_USER_EMAIL?: string;
  // OpenRouter Chat Configuration
  readonly OPENROUTER_BASE_URL?: string;
  readonly OPENROUTER_DEFAULT_MODEL?: string;
  readonly OPENROUTER_TIMEOUT_MS?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
