// PIVOT send-invoice (v78)
// Sends an invoice email with its PDF from the PIVOT mailbox (info@thepivotstrategy.com) through Microsoft Graph,
// so it lands in that mailbox's Sent Items. Only signed-in team members (people table, active, matching email)
// can send. Records sent_at / reminded_at on the invoice with the sender's own login (audit log shows who).
//
// Secrets (Supabase > Edge Functions > Secrets): MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MAIL_FROM
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const EMAIL = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function toHtml(text: string) {
  const paras = text.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#141414">${paras.join("")}</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const tenant = Deno.env.get("MS_TENANT_ID"), clientId = Deno.env.get("MS_CLIENT_ID");
  const secret = Deno.env.get("MS_CLIENT_SECRET"), from = Deno.env.get("MAIL_FROM");
  if (!tenant || !clientId || !secret || !from) return json(503, { error: "not_configured", message: "Email sending is not connected yet (Microsoft 365 secrets missing)." });

  // who is calling: their own token, so RLS and the audit log apply to them
  const auth = req.headers.get("Authorization") || "";
  const key = Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, key, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  const email = u?.user?.email?.toLowerCase();
  if (!email) return json(401, { error: "Sign in again." });
  const { data: ppl } = await sb.from("people").select("name,email,active");
  const me = (ppl || []).find((p: any) => (p.email || "").toLowerCase() === email && p.active !== false);
  if (!me) return json(403, { error: "Only active team members can send invoices." });

  let b: any;
  try { b = await req.json(); } catch { return json(400, { error: "Bad request" }); }
  const to: string[] = (b.to || []).map((x: string) => String(x).trim()).filter(Boolean);
  const cc: string[] = (b.cc || []).map((x: string) => String(x).trim()).filter(Boolean);
  if (!to.length || [...to, ...cc].some((x) => !EMAIL.test(x)) || to.length + cc.length > 10) return json(400, { error: "Check the email addresses." });
  if (!b.invoice_id || !b.subject || !b.body) return json(400, { error: "Missing invoice, subject or message." });
  if (!b.pdf_base64 || b.pdf_base64.length > 4_000_000) return json(400, { error: "The PDF is missing or too large." });
  const kind = b.kind === "reminder" ? "reminder" : "invoice";

  const { data: inv, error: invErr } = await sb.from("money").select("id,dir,reminders").eq("id", b.invoice_id).maybeSingle();
  if (invErr || !inv || inv.dir !== "Income") return json(404, { error: "Invoice not found." });

  // Microsoft Graph: app token, then sendMail from the PIVOT mailbox
  const tok = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: "client_credentials", scope: "https://graph.microsoft.com/.default" }),
  });
  if (!tok.ok) return json(502, { error: "Microsoft sign-in failed. Check the app secret.", detail: (await tok.text()).slice(0, 300) });
  const { access_token } = await tok.json();

  const message = {
    subject: String(b.subject).slice(0, 250),
    body: { contentType: "HTML", content: toHtml(String(b.body)) },
    toRecipients: to.map((address) => ({ emailAddress: { address } })),
    ccRecipients: cc.map((address) => ({ emailAddress: { address } })),
    attachments: [{ "@odata.type": "#microsoft.graph.fileAttachment", name: String(b.filename || `${b.invoice_id}.pdf`).slice(0, 120), contentType: "application/pdf", contentBytes: b.pdf_base64 }],
  };
  const sent = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (sent.status !== 202) return json(502, { error: "Microsoft 365 refused the email.", detail: (await sent.text()).slice(0, 300) });

  const now = new Date().toISOString();
  const patch = kind === "reminder" ? { reminded_at: now, reminders: (inv.reminders || 0) + 1 } : { sent_at: now, sent_to: to.join(", ") };
  const { error: upErr } = await sb.from("money").update(patch).eq("id", b.invoice_id);
  return json(200, { ok: true, from, kind, recorded: !upErr, by: me.name });
});
