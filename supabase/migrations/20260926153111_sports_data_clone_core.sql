create table if not exists public.sports_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  name text not null,
  mode text not null default 'api' check (mode in ('api','json','manual')),
  base_url text,
  active boolean not null default true,
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sports_leagues (
  id uuid primary key default gen_random_uuid(),
  sport text not null default 'football',
  name text not null,
  slug text not null,
  country text,
  logo_url text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sport, slug)
);

create table if not exists public.sports_teams (
  id uuid primary key default gen_random_uuid(),
  sport text not null default 'football',
  name text not null,
  slug text not null,
  country text,
  logo_url text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sport, slug)
);

create table if not exists public.sports_fixtures (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.sports_providers(id) on delete set null,
  external_id text,
  sport text not null default 'football',
  league_id uuid references public.sports_leagues(id) on delete set null,
  home_team_id uuid references public.sports_teams(id) on delete set null,
  away_team_id uuid references public.sports_teams(id) on delete set null,
  starts_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','paused','finished','postponed','cancelled')),
  minute int check (minute is null or (minute >= 0 and minute <= 200)),
  home_score int not null default 0 check (home_score >= 0),
  away_score int not null default 0 check (away_score >= 0),
  venue text,
  last_provider_update_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, external_id)
);

create table if not exists public.sports_fixture_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.sports_fixtures(id) on delete cascade,
  provider_event_id text,
  event_type text not null,
  minute int,
  team_id uuid references public.sports_teams(id) on delete set null,
  participant_name text,
  detail text,
  occurred_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fixture_id, provider_event_id)
);

create table if not exists public.sports_provider_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.sports_providers(id) on delete cascade,
  entity_type text not null check (entity_type in ('league','team','fixture')),
  external_id text not null,
  internal_id uuid not null,
  external_name text,
  match_method text not null default 'external_id' check (match_method in ('external_id','slug','manual')),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, entity_type, external_id)
);

create table if not exists public.sports_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.sports_providers(id) on delete set null,
  trigger_type text not null default 'manual' check (trigger_type in ('manual','api','scheduled')),
  status text not null default 'running' check (status in ('running','completed','partial','failed')),
  items_received int not null default 0,
  items_upserted int not null default 0,
  error_message text,
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.sports_admin_overrides (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.sports_fixtures(id) on delete cascade,
  field_name text not null,
  previous_value jsonb,
  override_value jsonb not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sports_fixtures_status_start_idx on public.sports_fixtures(status, starts_at);
create index if not exists sports_fixtures_league_start_idx on public.sports_fixtures(league_id, starts_at);
create index if not exists sports_fixtures_home_team_idx on public.sports_fixtures(home_team_id);
create index if not exists sports_fixtures_away_team_idx on public.sports_fixtures(away_team_id);
create index if not exists sports_fixture_events_fixture_idx on public.sports_fixture_events(fixture_id, minute);
create index if not exists sports_provider_mappings_internal_idx on public.sports_provider_mappings(entity_type, internal_id);
create index if not exists sports_sync_runs_provider_start_idx on public.sports_sync_runs(provider_id, started_at desc);
create index if not exists sports_admin_overrides_fixture_idx on public.sports_admin_overrides(fixture_id, created_at desc);

alter table public.sports_providers enable row level security;
alter table public.sports_leagues enable row level security;
alter table public.sports_teams enable row level security;
alter table public.sports_fixtures enable row level security;
alter table public.sports_fixture_events enable row level security;
alter table public.sports_provider_mappings enable row level security;
alter table public.sports_sync_runs enable row level security;
alter table public.sports_admin_overrides enable row level security;

revoke all on public.sports_providers, public.sports_leagues, public.sports_teams,
  public.sports_fixtures, public.sports_fixture_events, public.sports_provider_mappings,
  public.sports_sync_runs, public.sports_admin_overrides from anon;

grant select on public.sports_providers, public.sports_leagues, public.sports_teams,
  public.sports_fixtures, public.sports_fixture_events, public.sports_sync_runs to authenticated;

grant select, insert, update, delete on public.sports_providers, public.sports_leagues, public.sports_teams,
  public.sports_fixtures, public.sports_fixture_events, public.sports_provider_mappings,
  public.sports_sync_runs, public.sports_admin_overrides to service_role;

drop policy if exists sports_providers_read on public.sports_providers;
create policy sports_providers_read on public.sports_providers for select to authenticated using (active = true);
drop policy if exists sports_leagues_read on public.sports_leagues;
create policy sports_leagues_read on public.sports_leagues for select to authenticated using (active = true);
drop policy if exists sports_teams_read on public.sports_teams;
create policy sports_teams_read on public.sports_teams for select to authenticated using (active = true);
drop policy if exists sports_fixtures_read on public.sports_fixtures;
create policy sports_fixtures_read on public.sports_fixtures for select to authenticated using (true);
drop policy if exists sports_fixture_events_read on public.sports_fixture_events;
create policy sports_fixture_events_read on public.sports_fixture_events for select to authenticated using (true);
drop policy if exists sports_sync_runs_read on public.sports_sync_runs;
create policy sports_sync_runs_read on public.sports_sync_runs for select to authenticated using (true);

drop policy if exists sports_mappings_admin_read on public.sports_provider_mappings;
create policy sports_mappings_admin_read on public.sports_provider_mappings for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role::text = 'admin'));

drop policy if exists sports_overrides_admin_read on public.sports_admin_overrides;
create policy sports_overrides_admin_read on public.sports_admin_overrides for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role::text = 'admin'));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sports_fixtures'
  ) then
    alter publication supabase_realtime add table public.sports_fixtures;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sports_fixture_events'
  ) then
    alter publication supabase_realtime add table public.sports_fixture_events;
  end if;
end $$;
