-- Run this in Supabase SQL Editor.
-- Adds the "Habit" state: a habit the user has internalised, which counts as Done every day
-- from habit_since onwards without them tapping Complete.
-- Safe to re-run: every statement is guarded by IF NOT EXISTS.

alter table habits add column if not exists is_habit boolean not null default false;

-- Date the habit entered the "Habit" state. Days on/after this count as Done; earlier days
-- keep whatever is in habit_logs. Null whenever is_habit is false.
alter table habits add column if not exists habit_since date;

create index if not exists habits_is_habit_idx on habits(is_habit) where is_habit;
