-- PIVOT migration 16: split-payment invoices + extra client billing fields
-- Projects paid in parts become linked invoices sharing proj_ref, each with
-- its installment number (inst_no of inst_count) and a label. The invoice PDF
-- reads the siblings to print the full payment schedule. Billing fields extend
-- the "Billed To" block on invoices. Safe to re-run.

-- linked installment invoices (on money)
alter table money add column if not exists proj_ref   text;
alter table money add column if not exists inst_no    int;
alter table money add column if not exists inst_count int;
alter table money add column if not exists inst_label text;

-- extra client billing details (on accounts)
alter table accounts add column if not exists bill_company text;
alter table accounts add column if not exists bill_email   text;
alter table accounts add column if not exists bill_reg     text;
