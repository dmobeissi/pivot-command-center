"""
Behaviour checks for data rules (v68).

  - every data table opens sorted by ID descending (newest first)
  - a Done task with a done date and no due date is saved with due = done
    (inline status change, popup edit, new task popup); Done with no done date is still allowed
  - a task that is not Done is never given a due date by the rule
  - v69: "today" is the local date (checked at 00:30 Kuwait time, when UTC is still yesterday)
  - v69: a failed save puts the stored value back on screen
  - v69: retainer badge reads the service month; MTD compares with the same days last month
  - v69: My Tasks defaults to the signed-in person; Accounts hides Lost and Churned by default
  - v70: Paid money rows always get a paid date; a duplicate-ID insert is renumbered and retried;
         CSV cells that look like formulas are neutralized while numbers stay numbers; no "247% collected"
  - v71: sticky table headers; tasks open by default and paged at 100; money tables read-only except status;
         phone rows render as labelled cards; dates read "28 Oct 2026"
  - v72: Cancelled tasks are closed; Paid money cannot be deleted; before migration 18 deletes are hard deletes,
         after it they go to Trash (restore works); Activity reads the database audit log with local times
  - v73: estimated salary allocation adds up; business health; payment details on the PDF; reminder; account
         program and next step only once migration 19 columns exist; Home My work and Leads panels
  - v74: table pages fit the window (no page scroll, nothing cut off) and the wheel scrolls the table from anywhere;
         salaries are charged to their brand or split (migration 20), partners on the internal account by tasks
  - v75: profit is read per client group (children billed through the parent); group totals equal brand totals;
         choosing a program does not overwrite a fee already set

Usage: python tests/rules_check.py /path/to/pivot-backup.json   (client data is never committed)
"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import smoke
from playwright.sync_api import sync_playwright

TABLES = {"tasks": "tasks", "invoices": "invoices", "expenses": "expenses", "accounts": "accounts", "services": "svc_build"}

def main(seed_path):
    seed = json.load(open(seed_path)); seed = seed.get("tables", seed)
    srv = smoke.serve(); url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
    fails = []
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1280, "height": 900})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.add_init_script("window.__SEED=" + json.dumps(seed) + ";")
        pg.route("**/supabase.min.js", lambda r: r.fulfill(body=smoke.MOCK, content_type="application/javascript"))
        pg.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
        pg.goto(url); pg.wait_for_function("booted && ready()")
        # 1. default sort: first column ID cells descending
        for view, tbl in TABLES.items():
            pg.evaluate(f"state.view='{view}';render()"); pg.wait_for_timeout(150)
            ids = pg.evaluate(f"""[...document.querySelectorAll('{'[data-tbl="'+tbl+'"] ' if view=='services' else ''}tbody tr')]
                .map(r=>{{const c=r.querySelector('.id');return c?(c.value||c.textContent).trim():''}}).filter(Boolean)""")
            nums = [int(''.join(ch for ch in i if ch.isdigit()) or 0) for i in ids]
            if len(nums) < 2 or nums != sorted(nums, reverse=True): fails.append(f"{view}: not ID descending ({ids[:4]})")
        # 2. due = done rule
        t = pg.evaluate("store.tasks.find(t=>t.status!=='Done'&&!t.due&&!t.done)")
        if not t: fails.append("no open task without due/done in seed")
        else:
            pg.evaluate(f"""(async()=>{{window.__writes.length=0;await write('tasks','{t['id']}',{{status:'Done',done:'2026-10-20'}});}})()""")
            w = pg.evaluate("window.__writes.slice(-1)[0].row")
            if w.get("due") != "2026-10-20": fails.append(f"inline Done: due not set to done ({w})")
            pg.evaluate(f"""(async()=>{{await write('tasks','{t['id']}',{{status:'In Progress',done:null,due:null}});}})()""")
            w = pg.evaluate("window.__writes.slice(-1)[0].row")
            if w.get("due"): fails.append(f"not Done: due should stay empty ({w})")
            pg.evaluate(f"""(async()=>{{await write('tasks','{t['id']}',{{status:'Done'}});}})()""")
            w = pg.evaluate("window.__writes.slice(-1)[0].row")
            if "due" in w: fails.append(f"Done with no done date: due should not be invented ({w})")
        d = pg.evaluate("store.tasks.find(t=>t.status==='Done'&&t.due&&t.done&&t.due!==t.done)")
        if d:
            pg.evaluate(f"""(async()=>{{await write('tasks','{d['id']}',{{notes:'x'}});}})()""")
            w = pg.evaluate("window.__writes.slice(-1)[0].row")
            if "due" in w: fails.append(f"existing due overwritten ({w})")
        # new task popup
        pg.evaluate("openTaskNew()"); pg.fill("#mk_name", "Rule check"); pg.select_option("#mk_status", "Done")
        pg.click("#mkSave"); pg.wait_for_timeout(200)
        w = pg.evaluate("window.__writes.filter(x=>x.op==='insert'&&x.table==='tasks').slice(-1)[0]")
        if not w or not w["row"].get("due") or w["row"]["due"] != w["row"].get("done"): fails.append(f"new Done task: due != done ({w})")
        # v69: failed save reverts
        pg.evaluate("state.view='tasks';render()"); pg.wait_for_timeout(150)
        tid = pg.evaluate("document.querySelector('#view tbody select[data-f=priority]').dataset.id")
        old = pg.evaluate(f"store.tasks.find(t=>t.id==='{tid}').name")
        pg.evaluate("window.__realFrom=sb.from;sb.from=(t)=>{const q=window.__realFrom(t);const u=q.update;q.update=(o)=>{u(o);return {eq:async()=>({error:{message:'network down'}})}};return q;}")
        pg.evaluate(f"write('tasks','{tid}',{{name:'CHANGED'}})"); pg.wait_for_timeout(300)
        if pg.evaluate(f"store.tasks.find(t=>t.id==='{tid}').name") != old: fails.append("failed save changed local data")
        if pg.evaluate("[...document.querySelectorAll('input,a,button')].some(e=>(e.value||e.textContent)==='CHANGED')"): fails.append("failed save still shows the new value")
        if "Click to dismiss" not in pg.inner_text("#toast"): fails.append("failed save toast is not sticky")
        # the way a user hits it: change a priority in the table while the save fails
        oldp = pg.evaluate(f"store.tasks.find(t=>t.id==='{tid}').priority||'Medium'")
        newp = "Low" if oldp != "Low" else "High"
        sel = f"#view select[data-id='{tid}'][data-f=priority]"
        pg.evaluate(f"(()=>{{const e=document.querySelector(\"{sel}\");e.value='{newp}';e.dispatchEvent(new Event('change',{{bubbles:true}}));}})()")
        pg.wait_for_timeout(400)
        if pg.evaluate(f"document.querySelector(\"{sel}\").value") != oldp: fails.append("failed save leaves the new priority on screen")
        pg.evaluate("sb.from=window.__realFrom")
        # retainer badge
        pg.evaluate("state.view='retainers';render()"); pg.wait_for_timeout(150)
        if "not invoiced" in pg.inner_text("#view").lower(): fails.append("retainer badge still uses issue month")
        # MTD comparison
        pg.evaluate("state.range={preset:'mtd',from:'',to:''};state.cmp='prev_period'")
        c = pg.evaluate("(()=>{const R=activeRange();return [R.from,cmpRange(R.from,R.to)]})()")
        if c[1]["from"][8:] != "01": fails.append(f"MTD previous period does not start on the 1st ({c})")
        # My Tasks default
        pg.evaluate("state.me='';state.view='mytasks';render()"); pg.wait_for_timeout(150)
        if "Pick your name" in pg.inner_text("#view"): fails.append("My Tasks does not default to the signed-in person")
        # Accounts default filter
        pg.evaluate("state.view='accounts';render()"); pg.wait_for_timeout(150)
        if pg.evaluate("[...document.querySelectorAll('#view tbody select[data-f=lifecycle]')].some(e=>/Lost|Churned/.test(e.value))"): fails.append("Accounts shows Lost/Churned by default")
        pg.evaluate("F.status='Lost';render()"); pg.wait_for_timeout(150)
        if not pg.evaluate("document.querySelectorAll('#view tbody tr').length"): fails.append("picking Lifecycle = Lost shows nothing")
        pg.evaluate("F.status='';render()")
        # v70: Paid gets a paid date
        inv = pg.evaluate("store.money.find(m=>m.dir==='Income'&&m.status==='Unpaid').id")
        pg.evaluate(f"(async()=>{{window.__writes.length=0;await write('money','{inv}',{{status:'Paid'}});}})()"); pg.wait_for_timeout(200)
        w = pg.evaluate("window.__writes.slice(-1)[0].row")
        if not w.get("paid"): fails.append(f"Paid without a paid date ({w})")
        pg.evaluate(f"(async()=>{{await write('money','{inv}',{{status:'Paid',paid:'2026-10-01'}});}})()"); pg.wait_for_timeout(200)
        if pg.evaluate("window.__writes.slice(-1)[0].row.paid") != "2026-10-01": fails.append("given paid date overwritten")
        # v70: duplicate key on insert is renumbered and retried once
        pg.evaluate("""window.__realFrom2=sb.from;window.__dupOnce=true;sb.from=(t)=>{const q=window.__realFrom2(t);const ins=q.insert;q.insert=(o)=>{if(window.__dupOnce){window.__dupOnce=false;return {then:(r)=>Promise.resolve({error:{code:'23505',message:'duplicate key value'}}).then(r)}};return ins(o);};return q;}""")
        nid = pg.evaluate("nextId('tasks','TSK-',4)")
        pg.evaluate(f"""(async()=>{{store.tasks=store.tasks.filter(t=>t.id!=='{nid}');await create('tasks','{nid}',{{name:'Dup test',status:'To Do',acct:'',owner:'',priority:'Medium'}});}})()"""); pg.wait_for_timeout(400)
        pg.evaluate("sb.from=window.__realFrom2")
        w = pg.evaluate("window.__writes.filter(x=>x.op==='insert'&&x.table==='tasks').slice(-1)[0]")
        if not w or w["row"]["name"] != "Dup test": fails.append("duplicate-key insert was not retried")
        # v70: CSV formula guard
        c = pg.evaluate("[csvCell('=HYPERLINK(1)'),csvCell('-100.5'),csvCell('+cmd'),csvCell('Plain')]")
        if c != ["'=HYPERLINK(1)", "-100.5", "'+cmd", "Plain"]: fails.append(f"CSV guard wrong {c}")
        # v70: no percentage above 100
        pg.evaluate("state.view='moneydash';render()"); pg.wait_for_timeout(200)
        import re as _re
        if any(int(x) > 100 for x in _re.findall(r"(\d+)% (?:collected|paid)", pg.inner_text("#view"))): fails.append("dashboard still shows a percentage above 100")
        # v71: sticky header inside the table card
        pg.evaluate("F.quick='';state.view='tasks';render()"); pg.wait_for_timeout(250)
        st = pg.evaluate("(()=>{const w=document.querySelector('#view .tablewrap');w.scrollTop=600;const th=w.querySelector('thead th');return [w.scrollTop, Math.round(th.getBoundingClientRect().top-w.getBoundingClientRect().top)]})()")
        if st[0] < 100 or abs(st[1]) > 2: fails.append(f"table header not sticky (scrollTop, offset) = {st}")
        rows = pg.evaluate("document.querySelectorAll('#view tbody tr').length")
        if rows != 100: fails.append(f"tasks not paged at 100 ({rows})")
        if pg.query_selector("#tMore"):
            pg.click("#tMore"); pg.wait_for_timeout(250)
            if pg.evaluate("document.querySelectorAll('#view tbody tr').length") != 200: fails.append("Show 100 more does not add rows")
        else: fails.append("no Show 100 more button")
        pg.evaluate("F.quick='open';state.tSig=null;render()"); pg.wait_for_timeout(200)
        # v71: money tables read-only except status
        for v in ("invoices", "expenses"):
            pg.evaluate(f"state.view='{v}';render()"); pg.wait_for_timeout(200)
            bad = pg.evaluate("[...document.querySelectorAll('#view tbody .edit')].filter(e=>e.dataset.f!=='status').length")
            if bad: fails.append(f"{v}: {bad} inline editable fields besides status")
            if pg.evaluate("/\\d{4}-\\d{2}-\\d{2}/.test(document.querySelector('#view tbody').innerText)"): fails.append(f"{v}: ISO dates still shown")
        # v71: phone cards
        pp = b.new_page(viewport={"width": 390, "height": 800})
        pp.add_init_script("window.__SEED=" + json.dumps(seed) + ";")
        pp.route("**/supabase.min.js", lambda r: r.fulfill(body=smoke.MOCK, content_type="application/javascript"))
        pp.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
        pp.goto(url); pp.wait_for_function("booted && ready()")
        for v in ("tasks", "invoices", "expenses", "accounts", "services"):
            pp.evaluate(f"state.view='{v}';render()"); pp.wait_for_timeout(250)
            r = pp.evaluate("(()=>{const t=[...document.querySelectorAll('#view table')];return [t.every(x=>x.getBoundingClientRect().right<=innerWidth+1), [...document.querySelectorAll('#view tbody td')].filter(td=>td.dataset.label===undefined).length]})()")
            if not r[0]: fails.append(f"phone {v}: table wider than the screen")
            if r[1]: fails.append(f"phone {v}: {r[1]} cells without a label")
        pp.close()
        # v72: Cancelled is closed work
        pg.evaluate("state.view='tasks';F.quick='open';render()"); pg.wait_for_timeout(150)
        n_open = pg.evaluate("store.tasks.filter(isOpenT).length")
        tc = pg.evaluate("store.tasks.find(isOpenT).id")
        pg.evaluate(f"store.tasks.find(t=>t.id==='{tc}').status='Cancelled'")
        if pg.evaluate("store.tasks.filter(isOpenT).length") != n_open - 1: fails.append("Cancelled task still counted as open")
        # v72: Paid money cannot be deleted (before or after migration)
        paid = pg.evaluate("store.money.find(m=>m.status==='Paid').id")
        pg.evaluate("window.__writes.length=0")
        pg.evaluate(f"remove('money','{paid}')"); pg.wait_for_timeout(200)
        if pg.evaluate("window.__writes.length"): fails.append("Paid money row was deleted")
        # v72: before migration 18 (no deleted_at column) delete is a hard delete
        un = pg.evaluate("store.money.find(m=>m.status!=='Paid').id")
        pg.evaluate(f"remove('money','{un}')"); pg.wait_for_timeout(200)
        w = pg.evaluate("window.__writes.filter(x=>x.table==='money').slice(-1)[0]")
        if not w or w["op"] != "delete": fails.append(f"pre-migration delete should be a hard delete ({w})")
        if errs: fails.append("page errors: " + " | ".join(errs[:3]))
        # v72: after migration 18: Trash, restore, audit log
        seed2 = json.loads(json.dumps(seed))
        for t in ("tasks","money","accounts","services","templates"):
            for r in seed2.get(t, []): r["deleted_at"] = None; r["deleted_by"] = None
        tr = seed2["tasks"][0]; tr["deleted_at"] = "2026-10-26T21:30:00Z"; tr["deleted_by"] = "Daoud"
        seed2["audit_log"] = [{"id":1,"at":"2026-10-26T21:30:00Z","actor":"daoud@thepivotstrategy.com","op":"edited","tbl":"tasks","row_id":"TSK-0907","label":"Payment Methods","changes":{"status":["To Do","Done"]}}]
        p2 = b.new_page(viewport={"width": 1280, "height": 900})
        e2 = []; p2.on("pageerror", lambda e: e2.append(str(e)))
        p2.add_init_script("window.__SEED=" + json.dumps(seed2) + ";")
        p2.route("**/supabase.min.js", lambda r: r.fulfill(body=smoke.MOCK, content_type="application/javascript"))
        p2.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
        p2.goto(url); p2.wait_for_function("booted && ready()"); p2.wait_for_timeout(300)
        if p2.evaluate(f"store.tasks.some(t=>t.id==='{tr['id']}')"): fails.append("trashed task still shown")
        live = p2.evaluate("store.tasks.find(isOpenT).id")
        p2.evaluate("window.__writes.length=0")
        p2.evaluate(f"remove('tasks','{live}')"); p2.wait_for_timeout(300)
        w = p2.evaluate("window.__writes.filter(x=>x.table==='tasks').slice(-1)[0]")
        if not w or w["op"] != "update" or not w["row"].get("deleted_at"): fails.append(f"post-migration delete should move to Trash ({w})")
        p2.evaluate("state.view='setup';render()"); p2.wait_for_timeout(300)
        if tr["id"] not in p2.inner_text("#view"): fails.append("Trash panel does not list the trashed task")
        p2.click(f"[data-trestore='{tr['id']}']"); p2.wait_for_timeout(300)
        w = p2.evaluate("window.__writes.filter(x=>x.table==='tasks').slice(-1)[0]")
        if not w or w["row"].get("deleted_at", "x") is not None: fails.append(f"Restore did not clear deleted_at ({w})")
        p2.evaluate("state.view='activity';render()"); p2.wait_for_timeout(500)
        at = p2.inner_text("#view")
        if "edited status on" not in at: fails.append(f"Activity does not read the audit log ({at[:120]!r})")
        if p2.evaluate("logAct.toString().includes('if(AUDIT)return')") and not p2.evaluate("AUDIT"): fails.append("AUDIT flag not set when audit_log exists")
        # v73 after migration 19 shape
        p2.evaluate("""store.app_settings=[{key:'bank_iban',value:'KW81CBKU0000000000001234560101'},{key:'bank_name',value:'Test Bank'}];SETTINGS_OK=true;""")
        inv = p2.evaluate("store.money.find(m=>m.dir==='Income'&&owed(m)).id")
        html = p2.evaluate(f"invoiceHTML(store.money.find(m=>m.id==='{inv}'),AMAP[store.money.find(m=>m.id==='{inv}').acct])")
        if "KW81CBKU" not in html or "How to pay" not in html: fails.append("payment details missing from unpaid invoice PDF")
        pdone = p2.evaluate("store.money.find(m=>m.dir==='Income'&&m.status==='Paid').id")
        if "How to pay" in p2.evaluate(f"invoiceHTML(store.money.find(m=>m.id==='{pdone}'),{{}})"): fails.append("paid invoice shows payment details")
        p2.evaluate(f"openReminder('{inv}')"); p2.wait_for_timeout(150)
        body = p2.evaluate("document.getElementById('rm_body').value")
        if inv not in body and "INV-" not in body: fails.append("reminder text lacks the invoice number")
        if "KW81CBKU" not in body: fails.append("reminder lacks bank details")
        p2.evaluate("document.getElementById('modal').classList.remove('show')")
        if e2: fails.append("page errors after migration: " + " | ".join(e2[:3]))
        p2.close()
        # v73: estimated cost = every salary allocated or explicitly unallocated
        tot = pg.evaluate("(()=>{const e=estAlloc();let a=0;Object.values(e.alloc).forEach(o=>Object.values(o).forEach(v=>a+=v));const u=Object.values(e.unal).reduce((x,y)=>x+y,0);const sal=store.money.filter(m=>m.dir==='Salary'&&!voided(m)).reduce((x,m)=>x+Math.abs(+m.amt||0),0);return [a+u,sal]})()")
        if abs(tot[0]-tot[1]) > 0.001: fails.append(f"salary allocation does not add up {tot}")
        if pg.evaluate("estCost(store.accounts[0].id,'0000-01','9999-12')") < 0: fails.append("negative estimated cost")
        h = pg.evaluate("bizHealth(moneyStats(store.money,'0000-01-01','9999-12-31'))")
        if h["mrr"] != pg.evaluate("store.accounts.filter(a=>(+a.retainer_fee||0)&&(a.lifecycle==='Active'||a.lifecycle==='Paused')).reduce((s,a)=>s+Math.abs(+a.retainer_fee),0)"): fails.append("MRR wrong")
        pg.evaluate("state.view='moneydash';render()"); pg.wait_for_timeout(200)
        if "business health" not in pg.inner_text("#view").lower(): fails.append("no Business health panel")
        # before migration 19: no program / next step fields, no crash
        acc = pg.evaluate("store.accounts.find(a=>a.lifecycle==='Lead').id")
        pg.evaluate(f"openAccountEdit('{acc}')"); pg.wait_for_timeout(150)
        if pg.query_selector("#ae_program") or pg.query_selector("#ae_next_step"): fails.append("migration 19 fields shown before the migration")
        pg.evaluate("document.getElementById('modal').classList.remove('show')")
        pg.evaluate("state.view='digest';render()"); pg.wait_for_timeout(200)
        hv = pg.inner_text("#view").lower()
        if "my work" not in hv or "leads" not in hv: fails.append("Home lacks My work or Leads")
        # after migration 19 shape: fields appear and save
        pg.evaluate(f"store.accounts.forEach(a=>{{a.program=null;a.next_step='';a.next_date=null;}})")
        pg.evaluate(f"openAccountEdit('{acc}')"); pg.wait_for_timeout(150)
        if not (pg.query_selector("#ae_program") and pg.query_selector("#ae_next_step")): fails.append("migration 19 fields missing after the migration")
        else:
            pg.fill("#ae_next_step","Send proposal"); pg.evaluate("window.__writes.length=0"); pg.click("#mkSave"); pg.wait_for_timeout(250)
            w = pg.evaluate("window.__writes.filter(x=>x.table==='accounts').slice(-1)[0]")
            if not w or w["row"].get("next_step") != "Send proposal": fails.append(f"next step not saved ({w})")
        # v74: table pages fit the window
        pf = b.new_page(viewport={"width": 1280, "height": 800})
        pf.add_init_script("window.__SEED=" + json.dumps(seed) + ";")
        pf.route("**/supabase.min.js", lambda r: r.fulfill(body=smoke.MOCK, content_type="application/javascript"))
        pf.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
        pf.goto(url); pf.wait_for_function("booted && ready()")
        for v in ("tasks", "invoices", "expenses", "accounts"):
            pf.evaluate(f"state.view='{v}';F.quick='';render()"); pf.wait_for_timeout(300)
            r = pf.evaluate("""(()=>{const w=document.querySelector('#view .tpanel .tablewrap');const rc=document.querySelector('#view .tpanel .rowcount');
              return {tv:document.body.classList.contains('tv'),page:document.scrollingElement.scrollHeight-innerHeight,
                      bottom:Math.round(w.getBoundingClientRect().bottom),rc:rc?Math.round(rc.getBoundingClientRect().bottom):0,inner:innerHeight,scrolls:w.scrollHeight>w.clientHeight}})()""")
            if not r["tv"]: fails.append(f"{v}: not in fixed table layout")
            if r["page"] > 1: fails.append(f"{v}: the page itself scrolls by {r['page']}px")
            if r["bottom"] > r["inner"] or r["rc"] > r["inner"]: fails.append(f"{v}: table or row count cut off at the bottom {r}")
            if r["scrolls"]:
                pf.mouse.move(640, 110); pf.mouse.wheel(0, 400); pf.wait_for_timeout(200)
                if pf.evaluate("(()=>{const w=document.querySelector('#view .tpanel .tablewrap');return w.scrollTop>=Math.min(100,w.scrollHeight-w.clientHeight)-1})()") is False: fails.append(f"{v}: wheel outside the table does not scroll it")
                pf.evaluate("document.querySelector('#view .tpanel .tablewrap').scrollTop=0")
        pf.evaluate("state.view='moneydash';render()"); pf.wait_for_timeout(200)
        if pf.evaluate("document.body.classList.contains('tv')"): fails.append("dashboard locked in table layout")
        pf.close()
        # v74: salary charging
        ch = pg.evaluate("""(()=>{const fake=(o)=>Object.assign({dir:'Salary',status:'Paid',date:'2026-10-24',amt:-100,alloc:null},o);
          const mbs=store.accounts.find(a=>a.brand==='Moda Body Shop').id, miz=store.accounts.find(a=>a.brand==='Mizyana').id, piv=store.accounts.find(a=>a.lifecycle==='Internal').id;
          return {direct:allocOf(fake({acct:mbs})), split:allocOf(fake({acct:mbs,alloc:miz+':60|'+mbs+':40'})), internal:allocOf(fake({acct:piv})), none:allocOf(fake({acct:null})), equal:allocOf(fake({alloc:miz+'|'+mbs})), mbs, miz}})()""")
        if not (len(ch["direct"])==1 and ch["direct"][0]["a"]==ch["mbs"] and ch["direct"][0]["w"]==1): fails.append(f"single-brand salary not charged directly {ch['direct']}")
        if not (len(ch["split"])==2 and abs(ch["split"][0]["w"]-0.6)<1e-9): fails.append(f"split salary wrong {ch['split']}")
        if ch["internal"] or ch["none"]: fails.append("internal or unbranded salary should fall back to tasks")
        if not (len(ch["equal"])==2 and abs(ch["equal"][0]["w"]-0.5)<1e-9): fails.append(f"blank percent should split equally {ch['equal']}")
        tot = pg.evaluate("(()=>{_est=null;const e=estAlloc();let a=0;Object.values(e.alloc).forEach(o=>Object.values(o).forEach(v=>a+=v));const u=Object.values(e.unal).reduce((x,y)=>x+y,0);const sal=store.money.filter(m=>m.dir==='Salary'&&!voided(m)).reduce((x,m)=>x+Math.abs(+m.amt||0),0);return [a+u,sal]})()")
        if abs(tot[0]-tot[1]) > 0.001: fails.append(f"salary allocation does not add up after v74 {tot}")
        # month editor keeps and saves the brand (before migration 20: single brand into acct)
        amr = pg.evaluate("store.money.find(m=>m.dir==='Salary'&&m.partner==='Amr'&&m.date.startsWith('2026-10')).id")
        pg.evaluate(f"store.money.find(m=>m.id==='{amr}').acct=store.accounts.find(a=>a.brand==='Moda Body Shop').id")
        pg.evaluate("(()=>{const ym='2026-10';const rows=store.money.filter(m=>m.dir==='Salary'&&!voided(m)&&m.date.startsWith(ym));openSalaryNew({ym,rows});})()"); pg.wait_for_timeout(200)
        lab = pg.evaluate(f"[...document.querySelectorAll('.slrow')].find(r=>r.dataset.id==='{amr}').querySelector('.sl_b').textContent")
        if "Moda Body Shop" not in lab: fails.append(f"month editor does not show Amr's brand ({lab})")
        pg.evaluate("window.__writes.length=0"); pg.click("#mkSave"); pg.wait_for_timeout(400)
        w = pg.evaluate(f"window.__writes.filter(x=>x.table==='money'&&x.row&&x.row.partner==='Amr').slice(-1)[0]")
        if not w or w["row"].get("acct") != pg.evaluate("store.accounts.find(a=>a.brand==='Moda Body Shop').id"): fails.append(f"editing the month dropped Amr's brand ({w})")
        # v75: client groups
        g = pg.evaluate("""(()=>{let byBrand=0,byGroup=0;store.accounts.forEach(a=>byBrand+=collectedOn([a.id])-estCost(a.id,'0000-01','9999-12'));
          store.accounts.filter(a=>groupOf(a.id)===a.id).forEach(a=>byGroup+=collectedOn(groupIds(a.id))-groupCost(a.id,'0000-01','9999-12'));
          const px=store.accounts.find(a=>a.brand==='PhotonX');return [byBrand,byGroup,px?AMAP[groupOf(px.id)].brand:'']})()""")
        if abs(g[0]-g[1]) > 0.001: fails.append(f"group totals differ from brand totals {g}")
        if g[2] and g[2] != "Weldon Group": fails.append(f"PhotonX not grouped under Weldon Group ({g[2]})")
        pg.evaluate("state.view='accounts';F.status='';state.colF.accounts={};render()"); pg.wait_for_timeout(250)
        wg = pg.evaluate("store.accounts.find(a=>a.brand==='Weldon Group').id")
        tops = pg.evaluate("[...document.querySelectorAll('#view tbody tr')].map(r=>r.querySelector('.linkname').textContent)")
        if "PhotonX" in tops: fails.append("brands shown as top-level rows while collapsed")
        grow = pg.evaluate(f"[...document.querySelectorAll('#view tbody tr')].find(r=>r.querySelector('[data-brand=\"{wg}\"]')).lastElementChild.textContent")
        exp = pg.evaluate(f"KD(collectedOn(groupIds('{wg}'))-groupCost('{wg}','0000-01','9999-12'))")
        if grow.strip() != exp: fails.append(f"account row margin is not the group total ({grow} vs {exp})")
        pg.click(f"[data-acctog='{wg}']"); pg.wait_for_timeout(200)
        names = pg.evaluate("[...document.querySelectorAll('#view tbody tr.brandrow')].map(r=>r.querySelector('.linkname').textContent)")
        if not ("PhotonX" in names and "Mesoestetic Egypt" in names and "Weldon Group" in names): fails.append(f"expanding Weldon Group does not list its brands ({names})")
        px = pg.evaluate("(()=>{const r=[...document.querySelectorAll('#view tbody tr.brandrow')].find(r=>r.querySelector('.linkname').textContent==='PhotonX');const id=store.accounts.find(a=>a.brand==='PhotonX').id;return [r.lastElementChild.textContent,KD(collectedOn([id])-estCost(id,'0000-01','9999-12'))]})()")
        if px[0].strip() != px[1]: fails.append(f"brand row is not brand-specific {px}")
        pg.evaluate("store.accounts.forEach(a=>{if(!('program' in a))a.program=null;})")
        mz = pg.evaluate("store.accounts.find(a=>a.brand==='Mizyana').id")
        pg.evaluate(f"openAccountEdit('{mz}')"); pg.wait_for_timeout(150)
        eng = pg.evaluate("(store.services||[]).find(s=>svcGroup(s)==='Program'&&/engine/i.test(s.name))")
        if eng and pg.query_selector("#ae_program"):
            pg.select_option("#ae_program", eng["id"]); pg.wait_for_timeout(100)
            if pg.evaluate("parseFloat(document.getElementById('ae_retainer_fee').value)") != 650: fails.append("choosing a program overwrote the agreed fee")
        pg.evaluate("document.getElementById('modal').classList.remove('show')")
        # v69: local date at 00:30 Kuwait (21:30 UTC the day before)
        pk = b.new_context(timezone_id="Asia/Kuwait").new_page()
        pk.clock.set_fixed_time("2026-10-27T21:30:00Z")
        pk.add_init_script("window.__SEED=" + json.dumps(seed) + ";")
        pk.route("**/supabase.min.js", lambda r: r.fulfill(body=smoke.MOCK, content_type="application/javascript"))
        pk.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
        pk.goto(url); pk.wait_for_function("booted && ready()")
        if pk.evaluate("todayISO") != "2026-10-28": fails.append(f"today at 00:30 Kuwait is {pk.evaluate('todayISO')}, expected 2026-10-28")
        b.close()
    srv.shutdown()
    if fails: print("FAIL\n" + "\n".join(fails)); sys.exit(1)
    print("PASS: ID descending; due = done rule; local date at 00:30 Kuwait; failed save reverts; retainer badge; MTD comparison; My Tasks default; Accounts default filter; paid date on Paid; duplicate-ID retry; CSV guard; no % above 100; sticky headers; task paging; read-only money tables; phone cards; Cancelled closed; Paid undeletable; hard delete before m18, Trash after; audit log; estimated cost adds up; business health; payment details; reminder; m19 fields; Home panels; fixed table layout and wheel; salary charging and month editor; client groups; program keeps fee")

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    main(sys.argv[1])
