-- PIVOT migration 10: projects + subtasks + service checklists
-- A project groups the work for a client engagement; a signed deal deploys one
-- with its tasks. Tasks can belong to a project and have a parent (subtask).
-- Safe to re-run.

create table if not exists projects (id text primary key);
alter table projects add column if not exists acct       text;
alter table projects add column if not exists deal       text;
alter table projects add column if not exists service    text;
alter table projects add column if not exists name       text;
alter table projects add column if not exists status     text;   -- Planned|Active|On Hold|Done
alter table projects add column if not exists start_date date;
alter table projects add column if not exists due_date   date;
alter table projects add column if not exists notes      text;

alter table projects enable row level security;
drop policy if exists team_all on projects;
create policy team_all on projects for all to authenticated using (true) with check (true);

-- link tasks to a project and allow subtasks (parent task)
alter table tasks add column if not exists project text;
alter table tasks add column if not exists parent  text;

-- a service's default task checklist (one task per line), deployed with a project
alter table services add column if not exists tasks text;
