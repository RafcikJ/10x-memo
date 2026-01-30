/**
 * PATCH /api/lists/[id] - Update list name
 * DELETE /api/lists/[id] - Delete list
 *
 * Authentication: Required (Bearer token)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { errorResponse, validationErrorResponse, unauthorizedResponse, extractZodErrors } from "@/lib/utils/api-errors";
import { deleteList, isTestingMode, updateListName } from "@/lib/testing/inMemoryListsStore";

// Disable prerendering for API route
export const prerender = false;

/**
 * PATCH handler for updating list name
 */
export const PATCH: APIRoute = async (context) => {
  const { locals, request, params } = context;
  const { supabase, user } = locals;

  // ============================================================================
  // Step 1: Authentication Check
  // ============================================================================

  if (!user) {
    console.warn("[Update List] Unauthorized access attempt");
    return unauthorizedResponse();
  }

  // ============================================================================
  // Step 2: Validate List ID
  // ============================================================================

  const { id } = params;

  if (!id) {
    return errorResponse("invalid_id", "List ID is required", 400);
  }

  console.log(`[Update List] Request from user: ${user.id} for list: ${id}`);

  // ============================================================================
  // Step 3: Parse and Validate Request Body
  // ============================================================================

  const updateListSchema = z.object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(80, "Name must be at most 80 characters")
      .transform((val) => val.trim()),
  });

  let requestBody;

  try {
    const rawBody = await request.json();
    requestBody = updateListSchema.parse(rawBody);
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.warn("[Update List] Invalid JSON in request body");
      return errorResponse("invalid_json", "Request body must be valid JSON", 400);
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.warn("[Update List] Validation error:", error.errors);
      return validationErrorResponse("Invalid request data", extractZodErrors(error));
    }

    // Unexpected errors
    console.error("[Update List] Unexpected validation error:", error);
    return errorResponse("validation_error", "Failed to validate request", 400);
  }

  // ============================================================================
  // Step 4: Update List in Database
  // ============================================================================

  try {
    // TESTING MODE: In-memory persistence for deterministic E2E
    if (isTestingMode()) {
      const updated = updateListName({ userId: user.id, listId: id, name: requestBody.name });

      if (!updated) {
        console.warn("[Update List] List not found or unauthorized (testing mode)");
        return errorResponse("not_found", "List not found", 404);
      }

      return new Response(JSON.stringify({ success: true, list: updated }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const { data: list, error } = await supabase
      .from("lists")
      .update({ name: requestBody.name })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[Update List] Failed to update list:", error);
      return errorResponse("database_error", "Failed to update list. Please try again.", 500);
    }

    if (!list) {
      console.warn("[Update List] List not found or unauthorized");
      return errorResponse("not_found", "List not found", 404);
    }

    console.log(`[Update List] Successfully updated list: ${id}`);

    return new Response(JSON.stringify({ success: true, list }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Update List] Unexpected error:", error);
    return errorResponse("internal_error", "An unexpected error occurred. Please try again.", 500);
  }
};

/**
 * DELETE handler for deleting a list
 */
export const DELETE: APIRoute = async (context) => {
  const { locals, params } = context;
  const { supabase, user } = locals;

  // ============================================================================
  // Step 1: Authentication Check
  // ============================================================================

  if (!user) {
    console.warn("[Delete List] Unauthorized access attempt");
    return unauthorizedResponse();
  }

  // ============================================================================
  // Step 2: Validate List ID
  // ============================================================================

  const { id } = params;

  if (!id) {
    return errorResponse("invalid_id", "List ID is required", 400);
  }

  console.log(`[Delete List] Request from user: ${user.id} for list: ${id}`);

  // ============================================================================
  // Step 3: Delete List from Database
  // ============================================================================

  try {
    // TESTING MODE: In-memory persistence for deterministic E2E
    if (isTestingMode()) {
      const ok = deleteList({ userId: user.id, listId: id });
      if (!ok) {
        console.warn("[Delete List] List not found or unauthorized (testing mode)");
        return errorResponse("not_found", "List not found", 404);
      }

      return new Response(JSON.stringify({ success: true, message: "List deleted successfully" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const { error } = await supabase.from("lists").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      console.error("[Delete List] Failed to delete list:", error);
      return errorResponse("database_error", "Failed to delete list. Please try again.", 500);
    }

    console.log(`[Delete List] Successfully deleted list: ${id}`);

    return new Response(JSON.stringify({ success: true, message: "List deleted successfully" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Delete List] Unexpected error:", error);
    return errorResponse("internal_error", "An unexpected error occurred. Please try again.", 500);
  }
};
