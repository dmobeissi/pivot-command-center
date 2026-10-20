-- PIVOT migration 06: services catalogue
-- The list of what PIVOT offers (retainers + project types).
-- Safe to re-run.

create table if not exists services (id text primary key);
alter table services add column if not exists name   text;
alter table services add column if not exists type   text;      -- 'Retainer' | 'Project'
alter table services add column if not exists price  numeric;
alter table services add column if not exists unit   text;      -- '/mo', 'one-off'
alter table services add column if not exists notes  text;
alter table services add column if not exists active boolean default true;

alter table services enable row level security;
drop policy if exists team_all on services;
create policy team_all on services for all to authenticated using (true) with check (true);
