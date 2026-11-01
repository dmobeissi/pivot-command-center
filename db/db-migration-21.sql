-- PIVOT migration 21: security advisor fixes (1 Nov 2026)
-- 1. Trigger functions get a fixed search_path (advisor: function_search_path_mutable).
-- 2. SECURITY DEFINER functions cannot be called through the API (advisor 0028 / 0029). Triggers and event
--    triggers still fire: Postgres checks EXECUTE only when a trigger is created, not when it runs.
-- Safe to re-run.

alter function public.pivot_task_rules() set search_path = public;
alter function public.pivot_money_rules() set search_path = public;
alter function public.touch_updated_at() set search_path = public;

revoke execute on function public.pivot_audit() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
