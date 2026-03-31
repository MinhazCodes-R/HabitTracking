-- Run this in Supabase SQL Editor
create table feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  message text not null,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "Users can insert own feedback"
  on feedback for insert with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on feedback for select using (auth.uid() = user_id);
