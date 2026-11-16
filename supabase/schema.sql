-- Campaignia schema. Run this in the Supabase SQL editor.
-- Single-user personal app: one row per campaign, keyed by the app's own id.

create table if not exists campaigns (
  id text primary key,
  status text not null check (status in ('active', 'settled')),
  created_at timestamptz not null default now(),
  start_date date not null,
  verdict_date date not null,
  objective text not null,
  source text not null,
  criteria jsonb not null default '[]',
  stake integer not null,
  holder jsonb not null default '{"type":"pot","name":""}',
  stake_moved_at timestamptz,
  treat jsonb not null default '{}',
  charity jsonb not null default '{}',
  obstacle jsonb not null default '{}',
  next_action text not null default '',
  verdict jsonb,
  updated_at timestamptz not null default now()
);

-- One row holds the export timestamp.
create table if not exists app_meta (
  id int primary key,
  last_export_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Open access: personal single-user app without auth.
-- Tighten with RLS + auth if this ever becomes multi-user.
alter table campaigns disable row level security;
alter table app_meta disable row level security;
