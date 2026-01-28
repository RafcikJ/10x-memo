/**
 * Validation schemas for AI generation endpoints
 *
 * Uses Zod for runtime type validation and parsing
 */

import { z } from "zod";

/**
 * Valid noun categories for AI word list generation
 */
const NOUN_CATEGORIES = ["animals", "food", "household_items", "transport", "jobs"] as const;

/**
 * Generate List Request Schema
 *
 * Validates:
 * - category: must be one of predefined NounCategory values
 * - count: must be integer between 10 and 50 (inclusive)
 */
export const GenerateListRequestSchema = z.object({
  category: z.enum(NOUN_CATEGORIES, {
    errorMap: () => ({
      message: "Invalid category. Must be one of: animals, food, household_items, transport, jobs",
    }),
  }),
  count: z
    .number({
      required_error: "count is required",
      invalid_type_error: "count must be a number",
    })
    .int("count must be an integer")
    .min(10, "count must be at least 10")
    .max(50, "count must be at most 50"),
});

/**
 * Type inference from schema
 */
export type GenerateListRequest = z.infer<typeof GenerateListRequestSchema>;

/**
 * Validation function for generate list requests
 *
 * @param data - Unknown data to validate
 * @returns Parsed and validated GenerateListRequest
 * @throws ZodError if validation fails
 */
export function validateGenerateListRequest(data: unknown): GenerateListRequest {
  return GenerateListRequestSchema.parse(data);
}
