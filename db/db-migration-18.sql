-- PIVOT migration 18: database safeguards (v72)
--
-- 1. Allowed values and signs are enforced by the database, not only by the app
--    (statuses, priorities, lifecycles, money types, amount sign per type, ID formats, Paid needs a paid date).
-- 2. The same save rules the app applies also apply to SQL edits and imports:
--    a Done task with a done date and no due date gets due = done; a Paid money row with no paid date gets today (Kuwait).
-- 3. audit_log: every insert, update and delete on the main tables is recorded by the database with the signed-in
--    user's email. Nobody can edit or delete it from the app.
-- 4. Soft delete: deleted_at / deleted_by on tasks, money, accounts, services, templates. The app moves deleted rows
--    to Settings > Trash instead of erasing them.
-- 5. Paid money rows cannot be deleted or moved to Trash (set them to Cancelled instead).
-- 6. "Cancelled" becomes a task status (closed, not counted as open work).
--
-- Safe to re-run. Existing data was checked against every rule on 27 Oct 2026 (0 violations).

begin;

-- 4. soft delete columns (first, so the checks below can reference them)
alter table tasks     add column if not exists deleted_at timestamptz, add column if not exists deleted_by text;
alter table money     add column if not exists deleted_at timestamptz, add column if not exists deleted_by text;
alter table accounts  add column if not exists deleted_at timestamptz, add column if not exists deleted_by text;
alter table services  add column if not exists deleted_at timestamptz, add column if not exists deleted_by text;
alter table templates add column if not exists deleted_at timestamptz, add column if not exists deleted_by text;

-- 1. checks (drop and recreate so a re-run picks up any change)
alter table tasks drop constraint if exists tasks_status_ok;
alter table tasks add constraint tasks_status_ok check (status in ('To Do','In Progress','Review','Done','On Hold','Cancelled'));
alter table tasks drop constraint if exists tasks_priority_ok;
alter table tasks add constraint tasks_priority_ok check (priority is null or priority in ('High','Medium','Low'));
alter table tasks drop constraint if exists tasks_id_ok;
alter table tasks add constraint tasks_id_ok check (id ~ '^TSK-[0-9]{4,}$');

alter table money drop constraint if exists money_dir_ok;
alter table money add constraint money_dir_ok check (dir in ('Income','Expense','Salary','Payout'));
alter table money drop constraint if exists money_status_ok;
alter table money add constraint money_status_ok check (status in ('Paid','Partial','Unpaid','Pending','Voided','Cancelled'));
alter table money drop constraint if exists money_sign_ok;
alter table money add constraint money_sign_ok check ((dir = 'Income' and amt >= 0) or (dir <> 'Income' and amt <= 0));
alter table money drop constraint if exists money_id_ok;
alter table money add constraint money_id_ok check (
  (dir = 'Income'  and id ~ '^INV-[0-9]{4,}$') or (dir = 'Expense' and id ~ '^EXP-[0-9]{4,}$') or
  (dir = 'Salary'  and id ~ '^SAL-[0-9]{4,}$') or (dir = 'Payout'  and id ~ '^PYO-[0-9]{4,}$'));
alter table money drop constraint if exists money_paid_date_ok;
alter table money add constraint money_paid_date_ok check (status <> 'Paid' or paid is not null);
alter table money drop constraint if exists money_paid_not_trashed;
alter table money add constraint money_paid_not_trashed check (not (status = 'Paid' and deleted_at is not null));

alter table accounts drop constraint if exists accounts_lifecycle_ok;
alter table accounts add constraint accounts_lifecycle_ok check (lifecycle is null or lifecycle in ('Lead','Active','Paused','Churned','Lost','Internal'));
alter table accounts drop constraint if exists accounts_id_ok;
alter table accounts add constraint accounts_id_ok check (id ~ '^ACC-[0-9]{3,}$');

-- 2. save rules in the database
create or replace function pivot_task_rules() returns trigger language plpgsql as $$
begin
  if new.status = 'Done' and new.due is null and new.done is not null then new.due := new.done; end if;
  return new;
end $$;
drop trigger if exists task_rules on tasks;
create trigger task_rules before insert or update on tasks for each row execute function pivot_task_rules();

create or replace function pivot_money_rules() returns trigger language plpgsql as $$
begin
  if new.status = 'Paid' and new.paid is null then new.paid := (now() at time zone 'Asia/Kuwait')::date; end if;
  return new;
end $$;
drop trigger if exists money_rules on money;
create trigger money_rules before insert or update on money for each row execute function pivot_money_rules();

-- 3. audit log, written only by the database
create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text,
  op text not null,          -- added / edited / deleted / trashed / restored
  tbl text not null,
  row_id text,
  label text,
  changes jsonb
);
create index if not exists audit_log_at on audit_log (at desc);
alter table audit_log enable row level security;
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select to authenticated using (true);
grant select on audit_log to authenticated;
-- no insert, update or delete policy: the app cannot write, edit or erase it; only the trigger below can (security definer)

create or replace function pivot_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare
  who text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', current_user);
  o jsonb; n jsonb; diff jsonb := '{}'::jsonb; k text; act text; lbl text;
begin
  if tg_op = 'INSERT' then
    n := to_jsonb(new); act := 'added';
  elsif tg_op = 'DELETE' then
    o := to_jsonb(old); act := 'deleted';
  else
    o := to_jsonb(old); n := to_jsonb(new); act := 'edited';
    for k in select jsonb_object_keys(n) loop
      if k not in ('created_at') and (o -> k) is distinct from (n -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_array(o -> k, n -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;
    if (o ->> 'deleted_at') is null and (n ->> 'deleted_at') is not null then act := 'trashed';
    elsif (o ->> 'deleted_at') is not null and (n ->> 'deleted_at') is null then act := 'restored'; end if;
  end if;
  lbl := coalesce(n ->> 'name', n ->> 'description', n ->> 'brand', o ->> 'name', o ->> 'description', o ->> 'brand');
  insert into audit_log (actor, op, tbl, row_id, label, changes)
  values (who, act, tg_table_name, coalesce(n ->> 'id', o ->> 'id', n ->> 'key', o ->> 'key'), lbl,
          case when tg_op = 'UPDATE' then diff when tg_op = 'INSERT' then n else o end);
  return coalesce(new, old);
end $$;

drop trigger if exists audit_tasks on tasks;         create trigger audit_tasks after insert or update or delete on tasks for each row execute function pivot_audit();
drop trigger if exists audit_money on money;         create trigger audit_money after insert or update or delete on money for each row execute function pivot_audit();
drop trigger if exists audit_accounts on accounts;   create trigger audit_accounts after insert or update or delete on accounts for each row execute function pivot_audit();
drop trigger if exists audit_services on services;   create trigger audit_services after insert or update or delete on services for each row execute function pivot_audit();
drop trigger if exists audit_templates on templates; create trigger audit_templates after insert or update or delete on templates for each row execute function pivot_audit();
drop trigger if exists audit_people on people;       create trigger audit_people after insert or update or delete on people for each row execute function pivot_audit();

-- 5. Paid money rows cannot be deleted (restrictive: applies on top of team_all)
drop policy if exists money_no_delete_paid on money;
create policy money_no_delete_paid on money as restrictive for delete to authenticated using (status <> 'Paid');

commit;

-- Checks: audit_rows_so_far = 0, then 11 rule names listed
select count(*) as audit_rows_so_far from audit_log;
select conname from pg_constraint where conname like any (array['tasks_%_ok','money_%_ok','accounts_%_ok','money_paid_not_trashed']) order by 1;
