/**
 * POST /api/ai/generate-list
 * 
 * Generates a word list using AI (OpenRouter.ai) with daily quota enforcement.
 * Returns word list for client-side review before saving.
 * 
 * Rate Limit: 5 generations per user per UTC day
 * Authentication: Required (Bearer token)
 * 
 * Request Body:
 * {
 *   "category": "animals" | "food" | "household_items" | "transport" | "jobs",
 *   "count": 10-50
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "items": [
 *     { "position": 1, "display": "Cat" },
 *     { "position": 2, "display": "Dog" },
 *     ...
 *   ]
 * }
 * 
 * Error Responses:
 * - 400: Validation error (invalid category/count)
 * - 401: Unauthorized (missing/invalid authentication)
 * - 429: Rate limit exceeded (daily quota consumed)
 * - 500: AI service error
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { GenerateListResponseDTO } from '@/types';
import { validateGenerateListRequest } from '@/lib/validation/ai';
import { generateWordList } from '@/lib/services/ai-generator';
import { consumeAIQuota, RateLimitError } from '@/lib/services/ai-quota';
import {
	errorResponse,
	validationErrorResponse,
	unauthorizedResponse,
	aiServiceErrorResponse,
	rateLimitErrorResponse,
	extractZodErrors
} from '@/lib/utils/api-errors';

// Disable prerendering for API route
export const prerender = false;

/**
 * POST handler for AI word list generation
 */
export const POST: APIRoute = async (context) => {
	const { locals, request } = context;
	const { supabase, user } = locals;

	// ============================================================================
	// Step 1: Authentication Check
	// ============================================================================
	
	if (!user) {
		console.warn('[AI Generate] Unauthorized access attempt');
		return unauthorizedResponse();
	}

	console.log(`[AI Generate] Request from user: ${user.id}`);

	// ============================================================================
	// Step 2: Parse and Validate Request Body
	// ============================================================================
	
	let requestBody;
	
	try {
		const rawBody = await request.json();
		requestBody = validateGenerateListRequest(rawBody);
	} catch (error) {
		// Handle JSON parsing errors
		if (error instanceof SyntaxError) {
			console.warn('[AI Generate] Invalid JSON in request body');
			return errorResponse('invalid_json', 'Request body must be valid JSON', 400);
		}

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			console.warn('[AI Generate] Validation error:', error.errors);
			return validationErrorResponse(
				'Invalid request data',
				extractZodErrors(error)
			);
		}

		// Unexpected errors
		console.error('[AI Generate] Unexpected validation error:', error);
		return errorResponse(
			'validation_error',
			'Failed to validate request',
			400
		);
	}

	const { category, count } = requestBody;
	console.log(`[AI Generate] Generating ${count} ${category}`);

	// ============================================================================
	// Step 3: Check and Consume AI Quota
	// ============================================================================
	
	try {
		const quota = await consumeAIQuota(supabase);
		console.log(`[AI Generate] Quota consumed. Remaining: ${quota.remaining}/${quota.limit}`);
	} catch (error) {
		// Handle rate limit exceeded
		if (error instanceof RateLimitError) {
			console.warn(`[AI Generate] Rate limit exceeded for user ${user.id}`);
			return rateLimitErrorResponse(
				'Daily AI generation limit exceeded (5/day)',
				error.resetAt
			);
		}

		// Handle other quota check errors
		console.error('[AI Generate] Quota check error:', error);
		return errorResponse(
			'quota_check_failed',
			'Failed to verify generation quota. Please try again.',
			500
		);
	}

	// ============================================================================
	// Step 4: Generate Word List with AI
	// ============================================================================
	
	let generationResult;
	
	try {
		generationResult = await generateWordList({
			category,
			count,
			maxRetries: 1
		});

		// Check if generation was successful
		if (!generationResult.success) {
			console.error('[AI Generate] Generation failed:', generationResult.error);
			return aiServiceErrorResponse(30);
		}

		// Check completeness
		if (generationResult.items.length < count) {
			console.error(`[AI Generate] Incomplete generation: ${generationResult.items.length}/${count}`);
			return errorResponse(
				'ai_incomplete_error',
				`Only ${generationResult.items.length}/${count} words generated. Please try again.`,
				500
			);
		}

	} catch (error) {
		console.error('[AI Generate] Generation error:', error);
		return aiServiceErrorResponse(30);
	}

	// ============================================================================
	// Step 5: Return Success Response
	// ============================================================================
	
	console.log(`[AI Generate] Successfully generated ${generationResult.items.length} items`);

	const response: GenerateListResponseDTO = {
		success: true,
		items: generationResult.items
	};

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { 
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store' // Don't cache AI-generated content
		}
	});
};
