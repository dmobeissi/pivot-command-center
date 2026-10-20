# PIVOT Command Center

Team operations app for PIVOT (tasks, money, clients). Static front-end on GitHub Pages, data in Supabase (Postgres) with per-user login and row-level security.

- `index.html` / `app.js` / `styles.css` — the app
- `config.js` — Supabase project URL + public anon key

The public anon key is safe to expose; data access requires a team login and is enforced by Supabase RLS.
