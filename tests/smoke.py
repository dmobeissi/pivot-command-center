"""
PIVOT Command Center smoke test.

Boots the app in headless Chromium against a mocked Supabase client seeded
from a backup JSON, renders every view at desktop, tablet and phone width,
and fails on console errors or content bleeding out of the page.

Client data is never committed: pass the backup path at runtime.

Usage:
  pip install playwright && python -m playwright install chromium
  python tests/smoke.py /path/to/pivot-backup.json

Exit code 0 = pass. Writes screenshots to tests/out/ (git-ignored).
"""
import json, sys, threading, http.server, functools, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "out"
VIEWS = ["digest", "tasksdash", "moneydash", "mytasks", "tasks", "recurring", "invoices",
         "expenses", "salaries", "payouts", "retainers", "accounts", "services", "activity", "setup"]
WIDTHS = [1280, 768, 390]

# Minimal supabase-js stand-in. Reads return the seeded tables; writes are recorded
# on window.__writes and succeed.
MOCK = r"""
window.supabase = { createClient: () => {
  const D = window.__SEED || {};
  window.__writes = [];
  const q = (table) => {
    let rows = (D[table] || []).slice(), op = 'select', payload = null;
    const api = {
      select(){ return api; }, order(){ return api; }, limit(){ return api; },
      eq(k,v){ if(op==='select') rows = rows.filter(r => r[k]===v); else payload.__where = {[k]:v}; return api; },
      in(k,v){ if(op!=='select') payload.__where = {[k]:v}; return api; },
      update(o){ op='update'; payload = {table, op, row:o}; return api; },
      insert(o){ op='insert'; payload = {table, op, row:o}; return api; },
      delete(){ op='delete'; payload = {table, op}; return api; },
      then(res, rej){
        if(op!=='select'){ window.__writes.push(payload); return Promise.resolve({data:null, error:null}).then(res, rej); }
        if(!(table in D)) return Promise.resolve({data:null, error:{message:'relation does not exist'}}).then(res, rej);
        return Promise.resolve({data:rows, error:null}).then(res, rej);
      }
    };
    return api;
  };
  const session = {user:{email:'daoud@test.local'}};
  return {
    from: q,
    auth: { getSession: async () => ({data:{session}}), onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
            signOut: async () => ({}), updateUser: async () => ({}) , signInWithPassword: async () => ({}) },
    channel(){ const c = {on(){ return c; }, subscribe(){ return c; }}; return c; },
  };
}};
"""

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def main(seed_path):
    seed = json.load(open(seed_path))
    seed = seed.get("tables", seed)
    OUT.mkdir(parents=True, exist_ok=True)
    srv = serve()
    url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
    fails = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for w in WIDTHS:
            pg = b.new_page(viewport={"width": w, "height": 900})
            errs, cur = [], {"v": "boot"}
            pg.on("console", lambda m: errs.append(cur["v"] + ": " + m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errs.append(cur["v"] + ": " + str(e)))
            pg.add_init_script("window.__SEED=" + json.dumps(seed) + ";")
            pg.route("**/supabase.min.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
            pg.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
            pg.goto(url)
            pg.wait_for_function("typeof booted!=='undefined' && booted && ready()", timeout=15000)
            for v in VIEWS:
                cur["v"] = v
                pg.evaluate(f"state.view='{v}';render()")
                pg.wait_for_timeout(250)
                bleed = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
                if bleed: fails.append(f"{v} @ {w}px: page scrolls horizontally")
                pg.screenshot(path=str(OUT / f"{v}-{w}.png"), full_page=False)
            if errs: fails.append(f"console errors @ {w}px: " + " | ".join(errs[:5]))
            pg.close()
        b.close()
    srv.shutdown()
    if fails:
        print("FAIL\n" + "\n".join(fails)); sys.exit(1)
    print(f"PASS: {len(VIEWS)} views x {len(WIDTHS)} widths, no console errors, no page bleed")

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    main(sys.argv[1])
