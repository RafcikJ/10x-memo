/**
 * Supabase Edge Function: delete-account
 *
 * Securely deletes user account using service_role privileges
 * This function runs on Supabase infrastructure with proper security isolation
 *
 * Deploy with: supabase functions deploy delete-account
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteAccountRequest {
  confirmation: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // 1. Validate request method
    // ========================================================================

    if (req.method !== "DELETE" && req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "method_not_allowed",
          message: "Tylko DELETE lub POST są dozwolone",
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // 2. Get authenticated user from JWT
    // ========================================================================

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "unauthorized",
          message: "Musisz być zalogowany aby usunąć konto",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create client with anon key to verify JWT
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "unauthorized",
          message: "Nieprawidłowy token autoryzacji",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // 3. Validate request body (confirmation text)
    // ========================================================================

    let body: DeleteAccountRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Nieprawidłowe dane żądania",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (body.confirmation !== "USUŃ") {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Nieprawidłowe potwierdzenie. Wpisz dokładnie: USUŃ",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // 4. Delete user with service_role privileges (secure on Edge Function)
    // ========================================================================

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("[delete-account] Delete error:", deleteError);
      return new Response(
        JSON.stringify({
          error: "server_error",
          message: "Nie udało się usunąć konta. Spróbuj ponownie.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // 5. Success response
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        message: "Konto zostało trwale usunięte",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[delete-account] Unexpected error:", err);

    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Wystąpił nieoczekiwany błąd",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
