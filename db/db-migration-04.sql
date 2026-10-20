-- PIVOT migration 04: recurring expenses
-- Adds recurring-expense fields to templates, a tpl link on money, and seeds
-- the two Domain/Hosting recurrences (monthly email + yearly domain).

-- 1. template columns for recurring expenses
alter table templates add column if not exists kind   text default 'task';
alter table templates add column if not exists amt    numeric;
alter table templates add column if not exists cat    text;
alter table templates add column if not exists freq   text;
alter table templates add column if not exists amonth int;
alter table templates add column if not exists since  text;
update templates set kind='task' where kind is null;

-- 2. link generated expense lines back to their recurring template
alter table money add column if not exists tpl text;

-- 3. seed the Domain/Hosting recurrences (safe to re-run: skips if already there)
insert into templates (id, kind, name, cat, amt, freq, due_day, amonth, since, active)
select 'TPL-901','expense','Microsoft Email Registration','Domain / Hosting',3.97,'Monthly',28,NULL,'2024-10-01',true
where not exists (select 1 from templates where id='TPL-901');

insert into templates (id, kind, name, cat, amt, freq, due_day, amonth, since, active)
select 'TPL-902','expense','Domain Registration','Domain / Hosting',5.944,'Yearly',6,11,'2024-10-01',true
where not exists (select 1 from templates where id='TPL-902');
