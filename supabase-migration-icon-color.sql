-- Run this in Supabase SQL Editor
alter table habits add column if not exists icon text not null default 'circle';
alter table habits add column if not exists color text not null default '#ffffff';
