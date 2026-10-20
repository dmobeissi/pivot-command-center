# PIVOT Command Center — Agency OS Roadmap

A study of what a real agency operating system needs, benchmarked against what
agencies actually use, and turned into a prioritised build order for PIVOT.
Written for a 3-person agency (Daoud, Zawar, Arafa) doing retainers, digital
marketing, and Shopify/eCommerce builds, working with outside partners.

---

## 1. Where PIVOT stands today

The app already covers the operational core most small agencies struggle to get
into one place:

- Tasks (with owners, priority, status, due/done, recurring retainer tasks)
- Money: invoices and expenses, with statuses (Paid/Partial/Unpaid/Voided/Cancelled)
- Accounts/brands with lifecycle (Lead -> Active -> Churned/Lost)
- Engagements (service lines with a value)
- Dashboards (Tasks + Money overviews with date ranges and comparison)
- Per-person digest, activity log, reports, client-safe CSV export
- Real database (Supabase), hosted app, team logins

That is already further than most agencies at this size, who run on
spreadsheets + ClickUp + WhatsApp. The job now is to add the few things that
turn a tracker into an operating system: a client-to-brand structure, the money
truth per client, and the one metric agencies live or die on (time -> rate).

## 2. The agency-OS reference model

The standard module set agency platforms (Scoro, Productive, Teamwork, Accelo)
converge on:

| Module | What it does | PIVOT status |
|---|---|---|
| CRM / pipeline | Leads -> proposal -> won, deal value | Partial (lifecycle only) |
| Quoting / proposals | Scope + price, convert to project | Partial (engagement value) |
| Project / task mgmt | Work breakdown, status | Have |
| Time tracking | Hours per task/client | Missing (biggest gap) |
| Capacity / workload | Who is over/under booked | Missing |
| Retainers | Monthly hours/budget, burn, rollover | Partial (recurring tasks only) |
| Billing / invoicing | Issue, track, chase, recurring | Have (invoicing), partial (chasing) |
| Profitability | Margin per client/project | Missing (data exists, no view) |
| Expense / payouts | Bills, partner/freelancer payouts | Have (as expenses) |
| Reporting / KPIs | Utilisation, revenue, AR | Partial |
| Client portal | Share status/reports with clients | Missing |
| Multi-entity / currency | KD today; fine for now | N/A |

The two biggest value gaps for PIVOT specifically: **profitability per client**
(the data is already in `money`, it just needs a view) and **time tracking**
(without it you cannot know your real hourly rate or whether a retainer is
profitable).

## 3. Operating principle worth baking in

Agencies that plan to ~80% utilisation, not 100%, make more money, because the
spare 20% absorbs revisions and rush jobs that otherwise blow up timelines and
margins. Any capacity/workload view we build should flag at 80%, not 100%.

## 4. Recommended build order

### Phase 1 — Finish the money truth (highest value, data already exists)
1. **Account -> Brand hierarchy** (your #5). One client company can hold several
   brands; tasks and money attach to a brand; reporting rolls up to the account.
   Recommended low-friction model: keep your 37 current rows as **brands**, add an
   optional `parent_account` so only the few that genuinely group (e.g. a holding
   company with two brands) roll up. No disruptive restructure.
2. **Profitability per client/brand.** Revenue (paid + outstanding) minus expenses
   and partner payouts tagged to that brand = gross margin. One new panel. This is
   the single most useful number you do not have yet.
3. **AR aging + collections.** Bucket unpaid invoices 0-30 / 31-60 / 60+ days, show
   Days Sales Outstanding, and a one-click "chase" that logs the follow-up. You
   already flag overdue; this makes cash collection a routine.
4. **Partner/freelancer payouts module.** You already log these as expenses; give
   them their own view: per partner, per project, owed vs paid. You pay Zawar and
   others per project, so this matters for true margin.

### Phase 2 — The metric agencies run on
5. **Lightweight time tracking.** One number of hours per task (optional, not a
   timesheet bureaucracy for 3 people). Unlocks: effective hourly rate (revenue /
   hours), retainer burn (hours used vs budget), and "is this client worth it."
6. **Retainer budgets.** Per retainer, a monthly hours or KD budget, burn bar, and
   rollover. Turns your recurring tasks into real retainer management.
7. **Capacity view.** Simple per-person load for the week, flagged at 80%.

### Phase 3 — Growth and clients
8. **Pipeline/CRM.** A lead -> proposal -> won board with deal value and win rate.
   You have the lifecycle; this makes new business visible.
9. **Proposals/quotes.** Build a scope + price, convert a won proposal into an
   engagement + first invoice. Removes double entry.
10. **Client portal (read-only).** Share a brand's task status + monthly report
    via a link, so you stop sending screenshots.

### Phase 4 — Automation (GitHub Actions, free, reaches Supabase)
11. Nightly backup to a private repo (versioned forever).
12. Morning digest email (rebuilt on the new stack).
13. Monthly: auto-generate retainer tasks AND draft retainer invoices.
14. Overdue-invoice reminders.

## 5. KPIs to add (once time tracking is in)

- Billable utilisation = billable hours / available hours (target ~80%)
- Effective hourly rate = revenue / hours worked (per client, per service)
- Gross margin per client/brand = revenue - expenses - payouts
- Retainer burn = hours or KD used vs monthly budget
- AR aging + DSO
- Revenue concentration = % of revenue from the top client (risk flag)
- Win rate = won / total proposals

## 6. What NOT to build (honest scope control)

- Do not rebuild full project management. ClickUp already exists in your stack and
  does Gantt, dependencies, subtasks. Keep PIVOT's tasks lightweight. PIVOT's
  edge is the unified **client + money + margin** view ClickUp cannot give.
- Do not turn time tracking into a strict timesheet for 3 people. One optional
  number per task is enough to get the rate math.
- Do not build multi-currency or multi-entity until you actually operate in more
  than KD / one entity.
- Phase it. The money truth (Phase 1) pays for itself before you touch Phase 3.

## 7. Immediate recommendation

Do **Phase 1** next, in order. It is mostly views on data you already hold, it
answers the questions you cannot answer today (which clients make money, who owes
you, what you owe partners), and it is lower risk than time tracking. Phase 1
also forces the account/brand decision, which everything else depends on.

For the account/brand split I need one input from you: a list of which of your
current brands belong under a shared parent company (if any). Most are probably
standalone; only group the real cases.

---

### Sources
- [Scoro — agency management software (module list)](https://www.scoro.com/industries/agency-management-software)
- [Pilot — utilization rate for agencies (80% target principle)](https://pilot.com/blog/utilization-rate-for-agencies)
- [Productive — Scoro vs Accelo vs Productive (feature categories)](https://productive.io/blog/scoro-vs-accelo/)
- [Toggl — agency workload management](https://toggl.com/content-hub/agency/workload-management)
- [SmartTask — best agency management software 2025](https://www.smarttask.io/blog/best-agency-management-software)
