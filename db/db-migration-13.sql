-- PIVOT migration 13: safety net — ensure every column the app writes exists.
-- Fixes account saves failing (e.g. country) when an earlier migration did not
-- fully apply. All idempotent. Safe to re-run any time.

-- accounts
alter table accounts add column if not exists brand        text;
alter table accounts add column if not exists type         text;
alter table accounts add column if not exists country      text;
alter table accounts add column if not exists lifecycle    text;
alter table accounts add column if not exists parent       text;
alter table accounts add column if not exists date_added   text;
alter table accounts add column if not exists notes        text;
alter table accounts add column if not exists retainer_fee numeric;
alter table accounts add column if not exists stage        text;
alter table accounts add column if not exists deal_value   numeric;

-- money
alter table money add column if not exists partner     text;
alter table money add column if not exists role        text;
alter table money add column if not exists batch       text;
alter table money add column if not exists tpl         text;
alter table money add column if not exists inv_no      text;
alter table money add column if not exists income_type text;

-- tasks
alter table tasks add column if not exists project text;
alter table tasks add column if not exists parent  text;

-- templates (recurring)
alter table templates add column if not exists kind   text;
alter table templates add column if not exists amt    numeric;
alter table templates add column if not exists cat    text;
alter table templates add column if not exists freq   text;
alter table templates add column if not exists amonth int;
alter table templates add column if not exists since  text;

-- services
alter table services add column if not exists tasks text;
