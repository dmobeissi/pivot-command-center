-- PIVOT migration 02: account columns, account hierarchy, payouts as their own type.
-- Run once in the Supabase SQL Editor (paste the whole thing, Run).

-- 1) account columns
alter table accounts add column if not exists country text;
alter table accounts add column if not exists date_added date default current_date;
alter table accounts add column if not exists parent text references accounts(id) on delete set null;
update accounts set date_added = coalesce(date_added, current_date);

-- 2) account hierarchy (parent = the holding account; the parent is also a brand)
insert into accounts (id, brand, type, lifecycle)
  values ('ACC-038','Asnan','Client','Active')
  on conflict (id) do nothing;                                                   -- Asnan had no row yet
update accounts set parent='ACC-038' where id='ACC-033';                         -- BeOrganic   -> Asnan
update accounts set parent='ACC-026' where id='ACC-031';                         -- SPA Corner  -> Medica Energy
update accounts set parent='ACC-017' where id in ('ACC-018','ACC-019','ACC-034');-- Undo, Flash, Waterpik -> UltraMed
update accounts set parent='ACC-016' where id in ('ACC-028','ACC-029');          -- Meso Egypt, PhotonX   -> Weldon Group

-- 3) payouts become their own type (money.dir = 'Payout'), with an optional partner
alter table money add column if not exists partner text;
update money set dir='Payout' where cat='Partner Payout';
