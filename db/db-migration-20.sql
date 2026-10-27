-- PIVOT migration 20: salary split across brands (v74)
--
-- money.alloc: for salary rows, which brands the pay is charged to and how, e.g. 'ACC-032:60|ACC-022:40'
-- (brand ID and percent, separated by |). Empty = the single brand in acct, or, for partners with no client brand,
-- split by the tasks they finished that month. Used only by the estimated profit maths; cash figures do not change.
--
-- Safe to re-run.

alter table money add column if not exists alloc text;

-- Check
select column_name from information_schema.columns where table_name = 'money' and column_name = 'alloc';
