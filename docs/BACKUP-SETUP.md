# Nightly backup — one-time setup (~10 min)

The app repo is **public**, so backups are pushed to a **separate private repo**.
The backup runs every night at 02:00 Kuwait time and can also be run on demand.

## 1. Create the private backup repo
- GitHub → New repository → name `pivot-backups` → **Private** → Create.
- Leave it empty (no README needed).

## 2. Create a token the Action can push with
- GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
- Repository access: **Only select repositories** → `pivot-backups`.
- Permissions → Repository → **Contents: Read and write**.
- Expiration: 1 year (set a reminder to renew).
- Generate, copy the token (starts with `github_pat_...`).

## 3. Add the secrets to the APP repo
In `pivot-command-center` → Settings → Secrets and variables → **Actions** → New repository secret. Add four:

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://ldsvxbtnetxdxbbztulp.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → **service_role** secret key |
| `BACKUP_REPO` | `dmobeissi/pivot-backups` |
| `BACKUP_TOKEN` | the fine-grained token from step 2 |

> The `service_role` key bypasses row-level security so the backup can read every
> table. It lives only as an encrypted GitHub Actions secret — never in the app.

## 4. Run it once to test
- App repo → **Actions** tab → "Nightly Supabase backup" → **Run workflow**.
- After ~30s it should go green. Open `pivot-backups` — you'll see
  `latest/` and `backups/<today>/` with `pivot-backup.json` + one CSV per table.

## What you get
- Every night, a full snapshot of all tables as JSON + CSV, versioned forever in
  the private repo. `latest/` always holds the newest; `backups/<date>/` keeps history.
- **Restore:** import the CSVs back into Supabase (same order as the first import:
  accounts → engagements → tasks → money), or hand me `pivot-backup.json` and I'll
  rebuild it.
