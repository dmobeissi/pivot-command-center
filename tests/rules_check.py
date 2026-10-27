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
    print("PASS: ID descending; due = done rule; local date at 00:30 Kuwait; failed save reverts; retainer badge; MTD comparison; My Tasks default; Accounts default filter")

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    main(sys.argv[1])
