-- PIVOT migration 19: business fields (v73)
--
-- 1. accounts.program: the retainer program (a Program service ID, e.g. SVC-0012) the client is on.
-- 2. accounts.next_step / next_date: the next sales or account action, used by the Leads panel on Home.
-- 3. app_settings: small key/value settings shared by the team (bank details printed on invoices).
--
-- Safe to re-run. Adds columns and one table; changes no existing values.

begin;

alter table accounts add column if not exists program text;
alter table accounts add column if not exists next_step text;
alter table accounts add column if not exists next_date date;

create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
drop policy if exists team_all on app_settings;
create policy team_all on app_settings for all to authenticated using (true) with check (true);
grant select, insert, update, delete on app_settings to authenticated;

-- audit changes to settings too, if migration 18 has run
do $$ begin
  if exists (select 1 from pg_proc where proname = 'pivot_audit') then
    drop trigger if exists audit_settings on app_settings;
    create trigger audit_settings after insert or update or delete on app_settings for each row execute function pivot_audit();
  end if;
end $$;

commit;

-- Check
select column_name from information_schema.columns where table_name = 'accounts' and column_name in ('program','next_step','next_date') order by 1;
