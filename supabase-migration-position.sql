-- Run this in Supabase SQL Editor
alter table habits add column if not exists position integer not null default 0;
