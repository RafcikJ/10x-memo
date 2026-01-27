/**
 * Astro Middleware
 * 
 * Handles authentication and injects Supabase client + user into context.locals
 * for use in API routes and pages.
 */

import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from '../db/supabase.client.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  // Inject Supabase client into context
  context.locals.supabase = supabaseClient;

  // Get authenticated user from session
  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error('[Auth Middleware] Error getting user:', error.message);
  }

  // Inject user into context (null if not authenticated)
  context.locals.user = user || null;

  return next();
});
