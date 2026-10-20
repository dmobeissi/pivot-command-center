-- PIVOT migration 07: deals (CRM layer)
-- A deal is one opportunity for an account, with its own contract/signature journey.
-- Safe to re-run.

create table if not exists deals (id text primary key);
alter table deals add column if not exists acct          text;
alter table deals add column if not exists service       text;
alter table deals add column if not exists title         text;
alter table deals add column if not exists value         numeric;
alter table deals add column if not exists stage         text;   -- Lead|Proposal|Contract|Signed|Lost
alter table deals add column if not exists contract_date date;
alter table deals add column if not exists signed_date   date;
alter table deals add column if not exists close_date    date;
alter table deals add column if not exists notes         text;

alter table deals enable row level security;
drop policy if exists team_all on deals;
create policy team_all on deals for all to authenticated using (true) with check (true);

-- migrate any pipeline data set directly on accounts into deals (Won -> Signed)
insert into deals (id, acct, title, value, stage)
select 'DEALM-' || lpad((row_number() over (order by id))::text, 3, '0'),
       id, brand || ' deal', coalesce(deal_value, 0),
       case stage when 'Won' then 'Signed' else stage end
  from accounts
 where stage is not null and stage <> ''
on conflict (id) do nothing;
