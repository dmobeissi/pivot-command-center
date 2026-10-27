"""
Behaviour checks for data rules (v68).

  - every data table opens sorted by ID descending (newest first)
  - a Done task with a done date and no due date is saved with due = done
    (inline status change, popup edit, new task popup); Done with no done date is still allowed
  - a task that is not Done is never given a due date by the rule

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
        if errs: fails.append("page errors: " + " | ".join(errs[:3]))
        b.close()
    srv.shutdown()
    if fails: print("FAIL\n" + "\n".join(fails)); sys.exit(1)
    print("PASS: ID descending on tasks, invoices, expenses, accounts, services; Done task due = done on save, nothing else touched")

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    main(sys.argv[1])
