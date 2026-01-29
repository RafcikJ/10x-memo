-- Migration: Add function to allow users to delete their own accounts
-- This function can be called by authenticated users to delete their own account
-- Uses SECURITY DEFINER to bypass RLS and delete from auth.users

-- Function to delete current user's account
CREATE OR REPLACE FUNCTION delete_current_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();
  
  -- Security check: user must be authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete user from auth.users
  -- This will cascade to all related tables (lists, tests, items, etc.)
  -- thanks to ON DELETE CASCADE in the schema
  DELETE FROM auth.users WHERE id = current_user_id;
  
  -- Note: The user's session will be automatically invalidated
  -- after this function completes
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_current_user_account() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_current_user_account() IS 
  'Allows authenticated users to delete their own account. Cascades to all related data.';
