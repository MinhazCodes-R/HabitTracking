-- Run this in Supabase SQL Editor to add the increments column to existing habits table
alter table habits add column if not exists increments numeric[] not null default '{10,25,50}';
