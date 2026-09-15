-- Stores only opaque references to provider-managed authorization sessions.
-- Raw bank credentials, OTPs and browser cookies must not be stored here.
create table if not exists public.bank_authorization_sessions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  provider_session_ref text,
  status text not null default 'pending' check (status in ('pending','authorized','expired','revoked','error')),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (connection_id)
);

create index if not exists bank_authorization_sessions_connection_id_idx
  on public.bank_authorization_sessions(connection_id);

alter table public.bank_authorization_sessions enable row level security;

-- Intentionally no client RLS policies. The automation backend uses the
-- service-role key; browser clients cannot read provider session references.
comment on table public.bank_authorization_sessions is
  'Backend-only references to provider-managed bank authorization sessions; never raw credentials or browser cookies.';
