-- PIVOT migration 14: logged (service-month) date on money
-- A retainer invoice covers a month (logged = 1st of that month) but is issued
-- the 1st of the next month and due the 10th. Projects usually have logged =
-- issue date. This records the service month separately from the issue date.
-- Safe to re-run.

alter table money add column if not exists logged date;
