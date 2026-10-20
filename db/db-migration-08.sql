-- PIVOT migration 08: seed the services catalogue
-- Source: OneDrive 1.1 PIVOT/06 Services (Build + Run deliverables).
-- Prices are quoted per proposal, so left at 0 here. Safe to re-run.

insert into services (id, name, type, price, unit, notes, active) values
  ('SVC-B01','Ecommerce Setup',   'Project', 0, 'one-off', 'Build', true),
  ('SVC-B02','Product Database',  'Project', 0, 'one-off', 'Build', true),
  ('SVC-B03','Mobile App',        'Project', 0, 'one-off', 'Build', true),
  ('SVC-B04','Website Build',     'Project', 0, 'one-off', 'Build', true),
  ('SVC-B05','Custom Development', 'Project', 0, 'one-off', 'Build', true),
  ('SVC-R01','Ecommerce',         'Retainer',0, '/mo', 'Run // in every plan', true),
  ('SVC-R02','Presence',          'Retainer',0, '/mo', 'Run', true),
  ('SVC-R03','CRM Marketing',     'Retainer',0, '/mo', 'Run // Scale plan and above', true),
  ('SVC-R04','Media Buying',      'Retainer',0, '/mo', 'Run // add-on that brings new customers in', true),
  ('SVC-R05','Product Listing',   'Retainer',0, '/mo', 'Run // add-on to any plan', true)
on conflict (id) do nothing;
