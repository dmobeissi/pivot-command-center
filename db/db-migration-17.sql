-- PIVOT migration 17: per-tab serial IDs + service groups and program bundles
--
-- 1. Services get a group (Build / Run / Program) and programs list the Run services they bundle.
-- 2. Services renumber to SVC-0001.. (Build first, then Run, then Programs), deals/projects/program bundles remapped.
-- 3. Ledger renumbers per tab, in issue-date order: INV- (invoices), EXP- (expenses), SAL- (salaries), PYO- (payouts).
--    Invoice numbers (inv_no) become the invoice ID. Activity log entries are remapped to the new IDs.
-- Safe to re-run: each renumber only runs while old-style IDs still exist.

begin;

-- 1. service group + bundle columns
alter table services add column if not exists grp text;       -- 'Build' | 'Run' | 'Program'
alter table services add column if not exists includes text;  -- Program only: comma-separated Run service IDs

update services set grp = case
    when id like 'SVC-B%' then 'Build'
    when id like 'SVC-R%' then 'Run'
    when id like 'SVC-P%' or notes ilike 'Program%' then 'Program'
    when type = 'Project' then 'Build'
    else 'Run' end
where grp is null;

-- programs: read the bundle out of the old note "Program // Ecommerce + Presence"
update services p set includes = (
    select string_agg(r.id, ',' order by r.id) from services r
    where r.grp = 'Run' and r.name is not null and r.name <> ''
      and position(lower(r.name) in lower(split_part(p.notes, '//', 2))) > 0)
where p.grp = 'Program' and (p.includes is null or p.includes = '') and p.notes like '%//%';

-- notes that only repeated the group are now redundant (the bundle now lives in includes)
update services set notes = nullif(trim(split_part(notes, '//', 3)), '')
where grp = 'Program' and includes is not null and includes <> '' and notes ilike 'Program%//%';
update services set notes = nullif(trim(regexp_replace(notes, '^(Build|Run service|Program)\s*(//\s*)?', '', 'i')), '')
where notes ~* '^(Build|Run service|Program)';
update services set notes = upper(left(notes, 1)) || substr(notes, 2) where notes is not null and notes <> '';
update services set type = case when grp = 'Build' then 'Project' else 'Retainer' end;

-- 2. services renumber
do $$
begin
  if exists (select 1 from services where id !~ '^SVC-[0-9]{4}$') then
    create temp table svc_map on commit drop as
      select id as old_id,
             'SVC-' || lpad(row_number() over (
                order by case grp when 'Build' then 1 when 'Run' then 2 else 3 end, id)::text, 4, '0') as new_id
      from services;
    update services set id = 'TMP-' || id;
    update services s set id = m.new_id from svc_map m where s.id = 'TMP-' || m.old_id;
    -- remap bundles, deals, projects, activity
    update services s set includes = (
        select string_agg(coalesce(m.new_id, x), ',' order by coalesce(m.new_id, x))
        from unnest(string_to_array(s.includes, ',')) as x left join svc_map m on m.old_id = trim(x))
      where s.includes is not null and s.includes <> '';
    update deals d set service = m.new_id from svc_map m where d.service = m.old_id;
    update projects p set service = m.new_id from svc_map m where p.service = m.old_id;
    update activity a set doc_id = m.new_id from svc_map m where a.coll = 'services' and a.doc_id = m.old_id;
  end if;
end $$;

-- 3. ledger renumber, one serial per tab, oldest issue date first
do $$
begin
  if exists (select 1 from money where id !~ '^(INV|EXP|SAL|PYO)-[0-9]{4}$') then
    create temp table m_map on commit drop as
      select id as old_id,
             case dir when 'Income' then 'INV-' when 'Expense' then 'EXP-'
                      when 'Salary' then 'SAL-' when 'Payout' then 'PYO-' else 'LDG-' end
             || lpad(row_number() over (partition by dir order by txn_date nulls last, id)::text, 4, '0') as new_id
      from money;
    update money set id = 'TMP-' || id;
    update money m set id = mm.new_id from m_map mm where m.id = 'TMP-' || mm.old_id;
    update money set inv_no = id where dir = 'Income';
    update activity a set doc_id = mm.new_id from m_map mm where a.coll = 'money' and a.doc_id = mm.old_id;
  end if;
end $$;

commit;

-- Checks
select dir, count(*) as rows, min(id) as first_id, max(id) as last_id from money group by dir order by dir;
select id, grp, name, price, includes from services order by id;
