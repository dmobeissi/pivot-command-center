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
        if errs: fails.append("page errors: " + " | ".join(errs[:3]))
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
    print("PASS: ID descending; due = done rule; local date at 00:30 Kuwait; failed save reverts; retainer badge; MTD comparison; My Tasks default; Accounts default filter; paid date on Paid; duplicate-ID retry; CSV guard; no % above 100; sticky headers; task paging; read-only money tables; phone cards")

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    main(sys.argv[1])
