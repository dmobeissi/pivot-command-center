-- PIVOT migration 08: seed the services catalogue
-- Source: OneDrive 1.1 PIVOT/06 Services + prices supplied by Daoud.
-- Safe to re-run (updates prices/notes on existing rows).

insert into services (id, name, type, price, unit, notes, active) values
  -- Build (one-off projects)
  ('SVC-B01','Ecommerce Setup',   'Project', 950, 'one-off', 'Build', true),
  ('SVC-B02','Product Database',  'Project', 0,   'per product', 'Build // priced per product', true),
  ('SVC-B03','Mobile App',        'Project', 300, 'one-off', 'Build', true),
  ('SVC-B04','Website Build',     'Project', 450, 'one-off', 'Build', true),
  ('SVC-B05','Custom Development', 'Project', 0,   'quoted', 'Build // price varies', true),
  -- Run services (monthly components)
  ('SVC-R01','Ecommerce',         'Retainer', 400, '/mo', 'Run service', true),
  ('SVC-R02','Presence',          'Retainer', 300, '/mo', 'Run service', true),
  ('SVC-R03','CRM Marketing',     'Retainer', 350, '/mo', 'Run service', true),
  ('SVC-R04','Media Buying',      'Retainer', 450, '/mo', 'Run service', true),
  ('SVC-R05','Product Listing',   'Retainer', 0,   'per product', 'Run service // priced per product', true),
  -- Run programs (the bundles clients subscribe to)
  ('SVC-P01','Core',   'Retainer', 400,  '/mo', 'Program // Ecommerce', true),
  ('SVC-P02','Growth', 'Retainer', 650,  '/mo', 'Program // Ecommerce + Presence', true),
  ('SVC-P03','Scale',  'Retainer', 950,  '/mo', 'Program // Ecommerce + Presence + CRM Marketing', true),
  ('SVC-P04','Engine', 'Retainer', 1350, '/mo', 'Program // Ecommerce + Presence + CRM Marketing + Media Buying', true)
on conflict (id) do update set
  name=excluded.name, type=excluded.type, price=excluded.price,
  unit=excluded.unit, notes=excluded.notes, active=excluded.active;
