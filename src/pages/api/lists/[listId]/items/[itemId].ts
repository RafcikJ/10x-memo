/**
 * PATCH /api/lists/[listId]/items/[itemId] - Update list item
 * DELETE /api/lists/[listId]/items/[itemId] - Delete list item
 *
 * Authentication: Required (Bearer token)
 *
 * Note: After deletion, positions are reindexed (1..N)
 * Note: Editing is blocked by database trigger after first test
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { errorResponse, validationErrorResponse, unauthorizedResponse, extractZodErrors } from "@/lib/utils/api-errors";

// Disable prerendering for API route
export const prerender = false;

/**
 * PATCH handler for updating list item display text
 */
export const PATCH: APIRoute = async (context) => {
  const { locals, request, params } = context;
  const { supabase, user } = locals;

  // ============================================================================
  // Step 1: Authentication Check
  // ============================================================================

  if (!user) {
    console.warn("[Update Item] Unauthorized access attempt");
    return unauthorizedResponse();
  }

  // ============================================================================
  // Step 2: Validate Parameters
  // ============================================================================

  const { listId, itemId } = params;

  if (!listId || !itemId) {
    return errorResponse("invalid_id", "List ID and Item ID are required", 400);
  }

  console.log(`[Update Item] Request from user: ${user.id} for item: ${itemId} in list: ${listId}`);

  // ============================================================================
  // Step 3: Parse and Validate Request Body
  // ============================================================================

  const updateItemSchema = z.object({
    display: z
      .string()
      .min(1, "Display text is required")
      .max(80, "Display text must be at most 80 characters")
      .transform((val) => val.trim()),
  });

  let requestBody;

  try {
    const rawBody = await request.json();
    requestBody = updateItemSchema.parse(rawBody);
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.warn("[Update Item] Invalid JSON in request body");
      return errorResponse("invalid_json", "Request body must be valid JSON", 400);
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.warn("[Update Item] Validation error:", error.errors);
      return validationErrorResponse("Invalid request data", extractZodErrors(error));
    }

    // Unexpected errors
    console.error("[Update Item] Unexpected validation error:", error);
    return errorResponse("validation_error", "Failed to validate request", 400);
  }

  // ============================================================================
  // Step 4: Verify List Ownership
  // ============================================================================

  try {
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select("id, first_tested_at")
      .eq("id", listId)
      .eq("user_id", user.id)
      .single();

    if (listError || !list) {
      console.warn("[Update Item] List not found or unauthorized");
      return errorResponse("not_found", "List not found", 404);
    }

    // Check if list is locked (after first test)
    if (list.first_tested_at) {
      console.warn("[Update Item] Attempt to modify locked list");
      return errorResponse(
        "list_locked",
        "Cannot modify items after first test. The list is locked to preserve test history integrity.",
        403
      );
    }

    // ============================================================================
    // Step 5: Update Item in Database
    // ============================================================================

    const { data: item, error: updateError } = await supabase
      .from("list_items")
      .update({ display: requestBody.display })
      .eq("id", itemId)
      .eq("list_id", listId)
      .select()
      .single();

    if (updateError) {
      // Check if trigger blocked the update (shouldn't happen due to our check above)
      if (updateError.message.includes("locked") || updateError.message.includes("first test")) {
        return errorResponse(
          "list_locked",
          "Cannot modify items after first test. The list is locked to preserve test history integrity.",
          403
        );
      }

      console.error("[Update Item] Failed to update item:", updateError);
      return errorResponse("database_error", "Failed to update item. Please try again.", 500);
    }

    if (!item) {
      console.warn("[Update Item] Item not found");
      return errorResponse("not_found", "Item not found", 404);
    }

    console.log(`[Update Item] Successfully updated item: ${itemId}`);

    return new Response(JSON.stringify({ success: true, item }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Update Item] Unexpected error:", error);
    return errorResponse("internal_error", "An unexpected error occurred. Please try again.", 500);
  }
};

/**
 * DELETE handler for deleting a list item
 */
export const DELETE: APIRoute = async (context) => {
  const { locals, params } = context;
  const { supabase, user } = locals;

  // ============================================================================
  // Step 1: Authentication Check
  // ============================================================================

  if (!user) {
    console.warn("[Delete Item] Unauthorized access attempt");
    return unauthorizedResponse();
  }

  // ============================================================================
  // Step 2: Validate Parameters
  // ============================================================================

  const { listId, itemId } = params;

  if (!listId || !itemId) {
    return errorResponse("invalid_id", "List ID and Item ID are required", 400);
  }

  console.log(`[Delete Item] Request from user: ${user.id} for item: ${itemId} in list: ${listId}`);

  // ============================================================================
  // Step 3: Verify List Ownership and Lock Status
  // ============================================================================

  try {
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select("id, first_tested_at")
      .eq("id", listId)
      .eq("user_id", user.id)
      .single();

    if (listError || !list) {
      console.warn("[Delete Item] List not found or unauthorized");
      return errorResponse("not_found", "List not found", 404);
    }

    // Check if list is locked (after first test)
    if (list.first_tested_at) {
      console.warn("[Delete Item] Attempt to delete from locked list");
      return errorResponse(
        "list_locked",
        "Cannot delete items after first test. The list is locked to preserve test history integrity.",
        403
      );
    }

    // ============================================================================
    // Step 4: Get Item Position Before Deletion
    // ============================================================================

    const { data: item, error: itemError } = await supabase
      .from("list_items")
      .select("position")
      .eq("id", itemId)
      .eq("list_id", listId)
      .single();

    if (itemError || !item) {
      console.warn("[Delete Item] Item not found");
      return errorResponse("not_found", "Item not found", 404);
    }

    const deletedPosition = item.position;

    // ============================================================================
    // Step 5: Delete Item from Database
    // ============================================================================

    const { error: deleteError } = await supabase.from("list_items").delete().eq("id", itemId).eq("list_id", listId);

    if (deleteError) {
      // Check if trigger blocked the deletion
      if (deleteError.message.includes("locked") || deleteError.message.includes("first test")) {
        return errorResponse(
          "list_locked",
          "Cannot delete items after first test. The list is locked to preserve test history integrity.",
          403
        );
      }

      console.error("[Delete Item] Failed to delete item:", deleteError);
      return errorResponse("database_error", "Failed to delete item. Please try again.", 500);
    }

    // ============================================================================
    // Step 6: Reindex Remaining Items (shift down positions)
    // ============================================================================

    // Update all items with position > deletedPosition to position - 1
    const { error: reindexError } = await supabase.rpc("reindex_list_items_after_delete", {
      p_list_id: listId,
      p_deleted_position: deletedPosition,
    });

    // If the RPC function doesn't exist, do it manually
    if (reindexError && reindexError.message.includes("does not exist")) {
      console.log("[Delete Item] RPC not found, reindexing manually");

      const { data: remainingItems, error: fetchError } = await supabase
        .from("list_items")
        .select("id, position")
        .eq("list_id", listId)
        .gt("position", deletedPosition)
        .order("position", { ascending: true });

      if (fetchError) {
        console.error("[Delete Item] Failed to fetch items for reindexing:", fetchError);
        // Don't fail the whole operation, items are deleted but positions might be off
      } else if (remainingItems && remainingItems.length > 0) {
        // Update each item's position
        for (const remainingItem of remainingItems) {
          await supabase
            .from("list_items")
            .update({ position: remainingItem.position - 1 })
            .eq("id", remainingItem.id);
        }
      }
    } else if (reindexError) {
      console.error("[Delete Item] Failed to reindex items:", reindexError);
      // Don't fail the whole operation, item is deleted but positions might be off
    }

    console.log(`[Delete Item] Successfully deleted item: ${itemId} and reindexed positions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Item deleted successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Delete Item] Unexpected error:", error);
    return errorResponse("internal_error", "An unexpected error occurred. Please try again.", 500);
  }
};
