/**
 * POST /api/lists
 *
 * Creates a new word list with items in a single transaction.
 * Supports both manually created and AI-generated lists.
 *
 * Authentication: Required (Bearer token)
 *
 * Request Body:
 * {
 *   "name": "My List Name",
 *   "source": "manual" | "ai",
 *   "category": "animals" (required if source="ai", null if source="manual"),
 *   "items": [
 *     { "position": 1, "display": "Cat" },
 *     { "position": 2, "display": "Dog" },
 *     ...
 *   ]
 * }
 *
 * Success Response (201):
 * {
 *   "success": true,
 *   "list": {
 *     "id": "uuid",
 *     "name": "My List Name",
 *     "source": "manual",
 *     "category": null,
 *     "items": [...],
 *     ...
 *   }
 * }
 *
 * Error Responses:
 * - 400: Validation error (invalid name, source, category, items)
 * - 401: Unauthorized (missing/invalid authentication)
 * - 409: Duplicate position in items
 * - 429: User list limit exceeded (50 lists per user)
 * - 500: Database error
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import type { CreateListWithItemsResponseDTO } from "@/types";
import { validateCreateListWithItemsRequest } from "@/lib/validation/lists";
import {
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  extractZodErrors,
} from "@/lib/utils/api-errors";
import { createListWithItems, isTestingMode } from "@/lib/testing/inMemoryListsStore";

// Disable prerendering for API route
export const prerender = false;

/**
 * POST handler for creating a list with items
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const { supabase, user } = locals;

  // ============================================================================
  // Step 1: Authentication Check
  // ============================================================================

  if (!user) {
    console.warn("[Create List] Unauthorized access attempt");
    return unauthorizedResponse();
  }

  console.log(`[Create List] Request from user: ${user.id}`);

  // ============================================================================
  // Step 2: Parse and Validate Request Body
  // ============================================================================

  let requestBody;

  try {
    const rawBody = await request.json();
    requestBody = validateCreateListWithItemsRequest(rawBody);
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.warn("[Create List] Invalid JSON in request body");
      return errorResponse("invalid_json", "Request body must be valid JSON", 400);
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.warn("[Create List] Validation error:", error.errors);
      return validationErrorResponse("Invalid request data", extractZodErrors(error));
    }

    // Unexpected errors
    console.error("[Create List] Unexpected validation error:", error);
    return errorResponse("validation_error", "Failed to validate request", 400);
  }

  const { name, source, category, items } = requestBody;
  console.log(`[Create List] Creating "${name}" with ${items.length} items (source: ${source})`);

  // ============================================================================
  // TESTING MODE: In-memory persistence for deterministic E2E
  // ============================================================================
  if (isTestingMode()) {
    const list = createListWithItems({
      userId: user.id,
      name: name.trim(),
      source,
      category: category ?? null,
      items,
    });

    const response: CreateListWithItemsResponseDTO = {
      success: true,
      list,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // ============================================================================
  // Step 3: Create List in Database (Transaction)
  // ============================================================================

  try {
    // Step 3.1: Create the list record
    const { data: listData, error: listError } = await supabase
      .from("lists")
      .insert({
        user_id: user.id,
        name: name.trim(),
        source,
        category: category || null,
      })
      .select()
      .single();

    if (listError) {
      // Check for list limit error (50 lists per user)
      if (listError.code === "P0001") {
        console.warn(`[Create List] User ${user.id} exceeded list limit`);
        return errorResponse(
          "list_limit_exceeded",
          "You have reached the maximum number of lists (50). Please delete some lists before creating new ones.",
          429
        );
      }

      console.error("[Create List] Failed to create list:", listError);
      return errorResponse("database_error", "Failed to create list. Please try again.", 500);
    }

    console.log(`[Create List] List created with ID: ${listData.id}`);

    // Step 3.2: Create list items
    const itemsToInsert = items.map((item) => ({
      list_id: listData.id,
      position: item.position,
      display: item.display.trim(),
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from("list_items")
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      // If items insert fails, try to cleanup the list (best effort)
      console.error("[Create List] Failed to create items:", itemsError);
      
      // Attempt to delete the list (cascade will handle items if any were created)
      await supabase.from("lists").delete().eq("id", listData.id);

      // Check for duplicate position error
      if (itemsError.code === "23505") {
        return errorResponse(
          "duplicate_position",
          "Duplicate position detected in items. Each item must have a unique position.",
          409
        );
      }

      return errorResponse("database_error", "Failed to create list items. Please try again.", 500);
    }

    console.log(`[Create List] Created ${itemsData.length} items`);

    // ============================================================================
    // Step 4: Return Success Response
    // ============================================================================

    const response: CreateListWithItemsResponseDTO = {
      success: true,
      list: {
        ...listData,
        items: itemsData,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Create List] Unexpected error:", error);
    return errorResponse("internal_error", "An unexpected error occurred. Please try again.", 500);
  }
};
