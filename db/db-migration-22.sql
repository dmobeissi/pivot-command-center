-- PIVOT migration 22: invoice emails (v78)
-- Records when an invoice was emailed and reminded, and to whom. Written by the send-invoice edge function
-- with the sender's own login, so the audit log shows who sent it.
-- Safe to re-run.

alter table money add column if not exists sent_at timestamptz;
alter table money add column if not exists sent_to text;
alter table money add column if not exists reminded_at timestamptz;
alter table money add column if not exists reminders integer not null default 0;
