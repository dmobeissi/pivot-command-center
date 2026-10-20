-- PIVOT migration 09: income type (Retainer vs Project) + retainer cleanup
-- Classifies income and fills each client's monthly retainer from its
-- "support plan" invoices. Safe to re-run.

alter table money add column if not exists income_type text;

-- "support plan" = the monthly retainer
update money set income_type='Retainer'
 where dir='Income' and lower(coalesce(description,'')) like '%support plan%';

-- every other income is a one-off project
update money set income_type='Project'
 where dir='Income' and income_type is null;

-- fill each account's monthly retainer from its latest support-plan invoice
with latest as (
  select acct, abs(amt) AS amt,
         row_number() over (partition by acct order by txn_date desc nulls last) AS rn
    from money
   where dir='Income'
     and lower(coalesce(description,'')) like '%support plan%'
     and acct is not null and acct <> ''
)
update accounts a
   set retainer_fee = latest.amt
  from latest
 where latest.acct = a.id and latest.rn = 1
   and (a.retainer_fee is null or a.retainer_fee = 0);
