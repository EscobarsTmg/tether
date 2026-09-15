-- First-party application session telemetry.
-- Never store banking cookies, OTPs, passwords, access tokens or raw auth JWTs here.

create extension if not exists pgcrypto;

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_hash text not null unique,
  device_hash text,
  device_label text,
  user_agent text,
  ip_network text,
  country_code text,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  risk_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create index if not exists app_sessions_user_last_seen_idx on public.app_sessions(user_id, last_seen_at desc);
create index if not exists app_sessions_risk_idx on public.app_sessions(risk_score desc, last_seen_at desc);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid references public.app_sessions(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','high','critical')),
  request_id text,
  ip_network text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_user_created_idx on public.security_events(user_id, created_at desc);
create index if not exists security_events_type_created_idx on public.security_events(event_type, created_at desc);

create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  label text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id, device_hash)
);

create index if not exists trusted_devices_user_idx on public.trusted_devices(user_id, last_seen_at desc);

create table if not exists public.ip_allowlist (
  id uuid primary key default gen_random_uuid(),
  cidr cidr not null unique,
  label text,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.app_sessions enable row level security;
alter table public.security_events enable row level security;
alter table public.trusted_devices enable row level security;
alter table public.ip_allowlist enable row level security;

-- Users may read their own session/device/event records.
do $$ begin
  create policy app_sessions_read_own on public.app_sessions
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy security_events_read_own on public.security_events
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy trusted_devices_read_own on public.trusted_devices
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Admin/reviewer visibility for operational oversight.
do $$ begin
  create policy app_sessions_read_staff on public.app_sessions
    for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','reviewer')));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy security_events_read_staff on public.security_events
    for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','reviewer')));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy trusted_devices_read_staff on public.trusted_devices
    for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','reviewer')));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ip_allowlist_read_staff on public.ip_allowlist
    for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','reviewer')));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ip_allowlist_write_admin on public.ip_allowlist
    for all using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
    with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
exception when duplicate_object then null; end $$;
