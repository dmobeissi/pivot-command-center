"""
UI consistency checks that screenshots miss.

At 390 / 768 / 1280 px, light and dark:
  - menus (Add, user) open fully on screen and every item is clickable (real hit test)
  - phone sub-nav shows the pages of the current section and navigates; title shows "Section > Page"
  - date-range selects show their full label
  - no KPI value is cut ("KD 2,150..."), no KPI card left alone on a row
  - no helper text sits closer than 10px to a card edge
  - no page errors

Usage: python tests/ui_checks.py /path/to/pivot-backup.json   (client data is never committed)
"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import smoke
from playwright.sync_api import sync_playwright

HIT = """(sel)=>[...document.querySelectorAll(sel)].map(x=>{const r=x.getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return el===x||x.contains(el)})"""
ORPHAN = """[...document.querySelectorAll('.view>.kpis')].some(k=>{const tops={};[...k.children].forEach(c=>{
  const t=Math.round(c.getBoundingClientRect().top);(tops[t]=tops[t]||[]).push(c.getBoundingClientRect().width)});
  const rows=Object.keys(tops).sort((a,b)=>a-b).map(t=>tops[t]);const last=rows[rows.length-1];
  return rows.length>1&&last.length===1&&last[0]<k.getBoundingClientRect().width*0.9})"""
EDGE = """[...document.querySelectorAll('.hint,.rowcount,.panel>h2')].filter(e=>e.offsetParent&&e.textContent.trim()).some(e=>{
  const c=e.closest('.panel');if(!c)return false;const r=document.createRange();r.selectNodeContents(e);
  const b=r.getBoundingClientRect(),cb=c.getBoundingClientRect();return b.width&&(b.left-cb.left<10)})"""
SELFIT = """[...document.querySelectorAll('.rangebar select')].every(e=>{const o=e.options[e.selectedIndex].text;
  const c=document.createElement('canvas').getContext('2d');const s=getComputedStyle(e);c.font=s.fontWeight+' '+s.fontSize+' '+s.fontFamily;
  return c.measureText(o).width+parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)-4<=e.clientWidth+1})"""

def main(seed_path):
    seed = json.load(open(seed_path)); seed = seed.get("tables", seed)
    srv = smoke.serve(); url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
    fails = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for w in (390, 768, 1280):
            for scheme in ("light", "dark"):
                tag = f"{w} {scheme}"
                pg = b.new_page(viewport={"width": w, "height": 800}, color_scheme=scheme)
                errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
                pg.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
                pg.add_init_script("window.__SEED=" + json.dumps(seed) + ";")
                pg.route("**/supabase.min.js", lambda r: r.fulfill(body=smoke.MOCK, content_type="application/javascript"))
                pg.goto(url); pg.wait_for_function("booted && ready()")
                for v in smoke.VIEWS:
                    pg.evaluate(f"state.view='{v}';render()"); pg.wait_for_timeout(150)
                    if pg.evaluate(ORPHAN): fails.append(f"{tag} {v}: KPI card alone on a row")
                    if pg.evaluate("[...document.querySelectorAll('.kpi .val')].some(e=>e.scrollWidth>e.clientWidth+1)"): fails.append(f"{tag} {v}: KPI value cut off")
                    if pg.evaluate(EDGE): fails.append(f"{tag} {v}: text touching a card edge")
                    if not pg.evaluate(SELFIT): fails.append(f"{tag} {v}: date-range select cut off")
                pg.evaluate("state.view='invoices';render()"); pg.wait_for_timeout(200)
                t = pg.inner_text("#viewtitle")
                if "Money" not in t or "Invoices" not in t: fails.append(f"{tag}: title lacks hierarchy ({t!r})")
                shown = pg.evaluate("(()=>{const s=document.getElementById('subnav');return !!s&&getComputedStyle(s).display!=='none'})()")
                if shown != (w <= 720): fails.append(f"{tag}: sub-nav visibility wrong")
                if w <= 720 and shown:
                    pg.click('#subnav button[data-view="salaries"]'); pg.wait_for_timeout(200)
                    if pg.evaluate("state.view") != "salaries": fails.append(f"{tag}: sub-nav does not navigate")
                pg.click("#addBtn"); pg.wait_for_timeout(150)
                if not all(pg.evaluate(HIT, "#addMenu button")): fails.append(f"{tag}: Add menu item not clickable")
                if not pg.evaluate("(()=>{const m=document.getElementById('addMenu').getBoundingClientRect();return m.left>=0&&m.right<=innerWidth})()"): fails.append(f"{tag}: Add menu off screen")
                pg.mouse.click(w - 5, 780)
                pg.click("#uDots"); pg.wait_for_timeout(150)
                if not all(pg.evaluate(HIT, "#uMenu button")): fails.append(f"{tag}: user menu item not clickable")
                if errs: fails.append(f"{tag}: page errors: " + " | ".join(errs[:3]))
                pg.close()
        b.close()
    srv.shutdown()
    if fails:
        print("FAIL\n" + "\n".join(fails)); sys.exit(1)
    print("PASS: menus, sub-nav, titles, KPI rows, card edges, range bar at 390/768/1280, light and dark")

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    main(sys.argv[1])
