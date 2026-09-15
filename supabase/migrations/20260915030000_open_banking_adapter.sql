create extension if not exists pgcrypto;

alter table if exists public.bank_connections
  add column if not exists provider_connection_id text,
  add column if not exists consent_state text,
  add column if not exists consent_expires_at timestamptz,
  add column if not exists authorization_url text,
  add column if not exists sync_error text;

create unique index if not exists bank_connections_provider_connection_id_uidx
  on public.bank_connections(provider_connection_id)
  where provider_connection_id is not null;

alter table if exists public.bank_accounts
  add column if not exists connection_id uuid references public.bank_connections(id) on delete cascade,
  add column if not exists provider_account_id text,
  add column if not exists bank_name text,
  add column if not exists account_name text,
  add column if not exists iban_masked text;

create unique index if not exists bank_accounts_connection_provider_uidx
  on public.bank_accounts(connection_id, provider_account_id)
  where connection_id is not null and provider_account_id is not null;

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  provider_transaction_id text not null unique,
  occurred_at timestamptz not null,
  direction text not null check (direction in ('deposit','withdrawal')),
  method text not null,
  counterparty text,
  counterparty_iban_masked text,
  amount numeric(18,2) not null,
  balance_after numeric(18,2),
  status text not null,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists bank_transactions_connection_idx
  on public.bank_transactions(connection_id);
create index if not exists bank_transactions_account_idx
  on public.bank_transactions(account_id);
create index if not exists bank_transactions_occurred_idx
  on public.bank_transactions(occurred_at desc);
create index if not exists bank_transactions_provider_tx_idx
  on public.bank_transactions(provider_transaction_id);

alter table if exists public.payment_requests
  add column if not exists provider_payment_id text,
  add column if not exists authorization_url text,
  add column if not exists provider_error text,
  add column if not exists submitted_at timestamptz,
  add column if not exists destination_iban text;

create unique index if not exists payment_requests_provider_payment_uidx
  on public.payment_requests(provider_payment_id)
  where provider_payment_id is not null;

alter table public.bank_transactions enable row level security;

do $$ begin
  create policy bank_transactions_staff_read on public.bank_transactions
    for select
    using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','reviewer')));
exception when duplicate_object then null; end $$;
