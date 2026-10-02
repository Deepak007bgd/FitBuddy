-- FitBuddy initial schema. Run once (Supabase SQL editor or `supabase db push`).
-- Security model:
--   * Every table has RLS enabled; users only touch rows where user_id = auth.uid().
--   * Admin = a row in public.admin_users. That table has NO write policies, so it can
--     only be changed from the SQL editor / service role (users cannot self-promote).
--   * AI-generated rows (plans, insights, chat replies, usage) are written by the Edge
--     Function with the service role. Users can read them but not forge them.

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------- admin roles
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
create policy "admin_users: read own row" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  age smallint check (age between 13 and 100),
  height_cm numeric(5,1) check (height_cm between 80 and 250),
  weight_kg numeric(5,1) check (weight_kg between 25 and 400),
  target_weight_kg numeric(5,1) check (target_weight_kg between 25 and 400),
  goal text check (goal in ('weight_loss','muscle_gain','general_fitness','endurance','flexibility')),
  fitness_level text check (fitness_level in ('beginner','intermediate','advanced')),
  preferred_workouts text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- weight history
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,1) not null check (weight_kg between 25 and 400),
  logged_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);
create index weight_logs_user_date_idx on public.weight_logs (user_id, logged_on desc);

-- ---------------------------------------------------------------- workouts
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('walking','running','cycling','strength','yoga','swimming','custom')),
  custom_name text,
  duration_min integer not null check (duration_min between 1 and 1440),
  distance_km numeric(6,2) check (distance_km between 0 and 1000),
  calories integer check (calories between 0 and 20000),
  performed_on date not null default current_date,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint custom_needs_name check (type <> 'custom' or char_length(trim(coalesce(custom_name,''))) > 0)
);
create index workouts_user_date_idx on public.workouts (user_id, performed_on desc);

-- ---------------------------------------------------------------- workout plan versions
-- Never overwritten: each AI generation/modification inserts a new row with version+1.
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  parent_plan_id uuid references public.workout_plans(id) on delete set null,
  source text not null check (source in ('ai_generated','ai_feedback')),
  feedback text check (char_length(feedback) <= 1000),
  plan jsonb not null,                -- validated 7-day structure (validated in Edge Function)
  model text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);
create unique index workout_plans_one_active_idx on public.workout_plans (user_id) where is_active;

create or replace function public.workout_plans_before_insert()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0)); -- serialize per user
  select coalesce(max(version), 0) + 1 into new.version
    from public.workout_plans where user_id = new.user_id;
  if new.is_active then
    update public.workout_plans set is_active = false
      where user_id = new.user_id and is_active;
  end if;
  return new;
end $$;
create trigger workout_plans_version before insert on public.workout_plans
  for each row execute function public.workout_plans_before_insert();

-- Only is_active may change after insert; plan content is immutable.
create or replace function public.workout_plans_immutable()
returns trigger language plpgsql as $$
begin
  if (new.plan, new.version, new.user_id, new.feedback, new.source)
     is distinct from (old.plan, old.version, old.user_id, old.feedback, old.source) then
    raise exception 'workout plan versions are immutable; insert a new version instead';
  end if;
  return new;
end $$;
create trigger workout_plans_no_edit before update on public.workout_plans
  for each row execute function public.workout_plans_immutable();

-- ---------------------------------------------------------------- AI insights (cache)
-- input_hash = hash of the data sent to Gemini. Same hash => return stored row, no API call.
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('nutrition','recovery','progress_analysis','weekly_summary')),
  plan_id uuid references public.workout_plans(id) on delete set null,
  period_start date,
  period_end date,
  input_hash text not null,
  content jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, input_hash)
);
create index ai_insights_user_kind_idx on public.ai_insights (user_id, kind, created_at desc);

-- ---------------------------------------------------------------- chat
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 8000),
  created_at timestamptz not null default now()
);
create index chat_messages_user_idx on public.chat_messages (user_id, created_at);

-- ---------------------------------------------------------------- user feedback (for admin)
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.workout_plans(id) on delete set null,
  rating smallint check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);

-- ---------------------------------------------------------------- AI usage (rate limiting / cost)
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index ai_usage_user_time_idx on public.ai_usage (user_id, created_at desc);

-- ================================================================ RLS
alter table public.profiles      enable row level security;
alter table public.weight_logs   enable row level security;
alter table public.workouts      enable row level security;
alter table public.workout_plans enable row level security;
alter table public.ai_insights   enable row level security;
alter table public.chat_messages enable row level security;
alter table public.feedback      enable row level security;
alter table public.ai_usage      enable row level security;

-- profiles (row created by trigger; users read/update their own)
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- weight_logs & workouts: full CRUD on own rows, admin can read all
create policy "weight_logs: read own or admin" on public.weight_logs
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "weight_logs: insert own" on public.weight_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "weight_logs: update own" on public.weight_logs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "weight_logs: delete own" on public.weight_logs
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "workouts: read own or admin" on public.workouts
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "workouts: insert own" on public.workouts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "workouts: update own" on public.workouts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workouts: delete own" on public.workouts
  for delete to authenticated using (user_id = (select auth.uid()));

-- AI-written tables: read-only for users (Edge Function writes with service role)
create policy "workout_plans: read own or admin" on public.workout_plans
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "ai_insights: read own or admin" on public.ai_insights
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "chat_messages: read own" on public.chat_messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_usage: read own or admin" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- feedback: users submit + read their own; admin reads all
create policy "feedback: read own or admin" on public.feedback
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "feedback: insert own" on public.feedback
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- first admin (run manually)
-- insert into public.admin_users (user_id)
--   select id from auth.users where email = 'you@example.com';
