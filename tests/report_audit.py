"""Financial report + ledger CSV audit: report bank = dashboard = raw rows; CSV holds every ledger row; CSV paid in - paid out = bank; last running balance = bank.
Usage: python tests/report_audit.py /path/to/pivot-backup.json   (client data is never committed)"""
import sys,json,csv,io;sys.path.insert(0,'tests')
import smoke
from playwright.sync_api import sync_playwright
import os;os.makedirs('tests/out',exist_ok=True);_d=json.load(open(sys.argv[1]));seed=_d.get('tables',_d);M=seed['money']
srv=smoke.serve();url=f"http://127.0.0.1:{srv.server_address[1]}/index.html"
ok=True
def chk(l,c):
  global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+l)
# independent figures from raw rows
paid=[m for m in M if m['status']=='Paid']
A=lambda r:sum(abs(float(m['amt'])) for m in r)
bank=A([m for m in paid if m['dir']=='Income'])-A([m for m in paid if m['dir']!='Income'])
with sync_playwright() as p:
  b=p.chromium.launch()
  for w in (1280,390):
    pg=b.new_page(viewport={"width":w,"height":900},accept_downloads=True)
    errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("https://fonts.googleapis.com/**",lambda r:r.fulfill(body="",content_type="text/css"))
    pg.add_init_script("window.__SEED="+json.dumps(seed)+";try{localStorage.setItem('pivot_range',JSON.stringify({preset:'all'}))}catch(e){}")
    pg.route("**/supabase.min.js",lambda r:r.fulfill(body=smoke.MOCK,content_type="application/javascript"))
    pg.goto(url);pg.wait_for_function("booted&&ready()")
    pg.evaluate("state.range={preset:'all'};state.view='moneydash';render()");pg.wait_for_timeout(400)
    dash=pg.evaluate("moneyStats(store.money,'2000-01-01','9999-12-31')")
    pg.click('#repBtn');pg.wait_for_timeout(300)
    txt=pg.inner_text('.sheet-report')
    bleed=pg.evaluate("(()=>{const s=document.querySelector('.sheet-report');return [...s.querySelectorAll('*')].some(e=>e.getBoundingClientRect().right>s.getBoundingClientRect().right+1&&!e.closest('.tablewrap'))})()")
    chk(f"{w}: no bleed in report",not bleed)
    pg.screenshot(path=f"{"tests/out"}/rep{w}.png")
    if w==1280:
      chk("bank in report = dashboard = raw", abs(dash['bankBalance']-bank)<1e-6 and ("KD "+f"{bank:,.3f}") in txt)
      with pg.expect_download() as d: pg.click('#mkCsv')
      path=d.value.path();name=d.value.suggested_filename;print("file:",name)
      rows=list(csv.DictReader(io.open(path,encoding='utf-8-sig')))
      chk(f"CSV has every ledger row ({len(rows)} of {len(M)})", len(rows)==len(M) and {r['ID'] for r in rows}=={m['id'] for m in M})
      cin=sum(float(r['In (KD)']) for r in rows if r['Cash moved']=='Yes' and r['In (KD)'])
      cout=sum(float(r['Out (KD)']) for r in rows if r['Cash moved']=='Yes' and r['Out (KD)'])
      chk(f"CSV paid in - paid out = bank ({cin-cout:.3f})", abs(cin-cout-bank)<0.0015)
      last=[r for r in rows if r['Running bank balance (KD)']][-1]
      chk(f"last running balance = bank ({last['Running bank balance (KD)']})", abs(float(last['Running bank balance (KD)'])-bank)<0.0015)
      chk("signed amount matches stored amount", all(abs(float(r['Amount (signed KD)'])-float(next(m['amt'] for m in M if m['id']==r['ID'])))<0.0015 for r in rows))
      chk("cancelled rows flagged", all((r['Counts in totals']=='No')==(r['Status'] in('Cancelled','Voided')) for r in rows))
      print("dirs:",{d:sum(1 for r in rows if r['Type']==d) for d in('Income','Expense','Salary','Payout')})
      # range check: last month
      pg.click('#mkCancel');pg.evaluate("state.range={preset:'lastmonth'};render()");pg.wait_for_timeout(300);pg.click('#repBtn');pg.wait_for_timeout(200)
      print("last month header:",pg.inner_text('.sheet-report .reportbody').split('\n')[0])
    chk(f"{w}: no page errors",not errs)
  b.close()
sys.exit(0 if ok else 1)
