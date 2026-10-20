-- PIVOT migration 03: split Salaries out from Payouts
-- Rule (from you): Payouts = PARTNER PROFIT SPLITS only. Every payment to a
-- person (full-time, part-time, freelance) is a Salary. Partners currently
-- take a fixed monthly salary AND split profits yearly, so the historical
-- monthly partner payments are salaries, not profit splits.

-- 1. add the role column (Full-time / Part-time / Freelance)
alter table money add column if not exists role text;

-- 2. reclassify every people-payment row -> Salary
--    (old Partner Payout = monthly partner salary, Freelancer, old Salary).
--    This empties Payouts; you add real profit-split Payout rows when you
--    actually split profits.
update money set dir='Salary'
where dir='Payout' or cat in ('Partner Payout','Freelancer','Salary');

-- 3. best-effort role tagging so Salaries isn't blank (adjust any in the app)
update money set role='Freelance' where dir='Salary' and cat='Freelancer';
update money set role='Part-time' where dir='Salary' and lower(coalesce(partner,'')) like '%zawar%';
update money set role='Full-time' where dir='Salary' and (lower(coalesce(partner,'')) like '%daoud%' or lower(coalesce(partner,'')) like '%arafa%');
