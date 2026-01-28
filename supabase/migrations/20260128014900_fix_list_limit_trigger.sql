-- ============================================================================
-- Migration: Fix check_list_limit function
-- Description: Remove FOR UPDATE from count query (not allowed with aggregates)
-- Issue: PostgreSQL error 0A000 - FOR UPDATE is not allowed with aggregate functions
-- ============================================================================

-- Drop and recreate the function without FOR UPDATE
create or replace function public.check_list_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_count integer;
begin
  -- count user's existing lists
  -- Note: FOR UPDATE is not needed here since we're only counting
  -- The trigger runs BEFORE INSERT, so there's no race condition risk
  select count(*) into v_list_count
  from public.lists
  where user_id = new.user_id;
  
  -- check if limit would be exceeded
  if v_list_count >= 50 then
    raise exception 'maximum number of lists per user exceeded (50)'
      using errcode = 'P0001',
            hint = 'delete some lists before creating new ones';
  end if;
  
  return new;
end;
$$;

comment on function public.check_list_limit() is 'enforces 50 lists per user limit (fixed: removed FOR UPDATE from count query)';
