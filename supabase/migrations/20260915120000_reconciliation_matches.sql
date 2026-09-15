create table if not exists public.reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  movement_id uuid not null references public.account_movements(id) on delete cascade,
  matched_by uuid not null default auth.uid() references auth.users(id),
  matched_at timestamptz not null default now(),
  match_type text not null check (match_type in ('automatic','manual')),
  unique (transaction_id, movement_id)
);
alter table public.reconciliation_matches enable row level security;
create policy "reconciliation_matches_select_own" on public.reconciliation_matches for select to authenticated using ((select auth.uid()) = user_id);
create policy "reconciliation_matches_insert_own" on public.reconciliation_matches for insert to authenticated with check ((select auth.uid()) = user_id and (select auth.uid()) = matched_by and exists (select 1 from public.transactions t where t.id=transaction_id and t.user_id=(select auth.uid())) and exists (select 1 from public.account_movements m where m.id=movement_id and m.user_id=(select auth.uid())));
create policy "reconciliation_matches_delete_own" on public.reconciliation_matches for delete to authenticated using ((select auth.uid()) = user_id);
create index reconciliation_matches_user_matched_at_idx on public.reconciliation_matches(user_id, matched_at desc);
create index reconciliation_matches_transaction_id_idx on public.reconciliation_matches(transaction_id);
create index reconciliation_matches_movement_id_idx on public.reconciliation_matches(movement_id);
create index reconciliation_matches_matched_by_idx on public.reconciliation_matches(matched_by);
grant select, insert, delete on public.reconciliation_matches to authenticated;
