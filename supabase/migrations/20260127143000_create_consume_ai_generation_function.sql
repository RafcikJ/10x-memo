-- ============================================================================
-- Migration: Create consume_ai_generation RPC Function
-- Created: 2026-01-27
-- Description: Implements atomic AI generation quota management with daily limits
-- ============================================================================

-- ============================================================================
-- Function: consume_ai_generation()
-- ============================================================================
-- Purpose: Check and consume one AI generation from user's daily quota (5/day)
-- 
-- Side Effects:
--   - Creates or updates ai_usage_daily record for current UTC day
--   - Increments usage counter atomically
--   - Raises exception if daily limit (5) exceeded
-- 
-- Returns: JSONB with quota information
--   {
--     "used": <integer>,
--     "remaining": <integer>,
--     "limit": 5,
--     "reset_at": "<ISO 8601 timestamp>"
--   }
-- 
-- Errors:
--   P0001 - Rate limit exceeded (5/day)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.consume_ai_generation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_day_utc date;
  v_used integer;
  v_remaining integer;
  v_reset_at timestamptz;
  v_limit constant integer := 5;
BEGIN
  -- Get current UTC day (used as quota period key)
  v_day_utc := (now() at time zone 'utc')::date;
  
  -- Calculate reset time (next UTC midnight)
  v_reset_at := (v_day_utc + 1)::timestamptz;

  -- Upsert daily usage record with row-level lock
  -- This ensures atomic operations even under concurrent requests
  INSERT INTO public.ai_usage_daily (user_id, day_utc, used)
  VALUES (auth.uid(), v_day_utc, 0)
  ON CONFLICT (user_id, day_utc)
  DO UPDATE SET updated_at = now()
  RETURNING used INTO v_used;

  -- Guard: Check if limit already exceeded
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'daily ai generation limit exceeded (5/day)'
      USING 
        ERRCODE = 'P0001',
        HINT = format('Limit resets at %s', v_reset_at);
  END IF;

  -- Increment usage counter
  UPDATE public.ai_usage_daily
  SET 
    used = used + 1,
    updated_at = now()
  WHERE user_id = auth.uid() 
    AND day_utc = v_day_utc
  RETURNING used INTO v_used;

  -- Calculate remaining quota
  v_remaining := v_limit - v_used;

  -- Return quota information as JSONB
  RETURN jsonb_build_object(
    'used', v_used,
    'remaining', v_remaining,
    'limit', v_limit,
    'reset_at', v_reset_at
  );
END;
$$;

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.consume_ai_generation() TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION public.consume_ai_generation() IS 
  'Atomically checks and consumes one AI generation quota. ' ||
  'Enforces 5 generations per user per UTC day. ' ||
  'Raises P0001 exception if limit exceeded.';

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify function was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'consume_ai_generation' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'Function consume_ai_generation was not created successfully';
  END IF;
  
  RAISE NOTICE 'Function consume_ai_generation created successfully';
END;
$$;
