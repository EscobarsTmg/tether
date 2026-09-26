create table if not exists public.sports_catalog (
  id uuid primary key default gen_random_uuid(),
  sport_key text not null unique,
  name text not null,
  category text not null default 'sport',
  active boolean not null default true,
  sort_order int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sports_sync_state (
  provider_id uuid primary key references public.sports_providers(id) on delete cascade,
  cursor text,
  page_number int not null default 0,
  checkpoint jsonb not null default '{}'::jsonb,
  last_incremental_sync_at timestamptz,
  last_full_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.sports_unmapped_entities (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.sports_providers(id) on delete cascade,
  entity_type text not null check (entity_type in ('sport','league','team','fixture')),
  external_id text not null,
  external_name text,
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','resolved','ignored')),
  resolved_internal_id uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (provider_id, entity_type, external_id, reason)
);

alter table public.sports_leagues add column if not exists sport_id uuid references public.sports_catalog(id) on delete set null;
alter table public.sports_teams add column if not exists sport_id uuid references public.sports_catalog(id) on delete set null;
alter table public.sports_fixtures add column if not exists sport_id uuid references public.sports_catalog(id) on delete set null;

alter table public.sports_provider_mappings drop constraint if exists sports_provider_mappings_entity_type_check;
alter table public.sports_provider_mappings
  add constraint sports_provider_mappings_entity_type_check
  check (entity_type in ('sport','league','team','fixture'));

create index if not exists sports_catalog_active_order_idx on public.sports_catalog(active, sort_order, name);
create index if not exists sports_leagues_sport_id_idx on public.sports_leagues(sport_id);
create index if not exists sports_teams_sport_id_idx on public.sports_teams(sport_id);
create index if not exists sports_fixtures_sport_id_start_idx on public.sports_fixtures(sport_id, starts_at);
create index if not exists sports_unmapped_status_idx on public.sports_unmapped_entities(status, created_at desc);
create index if not exists sports_unmapped_provider_idx on public.sports_unmapped_entities(provider_id, entity_type, external_id);

alter table public.sports_catalog enable row level security;
alter table public.sports_sync_state enable row level security;
alter table public.sports_unmapped_entities enable row level security;

revoke all on public.sports_catalog, public.sports_sync_state, public.sports_unmapped_entities from anon;

grant select on public.sports_catalog to authenticated;
grant select on public.sports_sync_state, public.sports_unmapped_entities to authenticated;
grant select, insert, update, delete on public.sports_catalog, public.sports_sync_state, public.sports_unmapped_entities to service_role;

drop policy if exists sports_catalog_read on public.sports_catalog;
create policy sports_catalog_read on public.sports_catalog for select to authenticated using (active = true);

drop policy if exists sports_sync_state_admin_read on public.sports_sync_state;
create policy sports_sync_state_admin_read on public.sports_sync_state for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role::text = 'admin'
));

drop policy if exists sports_unmapped_admin_read on public.sports_unmapped_entities;
create policy sports_unmapped_admin_read on public.sports_unmapped_entities for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role::text = 'admin'
));
