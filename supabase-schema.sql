-- Run this in your Supabase SQL Editor

-- Habits table
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null default 'personal',
  metric_type text not null default 'quantity',
  unit text not null default 'ml',
  goal numeric not null default 1,
  frequency text not null default 'daily',
  created_at timestamptz default now()
);

-- Daily habit logs
create table habit_logs (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  value numeric not null default 0,
  unique (habit_id, date)
);

-- RLS policies
alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "Users can manage own habits"
  on habits for all using (auth.uid() = user_id);

create policy "Users can manage own logs"
  on habit_logs for all using (auth.uid() = user_id);
