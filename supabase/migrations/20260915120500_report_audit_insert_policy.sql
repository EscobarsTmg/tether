create policy "audit_logs_insert_report_generated" on public.audit_logs for insert to authenticated with check ((select auth.uid()) = user_id and (select auth.uid()) = actor_id and action = 'report_generated' and severity = 'info' and resource_type = 'report');
grant insert on public.audit_logs to authenticated;
