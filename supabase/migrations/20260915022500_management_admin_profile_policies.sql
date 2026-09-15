drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated using (public.current_user_role()='admin'::public.app_role) with check (role in ('admin'::public.app_role,'reviewer'::public.app_role,'viewer'::public.app_role));
drop policy if exists audit_logs_insert_user_role_changed on public.audit_logs;
create policy audit_logs_insert_user_role_changed on public.audit_logs for insert to authenticated with check ((select auth.uid())=user_id and (select auth.uid())=actor_id and public.current_user_role()='admin'::public.app_role and action='user_role_changed' and severity='info' and resource_type='profile');
