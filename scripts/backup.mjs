// Nightly Supabase backup. Pulls every table via the REST API (service key,
// bypasses RLS) and writes JSON + per-table CSV into ./backup-output.
// No dependencies: Node 20 global fetch.
import { mkdirSync, writeFileSync } from "node:fs";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"); process.exit(1); }

const TABLES = ["accounts", "engagements", "tasks", "money", "templates", "people", "activity"];
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function fetchAll(table) {
  const rows = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    const to = from + step - 1;
    const res = await fetch(`${URL}/rest/v1/${table}?select=*`, {
      headers: { ...H, Range: `${from}-${to}`, "Range-Unit": "items" },
    });
    if (res.status === 404) { console.warn(`skip ${table} (not found)`); return null; }
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < step) break;
  }
  return rows;
}

function toCSV(rows) {
  if (!rows || !rows.length) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

const out = "backup-output";
mkdirSync(out, { recursive: true });
const dump = { generatedAt: new Date().toISOString(), source: URL, tables: {} };
const counts = {};
for (const t of TABLES) {
  const rows = await fetchAll(t);
  if (rows === null) continue;
  dump.tables[t] = rows;
  counts[t] = rows.length;
  writeFileSync(`${out}/${t}.csv`, toCSV(rows));
}
writeFileSync(`${out}/pivot-backup.json`, JSON.stringify(dump, null, 2));
writeFileSync(`${out}/manifest.json`, JSON.stringify({ generatedAt: dump.generatedAt, counts }, null, 2));
console.log("Backup complete:", JSON.stringify(counts));
