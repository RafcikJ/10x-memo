/**
 * Validation Schemas for Authentication
 *
 * Uses Zod for type-safe validation of auth-related inputs
 */

import { z } from "zod";

/**
 * Schema for sending magic link
 * Validates email format and optional redirect URL
 */
export const SendMagicLinkSchema = z.object({
  email: z
    .string({ required_error: "Email jest wymagany" })
    .trim()
    .min(1, "Email jest wymagany")
    .email("Nieprawidłowy format email")
    .toLowerCase()
    .max(255, "Email jest za długi"),
  redirectTo: z
    .string()
    .optional()
    .default("/dashboard")
    .refine(
      (val) => {
        // Allow relative paths starting with /
        if (val.startsWith("/")) return true;

        // Allow full URLs (for external redirects if needed)
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Nieprawidłowy URL przekierowania" }
    ),
});

/**
 * Schema for delete account confirmation
 * Requires exact text match "USUŃ" (Polish)
 */
export const DeleteAccountSchema = z.object({
  confirmation: z.literal("USUŃ", {
    errorMap: () => ({
      message: "Nieprawidłowe potwierdzenie. Wpisz dokładnie: USUŃ",
    }),
  }),
});

// Type exports for use in API routes
export type SendMagicLinkInput = z.infer<typeof SendMagicLinkSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
