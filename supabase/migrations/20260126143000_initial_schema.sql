-- ============================================================================
-- migration: initial schema for word list learning application
-- description: creates all tables, enums, indexes, rls policies, triggers, 
--              and rpc functions for mvp
-- affected: profiles, lists, list_items, tests, ai_usage_daily, events
-- notes: 
--   - implements 5 ai generations per day limit (utc-based)
--   - enforces 50 lists per user and 200 items per list
--   - events table is write-only (no client access)
--   - test results are immutable audit records
-- ============================================================================

-- ============================================================================
-- section 1: extensions
-- ============================================================================

-- enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- enable unaccent for word normalization (removing diacritics)
create extension if not exists unaccent;

-- ============================================================================
-- section 2: enum types
-- ============================================================================

-- list source: distinguishes manually created lists from ai-generated ones
create type public.list_source as enum ('manual', 'ai');

-- noun category: fixed categories for ai noun generation
create type public.noun_category as enum (
  'animals',
  'food',
  'household_items',
  'transport',
  'jobs'
);

-- event name: analytics event types for consistent tracking
-- can be extended with: alter type public.event_name add value 'new_event';
create type public.event_name as enum (
  'open_app',
  'view_dashboard_empty',
  'start_ai_flow',
  'ai_generation_failed',
  'ai_generation_succeeded',
  'generate_ai_list',
  'save_ai_list',
  'create_list',
  'add_item',
  'start_test',
  'complete_test',
  'list_saved',
  'delete_list',
  'delete_account'
);

-- ============================================================================
-- section 3: tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1. profiles: user preferences (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_preference text not null default 'system' 
    check (theme_preference in ('system', 'light', 'dark')),
  locale text not null default 'pl-PL',
  timezone text null, -- e.g., 'Europe/Warsaw' for ui display only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'user ui preferences, 1:1 with auth.users';
comment on column public.profiles.theme_preference is 'ui theme: system, light, or dark';
comment on column public.profiles.locale is 'user locale for i18n (e.g., pl-PL)';
comment on column public.profiles.timezone is 'timezone for display purposes only (not for business logic)';

-- ----------------------------------------------------------------------------
-- 3.2. lists: word lists with denormalized last test result
-- ----------------------------------------------------------------------------
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  source public.list_source not null default 'manual',
  category public.noun_category null,
  story text null, -- mnemonic story (no hard limit in mvp)
  first_tested_at timestamptz null, -- set on first completed test
  last_score smallint null check (last_score is null or (last_score between 0 and 100)),
  last_tested_at timestamptz null,
  last_correct integer null check (last_correct is null or last_correct >= 0),
  last_wrong integer null check (last_wrong is null or last_wrong >= 0),
  last_accessed_at timestamptz null, -- for "recently used" sorting
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- ensure ai lists have category and manual lists don't
  check (source <> 'ai' or category is not null),
  check (source = 'ai' or category is null)
);

comment on table public.lists is 'word lists with ordering significance and denormalized test results';
comment on column public.lists.source is 'list origin: manual or ai-generated';
comment on column public.lists.category is 'noun category (required for ai lists, null for manual)';
comment on column public.lists.story is 'mnemonic story for ai-generated lists';
comment on column public.lists.first_tested_at is 'timestamp of first completed test (locks editing)';
comment on column public.lists.last_score is 'most recent test score (0-100)';
comment on column public.lists.last_accessed_at is 'last time user accessed this list (for sorting)';

-- ----------------------------------------------------------------------------
-- 3.3. list_items: list elements (position 1..200)
-- ----------------------------------------------------------------------------
create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  position integer not null check (position between 1 and 200),
  display text not null check (char_length(btrim(display)) between 1 and 80),
  normalized text not null,
  created_at timestamptz not null default now(),
  
  unique (list_id, position)
);

comment on table public.list_items is 'list elements with position (1-200), editable until first test';
comment on column public.list_items.position is 'item position in list (1-200), order matters';
comment on column public.list_items.display is 'display text as entered by user or ai';
comment on column public.list_items.normalized is 'normalized version for future search (lowercase, no diacritics, single spaces) - auto-set by trigger';

-- ----------------------------------------------------------------------------
-- 3.4. tests: audit trail of completed tests
-- ----------------------------------------------------------------------------
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  completed_at timestamptz not null,
  items_count integer not null check (items_count between 1 and 200),
  correct integer not null check (correct >= 0),
  wrong integer not null check (wrong >= 0),
  score smallint not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  
  -- ensure correct + wrong equals total items
  check (correct + wrong = items_count)
);

comment on table public.tests is 'audit trail of completed tests (immutable records)';
comment on column public.tests.completed_at is 'timestamp when test was completed';
comment on column public.tests.items_count is 'total number of items tested';
comment on column public.tests.score is 'calculated score (0-100)';

-- ----------------------------------------------------------------------------
-- 3.5. ai_usage_daily: ai generation usage counter (5/day limit)
-- ----------------------------------------------------------------------------
create table public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_utc date not null, -- utc day for consistent limit enforcement
  used integer not null default 0 check (used between 0 and 5),
  updated_at timestamptz not null default now(),
  
  primary key (user_id, day_utc)
);

comment on table public.ai_usage_daily is 'daily ai generation usage counter (5/day limit per user)';
comment on column public.ai_usage_daily.day_utc is 'utc date for consistent daily limit enforcement';
comment on column public.ai_usage_daily.used is 'number of ai generations used today (0-5)';

-- ----------------------------------------------------------------------------
-- 3.6. events: telemetry/analytics (write-only, no client read access)
-- ----------------------------------------------------------------------------
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name public.event_name not null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

comment on table public.events is 'telemetry/analytics events (write-only, no anonymous events)';
comment on column public.events.user_id is 'user who triggered event (always required, no anonymous events)';
comment on column public.events.name is 'event type from event_name enum';
comment on column public.events.payload is 'optional event metadata as json';

-- ============================================================================
-- section 4: indexes for query performance
-- ============================================================================

-- dashboard: "recently used" lists by user
create index lists_user_last_accessed_idx 
  on public.lists (user_id, last_accessed_at desc nulls last);

-- fast list + items retrieval
create index list_items_list_position_idx 
  on public.list_items (list_id, position);

-- test history audit queries
create index tests_list_completed_idx 
  on public.tests (list_id, completed_at desc);

create index tests_user_completed_idx 
  on public.tests (user_id, completed_at desc);

-- dashboard: filter/sort by last tested
create index lists_user_last_tested_idx 
  on public.lists (user_id, last_tested_at desc nulls last);

-- simple list name search (mvp)
create index lists_user_name_lower_idx 
  on public.lists (user_id, lower(name));

-- ============================================================================
-- section 5: row level security (rls) policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1. profiles: users can only access their own profile
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- allow authenticated users to select their own profile
create policy profiles_select_own 
  on public.profiles 
  for select 
  to authenticated 
  using (user_id = auth.uid());

-- allow authenticated users to insert their own profile
create policy profiles_insert_own 
  on public.profiles 
  for insert 
  to authenticated 
  with check (user_id = auth.uid());

-- allow authenticated users to update their own profile
create policy profiles_update_own 
  on public.profiles 
  for update 
  to authenticated 
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- allow authenticated users to delete their own profile
create policy profiles_delete_own 
  on public.profiles 
  for delete 
  to authenticated 
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5.2. lists: users can only access their own lists
-- ----------------------------------------------------------------------------
alter table public.lists enable row level security;

-- allow authenticated users to select their own lists
create policy lists_select_own 
  on public.lists 
  for select 
  to authenticated 
  using (user_id = auth.uid());

-- allow authenticated users to insert their own lists
create policy lists_insert_own 
  on public.lists 
  for insert 
  to authenticated 
  with check (user_id = auth.uid());

-- allow authenticated users to update their own lists
create policy lists_update_own 
  on public.lists 
  for update 
  to authenticated 
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- allow authenticated users to delete their own lists
create policy lists_delete_own 
  on public.lists 
  for delete 
  to authenticated 
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5.3. list_items: users can access items of their own lists
-- ----------------------------------------------------------------------------
alter table public.list_items enable row level security;

-- allow authenticated users to select items from their own lists
create policy list_items_select_own 
  on public.list_items 
  for select 
  to authenticated 
  using (
    exists (
      select 1 
      from public.lists l 
      where l.id = list_id 
        and l.user_id = auth.uid()
    )
  );

-- allow authenticated users to insert items into their own lists
create policy list_items_insert_own 
  on public.list_items 
  for insert 
  to authenticated 
  with check (
    exists (
      select 1 
      from public.lists l 
      where l.id = list_id 
        and l.user_id = auth.uid()
    )
  );

-- allow authenticated users to update items in their own lists
create policy list_items_update_own 
  on public.list_items 
  for update 
  to authenticated 
  using (
    exists (
      select 1 
      from public.lists l 
      where l.id = list_id 
        and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 
      from public.lists l 
      where l.id = list_id 
        and l.user_id = auth.uid()
    )
  );

-- allow authenticated users to delete items from their own lists
create policy list_items_delete_own 
  on public.list_items 
  for delete 
  to authenticated 
  using (
    exists (
      select 1 
      from public.lists l 
      where l.id = list_id 
        and l.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 5.4. tests: users can only read their own test history
--      insert/update/delete should be done via rpc only (recommended)
-- ----------------------------------------------------------------------------
alter table public.tests enable row level security;

-- allow authenticated users to select their own test history
create policy tests_select_own 
  on public.tests 
  for select 
  to authenticated 
  using (user_id = auth.uid());

-- allow authenticated users to insert their own tests
-- note: in production, consider removing this and only allowing insert via rpc
create policy tests_insert_own 
  on public.tests 
  for insert 
  to authenticated 
  with check (user_id = auth.uid());

-- deny update: test records are immutable audit trail
-- no update policy = implicit deny

-- deny delete: test records are immutable audit trail
-- no delete policy = implicit deny

-- ----------------------------------------------------------------------------
-- 5.5. ai_usage_daily: users can read their own usage, modify via rpc only
-- ----------------------------------------------------------------------------
alter table public.ai_usage_daily enable row level security;

-- allow authenticated users to select their own ai usage
create policy ai_usage_daily_select_own 
  on public.ai_usage_daily 
  for select 
  to authenticated 
  using (user_id = auth.uid());

-- deny insert: modifications only via security definer rpc
-- no insert policy = implicit deny

-- deny update: modifications only via security definer rpc
-- no update policy = implicit deny

-- deny delete: modifications only via security definer rpc
-- no delete policy = implicit deny

-- ----------------------------------------------------------------------------
-- 5.6. events: write-only table, no client access
--      insert only via service_role or security definer rpc
-- ----------------------------------------------------------------------------
alter table public.events enable row level security;

-- deny all operations for authenticated users
-- events are written by backend/service_role only
-- no policies = implicit deny for all operations

-- ============================================================================
-- section 6: triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1. generic trigger function: set updated_at to now()
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 'trigger function to automatically update updated_at timestamp';

-- ----------------------------------------------------------------------------
-- 6.2. profiles: auto-update updated_at on modification
-- ----------------------------------------------------------------------------
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6.3. ai_usage_daily: auto-update updated_at on modification
-- ----------------------------------------------------------------------------
create trigger ai_usage_daily_updated_at
  before update on public.ai_usage_daily
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6.4. lists: auto-update updated_at only on meaningful changes
--      (not when only last_accessed_at changes)
-- ----------------------------------------------------------------------------
create or replace function public.set_lists_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- only update updated_at if meaningful columns changed
  -- exclude last_accessed_at from triggering updated_at
  if (new.name is distinct from old.name
    or new.source is distinct from old.source
    or new.category is distinct from old.category
    or new.story is distinct from old.story
    or new.last_score is distinct from old.last_score
    or new.last_tested_at is distinct from old.last_tested_at
    or new.last_correct is distinct from old.last_correct
    or new.last_wrong is distinct from old.last_wrong
    or new.first_tested_at is distinct from old.first_tested_at)
  then
    new.updated_at = now();
  end if;
  
  return new;
end;
$$;

comment on function public.set_lists_updated_at() is 'trigger function to update lists.updated_at only on meaningful changes (not last_accessed_at)';

create trigger lists_updated_at
  before update on public.lists
  for each row
  execute function public.set_lists_updated_at();

-- ----------------------------------------------------------------------------
-- 6.5. list_items: auto-normalize display text
-- ----------------------------------------------------------------------------
create or replace function public.normalize_list_item_display()
returns trigger
language plpgsql
as $$
begin
  -- automatically normalize the display text
  -- remove diacritics, convert to lowercase, normalize whitespace
  new.normalized := lower(trim(regexp_replace(unaccent(new.display), '\s+', ' ', 'g')));
  return new;
end;
$$;

comment on function public.normalize_list_item_display() is 'trigger function to automatically normalize list item display text';

-- note: trigger names are prefixed with numbers to control execution order
-- triggers execute in alphabetical order, so 01 runs before 02
create trigger list_items_01_normalize_display
  before insert or update on public.list_items
  for each row
  execute function public.normalize_list_item_display();

-- ----------------------------------------------------------------------------
-- 6.6. list_items: block edits after first test
-- ----------------------------------------------------------------------------
create or replace function public.block_list_items_after_test()
returns trigger
language plpgsql
as $$
declare
  v_first_tested_at timestamptz;
begin
  -- get first_tested_at for the list
  select first_tested_at into v_first_tested_at
  from public.lists
  where id = coalesce(new.list_id, old.list_id);
  
  -- if list has been tested, block any modifications
  if v_first_tested_at is not null then
    raise exception 'cannot modify list items after first test has been completed'
      using errcode = 'P0001',
            hint = 'list has been tested and is now locked';
  end if;
  
  return coalesce(new, old);
end;
$$;

comment on function public.block_list_items_after_test() is 'prevents modification of list items after first test completion';

-- note: this trigger blocks insert, update, and delete operations
-- after the list has been tested (first_tested_at is set)
create trigger list_items_02_block_after_test
  before insert or update or delete on public.list_items
  for each row
  execute function public.block_list_items_after_test();

-- ----------------------------------------------------------------------------
-- 6.7. list_items: reset test results on sequence changes (safety net)
-- ----------------------------------------------------------------------------
create or replace function public.reset_list_test_results()
returns trigger
language plpgsql
as $$
begin
  -- reset test result fields when items change
  -- note: in practice, block_list_items_after_test prevents this
  -- this is a safety net for consistency
  update public.lists
  set last_score = null,
      last_tested_at = null,
      last_correct = null,
      last_wrong = null
  where id = coalesce(new.list_id, old.list_id);
  
  return coalesce(new, old);
end;
$$;

comment on function public.reset_list_test_results() is 'safety net: resets test results when list items change (normally blocked by block_list_items_after_test)';

-- note: this is an after trigger, so it runs after before triggers and the actual operation
create trigger list_items_03_reset_results
  after insert or update or delete on public.list_items
  for each row
  execute function public.reset_list_test_results();

-- ============================================================================
-- section 7: rpc functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1. touch_list: update last_accessed_at timestamp
-- ----------------------------------------------------------------------------
create or replace function public.touch_list(p_list_id uuid)
returns public.lists
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list public.lists;
begin
  -- guard: ensure list belongs to current user
  if not exists (
    select 1 
    from public.lists 
    where id = p_list_id 
      and user_id = auth.uid()
  ) then
    raise exception 'list not found or access denied'
      using errcode = 'P0001';
  end if;
  
  -- update last_accessed_at
  update public.lists
  set last_accessed_at = now()
  where id = p_list_id
  returning * into v_list;
  
  return v_list;
end;
$$;

comment on function public.touch_list(uuid) is 'updates last_accessed_at for a list (security definer, owner-only)';

-- ----------------------------------------------------------------------------
-- 7.2. complete_test: record test completion and update list stats
-- ----------------------------------------------------------------------------
create or replace function public.complete_test(
  p_list_id uuid,
  p_correct integer,
  p_wrong integer,
  p_completed_at timestamptz default now()
)
returns public.tests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items_count integer;
  v_score smallint;
  v_test public.tests;
  v_first_tested_at timestamptz;
begin
  -- guard: ensure list belongs to current user
  if not exists (
    select 1 
    from public.lists 
    where id = p_list_id 
      and user_id = auth.uid()
  ) then
    raise exception 'list not found or access denied'
      using errcode = 'P0001';
  end if;
  
  -- guard: ensure list has minimum 5 items
  select count(*) into v_items_count
  from public.list_items
  where list_id = p_list_id;
  
  if v_items_count < 5 then
    raise exception 'list must have at least 5 items to complete a test'
      using errcode = 'P0001',
            hint = 'current item count: ' || v_items_count;
  end if;
  
  -- validate that correct + wrong matches actual item count
  if p_correct + p_wrong <> v_items_count then
    raise exception 'correct + wrong must equal total items in list'
      using errcode = 'P0001',
            hint = 'expected: ' || v_items_count || ', got: ' || (p_correct + p_wrong);
  end if;
  
  -- calculate score (0-100)
  v_score := floor(100.0 * p_correct / nullif(v_items_count, 0))::smallint;
  
  -- insert test record
  insert into public.tests (
    user_id,
    list_id,
    completed_at,
    items_count,
    correct,
    wrong,
    score
  ) values (
    auth.uid(),
    p_list_id,
    p_completed_at,
    v_items_count,
    p_correct,
    p_wrong,
    v_score
  )
  returning * into v_test;
  
  -- get current first_tested_at
  select first_tested_at into v_first_tested_at
  from public.lists
  where id = p_list_id;
  
  -- update list with test results
  update public.lists
  set first_tested_at = coalesce(v_first_tested_at, p_completed_at),
      last_score = v_score,
      last_tested_at = p_completed_at,
      last_correct = p_correct,
      last_wrong = p_wrong
  where id = p_list_id;
  
  return v_test;
end;
$$;

comment on function public.complete_test(uuid, integer, integer, timestamptz) is 'records test completion, validates min 5 items, updates list stats (security definer, owner-only)';

-- ----------------------------------------------------------------------------
-- 7.3. consume_ai_generation: enforce 5/day ai generation limit
-- ----------------------------------------------------------------------------
create or replace function public.consume_ai_generation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_day_utc date;
  v_used integer;
  v_remaining integer;
  v_reset_at timestamptz;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'user must be authenticated'
      using errcode = 'P0001';
  end if;
  
  -- get current utc date
  v_day_utc := (now() at time zone 'utc')::date;
  
  -- lock row for update (or insert if doesn't exist)
  insert into public.ai_usage_daily (user_id, day_utc, used)
  values (v_user_id, v_day_utc, 0)
  on conflict (user_id, day_utc) do nothing;
  
  -- get current usage with lock
  select used into v_used
  from public.ai_usage_daily
  where user_id = v_user_id
    and day_utc = v_day_utc
  for update;
  
  -- check if limit exceeded
  if v_used >= 5 then
    v_reset_at := ((v_day_utc + 1)::timestamp at time zone 'UTC');
    raise exception 'daily ai generation limit exceeded (5/day)'
      using errcode = 'P0001',
            detail = 'used: ' || v_used || ', limit: 5',
            hint = 'limit resets at: ' || v_reset_at::text;
  end if;
  
  -- increment usage
  update public.ai_usage_daily
  set used = used + 1
  where user_id = v_user_id
    and day_utc = v_day_utc;
  
  -- get updated values
  v_used := v_used + 1;
  v_remaining := 5 - v_used;
  v_reset_at := ((v_day_utc + 1)::timestamp at time zone 'UTC');
  
  -- return usage info
  return jsonb_build_object(
    'used', v_used,
    'remaining', v_remaining,
    'limit', 5,
    'reset_at', v_reset_at
  );
end;
$$;

comment on function public.consume_ai_generation() is 'enforces daily ai generation limit (5/day per user, utc-based), returns usage info';

-- ----------------------------------------------------------------------------
-- 7.4. check_list_limit: enforce 50 lists per user limit
-- ----------------------------------------------------------------------------
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
  select count(*) into v_list_count
  from public.lists
  where user_id = new.user_id
  for update;
  
  -- check if limit would be exceeded
  if v_list_count >= 50 then
    raise exception 'maximum number of lists per user exceeded (50)'
      using errcode = 'P0001',
            hint = 'delete some lists before creating new ones';
  end if;
  
  return new;
end;
$$;

comment on function public.check_list_limit() is 'enforces 50 lists per user limit';

-- apply limit check trigger to lists table
create trigger lists_check_limit
  before insert on public.lists
  for each row
  execute function public.check_list_limit();

-- ============================================================================
-- migration complete
-- ============================================================================
