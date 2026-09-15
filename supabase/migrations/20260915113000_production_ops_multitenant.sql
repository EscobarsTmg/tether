-- Production multi-tenant operations schema.
-- Bank authentication secrets, passwords, OTPs and browser cookies are intentionally not stored here.
create table if not exists public.bank_providers (
  id uuid primary key default gen_random_uuid(), name text not null unique, country text not null,
  currency text not null default 'EUR', logo_url text, adapter_key text not null unique,
  auth_mode text not null default 'oauth' check (auth_mode in ('oauth','api','sandbox')),
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.bank_connections add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.bank_connections add column if not exists provider_id uuid references public.bank_providers(id) on delete restrict;
create index if not exists bank_connections_user_id_idx on public.bank_connections(user_id);
create index if not exists bank_connections_provider_id_idx on public.bank_connections(provider_id);
alter table public.bank_accounts add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists bank_accounts_user_id_idx on public.bank_accounts(user_id);
alter table public.transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists transactions_user_date_idx on public.transactions(user_id, occurred_at desc);
alter table public.account_movements add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists account_movements_user_date_idx on public.account_movements(user_id, occurred_at desc);
alter table public.account_history add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists account_history_user_date_idx on public.account_history(user_id, created_at desc);
alter table public.payment_requests add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.payment_requests add column if not exists idempotency_key uuid not null default gen_random_uuid();
create unique index if not exists payment_requests_idempotency_idx on public.payment_requests(idempotency_key);
create index if not exists payment_requests_user_date_idx on public.payment_requests(user_id, created_at desc);
create table if not exists public.automation_rules (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, from_account_id uuid not null references public.bank_accounts(id) on delete cascade,
 to_account_id uuid references public.bank_accounts(id) on delete set null, condition jsonb not null default '{}'::jsonb,
 amount_type text not null check(amount_type in ('fixed','percent','all_above')), amount_value numeric not null check(amount_value>=0),
 schedule text, active boolean not null default true, last_run_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.user_groups (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, name text not null, description text, created_at timestamptz not null default now(), unique(owner_id,name));
create table if not exists public.user_group_members (group_id uuid not null references public.user_groups(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, permission text not null default 'viewer' check(permission in ('viewer','reviewer','admin')), created_at timestamptz not null default now(), primary key(group_id,user_id));
create table if not exists public.notification_preferences (user_id uuid primary key references auth.users(id) on delete cascade, email_enabled boolean not null default true, webhook_enabled boolean not null default false, security_alerts boolean not null default true, operations_alerts boolean not null default true, updated_at timestamptz not null default now());
create table if not exists public.webhook_delivery_attempts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, event_id uuid references public.provider_webhook_events(id) on delete set null, target_type text not null check(target_type in ('provider','discord','email','custom')), status text not null default 'pending' check(status in ('pending','delivered','failed')), attempts int not null default 0, last_error text, next_retry_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.audit_logs add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.audit_logs drop constraint if exists audit_logs_severity_check;
alter table public.audit_logs add constraint audit_logs_severity_check check(severity in ('info','success','warning','error','critical'));
create index if not exists audit_logs_user_action_date_idx on public.audit_logs(user_id,action,created_at desc);
alter table public.bank_providers enable row level security; alter table public.automation_rules enable row level security; alter table public.user_groups enable row level security; alter table public.user_group_members enable row level security; alter table public.notification_preferences enable row level security; alter table public.webhook_delivery_attempts enable row level security;
drop policy if exists bank_providers_read on public.bank_providers; create policy bank_providers_read on public.bank_providers for select to authenticated using(active=true);
drop policy if exists own_bank_connections_read on public.bank_connections; create policy own_bank_connections_read on public.bank_connections for select to authenticated using(user_id=(select auth.uid()) or created_by=(select auth.uid()));
drop policy if exists own_bank_accounts_read on public.bank_accounts; create policy own_bank_accounts_read on public.bank_accounts for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists own_transactions_read on public.transactions; create policy own_transactions_read on public.transactions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists own_movements_read on public.account_movements; create policy own_movements_read on public.account_movements for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists own_history_read on public.account_history; create policy own_history_read on public.account_history for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists own_payments_read on public.payment_requests; create policy own_payments_read on public.payment_requests for select to authenticated using(user_id=(select auth.uid()) or requested_by=(select auth.uid()));
drop policy if exists automation_rules_own on public.automation_rules; create policy automation_rules_own on public.automation_rules for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists user_groups_owner on public.user_groups; create policy user_groups_owner on public.user_groups for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists user_group_members_visible on public.user_group_members; create policy user_group_members_visible on public.user_group_members for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.user_groups g where g.id=group_id and g.owner_id=(select auth.uid())));
drop policy if exists notification_preferences_own on public.notification_preferences; create policy notification_preferences_own on public.notification_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists webhook_attempts_own on public.webhook_delivery_attempts; create policy webhook_attempts_own on public.webhook_delivery_attempts for select to authenticated using(user_id=(select auth.uid()));
grant select on public.bank_providers,public.bank_connections,public.bank_accounts,public.transactions,public.account_movements,public.account_history,public.payment_requests to authenticated;
grant select,insert,update,delete on public.automation_rules,public.user_groups,public.notification_preferences to authenticated;
grant select on public.user_group_members,public.webhook_delivery_attempts to authenticated;