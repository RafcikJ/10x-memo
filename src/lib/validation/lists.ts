/**
 * Validation schemas for list management endpoints
 *
 * Uses Zod for runtime type validation and parsing
 */

import { z } from "zod";

/**
 * Valid list sources
 */
const LIST_SOURCES = ["manual", "ai"] as const;

/**
 * Valid noun categories for AI-generated lists
 */
const NOUN_CATEGORIES = ["animals", "food", "household_items", "transport", "jobs"] as const;

/**
 * Generated List Item Schema
 *
 * Validates:
 * - position: must be integer between 1 and 200
 * - display: must be non-empty string (1-80 characters after trim)
 */
const GeneratedListItemSchema = z.object({
  position: z
    .number({
      required_error: "position is required",
      invalid_type_error: "position must be a number",
    })
    .int("position must be an integer")
    .min(1, "position must be at least 1")
    .max(200, "position must be at most 200"),
  display: z
    .string({
      required_error: "display is required",
      invalid_type_error: "display must be a string",
    })
    .trim()
    .min(1, "display must be at least 1 character")
    .max(80, "display must be at most 80 characters"),
});

/**
 * Create List with Items Request Schema
 *
 * Validates:
 * - name: 1-80 characters (after trim)
 * - source: "manual" or "ai"
 * - category: required if source="ai", should be null/undefined for "manual"
 * - items: array of 1-200 items with unique positions
 */
export const CreateListWithItemsSchema = z
  .object({
    name: z
      .string({
        required_error: "name is required",
        invalid_type_error: "name must be a string",
      })
      .trim()
      .min(1, "name must be at least 1 character")
      .max(80, "name must be at most 80 characters"),
    source: z.enum(LIST_SOURCES, {
      errorMap: () => ({
        message: "source must be either 'manual' or 'ai'",
      }),
    }),
    category: z.enum(NOUN_CATEGORIES).nullable().optional(),
    items: z
      .array(GeneratedListItemSchema, {
        required_error: "items are required",
        invalid_type_error: "items must be an array",
      })
      .min(1, "items must contain at least 1 item")
      .max(200, "items must contain at most 200 items"),
  })
  .refine(
    (data) => {
      // If source is "ai", category must be provided
      if (data.source === "ai") {
        return data.category !== null && data.category !== undefined;
      }
      return true;
    },
    {
      message: "category is required when source is 'ai'",
      path: ["category"],
    }
  )
  .refine(
    (data) => {
      // If source is "manual", category should be null/undefined
      if (data.source === "manual") {
        return data.category === null || data.category === undefined;
      }
      return true;
    },
    {
      message: "category must be null when source is 'manual'",
      path: ["category"],
    }
  )
  .refine(
    (data) => {
      // Check for duplicate positions
      const positions = data.items.map((item) => item.position);
      const uniquePositions = new Set(positions);
      return positions.length === uniquePositions.size;
    },
    {
      message: "items must have unique positions",
      path: ["items"],
    }
  );

/**
 * Type inference from schema
 */
export type CreateListWithItemsRequest = z.infer<typeof CreateListWithItemsSchema>;

/**
 * Validation function for create list with items requests
 *
 * @param data - Unknown data to validate
 * @returns Parsed and validated CreateListWithItemsRequest
 * @throws ZodError if validation fails
 */
export function validateCreateListWithItemsRequest(data: unknown): CreateListWithItemsRequest {
  return CreateListWithItemsSchema.parse(data);
}
