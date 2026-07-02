-- Run this in Supabase SQL Editor.
-- Adds the social layer on top of the existing journal_entries table:
--   * profiles (username/display_name/avatar/bio) keyed by auth.users.id
--   * journal_entries: parent_id (self-FK for threaded replies) + visibility ('private' | 'public')
--   * RLS so a post is readable when it's yours OR visibility = 'public'
-- Idempotent: safe to re-run, and safe to run after an older revision of this
-- migration that included a 'followers' tier + follows table — those get
-- downgraded/removed in place.

-- 1. profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists profiles_username_lower_idx
  on profiles (lower(username));

alter table profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Profiles are readable by anyone authed') then
    create policy "Profiles are readable by anyone authed"
      on profiles for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile"
      on profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own profile') then
    create policy "Users can update own profile"
      on profiles for update using (auth.uid() = id);
  end if;
end $$;

-- Auto-create a profile row whenever a new auth.user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing users.
insert into profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', null)
from auth.users u
on conflict (id) do nothing;

-- 2. journal_entries: parent_id + visibility ('private' | 'public')
alter table journal_entries
  add column if not exists parent_id uuid references journal_entries(id) on delete cascade;

alter table journal_entries
  add column if not exists visibility text not null default 'private';

-- Downgrade any 'followers' rows from an earlier migration revision.
update journal_entries set visibility = 'public' where visibility = 'followers';

-- Replace the visibility check constraint (older revisions allowed 'followers').
alter table journal_entries drop constraint if exists journal_entries_visibility_check;
alter table journal_entries add constraint journal_entries_visibility_check
  check (visibility in ('private', 'public'));

create index if not exists journal_entries_parent_idx
  on journal_entries(parent_id, created_at);

create index if not exists journal_entries_public_feed_idx
  on journal_entries(created_at desc)
  where visibility = 'public' and parent_id is null;

-- 3. RLS: replace any prior read policy with the simpler own-or-public one.
do $$ begin
  if exists (select 1 from pg_policies
             where policyname = 'Users can read own journal_entries'
               and tablename = 'journal_entries') then
    drop policy "Users can read own journal_entries" on journal_entries;
  end if;
  if exists (select 1 from pg_policies
             where policyname = 'Users can read visible journal_entries'
               and tablename = 'journal_entries') then
    drop policy "Users can read visible journal_entries" on journal_entries;
  end if;
  create policy "Users can read visible journal_entries"
    on journal_entries for select using (
      auth.uid() = user_id or visibility = 'public'
    );
end $$;

-- Update policy (additive; allows future edit-post UX).
do $$ begin
  if not exists (select 1 from pg_policies
                 where policyname = 'Users can update own journal_entries'
                   and tablename = 'journal_entries') then
    create policy "Users can update own journal_entries"
      on journal_entries for update using (auth.uid() = user_id);
  end if;
end $$;

-- 4. Drop follows table if a prior revision created it. The follow-graph
-- feature was deferred; we'll add it back when we need it.
drop table if exists follows;
