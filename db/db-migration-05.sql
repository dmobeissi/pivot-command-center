-- PIVOT migration 05: retainers, pipeline, invoice numbers, team
-- Run this once in Supabase SQL Editor. Safe to re-run.

-- 1. Retainers + pipeline (on accounts)
alter table accounts add column if not exists retainer_fee numeric;
alter table accounts add column if not exists stage        text;
alter table accounts add column if not exists deal_value   numeric;

-- 2. Invoice numbers (on money)
alter table money add column if not exists inv_no text;

-- backfill INV-#### for existing invoices, in date order (skip any already set)
with ordered as (
  select id, row_number() over (order by txn_date nulls last, id) AS rn
  from money where dir = 'Income'
)
update money m
   set inv_no = 'INV-' || lpad(ordered.rn::text, 4, '0')
  from ordered
 where ordered.id = m.id
   and (m.inv_no is null or m.inv_no = '');

-- 3. Team (people table)
-- NOTE: this resets the people table to the schema the app expects.
-- Any older people rows (e.g. a legacy emails table) are replaced.
drop table if exists people cascade;
create table people (
  id     text primary key,
  name   text,
  role   text,
  active boolean default true,
  email  text
);
alter table people enable row level security;
drop policy if exists team_all on people;
create policy team_all on people for all to authenticated using (true) with check (true);

insert into people (id, name, role, active) values
  ('PPL-001','Daoud','Partner',   true),
  ('PPL-002','Arafa','Partner',   true),
  ('PPL-003','Zawar','Part-time', true),
  ('PPL-004','Amr','Former',      false),
  ('PPL-005','Maisoun','Former',  false),
  ('PPL-006','Bilal','Former',    false);
