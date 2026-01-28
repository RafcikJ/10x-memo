/**
 * Validation schemas for OpenRouter Chat Completions endpoints
 *
 * Uses Zod for runtime type validation and parsing
 */

import { z } from "zod";

/**
 * Valid chat message roles
 */
const CHAT_MESSAGE_ROLES = ["system", "user", "assistant"] as const;

/**
 * Chat Message Schema
 *
 * Validates:
 * - role: must be 'system', 'user', or 'assistant'
 * - content: non-empty string with max length
 */
export const ChatMessageSchema = z.object({
  role: z.enum(CHAT_MESSAGE_ROLES, {
    errorMap: () => ({
      message: "Invalid role. Must be one of: system, user, assistant",
    }),
  }),
  content: z
    .string({
      required_error: "content is required",
      invalid_type_error: "content must be a string",
    })
    .trim()
    .min(1, "content cannot be empty")
    .max(8000, "content must be at most 8000 characters"),
});

/**
 * Model Parameters Schema
 *
 * Validates optional generation parameters
 */
export const ChatModelParamsSchema = z
  .object({
    temperature: z.number().min(0, "temperature must be at least 0").max(2, "temperature must be at most 2").optional(),
    max_tokens: z
      .number()
      .int("max_tokens must be an integer")
      .min(1, "max_tokens must be at least 1")
      .max(4000, "max_tokens must be at most 4000")
      .optional(),
    top_p: z.number().min(0, "top_p must be at least 0").max(1, "top_p must be at most 1").optional(),
    frequency_penalty: z
      .number()
      .min(-2, "frequency_penalty must be at least -2")
      .max(2, "frequency_penalty must be at most 2")
      .optional(),
    presence_penalty: z
      .number()
      .min(-2, "presence_penalty must be at least -2")
      .max(2, "presence_penalty must be at most 2")
      .optional(),
  })
  .strict();

/**
 * JSON Schema Response Format Schema
 *
 * Validates the response_format structure for structured outputs
 */
export const JSONSchemaResponseFormatSchema = z
  .object({
    type: z.literal("json_schema", {
      errorMap: () => ({ message: 'type must be "json_schema"' }),
    }),
    json_schema: z.object({
      name: z
        .string()
        .min(1, "schema name is required")
        .max(64, "schema name must be at most 64 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "schema name must be alphanumeric with underscores"),
      strict: z.boolean({
        errorMap: () => ({ message: "strict must be a boolean" }),
      }),
      schema: z.record(z.unknown(), {
        errorMap: () => ({ message: "schema must be a valid JSON Schema object" }),
      }),
    }),
  })
  .strict();

/**
 * Chat Completion Request Schema
 *
 * Validates:
 * - systemPrompt: optional system message (max 2000 chars)
 * - messages: array of chat messages (1-50 messages)
 * - model: optional model override
 * - params: optional generation parameters
 */
export const ChatCompletionRequestSchema = z
  .object({
    systemPrompt: z.string().trim().max(2000, "systemPrompt must be at most 2000 characters").optional(),
    messages: z
      .array(ChatMessageSchema, {
        required_error: "messages is required",
        invalid_type_error: "messages must be an array",
      })
      .min(1, "messages must contain at least 1 message")
      .max(50, "messages must contain at most 50 messages"),
    model: z
      .string()
      .trim()
      .min(1, "model cannot be empty")
      .max(100, "model must be at most 100 characters")
      .optional(),
    params: ChatModelParamsSchema.optional(),
  })
  .strict();

/**
 * Structured Completion Request Schema
 *
 * Like ChatCompletionRequest but requires responseFormat
 */
export const StructuredCompletionRequestSchema = z
  .object({
    systemPrompt: z.string().trim().max(2000, "systemPrompt must be at most 2000 characters").optional(),
    messages: z
      .array(ChatMessageSchema, {
        required_error: "messages is required",
        invalid_type_error: "messages must be an array",
      })
      .min(1, "messages must contain at least 1 message")
      .max(50, "messages must contain at most 50 messages"),
    responseFormat: JSONSchemaResponseFormatSchema,
    model: z
      .string()
      .trim()
      .min(1, "model cannot be empty")
      .max(100, "model must be at most 100 characters")
      .optional(),
    params: ChatModelParamsSchema.optional(),
  })
  .strict();

/**
 * Type inference from schemas
 */
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
export type StructuredCompletionRequest = z.infer<typeof StructuredCompletionRequestSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatModelParams = z.infer<typeof ChatModelParamsSchema>;
export type JSONSchemaResponseFormat = z.infer<typeof JSONSchemaResponseFormatSchema>;

/**
 * Validation function for chat completion requests
 *
 * @param data - Unknown data to validate
 * @returns Parsed and validated ChatCompletionRequest
 * @throws ZodError if validation fails
 */
export function validateChatCompletionRequest(data: unknown): ChatCompletionRequest {
  return ChatCompletionRequestSchema.parse(data);
}

/**
 * Validation function for structured completion requests
 *
 * @param data - Unknown data to validate
 * @returns Parsed and validated StructuredCompletionRequest
 * @throws ZodError if validation fails
 */
export function validateStructuredCompletionRequest(data: unknown): StructuredCompletionRequest {
  return StructuredCompletionRequestSchema.parse(data);
}
