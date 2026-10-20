-- Run once in Supabase SQL Editor to add Country + Date added to accounts.
alter table accounts add column if not exists country text;
alter table accounts add column if not exists date_added date default current_date;
update accounts set date_added = coalesce(date_added, current_date);
