-- Run this in Supabase SQL Editor
alter table habits add column if not exists archived boolean not null default false;
