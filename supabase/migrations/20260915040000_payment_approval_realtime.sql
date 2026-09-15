create or replace function public.current_ops_role() returns text
language sql stable security invoker set search_path=public as $$
  select role from public.profiles where id=auth.uid()
$$;

drop policy if exists ops_update_payments on public.payment_requests;
create policy ops_update_payments on public.payment_requests
for update to authenticated
using (public.current_ops_role() in ('admin','reviewer'))
with check (public.current_ops_role() in ('admin','reviewer'));

do $$ begin
  alter publication supabase_realtime add table public.payment_requests;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.audit_logs;
exception when duplicate_object then null; end $$;
