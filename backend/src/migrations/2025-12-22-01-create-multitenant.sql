-- 2025-12-22-01-create-multitenant.sql
-- Create tables for multi‑tenant architecture

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp default now()
);

create table if not exists user_profiles (
  id uuid primary key references auth.users(id),
  org_id uuid references organizations(id),
  role text check (role in ('admin','member')) default 'member',
  created_at timestamp default now()
);

create table if not exists organization_members (
  user_id uuid references auth.users(id),
  org_id uuid references organizations(id),
  role text check (role in ('owner','admin','member')) default 'member',
  primary key (user_id, org_id)
);

-- Add org_id column to existing tables (using IF NOT EXISTS logic via block or forgiving manual check in mind, but simple alter is fine if it fails we adjust)
-- Better: alter table if exists
alter table chat_sessions add column if not exists org_id uuid;
alter table chat_messages add column if not exists org_id uuid;
