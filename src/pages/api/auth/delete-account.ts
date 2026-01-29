/**
 * API Endpoint: DELETE /api/auth/delete-account
 *
 * Securely deletes user account using database function
 * Uses server-side session for authentication
 * Calls delete_current_user_account() function which uses SECURITY DEFINER
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const DELETE: APIRoute = async ({ locals, request }) => {
  // ========================================================================
  // 1. Check authentication
  // ========================================================================

  const user = locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "unauthorized",
        message: "Musisz być zalogowany aby usunąć konto",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ========================================================================
  // 2. Validate confirmation
  // ========================================================================

  let body: { confirmation?: string };
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

  if (body.confirmation !== "USUŃ") {
    return new Response(
      JSON.stringify({
        error: "validation_error",
        message: 'Musisz wpisać "USUŃ" aby potwierdzić',
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ========================================================================
  // 3. Delete user using database function (bypasses JWT/Auth API issues)
  // ========================================================================

  try {
    // Call the database function using the user's own session
    // This function uses SECURITY DEFINER to delete from auth.users
    // and cascades to all related tables (lists, tests, items, etc.)
    const { error: deleteError } = await locals.supabase.rpc("delete_current_user_account");

    if (deleteError) {
      console.error("[delete-account] Delete error:", deleteError);
      return new Response(
        JSON.stringify({
          error: "server_error",
          message: "Nie udało się usunąć konta. Spróbuj ponownie.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // 4. Clear session and return success
    // ========================================================================

    await locals.supabase.auth.signOut();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Konto zostało trwale usunięte",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[delete-account] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Wystąpił błąd połączenia z serwerem",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
