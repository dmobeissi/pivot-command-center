// PIVOT digest: reads Supabase (service key) and writes digest.html — a
// read-only summary of what needs attention. No mutations, no dependencies.
import { writeFileSync } from "node:fs";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL = process.env.APP_URL || "";
if (!URL || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function all(table) {
  const rows = []; const step = 1000;
  for (let from = 0; ; from += step) {
    const res = await fetch(`${URL}/rest/v1/${table}?select=*`, { headers: { ...H, Range: `${from}-${from + step - 1}` } });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const b = await res.json(); rows.push(...b); if (b.length < step) break;
  }
  return rows;
}

const today = new Date().toISOString().slice(0, 10);
const [accounts, money, templates] = await Promise.all([all("accounts"), all("money"), all("templates")]);
const brand = (id) => (accounts.find((a) => a.id === id) || {}).name || id || "—";
const abs = (n) => Math.abs(+n || 0);
const KD = (n) => (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const owed = (m) => m.dir === "Income" && !["Paid", "Voided", "Cancelled"].includes(m.status);
const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// cash on hand = paid in - paid out (expense/salary/payout)
const cashIn = money.filter((m) => m.dir === "Income" && m.status === "Paid").reduce((a, m) => a + (+m.amt || 0), 0);
const cashOut = money.filter((m) => ["Expense", "Salary", "Payout"].includes(m.dir) && m.status === "Paid").reduce((a, m) => a + abs(m.amt), 0);
const cash = cashIn - cashOut;

const ym = today.slice(0, 7);
const collectedM = money.filter((m) => m.dir === "Income" && m.status === "Paid" && (m.paid || m.txn_date || "").slice(0, 7) === ym).reduce((a, m) => a + (+m.amt || 0), 0);
const billedM = money.filter((m) => m.dir === "Income" && !["Voided", "Cancelled"].includes(m.status) && (m.txn_date || "").slice(0, 7) === ym).reduce((a, m) => a + (+m.amt || 0), 0);

const unpaid = money.filter(owed);
const outstanding = unpaid.reduce((a, m) => a + (+m.amt || 0), 0);
const overdue = unpaid.filter((m) => m.due && m.due < today).sort((a, b) => (a.due || "").localeCompare(b.due || ""));

const pendSal = money.filter((m) => m.dir === "Salary" && m.status !== "Paid");
const pendExp = money.filter((m) => m.dir === "Expense" && owedExp(m));
function owedExp(m) { return !["Paid", "Voided", "Cancelled"].includes(m.status); }

// recurring templates whose current period isn't logged yet
const dueRecurring = templates.filter((t) => t.kind === "expense" && t.active !== false).filter((t) => {
  const yearly = t.freq === "Yearly"; const key = yearly ? today.slice(0, 4) : ym; const amt = Math.round(abs(t.amt) * 1000) / 1000;
  return !money.some((m) => m.dir === "Expense" && (m.cat || "") === (t.cat || "") && Math.round(abs(m.amt) * 1000) / 1000 === amt && (m.txn_date || "").slice(0, yearly ? 4 : 7) === key);
});

const money3 = (n) => `KD ${KD(n)}`;
const card = (lab, val, color) => `<td style="padding:0 6px"><div style="border:1px solid #e6e6ea;border-radius:12px;padding:12px 14px"><div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a8d94;font-weight:600">${lab}</div><div style="font-size:20px;font-weight:700;color:${color || "#111"};font-variant-numeric:tabular-nums">${val}</div></div></td>`;
const section = (title, inner) => `<h2 style="font-size:15px;margin:22px 0 8px">${title}</h2>${inner}`;
const rowline = (l, r) => `<tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f2">${l}</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f2;text-align:right;white-space:nowrap">${r}</td></tr>`;

let html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;color:#111">
  <div style="font-size:12px;color:#8a8d94;font-family:ui-monospace,Menlo,monospace">${today}</div>
  <h1 style="font-size:22px;margin:2px 0 14px">PIVOT daily digest</h1>
  <table style="width:100%;border-collapse:separate;border-spacing:0 0"><tr>
    ${card("Cash on hand", money3(cash), cash < 0 ? "#C22A1B" : "#157F3C")}
    ${card("Outstanding", money3(outstanding), "#C22A1B")}
    ${card("Collected (mo)", money3(collectedM), "#157F3C")}
    ${card("Billed (mo)", money3(billedM))}
  </tr></table>`;

if (overdue.length) {
  html += section(`⚠️ Overdue invoices (${overdue.length})`,
    `<table style="width:100%;border-collapse:collapse;font-size:14px">${overdue.slice(0, 12).map((m) =>
      rowline(`${m.description || m.id} <span style="color:#8a8d94">· ${brand(m.acct)}</span>`,
        `<b>KD ${KD(m.amt)}</b> <span style="color:#C22A1B">· ${days(m.due, today)}d</span>`)).join("")}</table>`);
} else {
  html += section("Invoices", `<div style="color:#157F3C;font-size:14px">✓ No overdue invoices.</div>`);
}

if (pendSal.length || pendExp.length) {
  const bits = [];
  if (pendSal.length) bits.push(rowline("Salaries awaiting payment", `<b>KD ${KD(pendSal.reduce((a, m) => a + abs(m.amt), 0))}</b> · ${pendSal.length}`));
  if (pendExp.length) bits.push(rowline("Expenses awaiting payment", `<b>KD ${KD(pendExp.reduce((a, m) => a + abs(m.amt), 0))}</b> · ${pendExp.length}`));
  html += section("Pending to confirm", `<table style="width:100%;border-collapse:collapse;font-size:14px">${bits.join("")}</table>`);
}

if (dueRecurring.length) {
  html += section(`Recurring not yet logged (${dueRecurring.length})`,
    `<table style="width:100%;border-collapse:collapse;font-size:14px">${dueRecurring.map((t) =>
      rowline(`${t.name || t.cat} <span style="color:#8a8d94">· ${t.freq || "Monthly"}</span>`, `KD ${KD(t.amt)}`)).join("")}</table>
    <div style="font-size:12px;color:#8a8d94;margin-top:6px">Open the app → Expenses → Generate due to add these.</div>`);
}

html += `<div style="margin:24px 0 8px">${APP_URL ? `<a href="${APP_URL}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9px;font-size:14px;font-weight:600">Open PIVOT Command Center</a>` : ""}</div>
  <div style="font-size:11px;color:#b5b7bd;margin-top:18px">Automated digest · read-only snapshot · nothing was changed.</div></div>`;

writeFileSync("digest.html", html);
console.log("Digest built:", JSON.stringify({ overdue: overdue.length, pendSal: pendSal.length, pendExp: pendExp.length, dueRecurring: dueRecurring.length, cash: Math.round(cash) }));
