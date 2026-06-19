-- Run this in Supabase SQL Editor.
-- Adds a free-form journal: text entries posted by the user, no parsing or habit linkage in v1.
-- Safe to re-run.

create table if not exists journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now()
);

alter table journal_entries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read own journal_entries') then
    create policy "Users can read own journal_entries"
      on journal_entries for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own journal_entries') then
    create policy "Users can insert own journal_entries"
      on journal_entries for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete own journal_entries') then
    create policy "Users can delete own journal_entries"
      on journal_entries for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists journal_entries_user_created_idx
  on journal_entries(user_id, created_at desc);
