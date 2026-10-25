-- PIVOT migration 15: client billing details on accounts
-- These feed the invoice PDF "Billed To" block. Country already exists on
-- accounts; these add the street address, billing contact, and phone so a
-- generated invoice carries the real client address instead of a blank.
-- Safe to re-run.

alter table accounts add column if not exists bill_addr text;
alter table accounts add column if not exists bill_attn text;
alter table accounts add column if not exists bill_tel  text;
