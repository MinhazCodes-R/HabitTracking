-- Run this in Supabase SQL Editor.
-- Adds user-defined habit groups + collapsible "check all" support on the Home screen.
-- Safe to re-run: every statement is guarded by IF NOT EXISTS / IF NOT EXISTS.

-- 1. Groups table
create table if not exists habit_groups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text,
  color text,
  position integer not null default 0,
  created_at timestamptz default now()
);

alter table habit_groups enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read own habit_groups') then
    create policy "Users can read own habit_groups"
      on habit_groups for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own habit_groups') then
    create policy "Users can insert own habit_groups"
      on habit_groups for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own habit_groups') then
    create policy "Users can update own habit_groups"
      on habit_groups for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete own habit_groups') then
    create policy "Users can delete own habit_groups"
      on habit_groups for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 2. FK on habits. ON DELETE SET NULL so deleting a group falls habits back to "Ungrouped".
alter table habits add column if not exists group_id uuid references habit_groups(id) on delete set null;

create index if not exists habits_group_id_idx on habits(group_id);

-- 3. Backfill: for each user, create one group per distinct non-empty habits.category and
--    FK each habit to its match. Existing rows whose category is null/blank stay ungrouped.
do $$
declare
  rec record;
  new_group_id uuid;
  pos integer;
begin
  for rec in
    select distinct user_id, category
    from habits
    where category is not null
      and length(trim(category)) > 0
      and group_id is null
  loop
    select coalesce(max(position), -1) + 1 into pos
      from habit_groups
      where user_id = rec.user_id;

    insert into habit_groups (user_id, name, position)
    values (rec.user_id, initcap(rec.category), pos)
    returning id into new_group_id;

    update habits
      set group_id = new_group_id
      where user_id = rec.user_id
        and category = rec.category
        and group_id is null;
  end loop;
end $$;
