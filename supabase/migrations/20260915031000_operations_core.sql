create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','reviewer','viewer')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_connection_id text,
  institution_name text,
  status text not null default 'pending',
  scopes text[] not null default '{}',
  consent_expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.bank_connections(id) on delete set null,
  provider_account_id text,
  bank_name text not null,
  account_name text not null,
  iban_masked text not null,
  currency text not null default 'TRY',
  balance numeric(18,2) not null default 0,
  deposits_enabled boolean not null default true,
  withdrawals_enabled boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id,provider_account_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  external_ref text,
  account_id uuid references public.bank_accounts(id) on delete set null,
  occurred_at timestamptz not null default now(),
  direction text not null default 'deposit',
  method text not null default 'transfer',
  counterparty text,
  counterparty_iban_masked text,
  amount numeric(18,2) not null,
  balance_after numeric(18,2),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
create unique index if not exists transactions_external_ref_uidx on public.transactions(external_ref) where external_ref is not null;
create index if not exists transactions_account_occurred_idx on public.transactions(account_id,occurred_at desc);

create table if not exists public.account_movements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.bank_accounts(id) on delete set null,
  occurred_at timestamptz not null default now(),
  movement_type text not null,
  reference text,
  source text not null default 'provider',
  amount numeric(18,2) not null,
  running_balance numeric(18,2),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.bank_accounts(id) on delete set null,
  direction text not null default 'transfer' check (direction in ('withdrawal','transfer')),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null,
  destination_iban_masked text,
  destination_name text,
  description text,
  provider_payment_id text,
  status text not null default 'draft',
  authorization_url text,
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_requests_created_idx on public.payment_requests(created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text,
  action text not null,
  resource_type text,
  resource_id uuid,
  detail text,
  severity text not null default 'info',
  created_at timestamptz not null default now()
);

create table if not exists public.account_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.bank_accounts(id) on delete set null,
  event_type text not null,
  event_message text not null,
  status text not null default 'info',
  created_at timestamptz not null default now()
);

create table if not exists public.reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.bank_accounts(id) on delete set null,
  ledger_balance numeric(18,2) not null default 0,
  bank_balance numeric(18,2) not null default 0,
  difference numeric(18,2) generated always as (bank_balance-ledger_balance) stored,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create or replace function public.current_ops_role() returns text language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.bank_connections enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.account_movements enable row level security;
alter table public.payment_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.account_history enable row level security;
alter table public.reconciliation_items enable row level security;

do $$ begin
  create policy profiles_read on public.profiles for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_read_connections on public.bank_connections for select to authenticated using (public.current_ops_role() in ('admin','reviewer','viewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_write_connections on public.bank_connections for all to authenticated using (public.current_ops_role() in ('admin','reviewer')) with check (public.current_ops_role() in ('admin','reviewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_read_accounts on public.bank_accounts for select to authenticated using (public.current_ops_role() in ('admin','reviewer','viewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_read_transactions on public.transactions for select to authenticated using (public.current_ops_role() in ('admin','reviewer','viewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_read_movements on public.account_movements for select to authenticated using (public.current_ops_role() in ('admin','reviewer','viewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_read_payments on public.payment_requests for select to authenticated using (public.current_ops_role() in ('admin','reviewer','viewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_write_payments on public.payment_requests for insert to authenticated with check (public.current_ops_role() in ('admin','reviewer') and requested_by=auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_read_audit on public.audit_logs for select to authenticated using (public.current_ops_role() in ('admin','reviewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_insert_audit on public.audit_logs for insert to authenticated with check (public.current_ops_role() in ('admin','reviewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_read_history on public.account_history for select to authenticated using (public.current_ops_role() in ('admin','reviewer','viewer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ops_read_reconciliation on public.reconciliation_items for select to authenticated using (public.current_ops_role() in ('admin','reviewer','viewer'));
exception when duplicate_object then null; end $$;
