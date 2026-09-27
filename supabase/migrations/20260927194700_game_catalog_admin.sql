-- Game catalog/admin control plane. No wager, payout, or outcome-control functionality.
create table if not exists public.game_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  name text not null,
  provider_type text not null default 'api' check (provider_type in ('api','json','manual')),
  catalog_url text,
  active boolean not null default true,
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_catalog (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.game_providers(id) on delete set null,
  external_id text,
  name text not null,
  slug text not null,
  game_type text not null check (game_type in ('slot','live_casino','table','instant','virtual','other')),
  category text,
  thumbnail_url text,
  demo_launch_url text,
  certified_rtp numeric(6,3) check (certified_rtp is null or (certified_rtp >= 0 and certified_rtp <= 100)),
  volatility text not null default 'unknown' check (volatility in ('low','medium','high','unknown')),
  max_multiplier numeric(12,2) check (max_multiplier is null or max_multiplier >= 0),
  enabled boolean not null default true,
  maintenance boolean not null default false,
  featured boolean not null default false,
  sort_order int not null default 0,
  provider_updated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, external_id)
);

create table if not exists public.game_provider_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.game_providers(id) on delete cascade,
  external_id text not null,
  internal_game_id uuid not null references public.game_catalog(id) on delete cascade,
  external_name text,
  verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, external_id)
);

create table if not exists public.game_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.game_providers(id) on delete set null,
  trigger_type text not null default 'manual' check (trigger_type in ('manual','api','scheduled')),
  status text not null default 'running' check (status in ('running','completed','partial','failed')),
  items_received int not null default 0,
  items_upserted int not null default 0,
  error_message text,
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists game_catalog_type_idx on public.game_catalog(game_type, enabled, maintenance);
create index if not exists game_catalog_provider_idx on public.game_catalog(provider_id, sort_order, name);
create index if not exists game_catalog_featured_idx on public.game_catalog(featured, sort_order);
create index if not exists game_mappings_internal_idx on public.game_provider_mappings(internal_game_id);
create index if not exists game_sync_runs_provider_idx on public.game_sync_runs(provider_id, started_at desc);

alter table public.game_providers enable row level security;
alter table public.game_catalog enable row level security;
alter table public.game_provider_mappings enable row level security;
alter table public.game_sync_runs enable row level security;

revoke all on public.game_providers, public.game_catalog, public.game_provider_mappings, public.game_sync_runs from anon;
grant select on public.game_providers, public.game_catalog, public.game_sync_runs to authenticated;
grant select,insert,update,delete on public.game_providers, public.game_catalog, public.game_provider_mappings, public.game_sync_runs to service_role;

drop policy if exists game_providers_read on public.game_providers;
create policy game_providers_read on public.game_providers for select to authenticated using (active = true);
drop policy if exists game_catalog_read on public.game_catalog;
create policy game_catalog_read on public.game_catalog for select to authenticated using (true);
drop policy if exists game_sync_runs_read on public.game_sync_runs;
create policy game_sync_runs_read on public.game_sync_runs for select to authenticated using (true);
drop policy if exists game_mappings_admin_read on public.game_provider_mappings;
create policy game_mappings_admin_read on public.game_provider_mappings for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role::text='admin' and coalesce(p.active,true)
));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='game_catalog'
  ) then
    alter publication supabase_realtime add table public.game_catalog;
  end if;
end $$;
