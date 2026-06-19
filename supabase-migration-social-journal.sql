-- Run this in Supabase SQL Editor.
-- Adds the social layer on top of the existing journal_entries table:
--   * profiles (username/display_name/avatar/bio) keyed by auth.users.id
--   * follows (directed graph)
--   * journal_entries: parent_id (self-FK for threaded replies) + visibility enum
--   * RLS so a post is readable when:
--       - it's yours, OR
--       - visibility = 'public', OR
--       - visibility = 'followers' AND viewer follows the author
-- Safe to re-run.

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

-- 2. follows
create table if not exists follows (
  follower_id uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on follows(following_id);

alter table follows enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Follows are readable by anyone authed') then
    create policy "Follows are readable by anyone authed"
      on follows for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can follow as themselves') then
    create policy "Users can follow as themselves"
      on follows for insert with check (auth.uid() = follower_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can unfollow their own follows') then
    create policy "Users can unfollow their own follows"
      on follows for delete using (auth.uid() = follower_id);
  end if;
end $$;

-- 3. journal_entries: parent_id + visibility
alter table journal_entries
  add column if not exists parent_id uuid references journal_entries(id) on delete cascade;

alter table journal_entries
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'followers', 'public'));

create index if not exists journal_entries_parent_idx
  on journal_entries(parent_id, created_at);

create index if not exists journal_entries_public_feed_idx
  on journal_entries(created_at desc)
  where visibility = 'public' and parent_id is null;

-- Replace the existing single-user read policy with a social-aware one.
do $$ begin
  if exists (select 1 from pg_policies
             where policyname = 'Users can read own journal_entries'
               and tablename = 'journal_entries') then
    drop policy "Users can read own journal_entries" on journal_entries;
  end if;
  if not exists (select 1 from pg_policies
                 where policyname = 'Users can read visible journal_entries'
                   and tablename = 'journal_entries') then
    create policy "Users can read visible journal_entries"
      on journal_entries for select using (
        auth.uid() = user_id
        or visibility = 'public'
        or (
          visibility = 'followers'
          and exists (
            select 1 from follows
            where follower_id = auth.uid()
              and following_id = journal_entries.user_id
          )
        )
      );
  end if;
end $$;

-- Update policy so users can edit their own entries (used for future edit-post UX; safe additive).
do $$ begin
  if not exists (select 1 from pg_policies
                 where policyname = 'Users can update own journal_entries'
                   and tablename = 'journal_entries') then
    create policy "Users can update own journal_entries"
      on journal_entries for update using (auth.uid() = user_id);
  end if;
end $$;
