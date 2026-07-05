-- Run this in Supabase SQL Editor.
-- Adds in-depth workout tracking: reusable workout templates (exercises with
-- target sets/reps/rest) plus per-session set-by-set logging with timing.
-- Safe to re-run: every statement is guarded by IF NOT EXISTS.

-- 1. Workout templates (e.g. "Monday — Chest + Abs")
create table if not exists workout_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete set null,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz default now()
);

alter table workout_templates enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read own workout_templates') then
    create policy "Users can read own workout_templates"
      on workout_templates for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own workout_templates') then
    create policy "Users can insert own workout_templates"
      on workout_templates for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own workout_templates') then
    create policy "Users can update own workout_templates"
      on workout_templates for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete own workout_templates') then
    create policy "Users can delete own workout_templates"
      on workout_templates for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 2. Exercises inside a template
create table if not exists workout_exercises (
  id uuid default gen_random_uuid() primary key,
  template_id uuid references workout_templates(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_sets integer not null default 3,
  target_reps_min integer not null default 8,
  target_reps_max integer not null default 12,
  rest_seconds integer not null default 120,
  notes text,
  position integer not null default 0
);

alter table workout_exercises enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read own workout_exercises') then
    create policy "Users can read own workout_exercises"
      on workout_exercises for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own workout_exercises') then
    create policy "Users can insert own workout_exercises"
      on workout_exercises for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own workout_exercises') then
    create policy "Users can update own workout_exercises"
      on workout_exercises for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete own workout_exercises') then
    create policy "Users can delete own workout_exercises"
      on workout_exercises for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists workout_exercises_template_id_idx on workout_exercises(template_id);

-- 3. Sessions (one per performed workout)
create table if not exists workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  template_id uuid references workout_templates(id) on delete set null,
  template_name text not null,
  date date not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  duration_seconds integer,
  notes text
);

alter table workout_sessions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read own workout_sessions') then
    create policy "Users can read own workout_sessions"
      on workout_sessions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own workout_sessions') then
    create policy "Users can insert own workout_sessions"
      on workout_sessions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own workout_sessions') then
    create policy "Users can update own workout_sessions"
      on workout_sessions for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete own workout_sessions') then
    create policy "Users can delete own workout_sessions"
      on workout_sessions for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists workout_sessions_template_id_idx on workout_sessions(template_id);
create index if not exists workout_sessions_date_idx on workout_sessions(user_id, date);

-- 4. Individual set logs
create table if not exists workout_set_logs (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references workout_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  exercise_name text not null,
  set_number integer not null,
  reps integer,
  weight numeric,
  completed_at timestamptz default now()
);

alter table workout_set_logs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read own workout_set_logs') then
    create policy "Users can read own workout_set_logs"
      on workout_set_logs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own workout_set_logs') then
    create policy "Users can insert own workout_set_logs"
      on workout_set_logs for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own workout_set_logs') then
    create policy "Users can update own workout_set_logs"
      on workout_set_logs for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete own workout_set_logs') then
    create policy "Users can delete own workout_set_logs"
      on workout_set_logs for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists workout_set_logs_session_id_idx on workout_set_logs(session_id);
