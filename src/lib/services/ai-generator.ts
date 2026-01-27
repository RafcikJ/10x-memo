/**
 * AI Word List Generation Service
 *
 * Integrates with OpenRouter.ai to generate word lists based on categories.
 * Implements retry logic, profanity filtering, and content validation.
 */

import type { NounCategory, GeneratedListItem } from "@/types";

/**
 * Configuration for OpenRouter.ai API
 */
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env.OPENROUTER_API_KEY;
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Category-specific prompts for AI generation
 * Optimized to produce clean, educational word lists
 */
const CATEGORY_PROMPTS: Record<NounCategory, string> = {
  animals:
    "Generate a list of {count} common animal names in English. Include both domestic and wild animals. Return only the animal names, one per line, without numbers or additional text. Examples: Cat, Dog, Elephant, Lion.",
  food: "Generate a list of {count} common food items in English. Include fruits, vegetables, and prepared dishes. Return only the food names, one per line, without numbers or additional text. Examples: Apple, Banana, Pizza, Salad.",
  household_items:
    "Generate a list of {count} common household items in English. Include furniture, appliances, and everyday objects. Return only the item names, one per line, without numbers or additional text. Examples: Chair, Table, Lamp, Refrigerator.",
  transport:
    "Generate a list of {count} common modes of transportation in English. Include vehicles and public transport. Return only the transport names, one per line, without numbers or additional text. Examples: Car, Bus, Bicycle, Train.",
  jobs: "Generate a list of {count} common job titles in English. Include various professions and occupations. Return only the job titles, one per line, without numbers or additional text. Examples: Teacher, Doctor, Engineer, Chef.",
};

/**
 * Basic profanity filter
 * Simple word list check - can be enhanced with external service
 */
const PROFANITY_LIST: string[] = [
  // Add profanity words here as needed
  // This is a placeholder implementation for MVP
];

/**
 * Options for word list generation
 */
export interface GenerateWordListOptions {
  category: NounCategory;
  count: number;
  maxRetries?: number;
}

/**
 * Result of word list generation
 */
export interface GenerateWordListResult {
  items: GeneratedListItem[];
  success: boolean;
  error?: string;
}

/**
 * Generate word list using OpenRouter.ai
 *
 * @param options - Generation options (category, count, retries)
 * @returns Generated list items with position numbers
 * @throws Error if generation fails after retries
 *
 * @example
 * ```ts
 * const result = await generateWordList({
 *   category: 'animals',
 *   count: 20
 * });
 *
 * if (result.success) {
 *   console.log(result.items); // [{ position: 1, display: 'Cat' }, ...]
 * }
 * ```
 */
export async function generateWordList(options: GenerateWordListOptions): Promise<GenerateWordListResult> {
  const { category, count, maxRetries = 1 } = options;

  // Guard: Check API key configuration
  if (!OPENROUTER_API_KEY) {
    console.error("[AI Generator] Missing OPENROUTER_API_KEY environment variable");
    return createErrorResult("AI service not configured");
  }

  // Prepare prompt with category and count
  const prompt = CATEGORY_PROMPTS[category].replace("{count}", String(count));

  // Attempt generation with retry logic
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await attemptGeneration(prompt, count, attempt, maxRetries);

    if (result.success || attempt >= maxRetries) {
      return result;
    }
  }

  // Fallback (should not reach here)
  return createErrorResult("Unexpected error during generation");
}

/**
 * Attempt a single generation with validation
 */
async function attemptGeneration(
  prompt: string,
  count: number,
  attempt: number,
  maxRetries: number
): Promise<GenerateWordListResult> {
  try {
    const items = await callOpenRouterAPI(prompt, count);

    // Validate completeness
    if (items.length < count) {
      console.warn(`[AI Generator] Incomplete generation: ${items.length}/${count} items (attempt ${attempt + 1})`);

      if (attempt >= maxRetries) {
        return createErrorResult(`Only ${items.length}/${count} words generated. Please try again.`);
      }

      return createErrorResult("Retry needed");
    }

    // Filter profanity
    const cleanItems = filterProfanity(items);

    if (cleanItems.length < count && attempt < maxRetries) {
      console.warn(`[AI Generator] Profanity filtered: ${items.length - cleanItems.length} items removed`);
      return createErrorResult("Retry needed");
    }

    // Success - return generated items
    return {
      success: true,
      items: cleanItems.slice(0, count),
    };
  } catch (error) {
    console.error(`[AI Generator] Generation error (attempt ${attempt + 1}):`, error);

    if (attempt >= maxRetries) {
      return createErrorResult("Failed to generate list. Please try again.");
    }

    return createErrorResult("Retry needed");
  }
}

/**
 * Filter profanity from items
 */
function filterProfanity(items: GeneratedListItem[]): GeneratedListItem[] {
  return items.filter((item) => !containsProfanity(item.display));
}

/**
 * Create error result
 */
function createErrorResult(error: string): GenerateWordListResult {
  return {
    success: false,
    items: [],
    error,
  };
}

/**
 * Call OpenRouter.ai API to generate words
 *
 * @param prompt - Category-specific prompt
 * @param expectedCount - Expected number of words
 * @returns Array of generated list items
 * @throws Error on API failure or timeout
 */
async function callOpenRouterAPI(prompt: string, expectedCount: number): Promise<GeneratedListItem[]> {
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": import.meta.env.PUBLIC_APP_URL || "http://localhost:4321",
        "X-Title": "Word List Learning App",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo", // Cost-effective model for simple tasks
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates educational word lists. Output only the requested words, one per line, without any numbering, formatting, or additional text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract generated text from response
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error("No content in OpenRouter API response");
    }

    // Parse generated text into list items
    const items = parseGeneratedText(generatedText, expectedCount);

    return items;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse AI-generated text into structured list items
 *
 * @param text - Raw text from AI response
 * @param expectedCount - Expected number of items
 * @returns Array of list items with positions
 */
function parseGeneratedText(text: string, expectedCount: number): GeneratedListItem[] {
  // Split by newlines and clean up
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Remove leading numbers/bullets (e.g., "1.", "1)", "- ")
      return line.replace(/^\d+[.)]\s*/, "").replace(/^[-•]\s*/, "");
    })
    .filter((line) => line.length > 0 && line.length <= 80); // Max 80 chars per item

  // Map to GeneratedListItem format
  const items: GeneratedListItem[] = lines.slice(0, expectedCount).map((display, index) => ({
    position: index + 1,
    display: display.trim(),
  }));

  return items;
}

/**
 * Check if text contains profanity
 *
 * @param text - Text to check
 * @returns true if profanity detected
 */
function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase();
  return PROFANITY_LIST.some((word) => normalized.includes(word));
}
