
const STATUSES=["To Do","In Progress","Review","Done","On Hold"];
const PRIOS=["High","Medium","Low"];
const LIFE=["Lead","Active","Paused","Churned","Lost","Internal"];
const STAGES=["Lead","Proposal","Won","Lost"];
const PAY=["Paid","Partial","Unpaid","Voided","Cancelled"];
const PAYOUT_STATUS=["Pending","Paid"];
const INCOME_TYPES=["Retainer","Project","One-time"];
const ROLES=["Full-time","Part-time","Freelance"];
const FREQ=["Monthly","Yearly"];
const EXPANDED=new Set(); // groups default collapsed; presence here = expanded
function wireCollapse(prefix,keys){
  const esckey=(typeof CSS!=='undefined'&&CSS.escape)?(k=>CSS.escape(k)):(k=>k);
  const setExp=(key,exp)=>{const el=document.querySelector(`[data-grp="${prefix}:${esckey(key)}"]`);if(el)el.classList.toggle('collapsed',!exp);};
  const toggle=key=>{const id=prefix+':'+key;if(EXPANDED.has(id)){EXPANDED.delete(id);setExp(key,false);}else{EXPANDED.add(id);setExp(key,true);}};
  document.querySelectorAll(`[data-tog]`).forEach(b=>{if(b.dataset.tog.indexOf(prefix+':')===0)b.onclick=e=>{e.stopPropagation();toggle(b.dataset.tog.slice(prefix.length+1));};});
  const all=exp=>keys.forEach(k=>{const id=prefix+':'+k;if(exp)EXPANDED.add(id);else EXPANDED.delete(id);setExp(k,exp);});
  if($(prefix+'XpAll'))$(prefix+'XpAll').onclick=()=>all(true);
  if($(prefix+'ClAll'))$(prefix+'ClAll').onclick=()=>all(false);
}
const DIRS=["Income","Expense"];
const EXPCATS=["Salary","Software","Advertising","Freelancer","Partner Payout","Domain / Hosting","Tax","Office","Other Expense"];
const TEAM_ACTIVE=["Daoud","Zawar","Arafa"];const TEAM_ARCHIVED=["Amr","Maisoun","Bilal"];let TEAM=[...TEAM_ACTIVE,...TEAM_ARCHIVED];
const COLLS=["accounts","engagements","tasks","money"];
const store={accounts:[],engagements:[],tasks:[],money:[],templates:[],people:[],services:[],deals:[],projects:[]};
const loaded={accounts:false,engagements:false,tasks:false,money:false,templates:false,people:false,services:false,deals:false,projects:false};
const SOFT=new Set(['people','services','deals','projects']); // tables that may not exist yet; must not block boot
let AMAP={}, canWrite=false, booted=false, myName="Someone", PEOPLE={};
let sb=null, session=null;
const ALLCOLLS=["accounts","engagements","tasks","money","templates","people","services","deals","projects"];
const F={brand:"",team:"",status:"",q:"",quick:""};
const state={view:(()=>{try{return localStorage.getItem('pivot_view')||"digest"}catch(e){return"digest"}})(),sortT:{k:"due",dir:1},sortM:{k:"date",dir:-1},me:(()=>{try{return localStorage.getItem('pivot_me')||""}catch(e){return""}})(),
  range:(()=>{try{return JSON.parse(localStorage.getItem('pivot_range'))||{preset:'mtd',from:'',to:''}}catch(e){return{preset:'mtd',from:'',to:''}}})(),
  cmp:(()=>{try{return localStorage.getItem('pivot_cmp')||'prev_period'}catch(e){return'prev_period'}})(),
  groups:(()=>{try{return JSON.parse(localStorage.getItem('pivot_nav2'))||{tasks:false,money:false}}catch(e){return{tasks:false,money:false}}})(),
  theme:(()=>{try{return localStorage.getItem('pivot_theme')||'system'}catch(e){return'system'}})(),
  sortA:{k:"coll",dir:-1},
  msort:{},colF:{},colRange:{},colText:{}};
const todayISO=new Date().toISOString().slice(0,10);

const $=id=>document.getElementById(id);
const esc=s=>(s==null?"":String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KD=n=>(n==null||isNaN(n)?0:n).toLocaleString(undefined,{minimumFractionDigits:3,maximumFractionDigits:3});
const brandOf=id=>AMAP[id]?AMAP[id].brand:(id||"");
function toast(m,ms){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);const dur=ms||(/fail|error|not able|read-only|violates|constraint/i.test(m)?8000:3000);t._t=setTimeout(()=>t.classList.remove('show'),dur);}
let saveStateText="waking up…",pendingHL="";const APPVER="v65 · Supabase";
function setSave(t){saveStateText=t;const e=$('savestate');if(e)e.textContent=t;}

(async function boot(){
  try{ sb = supabase.createClient(window.PIVOT_CFG.url, window.PIVOT_CFG.key, {auth:{persistSession:true,autoRefreshToken:true}}); }catch(e){ sb=null; }
  if(!sb){ document.body.innerHTML='<div class="center"><h2>Config missing</h2><p>Supabase keys are not set.</p></div>'; return; }
  let s=null; try{ const r=await sb.auth.getSession(); s=r.data.session; }catch(e){}
  session=s;
  if(!session){ showLogin(); return; }
  startApp();
})();
function nameFromEmail(e){ if(!e)return "Someone"; const p=e.split("@")[0].replace(/[._-]/g," ").trim(); return p.charAt(0).toUpperCase()+p.slice(1); }
// a little personality, internal only
const QUIPS=["Grabbing coffee, one sec…","Catching butterflies…","Warming up the numbers…","Counting the dinars…","Herding the invoices…","Shuffling the deck…","Chasing decimals…","Polishing the pixels…","Summoning the data…","Doing the math, carrying the one…","Untangling the spreadsheets…","Feeding the hamsters…"];
function quip(){return QUIPS[Math.floor(Math.random()*QUIPS.length)];}
function firstName(){return (myName&&myName!=="Someone")?String(myName).split(' ')[0]:"there";}
function dayPick(arr){return arr[Math.floor(Date.now()/864e5)%arr.length];}
function showLogin(){
  const w=$('loginwrap'); w.classList.add('show');
  w.innerHTML=`<div class="loginbox">
    <div style="display:flex;align-items:center;gap:10px"><span class="dot" style="width:12px;height:12px;border-radius:50%;background:var(--accent);display:inline-block"></span><b style="font-size:18px">PIVOT Command Center</b></div>
    <p class="muted" style="margin:0 0 6px">Sign in with your team account.</p>
    <input id="lg_email" type="email" placeholder="you@thepivotstrategy.com" autocomplete="username">
    <input id="lg_pass" type="password" placeholder="Password" autocomplete="current-password">
    <button class="btn" id="lg_btn" style="justify-content:center;text-align:center">Sign in</button>
    <div id="lg_err" class="muted" style="color:var(--bad);min-height:16px"></div></div>`;
  const go=async()=>{ $('lg_err').textContent=''; const email=$('lg_email').value.trim(), password=$('lg_pass').value;
    if(!email||!password){$('lg_err').textContent='Enter email and password';return;}
    $('lg_btn').textContent='Signing in…';
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error){$('lg_err').textContent=error.message;$('lg_btn').textContent='Sign in';return;}
    location.reload(); };
  $('lg_btn').onclick=go;
  $('lg_pass').onkeydown=e=>{if(e.key==='Enter')go();};
  $('lg_email').focus();
}
async function startApp(){
  myName=nameFromEmail(session.user.email); canWrite=true;
  setSave('live · '+(session.user.email||''));
  $('loginwrap').classList.remove('show'); $('loginwrap').innerHTML='';
  renderUserChip();
  booted=true;
  await loadAll();
}
function renderUserChip(){
  const nu=$('navuser'); if(!nu)return;
  const initials=((myName||'U').trim()[0]||'U').toUpperCase();
  nu.innerHTML=`<div class="ua">${esc(initials)}</div><div class="un" title="${esc(session.user.email||'')}">${esc(myName)}</div><button class="udots" id="uDots" title="Account">⋯</button>
    <div class="usermenu" id="uMenu"><button id="uRefresh" title="Reload the latest data and app version">Refresh data</button><button id="uPass">Change password</button><button class="danger" id="uOut">Sign out</button></div>`;
  $('uDots').onclick=e=>{e.stopPropagation();const m=$('uMenu');m.classList.toggle('show');
    m.style.top=(getComputedStyle(m).position==='fixed')?(e.currentTarget.getBoundingClientRect().bottom+6)+'px':'';};
  $('uOut').onclick=signOut;
  $('uPass').onclick=openChangePassword;
  $('uRefresh').onclick=hardRefresh;
}
document.addEventListener('click',e=>{ if($('uMenu')&&!e.target.closest('#navuser'))$('uMenu').classList.remove('show'); });
function openChangePassword(){
  if($('uMenu'))$('uMenu').classList.remove('show');
  $('modal').innerHTML=`<div class="sheet" style="max-width:420px">
    <div class="sheethead"><div><div class="id">${esc(session.user.email||'')}</div><h3>Change password</h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formfull">${fld("New password",`<input type="password" id="cp_pass" autocomplete="new-password">`)}${fld("Confirm password",`<input type="password" id="cp_pass2" autocomplete="new-password">`)}<div id="cp_err" class="muted" style="color:var(--bad);min-height:16px"></div></div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Update</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=async()=>{const p=$('cp_pass').value,p2=$('cp_pass2').value;
    if((p||'').length<6){$('cp_err').textContent='At least 6 characters';return;} if(p!==p2){$('cp_err').textContent='Passwords do not match';return;}
    const {error}=await sb.auth.updateUser({password:p}); if(error){$('cp_err').textContent=error.message;return;} toast('Password updated'); close();};
}
function applyTheme(){const m=state.theme||'system';const root=document.documentElement;
  if(m==='system')root.removeAttribute('data-theme'); else root.setAttribute('data-theme',m);
  document.querySelectorAll('.themeseg button').forEach(b=>b.classList.toggle('on',b.dataset.theme===m));}
function setTheme(m){state.theme=m;try{localStorage.setItem('pivot_theme',m);}catch(_){}applyTheme();}
async function signOut(){ try{ await sb.auth.signOut(); }catch(e){} location.reload(); }
let rowMenuEl=null;
function rowMenu(coll,id){return `<button class="dots" data-menu="${esc(coll)}:${esc(id)}" title="Actions">⋯</button>`;}
function closeRowMenu(){if(rowMenuEl){rowMenuEl.remove();rowMenuEl=null;}}
document.addEventListener('click',e=>{const d=e.target.closest('[data-menu]');
  if(d){e.stopPropagation();closeRowMenu();const parts=d.dataset.menu.split(':');const coll=parts[0],id=parts.slice(1).join(':');const r=d.getBoundingClientRect();
    rowMenuEl=document.createElement('div');rowMenuEl.className='rowmenu';
    const canOpen=(coll==='tasks'||coll==='money');
    const mRow=coll==='money'?store.money.find(x=>x.id===id):null;
    const canInv=!!(mRow&&mRow.dir==='Income');
    rowMenuEl.innerHTML=`${canOpen?'<button data-mi="open">Open</button>':''}${canInv?'<button data-mi="inv">Invoice PDF</button>':''}<button data-mi="del" class="danger">Delete</button>`;
    document.body.appendChild(rowMenuEl);
    const w=160,left=Math.min(window.innerWidth-w-8,Math.max(8,r.right-w));
    rowMenuEl.style.top=(r.bottom+4)+'px';rowMenuEl.style.left=left+'px';
    rowMenuEl.onclick=ev=>{const b=ev.target.closest('[data-mi]');if(!b)return;const mi=b.dataset.mi;closeRowMenu();
      if(mi==='del')remove(coll,id);else if(mi==='inv')downloadInvoicePDF(id);else if(mi==='open'){if(coll==='tasks')openTask(id);else if(coll==='money')openMoney(id);}};
    return;}
  if(!e.target.closest('.rowmenu'))closeRowMenu();});
window.addEventListener('scroll',()=>closeRowMenu(),true);
const _tip=document.createElement('div');_tip.id='tip';document.body.appendChild(_tip);
document.addEventListener('mousemove',e=>{const b=e.target.closest('[data-tip]');if(b){_tip.textContent=b.getAttribute('data-tip');_tip.classList.add('show');_tip.style.left=Math.min(window.innerWidth-160,e.clientX+12)+'px';_tip.style.top=(e.clientY-14)+'px';}else _tip.classList.remove('show');});

function fromDB(coll,r){ if(coll==='money'){const o=Object.assign({},r);o.desc=r.description;o.date=r.txn_date;return o;} if(coll==='templates'){const o=Object.assign({},r);o.dueDay=r.due_day;o.active=r.active?"Yes":"No";return o;} if(coll==='people'||coll==='services'){const o=Object.assign({},r);o.active=(r.active===false?"No":"Yes");return o;} return r; }
function toDB(coll,obj){ const o=Object.assign({},obj);
  if(coll==='money'){ if('desc' in o){o.description=o.desc;delete o.desc;} if('date' in o){o.txn_date=o.date||null;delete o.date;} ['due','paid','txn_date','acct','eng','logged','proj_ref','inst_label'].forEach(k=>{if(o[k]==='')o[k]=null;}); ['inst_no','inst_count'].forEach(k=>{if(k in o)o[k]=(o[k]===''||o[k]==null)?null:(parseInt(o[k])||null);}); }
  if(coll==='tasks'){ ['logged','due','done','acct','eng','project','parent'].forEach(k=>{if(o[k]==='')o[k]=null;}); }
  if(coll==='templates'){ if('dueDay' in o){o.due_day=parseInt(o.dueDay)||1;delete o.dueDay;} if('active' in o){o.active=(o.active!=="No"&&o.active!==false);} }
  if(coll==='people'||coll==='services'){ if('active' in o){o.active=(o.active!=="No"&&o.active!==false);} }
  if(coll==='accounts'){ if(o.parent==='')o.parent=null; }
  if(coll==='deals'){ ['contract_date','signed_date','close_date'].forEach(k=>{if(o[k]==='')o[k]=null;}); }
  if(coll==='projects'){ ['start_date','due_date'].forEach(k=>{if(o[k]==='')o[k]=null;}); }
  return o; }
async function fetchColl(coll){
  const {data,error}=await sb.from(coll).select('*');
  if(error){ if(SOFT.has(coll)){store[coll]=[];loaded[coll]=true;return;} toast("Load error: "+coll); console.error(coll,error); return; }
  store[coll]=data.map(r=>fromDB(coll,r));
  if(coll==='accounts'){ AMAP={}; store.accounts.forEach(a=>AMAP[a.id]=a); rebuildBrandFilter(); }
  if(coll==='tasks'){ const s=new Set(store.tasks.map(x=>x.owner).filter(Boolean)); if(s.size){TEAM=[...new Set([...TEAM,...s])];rebuildTeamFilter();} }
  loaded[coll]=true;
}
function subscribe(coll){
  try{ sb.channel('rt-'+coll).on('postgres_changes',{event:'*',schema:'public',table:coll},async()=>{ await fetchColl(coll); render(); }).subscribe(); }catch(e){ console.error(e); }
}
let _refreshing=false;
function _busyEditing(){ try{ if(document.querySelector('.modal.show'))return true; const a=document.activeElement; if(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))return true; }catch(e){} return false; }
async function refreshAll(){ if(_refreshing||!booted||_busyEditing())return; _refreshing=true; try{ await Promise.all(ALLCOLLS.map(fetchColl)); render(); }catch(e){ console.error(e); } _refreshing=false; }
async function loadAll(){
  try{ await Promise.all(ALLCOLLS.map(fetchColl)); }catch(e){ console.error(e); }
  render();
  ALLCOLLS.forEach(subscribe);
  // keep the shared workspace fresh even without Supabase Realtime:
  setInterval(()=>{ if(typeof document==='undefined'||!document.hidden) refreshAll(); },40000);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{ if(!document.hidden) refreshAll(); });
}
function applyLocal(coll,id,patch){ const arr=store[coll]; if(!arr)return; const i=arr.findIndex(x=>x.id===id); if(i>=0){ Object.assign(arr[i],patch); render(); } }
const errMsg=e=>{const s=(e&&(e.message||e.hint||e.details))||"";return s?(": "+String(s).slice(0,140)):"";};
const ready=()=>COLLS.every(c=>loaded[c]);

async function write(coll,id,patch){
  if(!canWrite){toast("Read-only access");return;}
  const o=toDB(coll,patch); delete o.id;              // never try to update the primary key
  const {error}=await sb.from(coll).update(o).eq('id',id);
  if(error){ toast("Save failed"+errMsg(error)); console.error(error); } else { toast("Saved"); applyLocal(coll,id,patch); }
}
async function create(coll,id,data){ if(!canWrite){toast("Read-only access");return;} const row=Object.assign({id},toDB(coll,data)); const {error}=await sb.from(coll).insert(row); if(error){ toast("Add failed"+errMsg(error)); console.error(error);} else { toast("Added"); logAct("added",coll,id,data.name||data.desc||""); await fetchColl(coll); render(); } }
async function remove(coll,id){ if(!canWrite){toast("Read-only access");return;} const row=(store[coll]||[]).find(r=>r.id===id); const {error}=await sb.from(coll).delete().eq("id",id); if(error){ toast("Delete failed"+errMsg(error)); console.error(error);} else { logAct("deleted",coll,id,""); await fetchColl(coll); render(); if(row)undoToast("Deleted",coll,[row]); else toast("Deleted"); } }
async function restoreRows(coll,rows){ if(!canWrite||!rows||!rows.length)return; const payload=rows.map(r=>toDB(coll,Object.assign({},r))); const {error}=await sb.from(coll).insert(payload); if(error){ toast("Undo failed"); console.error(error); return; } rows.forEach(r=>logAct("restored",coll,r.id,r.desc||r.name||"")); await fetchColl(coll); render(); toast(rows.length>1?("Restored "+rows.length):"Restored"); }
function undoToast(msg,coll,rows){ const t=$('toast'); if(!t)return; const hide=()=>{t.classList.remove('show');t.style.pointerEvents='';t.innerHTML='';}; t.innerHTML=`<span>${esc(msg)}</span><button id="undoBtn" class="undobtn">Undo</button>`; t.classList.add('show'); t.style.pointerEvents='auto'; clearTimeout(t._t); t._t=setTimeout(hide,7000); const b=$('undoBtn'); if(b)b.onclick=()=>{clearTimeout(t._t);hide();restoreRows(coll,rows);}; }
async function createMany(coll,rows){ if(!canWrite){toast("Read-only access");return;} if(!rows.length)return; const payload=rows.map(r=>toDB(coll,r)); const {error}=await sb.from(coll).insert(payload); if(error){ toast("Add failed"+errMsg(error)); console.error(error);} else { toast("Added "+rows.length); rows.forEach(r=>logAct("added",coll,r.id,r.desc||"")); await fetchColl(coll); render(); } }
async function removeMany(coll,ids){ if(!canWrite){toast("Read-only access");return;} if(!ids.length)return; const rows=(store[coll]||[]).filter(r=>ids.includes(r.id)); const {error}=await sb.from(coll).delete().in("id",ids); if(error){ toast("Delete failed"+errMsg(error)); console.error(error);} else { ids.forEach(id=>logAct("deleted",coll,id,"")); await fetchColl(coll); render(); undoToast("Deleted "+ids.length,coll,rows); } }
async function updateMany(coll,ids,patch){ if(!canWrite){toast("Read-only access");return;} if(!ids.length)return; const o=toDB(coll,patch); delete o.id; const {error}=await sb.from(coll).update(o).in("id",ids); if(error){ toast("Save failed"+errMsg(error)); console.error(error);} else { toast("Saved"); await fetchColl(coll); render(); } }
function nextId(coll,prefix,pad){let mx=0;store[coll].forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});return prefix+String(mx+1).padStart(pad,"0");}
async function logAct(act,coll,id,label){ try{ await sb.from("activity").insert({who:myName,action:act,coll,doc_id:id,label:label||""}); }catch(e){} }
function dl(name,text){const blob=new Blob(["﻿"+text],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},120);}
function csvCell(v){v=v==null?"":String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function exportTasksCSV(rows,fname){
  const cols=[["id","Task ID"],["_brand","Brand"],["name","Task"],["owner","Owner"],["priority","Priority"],["reqby","Requested By"],["logged","Logged"],["due","Due"],["done","Done"],["status","Status"],["tags","Tags"],["details","Details"],["output","Output"]];
  const head=cols.map(c=>csvCell(c[1])).join(",");
  const body=rows.map(t=>cols.map(c=>csvCell(c[0]==="_brand"?brandOf(t.acct):t[c[0]])).join(",")).join("\n");
  dl(fname,head+"\n"+body);
}

// ---------- bulk import (tasks) ----------
function parseCSV(text){
  text=text.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const rows=[];let row=[],f="",q=false,i=0;
  while(i<text.length){const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i+=2;continue;} q=false;i++;continue; } f+=c;i++;continue; }
    if(c==='"'){q=true;i++;continue;}
    if(c===","){row.push(f);f="";i++;continue;}
    if(c==="\n"){row.push(f);rows.push(row);row=[];f="";i++;continue;}
    f+=c;i++;
  }
  if(f!==""||row.length){row.push(f);rows.push(row);}
  return rows.filter(r=>!(r.length===1&&r[0].trim()===""));
}
const TASK_IMPORT_COLS=["name","brand","owner","priority","due","status","details","tags"];
function downloadTaskTemplate(){
  const sample=[
    ["Prepare October report","Weldon Group","Daoud","High","2026-11-05","To Do","Pull the numbers and format // send to client","reporting"],
    ["Design new banner","","Arafa","Medium","","To Do","",""]
  ];
  const csv=[TASK_IMPORT_COLS.join(",")].concat(sample.map(r=>r.map(csvCell).join(","))).join("\n");
  dl("pivot-tasks-template.csv",csv);
}
function rowsToTasks(rows){
  if(!rows.length)return{out:[],warn:[],err:"The file is empty."};
  const header=rows[0].map(h=>h.trim().toLowerCase());
  if(header.indexOf("name")<0)return{out:[],warn:[],err:"No 'name' column found. Download the template and match the headers."};
  const col={};TASK_IMPORT_COLS.forEach(c=>col[c]=header.indexOf(c));
  const brandMap={};store.accounts.forEach(a=>{if(a.brand)brandMap[a.brand.toLowerCase().trim()]=a.id;});
  const out=[],warn=new Set();
  for(let i=1;i<rows.length;i++){const r=rows[i];const g=k=>col[k]>=0&&r[col[k]]!=null?String(r[col[k]]).trim():"";
    const name=g("name");if(!name)continue;
    let acct="";const brand=g("brand");if(brand){acct=brandMap[brand.toLowerCase()]||"";if(!acct)warn.add(brand);}
    const pri=PRIOS.find(p=>p.toLowerCase()===g("priority").toLowerCase())||"Medium";
    const st=STATUSES.find(s=>s.toLowerCase()===g("status").toLowerCase())||"To Do";
    out.push({name,acct,owner:g("owner"),priority:pri,due:g("due"),status:st,details:g("details"),tags:g("tags")});
  }
  return {out,warn:[...warn],err:out.length?"":"No rows with a task name were found."};
}
function openImportTasks(){
  if(!canWrite){toast("Read-only access");return;}
  let parsed=null;
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">Bulk import</div><h3>Import tasks from CSV</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formfull">
      <div id="impDrop" class="dropzone"><div class="muted" style="margin-bottom:8px">Drag and drop a CSV here, or</div><button class="btn" id="impPick" type="button">+ Choose file</button><input type="file" id="impFile" accept=".csv,text/csv" style="display:none"><div id="impName" class="muted" style="margin-top:10px;font-size:12px"></div></div>
      <div style="margin-top:10px;font-size:12px"><a href="#" id="impTpl">Download template</a> <span class="muted">· columns: name, brand, owner, priority, due (YYYY-MM-DD), status, details, tags. Only name is required.</span></div>
      <div id="impMsg" style="margin-top:10px;font-size:12px"></div>
    </div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="impGo" disabled>Import</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('impTpl').onclick=e=>{e.preventDefault();downloadTaskTemplate();};
  const handleFile=file=>{if(!file)return;$('impName').textContent=file.name;
    const rd=new FileReader();rd.onload=()=>{try{const rows=parseCSV(String(rd.result));parsed=rowsToTasks(rows);
        if(parsed.err){$('impMsg').innerHTML=`<span style="color:var(--bad)">${esc(parsed.err)}</span>`;$('impGo').disabled=true;return;}
        const w=parsed.warn.length?` <span style="color:var(--warn)">${parsed.warn.length} brand name${parsed.warn.length===1?'':'s'} not matched (left blank): ${esc(parsed.warn.slice(0,5).join(', '))}${parsed.warn.length>5?'…':''}</span>`:'';
        $('impMsg').innerHTML=`<b>${parsed.out.length}</b> task${parsed.out.length===1?'':'s'} ready to import.${w}`;$('impGo').disabled=!parsed.out.length;
      }catch(err){$('impMsg').innerHTML=`<span style="color:var(--bad)">Could not read that file.</span>`;$('impGo').disabled=true;}};
    rd.readAsText(file);};
  $('impPick').onclick=()=>$('impFile').click();
  $('impFile').onchange=e=>handleFile(e.target.files&&e.target.files[0]);
  const dz=$('impDrop');
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('over');}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('over');}));
  dz.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];handleFile(f);});
  $('impGo').onclick=async()=>{if(!parsed||!parsed.out.length)return;$('impGo').disabled=true;$('impGo').textContent="Importing…";
    let base=0;store.tasks.forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)base=Math.max(base,+m[1]);});
    const rows=parsed.out.map((e,i)=>({id:"TSK-"+String(base+1+i).padStart(4,"0"),acct:e.acct,eng:"",name:e.name,details:e.details,owner:e.owner,priority:e.priority,reqby:"Import",logged:todayISO,due:e.due,done:(e.status==="Done"?todayISO:""),status:e.status,output:"",notes:"",tags:e.tags,project:"",parent:""}));
    await createMany("tasks",rows);close();};
}
function rebuildBrandFilter(){const s=$('fBrand');if(!s)return;const cur=s.value;
  while(s.children.length>1)s.removeChild(s.lastChild);   // keep the "All brands" option, drop old optgroups
  const life={};store.accounts.forEach(a=>{if(a.brand&&!(a.brand in life))life[a.brand]=a.lifecycle||"";});
  const names=Object.keys(life).sort();
  const active=names.filter(b=>life[b]==="Active");
  const other=names.filter(b=>life[b]!=="Active");
  const grp=(label,arr)=>{if(!arr.length)return;const og=document.createElement('optgroup');og.label=label;arr.forEach(b=>og.appendChild(new Option(b,b)));s.appendChild(og);};
  grp("Active",active);grp("Other",other);
  s.value=cur;}
function rebuildTeamFilter(){const s=$('fTeam');const cur=s.value;s.length=1;TEAM.slice().sort().forEach(t=>s.add(new Option(t,t)));s.value=cur;}
function tasksF(){return store.tasks.filter(t=>{
  if(F.brand&&brandOf(t.acct)!==F.brand)return false;
  if(F.team&&t.owner!==F.team)return false;
  if(F.status&&t.status!==F.status)return false;
  if(F.q){const s=(t.id+" "+(t.name||"")+" "+brandOf(t.acct)+" "+(t.owner||"")+" "+(t.tags||"")).toLowerCase();if(!s.includes(F.q))return false;}
  return true;});}
function applyQuick(arr){if(!F.quick)return arr;return arr.filter(t=>{
  if(F.quick==='open')return t.status!=='Done';
  if(F.quick==='done')return t.status==='Done';
  if(F.quick==='overdue')return t.status!=='Done'&&t.due&&t.due<todayISO;
  if(F.quick==='week')return t.status!=='Done'&&t.due&&t.due>=todayISO&&(new Date(t.due)-new Date(todayISO))<=7*864e5;
  if(F.quick==='unassigned')return !t.owner;
  if(F.quick==='high')return t.status!=='Done'&&t.priority==='High';
  return true;});}
function moneyF(){return store.money.filter(m=>{
  if(F.brand&&brandOf(m.acct)!==F.brand)return false;
  if(F.q){const s=((m.id||"")+" "+(m.desc||"")+" "+brandOf(m.acct)+" "+(m.cat||"")).toLowerCase();if(!s.includes(F.q))return false;}
  return true;});}
const flag=t=>{if(t.status==="Done")return["Done","flag-ok"];if(!t.due)return["—","flag-ok"];
  if(t.due<todayISO)return["Overdue","flag-over"];if((new Date(t.due)-new Date(todayISO))<=7*864e5)return["Due soon","flag-soon"];return["On track","flag-ok"];};
const owed=m=>m.dir==="Income"&&m.status!=="Paid"&&m.status!=="Voided"&&m.status!=="Cancelled";
const voided=m=>m.status==="Voided"||m.status==="Cancelled";
const sCls=s=>({"To Do":"s-todo","In Progress":"s-prog","Review":"s-review","Done":"s-done","On Hold":"s-hold"}[s]||"s-todo");
const opts=(list,sel)=>list.map(o=>`<option${o===sel?" selected":""}>${esc(o)}</option>`).join("");
const brandOpts=sel=>`<option value="">—</option>`+store.accounts.filter(a=>a.id===sel||(a.lifecycle!=="Churned"&&a.lifecycle!=="Lost")).map(a=>`<option value="${esc(a.id)}"${a.id===sel?" selected":""}>${esc(a.brand)}</option>`).join("");
function teamActive(){const p=(store.people||[]).filter(x=>x.active!=="No"&&x.active!==false);return p.length?p.map(x=>x.name):[...TEAM_ACTIVE];}
function activeOwners(cur){const a=[...teamActive()];if(cur&&!a.includes(cur))a.push(cur);return a;}
function accountOpts(sel,excludeId){return `<option value="">— none —</option>`+[...store.accounts].filter(a=>a.id!==excludeId).sort((x,y)=>(x.brand||'').localeCompare(y.brand||'')).map(a=>`<option value="${esc(a.id)}"${a.id===sel?" selected":""}>${esc(a.brand)}</option>`).join("");}
const CMAP={status:{"To Do":["var(--hold-soft)","var(--hold)"],"In Progress":["var(--warn-soft)","var(--warn)"],"Review":["var(--accent-soft)","var(--accent)"],"Done":["var(--good-soft)","var(--good)"],"On Hold":["var(--hold-soft)","var(--hold)"]},
  priority:{High:["var(--bad-soft)","var(--bad)"],Medium:["var(--warn-soft)","var(--warn)"],Low:["var(--good-soft)","var(--good)"]},
  pay:{Paid:["var(--good-soft)","var(--good)"],Partial:["var(--warn-soft)","var(--warn)"],Unpaid:["var(--bad-soft)","var(--bad)"],Voided:["var(--hold-soft)","var(--hold)"],Cancelled:["var(--hold-soft)","var(--hold)"]},
  payout:{Pending:["var(--warn-soft)","var(--warn)"],Paid:["var(--good-soft)","var(--good)"]},
  life:{Active:["var(--good-soft)","var(--good)"],Lead:["var(--info-soft)","var(--info)"],Paused:["var(--warn-soft)","var(--warn)"],Churned:["var(--hold-soft)","var(--hold)"],Lost:["var(--bad-soft)","var(--bad)"],Internal:["var(--accent-soft)","var(--accent)"]},
  proj:{Planned:["var(--info-soft)","var(--info)"],Active:["var(--good-soft)","var(--good)"],"On Hold":["var(--warn-soft)","var(--warn)"],Done:["var(--hold-soft)","var(--hold)"]}};
function cstyle(kind,val){const map=CMAP[kind]||{};let c=map[val];if(!c&&val){const key=String(val).trim().toLowerCase();const hit=Object.keys(map).find(k=>k.toLowerCase()===key);if(hit)c=map[hit];}return c?`background-color:${c[0]};color:${c[1]};border-color:transparent`:"";}
function csel(kind,coll,id,field,val,list,ro){return `<select class="edit csel" data-color="${kind}" data-c="${coll}" data-id="${esc(id)}" data-f="${field}" style="${cstyle(kind,val)}" ${ro}>${opts(list,val)}</select>`;}

function donut(parts,size=150){const tot=parts.reduce((a,p)=>a+p.v,0)||1,R=size/2,r=R*0.62;let a0=-Math.PI/2,paths="";
  parts.forEach(p=>{const fr=p.v/tot,a1=a0+fr*2*Math.PI,x0=R+R*Math.cos(a0),y0=R+R*Math.sin(a0),x1=R+R*Math.cos(a1),y1=R+R*Math.sin(a1),
   xi1=R+r*Math.cos(a1),yi1=R+r*Math.sin(a1),xi0=R+r*Math.cos(a0),yi0=R+r*Math.sin(a0),big=fr>0.5?1:0;
   if(p.v>0)paths+=`<path class="pieslice" ${p.k?`data-drill="status" data-val="${esc(p.k)}" data-tip="${esc(p.k)}: ${p.v}"`:""} d="M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${xi1} ${yi1} A${r} ${r} 0 ${big} 0 ${xi0} ${yi0} Z" fill="${p.c}"/>`;a0=a1;});
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${paths}<text x="${R}" y="${R-2}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--ink)" font-family="var(--mono)">${tot}</text><text x="${R}" y="${R+16}" text-anchor="middle" font-size="11" fill="var(--muted)">tasks</text></svg>`;}
function hbars(items,unit,drill){const max=Math.max(1,...items.map(i=>i.v));return `<div class="hbars">`+
  items.map(i=>`<div class="hbar-row${drill?' drill':''}" ${drill?`data-drill="${drill}" data-val="${esc(i.l)}"`:""}>
   <span class="hbar-lab muted" title="${esc(i.l)}">${esc(i.l)}</span>
   <span class="hbar-track"><span class="hbar-fill" style="width:${Math.max(i.v>0?2:0,i.v/max*100)}%;${i.c?`background:${i.c}`:''}"></span></span>
   <span class="num hbar-val">${unit==='kd'?KD(i.v):i.v}</span></div>`).join("")+`</div>`;}
const kpi=(l,v,c,dh)=>`<div class="kpi ${c||''}"><span class="lab">${l}</span><span class="val">${v}</span>${dh?`<span class="kdelta">${dh}</span>`:''}<span class="bar"></span></div>`;
function kShort(v){v=+v||0;const a=Math.abs(v);if(a>=1000)return (v/1000).toFixed(a>=10000?0:1).replace(/\.0$/,'')+'k';return Math.round(v);}
function vbars(items,unit){const max=Math.max(1,...items.map(i=>i.v));return `<div style="display:flex;align-items:flex-end;gap:3px;height:148px;padding-top:18px">`+
  items.map(i=>`<div data-tip="${esc(i.l)}: ${unit==='kd'?'KD '+KD(i.v):i.v}" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px;min-width:0;cursor:default">
   <span class="barval">${i.v?(unit==='kd'?kShort(i.v):i.v):''}</span>
   <div style="width:100%;max-width:34px;background:var(--accent);border-radius:4px 4px 0 0;height:${Math.max(2,Math.round(i.v/max*100))}px"></div>
   <span class="muted" style="font-size:9px;white-space:nowrap;overflow:hidden;max-width:100%">${esc(i.s||i.l)}</span></div>`).join("")+`</div>`;}
function isoAdd(iso,days){const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function daysBetween(a,b){return Math.round((new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z'))/864e5);}
function shiftMonths(iso,n){const d=new Date(iso+'T00:00:00Z');const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
function shiftYears(iso,n){return shiftMonths(iso,n*12);}
function rangeFor(p){const T=todayISO;const d=new Date(T+'T00:00:00Z');const y=d.getUTCFullYear(),m=d.getUTCMonth();const pad=x=>String(x).padStart(2,'0');
  if(p==='today')return{from:T,to:T};
  if(p==='yesterday'){const yx=isoAdd(T,-1);return{from:yx,to:yx};}
  if(p==='last7')return{from:isoAdd(T,-6),to:T};
  if(p==='last30')return{from:isoAdd(T,-29),to:T};
  if(p==='last90')return{from:isoAdd(T,-89),to:T};
  if(p==='wtd'){const dow=d.getUTCDay();return{from:isoAdd(T,-dow),to:T};}
  if(p==='qtd'){const qm=Math.floor(m/3)*3;return{from:`${y}-${pad(qm+1)}-01`,to:T};}
  if(p==='ytd')return{from:`${y}-01-01`,to:T};
  if(p==='lastmonth'){const first=`${y}-${pad(m+1)}-01`;return{from:shiftMonths(first,-1),to:isoAdd(first,-1)};}
  if(p==='all')return{from:'2000-01-01',to:'9999-12-31'};
  return{from:`${y}-${pad(m+1)}-01`,to:T};}
function activeRange(){if(state.range.preset==='custom'){return{from:state.range.from||rangeFor('mtd').from,to:state.range.to||todayISO};}return rangeFor(state.range.preset);}
function cmpRange(from,to){const c=state.cmp;if(c==='none')return null;
  if(c==='prev_period'){const len=daysBetween(from,to)+1;return{from:isoAdd(from,-len),to:isoAdd(from,-1)};}
  if(c==='prev_month')return{from:shiftMonths(from,-1),to:shiftMonths(to,-1)};
  if(c==='prev_year')return{from:shiftYears(from,-1),to:shiftYears(to,-1)};
  return null;}
function saveRange(){try{localStorage.setItem('pivot_range',JSON.stringify(state.range));localStorage.setItem('pivot_cmp',state.cmp);}catch(e){}}
function delta(cur,prev,goodUp){if(prev==null)return"";
  if(prev===0&&cur===0)return`<span class="delta d-flat">—</span>`;
  if(prev===0)return`<span class="delta d-${goodUp?'good':'bad'}">▲ new</span>`;
  const pct=Math.round((cur-prev)/Math.abs(prev)*100);const up=cur>=prev;const good=goodUp?up:!up;
  return `<span class="delta d-${pct===0?'flat':(good?'good':'bad')}">${up?'▲':'▼'} ${pct>0?'+':''}${pct}%</span>`;}
function rangeBar(actions){
  const presets=[['today','Today'],['yesterday','Yesterday'],['last7','Last 7 days'],['last30','Last 30 days'],['last90','Last 90 days'],['wtd','Week to date'],['mtd','Month to date'],['qtd','Quarter to date'],['ytd','Year to date'],['lastmonth','Last month'],['all','All time'],['custom','Custom']];
  const cmps=[['none','No comparison'],['prev_period','Previous period'],['prev_month','Previous month'],['prev_year','Previous year']];
  const isC=state.range.preset==='custom';const R=activeRange();const C=cmpRange(R.from,R.to);
  return `<div class="rangebar">
    <select id="dPreset">${presets.map(p=>`<option value="${p[0]}"${state.range.preset===p[0]?' selected':''}>${p[1]}</option>`).join("")}</select>
    ${isC?`<input type="date" id="dFrom" value="${esc(state.range.from)}"><span class="muted">to</span><input type="date" id="dTo" value="${esc(state.range.to)}">`:`<span class="muted" style="font-size:12px">${esc(R.from)} → ${esc(R.to==='9999-12-31'?'now':R.to)}</span>`}
    <span class="muted" style="font-size:12px">vs</span>
    <select id="dCmp">${cmps.map(c=>`<option value="${c[0]}"${state.cmp===c[0]?' selected':''}>${c[1]}</option>`).join("")}</select>
    ${C?`<span class="muted" style="font-size:11px">${esc(C.from)} → ${esc(C.to)}</span>`:""}
    <span style="flex:1"></span>
    ${actions||''}
  </div>`;}
function wireRange(rerender){
  const p=$('dPreset');if(p)p.onchange=e=>{state.range.preset=e.target.value;if(state.range.preset==='custom'&&!state.range.from){const r=rangeFor('mtd');state.range.from=r.from;state.range.to=r.to;}saveRange();rerender();};
  const c=$('dCmp');if(c)c.onchange=e=>{state.cmp=e.target.value;saveRange();rerender();};
  const f=$('dFrom');if(f)f.onchange=e=>{state.range.from=e.target.value;saveRange();rerender();};
  const t=$('dTo');if(t)t.onchange=e=>{state.range.to=e.target.value;saveRange();rerender();};}
function moneySeries(from,to){
  // collected over time: plot income on the date it was actually paid, not when it was billed
  let Mall=moneyF().filter(m=>m.dir==='Income'&&m.status==='Paid');
  const pd=m=>m.paid||m.date||'';
  if(Mall.length){const minD=Mall.reduce((a,m)=>{const d=pd(m);return (d&&d<a)?d:a;},'9999-12-31');if(from<minD)from=minD;}
  if(to>todayISO)to=todayISO;
  const byMonth=daysBetween(from,to)>45;const map={};
  Mall.forEach(m=>{const dt=pd(m);if(!dt||dt<from||dt>to)return;const key=byMonth?dt.slice(0,7):dt;map[key]=(map[key]||0)+(+m.amt||0);});
  const items=[];let guard=0;
  if(byMonth){let cur=from.slice(0,7),end=to.slice(0,7);while(cur<=end&&guard<36){items.push({l:cur,s:cur.slice(2),v:map[cur]||0});const[yy,mm]=cur.split('-').map(Number);cur=mm===12?`${yy+1}-01`:`${yy}-${String(mm+1).padStart(2,'0')}`;guard++;}}
  else{let cur=from;while(cur<=to&&guard<62){items.push({l:cur,s:cur.slice(5),v:map[cur]||0});cur=isoAdd(cur,1);guard++;}}
  return items;}

function renderTasksDash(){
  const T=tasksF();
  const open=T.filter(t=>t.status!=="Done").length,done=T.filter(t=>t.status==="Done").length;
  const overdue=T.filter(t=>t.status!=="Done"&&t.due&&t.due<todayISO).length;
  const high=T.filter(t=>t.status!=="Done"&&t.priority==="High").length;
  const scol={"To Do":"#9aa0aa","In Progress":"var(--warn)","Review":"#4b5563","Done":"var(--good)","On Hold":"#c2c6cc"};
  const sParts=STATUSES.map(s=>({name:s,v:T.filter(t=>t.status===s).length,c:scol[s]}));
  const ownerItems=TEAM.map(tm=>({l:tm,v:T.filter(t=>t.status!=="Done"&&t.owner===tm).length})).filter(i=>i.v).sort((a,b)=>b.v-a.v);
  const byBrand={};T.forEach(t=>{if(t.status!=="Done"){const b=brandOf(t.acct);byBrand[b]=(byBrand[b]||0)+1;}});
  const topBrand=Object.entries(byBrand).map(([l,v])=>({l,v})).sort((a,b)=>b.v-a.v).slice(0,7);
  const attn=T.filter(t=>t.status!=="Done"&&t.due).sort((a,b)=>(a.due||"").localeCompare(b.due||"")).slice(0,8);
  const R=activeRange(),C=cmpRange(R.from,R.to);
  const inR=(v,from,to)=>v&&v>=from&&v<=to;
  const tagg=(from,to)=>({created:T.filter(t=>inR(t.logged,from,to)).length,completed:T.filter(t=>inR(t.done,from,to)).length});
  const curT=tagg(R.from,R.to),prevT=C?tagg(C.from,C.to):null;
  $('view').innerHTML=`<div class="view">
    ${rangeBar(`<button class="ghost" id="repBtn">Export report</button>`)}
    <div class="kpis">${kpi("Logged in range",curT.created,"accent",prevT?delta(curT.created,prevT.created,true):"")}${kpi("Completed in range",curT.completed,"good",prevT?delta(curT.completed,prevT.completed,true):"")}</div>
    <div class="kpis">${kpi("Open tasks",open,"accent")}${kpi("Overdue",overdue,"bad")}${kpi("High open",high,"warn")}${kpi("Done",done,"good")}${kpi("Active brands",store.accounts.filter(a=>a.lifecycle==="Active").length,"")}${kpi("Engagements",store.engagements.length,"")}</div>
    <div class="grid3">
      <div class="panel"><h2>Needs attention, soonest due</h2><div class="attn">${attn.length?attn.map(t=>{const[fl,fc]=flag(t);return `<div class="r"><span class="t"><button class="linkname" data-open="${esc(t.id)}">${esc(t.name||t.id)}</button> <span class="muted">· ${esc(brandOf(t.acct))}</span></span><span class="${fc}">${esc(t.due||'')}</span></div>`;}).join(""):'<div class="rowcount">Nothing due.</div>'}</div></div>
      <div class="panel"><h2>Tasks by status</h2><div class="body" style="display:flex;justify-content:center">${donut(sParts.map(p=>({v:p.v,c:p.c,k:p.name})))}</div><div class="legend">${sParts.map(p=>`<span class="drill" data-drill="status" data-val="${esc(p.name)}"><span class="sw" style="background:${p.c}"></span>${p.name} ${p.v}</span>`).join("")}</div></div>
      <div class="panel"><h2>Open tasks by owner</h2><div class="body">${ownerItems.length?hbars(ownerItems,null,'team'):'<div class="muted">No open tasks</div>'}</div></div>
    </div>
    <div class="panel"><h2>Busiest brands (open work)</h2><div class="body">${topBrand.length?hbars(topBrand,null,'brand'):'<div class="muted">—</div>'}</div></div>
  </div>`;
  wireRange(renderTasksDash);
  if($('repBtn'))$('repBtn').onclick=()=>openReport('tasks');
}
// ---- money maths, one place, testable ----
// outflow still owed (expense/salary/payout not yet paid, not voided)
const owedOut=m=>(m.dir==='Expense'||m.dir==='Salary'||m.dir==='Payout')&&m.status!=='Paid'&&!voided(m);
function moneyStats(M,from,to){
  const sumAmt=arr=>arr.reduce((a,m)=>a+(+m.amt||0),0);
  const issuedIn=rows=>rows.filter(m=>!voided(m)&&(m.date||'')>=from&&(m.date||'')<=to);
  const paidIn=rows=>rows.filter(m=>m.status==='Paid'&&(m.paid||m.date||'')>=from&&(m.paid||m.date||'')<=to);
  const perType={};
  [['income','Income'],['expense','Expense'],['salary','Salary'],['payout','Payout']].forEach(([k,dir])=>{
    const rows=M.filter(m=>m.dir===dir);
    perType[k]={issued:Math.abs(sumAmt(issuedIn(rows))),paid:Math.abs(sumAmt(paidIn(rows)))};
  });
  const cashIn=perType.income.paid;
  const cashOut=perType.expense.paid+perType.salary.paid+perType.payout.paid;
  const cashflow=cashIn-cashOut;                                   // cash basis, in range
  const accrualNet=perType.income.issued-perType.expense.issued-perType.salary.issued-perType.payout.issued;
  const allPaid=dir=>Math.abs(sumAmt(M.filter(m=>m.dir===dir&&m.status==='Paid')));
  const bankBalance=allPaid('Income')-allPaid('Expense')-allPaid('Salary')-allPaid('Payout'); // all time, money left
  const toCollect=sumAmt(M.filter(m=>m.dir==='Income'&&!voided(m)&&m.status!=='Paid'));         // unpaid invoices, all time
  const toPayOut=Math.abs(sumAmt(M.filter(owedOut)));                                           // unpaid outflows, all time
  return {perType,cashIn,cashOut,cashflow,accrualNet,bankBalance,toCollect,toPayOut};
}
// one compact "paid of issued" row with a filled track; both figures click through to the items
function ivpRow(label,issued,paid,collect,type){
  const pct=issued>0?Math.round(paid/issued*100):(paid>0?100:0);
  const left=Math.max(0,issued-paid);
  const col=collect?'var(--good)':'var(--accent)';
  return `<div class="ivp">
    <div class="ivptop"><span class="ivplab">${label}</span><span class="ivpval"><b class="dmlink" data-dm="${type}:paid" title="See which">KD ${KD(paid)}</b> <span class="muted">of</span> <span class="dmlink" data-dm="${type}:issued" title="See which">KD ${KD(issued)}</span></span></div>
    <div class="ivptrack dmlink" data-dm="${type}:issued"><div class="ivpfill" style="width:${Math.min(100,pct)}%;background:${col}"></div></div>
    <div class="ivpfoot"><span class="muted">${pct}% ${collect?'collected':'paid'}</span><span class="muted">${left>0?('KD '+KD(left)+(collect?' to collect':' to pay')):'all settled'}</span></div>
  </div>`;
}
// cash-position waterfall: bank now, minus what's committed (pending out), the free cash that leaves,
// plus what's expected in, and the projected balance. Floating bars, drillable where it makes sense.
function cashWaterfall(items){
  let run=0;const segs=[];
  for(const it of items){
    if(it.type==='start'){segs.push({l:it.l,from:0,to:it.v,v:it.v,k:'start',end:it.v,dm:it.dm});run=it.v;}
    else if(it.type==='down'){const nx=run-Math.abs(it.v);segs.push({l:it.l,from:run,to:nx,v:-Math.abs(it.v),k:'down',end:nx,dm:it.dm});run=nx;}
    else if(it.type==='up'){const nx=run+Math.abs(it.v);segs.push({l:it.l,from:run,to:nx,v:Math.abs(it.v),k:'up',end:nx,dm:it.dm});run=nx;}
    else{segs.push({l:it.l,from:0,to:run,v:run,k:'total',end:run,dm:it.dm});}
  }
  const vals=segs.flatMap(s=>[s.from,s.to]);
  const hi=Math.max(0,...vals),lo=Math.min(0,...vals),rng=(hi-lo)||1;
  const n=segs.length,bw=54,gap=28,W=Math.max(300,n*bw+(n+1)*gap),H=150,pad=22;
  const Y=v=>pad+(H-2*pad)*((hi-v)/rng);
  const colFor={start:'var(--accent)',down:'var(--bad)',up:'var(--good)',total:'var(--muted)'};
  let bars='',conn='',labs='';
  segs.forEach((s,i)=>{
    const x=gap+i*(bw+gap);
    const yTop=Y(Math.max(s.from,s.to)),yBot=Y(Math.min(s.from,s.to)),h=Math.max(3,yBot-yTop);
    const dm=s.dm?` class="dmlink" data-dm="${s.dm}"`:'';
    bars+=`<rect${dm} x="${x}" y="${yTop}" width="${bw}" height="${h}" rx="3" fill="${colFor[s.k]}" opacity="${s.k==='total'?0.8:0.92}"/>`;
    labs+=`<text x="${x+bw/2}" y="${yTop-6}" text-anchor="middle" font-size="11" font-weight="600" font-family="var(--mono)" fill="var(--ink)">${s.v<0?'-':(s.k==='up'?'+':'')}${kShort(Math.abs(s.v))}</text>`;
    (s.l.split(' ').length>1?[s.l.split(' ').slice(0,2).join(' '),s.l.split(' ').slice(2).join(' ')]:[s.l]).filter(Boolean).forEach((ln,j)=>{labs+=`<text x="${x+bw/2}" y="${H+13+j*12}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(ln)}</text>`;});
    if(i<n-1){const nx=gap+(i+1)*(bw+gap);conn+=`<line x1="${x+bw}" y1="${Y(s.end)}" x2="${nx}" y2="${Y(s.end)}" stroke="var(--line)" stroke-dasharray="3 3"/>`;}
  });
  return `<svg viewBox="0 0 ${W} ${H+34}" width="100%" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto">
    <line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" stroke="var(--line)"/>${conn}${bars}${labs}</svg>`;
}
// popup listing the exact items behind a dashboard number, with a button into the full list
function drillList(title,rows,viewKey,viewLabel){
  rows=[...rows].sort((a,b)=>(((b.paid||b.date||'')+'').localeCompare((a.paid||a.date||''))));
  const tot=rows.reduce((s,m)=>s+Math.abs(+m.amt||0),0);
  const body=rows.length?rows.map(m=>`<div class="r"><span class="t"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.desc||m.inv_no||m.id)}</button> <span class="muted">· ${esc(brandOf(m.acct)||m.partner||'')}</span></span><span style="display:flex;gap:8px;align-items:center;white-space:nowrap"><span class="num">KD ${KD(Math.abs(+m.amt||0))}</span><span class="dchip ${m.status==='Paid'?'dchip-good':(owed(m)||owedOut(m)?'dchip-warn':'')}">${esc(m.status||'')}</span> <span class="muted">${esc(m.paid||m.date||'')}</span></span></div>`).join(""):'<div class="rowcount">Nothing here.</div>';
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${rows.length} item${rows.length===1?'':'s'} · KD ${KD(tot)}</div><h3>${esc(title)}</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formfull"><div class="attn">${body}</div></div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Close</button>${viewKey?`<button class="btn" id="drillGo">Open ${esc(viewLabel||viewKey)}</button>`:''}</div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  if($('drillGo'))$('drillGo').onclick=()=>{state.view=viewKey;try{localStorage.setItem('pivot_view',viewKey);}catch(_){}close();render();};
}
function openCashPosition(){
  const b=moneyStats(store.money,'0000-01-01','9999-12-31');
  const pendSal=Math.abs(store.money.filter(m=>m.dir==='Salary'&&m.status!=='Paid'&&!voided(m)).reduce((s,m)=>s+(+m.amt||0),0));
  const pendOther=Math.max(0,b.toPayOut-pendSal);
  const freeCash=b.bankBalance-b.toPayOut;
  const wf=[{l:'In bank now',v:b.bankBalance,type:'start',dm:''}];
  if(pendSal>0)wf.push({l:'Pending salaries',v:pendSal,type:'down',dm:'pay'});
  if(pendOther>0)wf.push({l:'Pending other',v:pendOther,type:'down',dm:'pay'});
  wf.push({l:'Free cash',type:'total'});
  if(b.toCollect>0)wf.push({l:'To collect',v:b.toCollect,type:'up',dm:'collect'});
  wf.push({l:'If all clears',type:'total'});
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">Actual cash now · KD ${KD(b.bankBalance)}</div><h3>Cash position</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formfull">
      <div style="overflow-x:auto">${cashWaterfall(wf)}</div>
      <div class="attn">
        <div class="r"><span class="t">In the bank now · collected minus paid out</span><span class="num">KD ${KD(b.bankBalance)}</span></div>
        ${pendSal>0?`<div class="r"><span class="t">Pending salaries still to pay</span><span class="num neg">- KD ${KD(pendSal)}</span></div>`:''}
        ${pendOther>0?`<div class="r"><span class="t">Pending bills and payouts</span><span class="num neg">- KD ${KD(pendOther)}</span></div>`:''}
        <div class="r"><span class="t"><b>Free cash after commitments</b></span><span class="num ${freeCash<0?'neg':'pos'}"><b>KD ${KD(freeCash)}</b></span></div>
        ${b.toCollect>0?`<div class="r"><span class="t">Still to collect</span><span class="num pos">+ KD ${KD(b.toCollect)}</span></div>`:''}
        <div class="r"><span class="t"><b>If everything owed clears</b></span><span class="num"><b>KD ${KD(b.bankBalance+b.toCollect-b.toPayOut)}</b></span></div>
      </div>
      <div class="muted" style="font-size:12px;margin-top:8px">Bank balance is actual cash: money collected minus money actually paid out. Pending items still show above but do not count until they move.</div>
    </div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Close</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
}
function drillMoney(tok){
  if(tok==='cashpos'){openCashPosition();return;}
  const R=activeRange();
  const inIssue=m=>(m.date||'')>=R.from&&(m.date||'')<=R.to;
  const inPaid=m=>m.status==='Paid'&&(m.paid||m.date||'')>=R.from&&(m.paid||m.date||'')<=R.to;
  const rng=R.from+' → '+(R.to==='9999-12-31'?'now':R.to);
  const dirOf={invoices:'Income',expenses:'Expense',salaries:'Salary',payouts:'Payout'};
  const labelOf={invoices:'Invoices',expenses:'Expenses',salaries:'Salaries',payouts:'Payouts'};
  let set=[],title='',view='',vlabel='';
  if(tok==='collect'){set=store.money.filter(m=>m.dir==='Income'&&!voided(m)&&m.status!=='Paid');title='Invoices still to collect · all dates';view='invoices';vlabel='Invoices';}
  else if(tok==='pay'){set=store.money.filter(owedOut);title='Still to pay out · all dates';}
  else if(tok==='cashin'){set=store.money.filter(m=>m.dir==='Income'&&inPaid(m));title='Money in · '+rng;view='invoices';vlabel='Invoices';}
  else if(tok==='cashout'){set=store.money.filter(m=>(m.dir==='Expense'||m.dir==='Salary'||m.dir==='Payout')&&inPaid(m));title='Money out · '+rng;}
  else if(tok==='billedout'){set=store.money.filter(m=>(m.dir==='Expense'||m.dir==='Salary'||m.dir==='Payout')&&!voided(m)&&inIssue(m));title='Costs billed · '+rng;}
  else {const[type,mode]=tok.split(':');const dir=dirOf[type];if(!dir)return;const rows=store.money.filter(m=>m.dir===dir);
    if(mode==='paid'){set=rows.filter(inPaid);title=labelOf[type]+' '+(type==='invoices'?'collected':'paid')+' · '+rng;}
    else{set=rows.filter(m=>!voided(m)&&inIssue(m));title=labelOf[type]+' issued · '+rng;}
    view=type;vlabel=labelOf[type];}
  drillList(title,set,view,vlabel);
}
function renderMoneyDash(){
  const Mall=store.money;
  const R=activeRange(),C=cmpRange(R.from,R.to);
  const inR=(m,from,to)=>{const dt=m.date||'';return dt>=from&&dt<=to;};
  const S=moneyStats(Mall,R.from,R.to),P=C?moneyStats(Mall,C.from,C.to):null;
  const rate=S.perType.income.issued?Math.round(S.perType.income.paid/S.perType.income.issued*100):0;
  const unpaid=Mall.filter(owed);
  const chase=[...unpaid].sort((a,b)=>((a.due||"9999")+"").localeCompare((b.due||"9999")+"")).slice(0,8);
  const chaseTot=unpaid.reduce((s,m)=>s+(+m.amt||0),0);
  const overdueInv=unpaid.filter(m=>m.due&&m.due<todayISO).length;
  const cats={};Mall.filter(m=>m.dir==='Expense'&&!voided(m)&&inR(m,R.from,R.to)).forEach(m=>{const k=m.cat||"Other";cats[k]=(cats[k]||0)+Math.abs(+m.amt||0);});
  const topCat=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([l,v])=>({l,v}));
  const series=moneySeries(R.from,R.to);
  const bm={};
  Mall.forEach(m=>{const b=brandOf(m.acct);if(!b)return;if(!bm[b])bm[b]={rev:0,cost:0};if(m.dir==='Income'&&m.status==='Paid')bm[b].rev+=(+m.amt||0);else if((m.dir==='Expense'||m.dir==='Payout'||m.dir==='Salary')&&m.status==='Paid')bm[b].cost+=Math.abs(+m.amt||0);});
  const marginRows=Object.entries(bm).map(([l,o])=>({l,v:o.rev-o.cost})).filter(x=>x.v!==0).sort((a,b)=>b.v-a.v).slice(0,8);
  const age={cur:0,b30:0,b60:0,b60p:0};
  unpaid.forEach(m=>{const amt=+m.amt||0;if(!m.due||m.due>=todayISO){age.cur+=amt;return;}const d=daysBetween(m.due,todayISO);if(d<=30)age.b30+=amt;else if(d<=60)age.b60+=amt;else age.b60p+=amt;});
  const bankCls=S.bankBalance<0?'bad':'good';
  const settled=S.bankBalance+S.toCollect-S.toPayOut;
  const billedOut=S.perType.expense.issued+S.perType.salary.issued+S.perType.payout.issued;
  $('view').innerHTML=`<div class="view">
    ${rangeBar(`<button class="ghost" id="repBtn">Export report</button>`)}
    <div class="kpis">
      <div class="kpi ${bankCls} kpiclick" data-dm="cashpos" style="grid-column:span 2" title="See the cash position breakdown"><span class="lab">Bank balance · actual cash now · tap for breakdown</span><span class="val valbig">KD ${KD(S.bankBalance)}</span><span class="kdelta muted">If everything owed clears: KD ${KD(settled)}</span><span class="bar"></span></div>
      <div class="kpiclick" data-dm="collect">${kpi("Still to collect","KD "+KD(S.toCollect),"warn")}</div><div class="kpiclick" data-dm="pay">${kpi("Still to pay out","KD "+KD(S.toPayOut),"bad")}</div>
    </div>
    <div class="panel"><h2>Issued vs paid <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">· ${esc(R.from)} → ${esc(R.to==='9999-12-31'?'now':R.to)} · click a number to see which</span></h2>
      <div class="ivpwrap">
        ${ivpRow("Invoices",S.perType.income.issued,S.perType.income.paid,true,"invoices")}
        ${ivpRow("Expenses",S.perType.expense.issued,S.perType.expense.paid,false,"expenses")}
        ${ivpRow("Salaries",S.perType.salary.issued,S.perType.salary.paid,false,"salaries")}
        ${ivpRow("Payouts",S.perType.payout.issued,S.perType.payout.paid,false,"payouts")}
      </div>
      <div class="cashtwo">
        <div class="cashgrp">
          <div class="cashhd">This month · billed, paid or not</div>
          <span class="dmlink" data-dm="invoices:issued"><span class="muted">In</span> <b class="pos">KD ${KD(S.perType.income.issued)}</b></span>
          <span class="dmlink" data-dm="billedout"><span class="muted">Out</span> <b class="neg">KD ${KD(billedOut)}</b></span>
          <span><span class="muted">Cashflow</span> <b class="${S.accrualNet<0?'neg':'pos'}">KD ${KD(S.accrualNet)}</b>${P?delta(S.accrualNet,P.accrualNet,true):''}</span>
        </div>
        <div class="cashgrp">
          <div class="cashhd">Actually in the bank · cash moved</div>
          <span class="dmlink" data-dm="cashin"><span class="muted">Collected</span> <b class="pos">KD ${KD(S.cashIn)}</b></span>
          <span class="dmlink" data-dm="cashout"><span class="muted">Paid out</span> <b class="neg">KD ${KD(S.cashOut)}</b></span>
          <span><span class="muted">To bank</span> <b class="${S.cashflow<0?'neg':'pos'}">KD ${KD(S.cashflow)}</b></span>
        </div>
      </div>
    </div>
    <div class="panel"><h2>Collected over time <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">· by the date paid</span></h2><div class="body">${series.length?vbars(series,'kd'):'<div class="muted">Nothing collected in range</div>'}</div></div>
    <div class="grid3">
      <div class="panel"><h2>Invoices to chase ${overdueInv?`<span class="flag-over" style="font-size:11px;font-weight:700">· ${overdueInv} overdue</span>`:""}</h2><div class="attn">${chase.length?chase.map(m=>{const od=m.due&&m.due<todayISO;return `<div class="r" data-goto="invoices" data-hl="${esc(m.id)}" style="cursor:pointer"><span class="t"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.desc||m.id)}</button> <span class="muted">· ${esc(brandOf(m.acct))}</span></span><span class="${od?'flag-over':'flag-soon'}" style="white-space:nowrap">KD ${KD(m.amt)}${m.due?` · ${esc(m.due)}`:''}</span></div>`;}).join(""):'<div class="rowcount">All invoices settled.</div>'}</div><div class="rowcount">KD ${KD(chaseTot)} outstanding · ${unpaid.length} invoice${unpaid.length===1?'':'s'} (live, all dates)</div></div>
      <div class="panel"><h2>Expenses by category <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">· issued in range</span></h2><div class="body">${topCat.length?hbars(topCat,'kd'):'<div class="muted">No expenses in range</div>'}</div></div>
      <div class="panel"><h2>Profit by brand <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">· collected − paid costs</span></h2><div class="attn">${marginRows.length?marginRows.map(r=>`<div class="r"><span class="t">${esc(r.l)}</span><span class="num ${r.v<0?'neg':'pos'}">KD ${KD(r.v)}</span></div>`).join(""):'<div class="rowcount">No data yet.</div>'}</div></div>
    </div>
    <div class="panel"><h2>Unpaid invoices by age</h2><div class="attn">
        <div class="r"><span class="t">Not due yet</span><span class="num">KD ${KD(age.cur)}</span></div>
        <div class="r"><span class="t">1-30 days overdue</span><span class="num flag-soon">KD ${KD(age.b30)}</span></div>
        <div class="r"><span class="t">31-60 days overdue</span><span class="num flag-soon">KD ${KD(age.b60)}</span></div>
        <div class="r"><span class="t">60+ days overdue</span><span class="num flag-over">KD ${KD(age.b60p)}</span></div>
      </div><div class="rowcount">KD ${KD(age.cur+age.b30+age.b60+age.b60p)} outstanding across all unpaid invoices</div></div>
    </div>`;
  wireRange(renderMoneyDash);
  if($('repBtn'))$('repBtn').onclick=()=>openReport('money');
}

function sortBy(arr,k,dir){return [...arr].sort((a,b)=>{let x=a[k],y=b[k];if(k==='amt'){x=+a.amt||0;y=+b.amt||0;}x=x==null?"":x;y=y==null?"":y;return x>y?dir:x<y?-dir:0;});}
// ---- data tables: nested multi-sort + per-column Excel-style filter ----
// default sort per table: the date first, then the entry sequence number, so same-date rows read in order
const DEFSORT={invoices:[{k:'date',dir:-1},{k:'seq',dir:-1}],expenses:[{k:'date',dir:-1},{k:'seq',dir:-1}],tasks:[{k:'due',dir:1},{k:'seq',dir:1}],accounts:[{k:'date_added',dir:-1},{k:'seq',dir:-1}],services:[{k:'active',dir:-1},{k:'name',dir:1}]};
const NUMCOLS=new Set(['amt','coll','out','cost','margin','eng','open','price','retainer_fee','value','seq']);
const DATECOLS=new Set(['date','due','done','logged','paid','date_added','start_date','due_date','signed_date','contract_date','close_date']);
const TEXTCOLS=new Set(['inv_no','id','desc','name','notes','output','details','title']);       // sort + text search
const CATCOLS=new Set(['brand','income_type','status','owner','priority','country','type','lifecycle','cat','tags','active','stage','role','reqby','unit']); // sort + value checklist
function seqOf(r){const m=String(r.inv_no||r.id||'').match(/(\d+)(?!.*\d)/);return m?+m[1]:0;}
function colVal(r,k){ if(k==='seq')return seqOf(r); if(k==='brand')return brandOf(r.acct)||''; let v=r[k]; if(NUMCOLS.has(k))return +v||0; return v==null?'':String(v); }
function sortByMulti(arr,keys){ return [...arr].sort((a,b)=>{ for(const s of keys){let x=colVal(a,s.k),y=colVal(b,s.k); if(typeof x==='string'||typeof y==='string'){x=(''+x).toLowerCase();y=(''+y).toLowerCase();} if(x<y)return -s.dir; if(x>y)return s.dir;} return 0; }); }
function effSort(tbl){const m=state.msort[tbl];return (m&&m.length)?m:(DEFSORT[tbl]||[]);}
function tableFilter(rows,tbl){const f=state.colF[tbl]||{};const rng=state.colRange[tbl]||{};const txt=state.colText[tbl]||{};
  const fks=Object.keys(f).filter(k=>f[k]&&f[k].length);
  const rks=Object.keys(rng).filter(k=>rng[k]&&(rng[k].from||rng[k].to));
  const tks=Object.keys(txt).filter(k=>txt[k]);
  if(!fks.length&&!rks.length&&!tks.length)return rows;
  return rows.filter(r=>{
    for(const k of fks){if(!f[k].includes(String(colVal(r,k))))return false;}
    for(const k of rks){const v=String(colVal(r,k)||'');const cr=rng[k];if(!v)return false;if(cr.from&&v<cr.from)return false;if(cr.to&&v>cr.to)return false;}
    for(const k of tks){if(!String(colVal(r,k)||'').toLowerCase().includes(txt[k]))return false;}
    return true;});}
function arrange(rows,tbl){_TBL=tbl;return sortByMulti(tableFilter(rows,tbl),effSort(tbl));}
function applyColSort(tbl,k,dir){let m=state.msort[tbl];if(!Array.isArray(m)||!m.length){m=[{k,dir}];}else{const i=m.findIndex(s=>s.k===k);if(i>=0)m[i].dir=dir;else m.push({k,dir});}state.msort[tbl]=m;}
function removeColSort(tbl,k){const m=state.msort[tbl];if(Array.isArray(m)){state.msort[tbl]=m.filter(s=>s.k!==k);}}
function distinctVals(rows,tbl,k){const f=state.colF[tbl]||{};const other=Object.keys(f).filter(x=>x!==k&&f[x]&&f[x].length);
  const base=other.length?rows.filter(r=>other.every(x=>f[x].includes(String(colVal(r,x))))):rows;
  const set=new Set(base.map(r=>String(colVal(r,k))));
  return [...set].sort((a,b)=>{const na=+a,nb=+b;if(a!==''&&b!==''&&!isNaN(na)&&!isNaN(nb))return na-nb;return a.localeCompare(b);});}
let _TBL=null;
function thhead(head,tbl){if(tbl)_TBL=tbl;const t=_TBL;const keys=effSort(t);const manual=!!(state.msort[t]&&state.msort[t].length);
  return head.map(h=>{if(!h[0])return h[1]?`<th>${h[1]}</th>`:"<th></th>";
    const i=keys.findIndex(s=>s.k===h[0]);const s=i>=0?keys[i]:null;
    const arrow=s?(s.dir>0?' \u25B2':' \u25BC'):'';
    const pri=(manual&&keys.length>1&&i>=0)?`<sup class="thpri">${i+1}</sup>`:'';
    const rngOn=state.colRange[t]&&state.colRange[t][h[0]]&&(state.colRange[t][h[0]].from||state.colRange[t][h[0]].to);
    const txtOn=state.colText[t]&&state.colText[t][h[0]];
    const filt=((state.colF[t]&&state.colF[t][h[0]]&&state.colF[t][h[0]].length)||rngOn||txtOn)?' <span class="thfilt" title="Filtered">\u25BC</span>':'';
    return `<th data-k="${esc(h[0])}" data-lbl="${esc(h[1])}" class="thsort">${h[1]}${arrow}${pri}${filt}</th>`;}).join("");}
function bindTable(tbl,baseRows,rerender){_TBL=tbl;
  document.querySelectorAll('thead th[data-k]').forEach(th=>{th.onclick=e=>{e.stopPropagation();openColMenu(th,th.dataset.k,th.dataset.lbl||th.dataset.k,baseRows,tbl,rerender);};});}
const DATEPRESETS=[['all','All dates'],['today','Today'],['yesterday','Yesterday'],['last7','Last 7 days'],['last30','Last 30 days'],['last90','Last 90 days'],['wtd','Week to date'],['mtd','Month to date'],['qtd','Quarter to date'],['ytd','Year to date'],['lastmonth','Last month'],['custom','Custom range']];
function openColMenu(th,k,label,baseRows,tbl,rerender){
  closeColMenu();
  const mode=DATECOLS.has(k)?'date':(CATCOLS.has(k)?'values':(TEXTCOLS.has(k)?'text':'sortonly'));
  const m=document.createElement('div');m.className='colmenu';m.id='colmenu';
  let body=`
    <div class="cmhd">${esc(label)}</div>
    <div class="cmsort"><button class="ghost" data-s="asc">\u25B2 Sort ascending</button><button class="ghost" data-s="desc">\u25BC Sort descending</button></div>
    <button class="cmlink" data-s="remove">Remove from sort</button>`;
  if(mode==='date'){
    const cr=(state.colRange[tbl]&&state.colRange[tbl][k])||{preset:'all',from:'',to:''};
    body+=`<div class="cmsep"></div>
      <select id="cmPreset" class="cmsearch">${DATEPRESETS.map(p=>`<option value="${p[0]}"${cr.preset===p[0]?' selected':''}>${p[1]}</option>`).join('')}</select>
      <div id="cmCustom" style="display:${cr.preset==='custom'?'flex':'none'};gap:6px;margin-top:6px">
        <input type="date" id="cmFrom" value="${esc(cr.from||'')}" class="cmsearch" style="flex:1">
        <input type="date" id="cmTo" value="${esc(cr.to||'')}" class="cmsearch" style="flex:1"></div>
      <div class="cmfoot"><button class="cmlink" data-s="clearf">Clear filter</button><span style="flex:1"></span><button class="btn" data-s="apply">Apply</button></div>`;
  }else if(mode==='text'){
    const cur=(state.colText[tbl]&&state.colText[tbl][k])||'';
    body+=`<div class="cmsep"></div>
      <input type="search" id="cmText" placeholder="Search ${esc(label.toLowerCase())}" value="${esc(cur)}" class="cmsearch">
      <div class="cmfoot"><button class="cmlink" data-s="clearf">Clear search</button><span style="flex:1"></span><button class="btn" data-s="apply">Apply</button></div>`;
  }else if(mode==='values'){
    const vals=distinctVals(baseRows,tbl,k);
    const allowed=(state.colF[tbl]&&state.colF[tbl][k])?state.colF[tbl][k]:null;
    const isOn=v=>!allowed||allowed.includes(v);
    body+=`<div class="cmsep"></div>
      <input type="search" id="cmSearch" placeholder="Filter values" class="cmsearch">
      <label class="cmall"><input type="checkbox" id="cmAll" ${!allowed?'checked':''}> Select all</label>
      <div class="cmlist" id="cmList">${vals.map(v=>`<label class="cmrow"><input type="checkbox" class="cmv" value="${esc(v)}" ${isOn(v)?'checked':''}><span class="cmrowtxt">${v===''?'<span class="muted">(blank)</span>':esc(v)}</span></label>`).join('')||'<div class="muted" style="padding:6px">No values</div>'}</div>
      <div class="cmfoot"><button class="cmlink" data-s="clearf">Clear filter</button><span style="flex:1"></span><button class="btn" data-s="apply">Apply</button></div>`;
  }
  m.innerHTML=body;
  document.body.appendChild(m);
  const r=th.getBoundingClientRect();const mw=250;let left=Math.min(r.left,window.innerWidth-mw-8);left=Math.max(8,left);
  m.style.left=left+'px';m.style.top=(r.bottom+4)+'px';
  const close=closeColMenu;
  const doSort=dir=>{applyColSort(tbl,k,dir);close();rerender();};
  m.querySelector('[data-s="asc"]').onclick=()=>doSort(1);
  m.querySelector('[data-s="desc"]').onclick=()=>doSort(-1);
  m.querySelector('[data-s="remove"]').onclick=()=>{removeColSort(tbl,k);close();rerender();};
  if(mode==='date'){
    const ps=m.querySelector('#cmPreset');
    ps.onchange=()=>{m.querySelector('#cmCustom').style.display=ps.value==='custom'?'flex':'none';};
    m.querySelector('[data-s="clearf"]').onclick=()=>{if(state.colRange[tbl])delete state.colRange[tbl][k];close();rerender();};
    m.querySelector('[data-s="apply"]').onclick=()=>{const p=ps.value;let from='',to='';
      if(p==='custom'){from=m.querySelector('#cmFrom').value;to=m.querySelector('#cmTo').value;}
      else if(p!=='all'){const rr=rangeFor(p);from=rr.from;to=rr.to;}
      if(!state.colRange[tbl])state.colRange[tbl]={};
      if(p==='all'&&!from&&!to){delete state.colRange[tbl][k];}else{state.colRange[tbl][k]={preset:p,from,to};}
      close();rerender();};
  }else if(mode==='text'){
    const applyText=()=>{const v=m.querySelector('#cmText').value.trim().toLowerCase();if(!state.colText[tbl])state.colText[tbl]={};if(v){state.colText[tbl][k]=v;}else{delete state.colText[tbl][k];}close();rerender();};
    m.querySelector('[data-s="apply"]').onclick=applyText;
    m.querySelector('#cmText').onkeydown=e=>{if(e.key==='Enter')applyText();};
    m.querySelector('[data-s="clearf"]').onclick=()=>{if(state.colText[tbl])delete state.colText[tbl][k];close();rerender();};
  }else if(mode==='values'){
    m.querySelector('[data-s="clearf"]').onclick=()=>{if(state.colF[tbl])delete state.colF[tbl][k];close();rerender();};
    m.querySelector('[data-s="apply"]').onclick=()=>{const boxes=[...m.querySelectorAll('.cmv')];const checked=boxes.filter(b=>b.checked).map(b=>b.value);
      if(!state.colF[tbl])state.colF[tbl]={};
      if(checked.length===boxes.length){delete state.colF[tbl][k];}else{state.colF[tbl][k]=checked;}
      close();rerender();};
    const all=m.querySelector('#cmAll');all.onchange=()=>{m.querySelectorAll('.cmrow').forEach(row=>{if(row.style.display!=='none'){row.querySelector('.cmv').checked=all.checked;}});};
    m.querySelector('#cmSearch').oninput=e=>{const q=e.target.value.toLowerCase();m.querySelectorAll('.cmrow').forEach(row=>{row.style.display=row.querySelector('.cmv').value.toLowerCase().includes(q)?'':'none';});};
  }
  setTimeout(()=>document.addEventListener('mousedown',colMenuOutside),0);
}
function colMenuOutside(e){const m=document.getElementById('colmenu');if(m&&!m.contains(e.target))closeColMenu();}
function closeColMenu(){const m=document.getElementById('colmenu');if(m)m.remove();document.removeEventListener('mousedown',colMenuOutside);}

function renderTasks(){
  const _base=applyQuick(tasksF());
  let T=arrange(_base,'tasks');
  const cap=T.length>350?350:T.length;
  const chips=[["","All"],["open","Open"],["overdue","Overdue"],["week","Due this week"],["unassigned","Unassigned"],["high","High priority"],["done","Done"]];
  const head=[["id","ID"],["brand","Brand"],["name","Task"],["owner","Owner"],["priority","Priority"],["due","Due"],["status","Status"],["done","Done"],["flag","Flag"],["",""]];
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Shown",T.length,"accent")}${kpi("Open",T.filter(t=>t.status!=="Done").length,"")}${kpi("Overdue",T.filter(t=>t.status!=="Done"&&t.due&&t.due<todayISO).length,"bad")}${kpi("High open",T.filter(t=>t.status!=="Done"&&t.priority==="High").length,"warn")}</div>
    <div class="panel">
      <div class="addbar">
        <button class="btn" id="ntAdd"${canWrite?"":" disabled"}>+ Add task</button>
        <button class="ghost" id="ntImport"${canWrite?"":" disabled"}>Bulk import</button>
        <span style="flex:1"></span>
        <button class="ghost" id="tExport" title="Download a client-safe CSV of the tasks shown (no internal notes)">Export (client-safe)</button>
      </div>
      <div class="chips">${chips.map(c=>`<button class="chip${F.quick===c[0]?' on':''}" data-quick="${c[0]}">${c[1]}</button>`).join("")}</div>
      <div class="tablewrap"><table><thead><tr>${thhead(head)}</tr></thead>
      <tbody>${T.slice(0,cap).map(t=>{const[fl,fc]=flag(t);const ro=canWrite?"":"disabled";return `<tr>
        <td class="id">${esc(t.id)}</td>
        <td><select class="edit" data-c="tasks" data-id="${esc(t.id)}" data-f="acct" ${ro}>${brandOpts(t.acct)}</select></td>
        <td class="editname">${t.output?`<span title="Output filled in" style="color:var(--good);margin-right:4px">●</span>`:""}<button class="linkname" data-open="${esc(t.id)}">${esc(t.name||t.id)}</button>${t.tags?`<div class="tagrow">${String(t.tags).split(",").map(x=>x.trim()).filter(Boolean).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>`:""}</td>
        <td><select class="edit" data-c="tasks" data-id="${esc(t.id)}" data-f="owner" ${ro}><option value="">—</option>${opts(activeOwners(t.owner),t.owner)}</select></td>
        <td>${csel("priority","tasks",t.id,"priority",t.priority,PRIOS,ro)}</td>
        <td><input type="date" class="edit" data-c="tasks" data-id="${esc(t.id)}" data-f="due" value="${esc(t.due||'')}" ${ro}></td>
        <td>${csel("status","tasks",t.id,"status",t.status,STATUSES,ro)}</td>
        <td><input type="date" class="edit" data-c="tasks" data-id="${esc(t.id)}" data-f="done" value="${esc(t.done||'')}" ${ro}></td>
        <td class="${fc}">${fl}</td>
        <td>${canWrite?rowMenu("tasks",t.id):""}</td></tr>`;}).join("")}</tbody></table></div>
      <div class="rowcount">${T.length>cap?`Showing first ${cap} of ${T.length}. Narrow with filters.`:`${T.length} tasks`}</div>
    </div></div>`;
  $('ntAdd').onclick=openTaskNew;
  if($('ntImport'))$('ntImport').onclick=openImportTasks;
  $('tExport').onclick=()=>{const nm="PIVOT tasks"+(F.brand?" - "+F.brand:"")+(F.quick?" ("+F.quick+")":"")+" "+todayISO+".csv";exportTasksCSV(T,nm);};
  bindTable('tasks',_base,renderTasks);
}

function renderMyTasks(){
  const me=state.me||"";
  const mine=me?store.tasks.filter(t=>t.owner===me&&(!F.brand||brandOf(t.acct)===F.brand)&&(!F.q||((t.id+" "+(t.name||"")+" "+brandOf(t.acct)+" "+(t.tags||"")).toLowerCase().includes(F.q)))):[];
  const open=mine.filter(t=>t.status!=="Done");
  const byDue=(a,b)=>((a.due||"9999-99")+"").localeCompare((b.due||"9999-99")+"");
  const overdue=open.filter(t=>t.due&&t.due<todayISO).sort(byDue);
  const week=open.filter(t=>t.due&&t.due>=todayISO&&(new Date(t.due)-new Date(todayISO))<=7*864e5).sort(byDue);
  const later=open.filter(t=>!t.due||(t.due>todayISO&&(new Date(t.due)-new Date(todayISO))>7*864e5)).sort(byDue);
  const ro=canWrite?"":"disabled";
  const card=(title,arr,cls)=>`<div class="panel"><h2>${title} · ${arr.length}</h2><div class="attn">${arr.length?arr.map(t=>`
     <div class="r"><span class="t"><button class="linkname" data-open="${esc(t.id)}">${esc(t.name||t.id)}</button> <span class="muted">· ${esc(brandOf(t.acct))}</span></span>
     <span style="display:flex;gap:8px;align-items:center;flex:0 0 auto"><span class="${cls}">${esc(t.due||'no date')}</span>
     ${csel("status","tasks",t.id,"status",t.status,STATUSES,ro)}</span></div>`).join(""):'<div class="rowcount">Nothing here.</div>'}</div></div>`;
  $('view').innerHTML=`<div class="view">
    <div class="panel"><div class="addbar"><span class="muted">Show tasks for</span>
      <select id="meSel"><option value="">— pick your name —</option>${opts(activeOwners(me),me)}</select></div></div>
    ${me?`<div class="kpis">${kpi("Open",open.length,"accent")}${kpi("Overdue",overdue.length,"bad")}${kpi("Due this week",week.length,"warn")}${kpi("Done",mine.length-open.length,"good")}</div>
      ${card("Overdue",overdue,"flag-over")}${card("This week",week,"flag-soon")}${card("Later / no date",later,"flag-ok")}`
      :'<div class="center"><h2>Pick your name</h2><p>Choose who you are above to see your next tasks, sorted by due date.</p></div>'}
  </div>`;
  $('meSel').onchange=e=>{state.me=e.target.value;try{localStorage.setItem('pivot_me',state.me);}catch(_){}render();};
}

function renderInvoices(){
  const _base=moneyF().filter(m=>m.dir==="Income"&&(!F.status||m.status===F.status));
  let M=arrange(_base,'invoices');
  const collected=M.filter(m=>m.status==="Paid").reduce((a,m)=>a+(+m.amt||0),0);
  const billed=M.filter(m=>!voided(m)).reduce((a,m)=>a+(+m.amt||0),0);
  const overdue=M.filter(m=>owed(m)&&m.due&&m.due<todayISO).reduce((a,m)=>a+(+m.amt||0),0);
  const head=[["inv_no","Invoice #"],["date","Issued"],["brand","Brand"],["income_type","Type"],["desc","Title"],["amt","Amount"],["status","Status"],["due","Due"],["",""]];
  const ro=canWrite?"":"disabled";
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Billed","KD "+KD(billed),"accent")}${kpi("Collected","KD "+KD(collected),"good")}${kpi("Outstanding","KD "+KD(billed-collected),"bad")}${kpi("Overdue","KD "+KD(overdue),"warn")}</div>
    <div class="panel">
      <div class="addbar"><button class="btn" id="niAdd"${canWrite?"":" disabled"}>+ Add invoice</button><span class="muted" style="font-size:12px">Click a field to edit it. Click the invoice number to open the full record. Retainers bill the 1st of the next month, due the 10th.</span></div>
      <div class="tablewrap"><table><thead><tr>${thhead(head)}</tr></thead>
      <tbody>${M.map(m=>{const od=owed(m)&&m.due&&m.due<todayISO;return `<tr id="mrow-${esc(m.id)}">
        <td class="id"><button class="linkname" data-mopen="${esc(m.id)}" title="Open full record">${esc(m.inv_no||m.id)}</button>${m.notes?` <span class="tag" style="color:var(--hold);background:var(--hold-soft)">note</span>`:""}</td>
        <td><input type="date" class="edit" data-c="money" data-id="${esc(m.id)}" data-f="date" value="${esc(m.date||'')}" ${ro}></td>
        <td><select class="edit" data-c="money" data-id="${esc(m.id)}" data-f="acct" ${ro}>${brandOpts(m.acct)}</select></td>
        <td><select class="edit" data-c="money" data-id="${esc(m.id)}" data-f="income_type" ${ro}>${opts(INCOME_TYPES,m.income_type||"Project")}</select></td>
        <td style="min-width:200px"><input class="edit" style="width:100%" data-c="money" data-id="${esc(m.id)}" data-f="desc" value="${esc(m.desc||'')}" ${ro} placeholder="Invoice title"></td>
        <td class="num pos"><input type="number" step="0.001" class="edit num" style="width:104px" data-c="money" data-id="${esc(m.id)}" data-f="amt" value="${esc(m.amt)}" ${ro}></td>
        <td>${csel("pay","money",m.id,"status",m.status,PAY,ro)}</td>
        <td class="${od?'flag-over':''}"><input type="date" class="edit" data-c="money" data-id="${esc(m.id)}" data-f="due" value="${esc(m.due||'')}" ${ro}></td>
        <td>${canWrite?rowMenu("money",m.id):""}</td></tr>`;}).join("")}</tbody></table></div>
      <div class="rowcount">${M.length} invoices</div>
    </div></div>`;
  if(pendingHL){const el=$('mrow-'+pendingHL);pendingHL="";if(el){el.classList.add('hlrow');el.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>el.classList.remove('hlrow'),3000);}}
  $('niAdd').onclick=openInvoiceNew;
  bindTable('invoices',_base,renderInvoices);
}

function renderExpenses(){
  const _base=moneyF().filter(m=>m.dir==="Expense"&&(!F.status||m.status===F.status));
  let M=arrange(_base,'expenses');
  const total=Math.abs(M.filter(m=>!voided(m)).reduce((a,m)=>a+(+m.amt||0),0));
  const paid=Math.abs(M.filter(m=>m.status==="Paid").reduce((a,m)=>a+(+m.amt||0),0));
  const pending=Math.abs(M.filter(m=>owedOut(m)).reduce((a,m)=>a+(+m.amt||0),0));
  const cats={};M.filter(m=>!voided(m)).forEach(m=>{const k=m.cat||"Other";cats[k]=(cats[k]||0)+Math.abs(+m.amt||0);});
  const top=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([l,v])=>({l,v}));
  const head=[["id","ID"],["date","Date"],["brand","Brand"],["cat","Category"],["desc","Description"],["amt","Amount"],["status","Status"],["",""]];
  const ro=canWrite?"":"disabled";
  const rtpls=(store.templates||[]).filter(t=>t.kind==="expense");
  const dueCount=recurringExpenseDue().length;
  const rtHtml=rtpls.length?rtpls.map(t=>`<div class="por"><span class="porperson"><button class="linkname" data-etpl="${esc(t.id)}">${esc(t.name||t.cat||t.id)}</button><span class="rtag">${esc(t.freq||'Monthly')}</span>${(t.active||"Yes")==="No"?'<span class="rtag" style="color:var(--bad);background:var(--bad-soft)">paused</span>':''}</span><span class="num neg">KD ${KD(Math.abs(+t.amt||0))}${(t.freq==='Yearly'?' /yr':' /mo')}</span></div>`).join(""):'<div class="rowcount">No recurring expenses yet.</div>';
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Total expenses","KD "+KD(total),"warn")}${kpi("Paid","KD "+KD(paid),"good")}${kpi("Pending","KD "+KD(pending),"bad")}${kpi("Lines",M.length,"")}</div>
    <div class="grid2">
      <div class="panel"><h2>By category</h2><div class="body">${top.length?hbars(top,'kd'):'<div class="muted">No expenses</div>'}</div></div>
      <div class="panel"><h2>Recurring expenses</h2>
        <div class="poevents" style="margin-bottom:10px">${rtHtml}</div>
        <div class="addbar"><button class="ghost" id="reAdd"${canWrite?"":" disabled"}>+ Create recurring</button><button class="btn" id="reGen"${canWrite?"":" disabled"}>Generate due${dueCount?` (${dueCount})`:""}</button></div>
        <div class="muted" style="font-size:12px;margin-top:6px">Generated lines land as pending until you mark them paid; past-dated ones that already auto-charged come in as paid.</div>
      </div>
    </div>
    <div class="panel">
      <div class="addbar"><button class="btn" id="neAdd"${canWrite?"":" disabled"}>+ Add expense</button><span class="muted" style="font-size:12px">Click a field to edit it. Recurring lines stay pending until marked paid.</span></div>
      <div class="tablewrap"><table><thead><tr>${thhead(head)}</tr></thead>
      <tbody>${M.map(m=>`<tr id="mrow-${esc(m.id)}">
        <td class="id">${esc(m.id)}</td>
        <td><input type="date" class="edit" data-c="money" data-id="${esc(m.id)}" data-f="date" value="${esc(m.date||'')}" ${ro}></td>
        <td><select class="edit" data-c="money" data-id="${esc(m.id)}" data-f="acct" ${ro}>${brandOpts(m.acct)}</select></td>
        <td><select class="edit" data-c="money" data-id="${esc(m.id)}" data-f="cat" ${ro}>${opts(EXPCATS.includes(m.cat)?EXPCATS:[m.cat].concat(EXPCATS),m.cat)}</select></td>
        <td style="min-width:200px"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.desc||m.id)}</button></td>
        <td class="num neg"><input type="number" step="0.001" class="edit num" style="width:104px" data-c="money" data-id="${esc(m.id)}" data-f="amt" value="${esc(m.amt)}" ${ro}></td>
        <td>${csel("pay","money",m.id,"status",m.status,PAY,ro)}</td>
        <td>${canWrite?rowMenu("money",m.id):""}</td></tr>`).join("")}</tbody></table></div>
      <div class="rowcount">${M.length} expenses</div>
    </div></div>`;
  if(pendingHL){const el=$('mrow-'+pendingHL);pendingHL="";if(el){el.classList.add('hlrow');el.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>el.classList.remove('hlrow'),3000);}}
  $('neAdd').onclick=openExpenseNew;
  if($('reAdd'))$('reAdd').onclick=()=>openExpTemplateNew();
  if($('reGen'))$('reGen').onclick=generateDueExpenses;
  document.querySelectorAll('[data-etpl]').forEach(b=>b.onclick=()=>openExpTemplateEdit(b.dataset.etpl));
  bindTable('expenses',_base,renderExpenses);
}
// ----- recurring expenses -----
function isoOf(y,m0,dd){return new Date(Date.UTC(y,m0,dd)).toISOString().slice(0,10);}
function tplOccurrences(t){
  // occurrences from `since` through the first one after today (so the upcoming period shows as due)
  const out=[];const freq=t.freq||"Monthly";const dd=Math.min(28,Math.max(1,parseInt(t.dueDay)||1));
  const start=(t.since||t.date||todayISO);const sy=+start.slice(0,4),sm=+start.slice(5,7)-1;
  if(freq==="Yearly"){
    const am=Math.min(12,Math.max(1,parseInt(t.amonth)||1))-1;
    let y=sy;if(isoOf(y,am,dd)<start)y++;
    const endY=(+todayISO.slice(0,4))+1;
    for(;y<=endY;y++){const due=isoOf(y,am,dd);out.push({due,ym:due.slice(0,7),yr:due.slice(0,4)});if(due>todayISO)break;}
  }else{
    let y=sy,m=sm;
    for(let i=0;i<600;i++){const due=isoOf(y,m,dd);out.push({due,ym:due.slice(0,7),yr:due.slice(0,4)});if(due>todayISO)break;m++;if(m>11){m=0;y++;}}
  }
  return out;
}
function occCovered(t,occ){
  const amt=Math.round(Math.abs(+t.amt||0)*1000)/1000;const yearly=(t.freq==="Yearly");
  return store.money.some(m=>{if(m.dir!=="Expense")return false;if(m.tpl===t.id&&(m.date||"").slice(0,(yearly?4:7))===(yearly?occ.yr:occ.ym))return true;
    return (m.cat||"")===(t.cat||"")&&Math.round(Math.abs(+m.amt||0)*1000)/1000===amt&&(m.date||"").slice(0,(yearly?4:7))===(yearly?occ.yr:occ.ym);});
}
function recurringExpenseDue(){
  const due=[];(store.templates||[]).filter(t=>t.kind==="expense"&&(t.active||"Yes")!=="No").forEach(t=>{
    tplOccurrences(t).forEach(occ=>{if(!occCovered(t,occ))due.push({t,occ});});
  });
  return due;
}
async function generateDueExpenses(){
  if(!canWrite){toast("Read-only access");return;}
  const due=recurringExpenseDue();
  if(!due.length){toast("Nothing due to generate");return;}
  let mx=0;store.money.forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});
  const rows=due.map(({t,occ},i)=>{const past=occ.due<=todayISO;const st=past?"Paid":"Unpaid";
    return {id:"LDG-"+String(mx+1+i).padStart(4,"0"),date:occ.due,acct:t.acct||"",eng:"",dir:"Expense",cat:t.cat||"Other Expense",tpl:t.id,desc:t.name||t.cat||"Recurring expense",amt:-Math.abs(+t.amt||0),status:st,due:occ.due,paid:(past?occ.due:""),notes:"auto · recurring"};});
  await createMany("money",rows);
}
function openExpTemplateNew(t){
  if(!canWrite){toast("Read-only access");return;}
  t=t||{freq:"Monthly",cat:"Domain / Hosting",dueDay:1,amonth:1,active:"Yes",since:todayISO.slice(0,7)+"-01"};
  const edit=!!t.id;
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${edit?esc(t.id):"New recurring expense"}</div><h3>${edit?"Edit":"Create"} recurring expense</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Description",`<input id="re_name" value="${esc(t.name||'')}" placeholder="e.g. Microsoft email">`)}
      ${fld("Category",`<select id="re_cat">${opts(EXPCATS,t.cat||"Domain / Hosting")}</select>`)}
      ${fld("Amount (KD)",`<input type="number" step="0.001" id="re_amt" value="${t.amt!=null?esc(Math.abs(+t.amt)):''}" placeholder="0.000">`)}
      ${fld("Frequency",`<select id="re_freq">${opts(FREQ,t.freq||"Monthly")}</select>`)}
      ${fld("Day of month (1-28)",`<input type="number" min="1" max="28" id="re_dueDay" value="${esc(t.dueDay||1)}">`)}
      ${fld("Month (yearly only)",`<select id="re_amonth">${["01","02","03","04","05","06","07","08","09","10","11","12"].map((mm,i)=>`<option value="${i+1}" ${(+t.amonth||1)===i+1?'selected':''}>${monthLabel("2000-"+mm).split(' ')[0]}</option>`).join("")}</select>`)}
      ${fld("Tracking since",`<input type="date" id="re_since" value="${esc(t.since||'')}">`)}
      ${fld("Active",`<select id="re_active">${opts(["Yes","No"],t.active||"Yes")}</select>`)}
    </div>
    <div class="sheetfoot">${edit?`<button class="del" id="mkDelete">Delete</button>`:""}<span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">${edit?"Save":"Create"}</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('re_'+f);return el?el.value:"";};const amt=parseFloat(g('amt'));if(isNaN(amt)||amt<=0){toast("Enter an amount");return;}
    const patch={kind:"expense",name:g('name'),cat:g('cat'),amt:Math.abs(amt),freq:g('freq'),dueDay:Math.min(28,Math.max(1,parseInt(g('dueDay'))||1)),amonth:parseInt(g('amonth'))||1,since:g('since'),active:g('active')};
    if(edit){write("templates",t.id,patch);}else{const tid="TPL-"+String((store.templates.reduce((mx,d)=>{const mm=String(d.id).match(/(\d+)$/);return mm?Math.max(mx,+mm[1]):mx;},0))+1).padStart(3,"0");create("templates",tid,patch);}
    close();};
  if(edit&&$('mkDelete'))$('mkDelete').onclick=()=>{close();remove("templates",t.id);};
}
function openExpTemplateEdit(id){const t=(store.templates||[]).find(x=>x.id===id);if(t)openExpTemplateNew(t);}

function monthLabel(ym){const MM=["January","February","March","April","May","June","July","August","September","October","November","December"];const p=(ym||"").split("-");return p.length>=2?MM[(+p[1]||1)-1]+" "+p[0]:(ym||"—");}
function renderSalaries(){
  const M=moneyF().filter(m=>m.dir==="Salary"&&(!F.status||m.status===F.status));
  const total=Math.abs(M.reduce((a,m)=>a+(+m.amt||0),0));
  const pending=Math.abs(M.filter(m=>m.status!=="Paid").reduce((a,m)=>a+(+m.amt||0),0));
  // group into monthly payroll runs by the month of the date
  const groups={};
  M.forEach(m=>{const ym=(m.date||"").slice(0,7)||"—";if(!groups[ym])groups[ym]={ym,rows:[]};groups[ym].rows.push(m);});
  const months=Object.values(groups).map(g=>{
    g.total=Math.abs(g.rows.reduce((a,m)=>a+(+m.amt||0),0));
    g.paidN=g.rows.filter(m=>m.status==="Paid").length;
    g.status=g.paidN===g.rows.length?"Paid":(g.paidN===0?"Pending":"Partial");
    g.ids=g.rows.map(m=>m.id);
    g.rows.sort((a,b)=>(a.role==="Freelance"?1:0)-(b.role==="Freelance"?1:0)||(a.partner||"").localeCompare(b.partner||""));
    return g;
  }).sort((a,b)=>(b.ym||"").localeCompare(a.ym||""));
  const ro=!canWrite;
  const monthHtml=months.length?months.map(g=>`
    <div class="poevent${EXPANDED.has('sal:'+g.ym)?'':' collapsed'}" data-grp="sal:${esc(g.ym)}">
      <div class="pohead">
        <button class="pocaret" data-tog="sal:${esc(g.ym)}" title="Collapse">▾</button>
        <div class="poinfo" data-tog="sal:${esc(g.ym)}"><span class="pototal">KD ${KD(g.total)}</span><span class="muted"> · ${esc(monthLabel(g.ym))} · ${g.rows.length} ${g.rows.length===1?'person':'people'}</span></div>
        <div class="poact">
          <span class="pill ${g.status==='Paid'?'pill-good':(g.status==='Partial'?'pill-warn':'pill-bad')}">${g.status==='Paid'?'All sent':(g.status==='Partial'?('Partial · '+g.paidN+'/'+g.rows.length):'Pending')}</span>
          ${ro?"":`<button class="ghost sledit" data-ym="${esc(g.ym)}" title="Edit this month, add or remove people, change amounts">Edit</button>`}
          ${ro?"":`<button class="ghost sltoggle" data-ym="${esc(g.ym)}" data-to="${g.status==='Paid'?'Pending':'Paid'}">Mark all ${g.status==='Paid'?'pending':'sent'}</button>`}
          ${ro?"":`<button class="ghost sldel" data-ym="${esc(g.ym)}" title="Delete this month">✕</button>`}
        </div>
      </div>
      <div class="porows">
        ${g.rows.map(m=>{const paid=m.status==='Paid';return `<div class="por"><span class="porperson"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.partner||m.desc||'—')}</button>${m.role?`<span class="rtag">${esc(m.role)}</span>`:""}</span><span class="porright"><span class="num neg">KD ${KD(Math.abs(+m.amt||0))}</span>${ro?`<span class="pill ${paid?'pill-good':'pill-bad'}">${paid?'sent':'pending'}</span>`:`<button class="ghost slone ${paid?'on':''}" data-id="${esc(m.id)}" data-to="${paid?'Pending':'Paid'}" data-date="${esc(m.date||'')}">${paid?'✓ sent':'mark sent'}</button>`}</span></div>`;}).join("")}
      </div>
    </div>`).join(""):'<div class="rowcount">No salaries yet.</div>';
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Total salaries","KD "+KD(total),"warn")}${kpi("Pending","KD "+KD(pending),"bad")}${kpi("Paid","KD "+KD(total-pending),"good")}${kpi("Months",months.length,"")}</div>
    <div class="panel">
      <div class="addbar"><span class="muted" style="flex:1">Salaries are grouped by month. Each month lists the people paid, full-time, part-time or freelance.</span>${months.length>1?`<button class="ghost" id="salXpAll">Expand all</button><button class="ghost" id="salClAll">Collapse all</button>`:""}<button class="btn" id="slAdd"${canWrite?"":" disabled"}>+ Add month</button></div>
      <div class="poevents">${monthHtml}</div>
    </div></div>`;
  if($('slAdd'))$('slAdd').onclick=openSalaryNew;
  wireCollapse('sal',months.map(e=>e.ym));
  document.querySelectorAll('.sltoggle').forEach(b=>b.onclick=()=>{const g=months.find(e=>e.ym===b.dataset.ym);if(!g)return;const to=b.dataset.to;updateMany("money",g.ids,{status:to,paid:(to==='Paid'?(g.rows[0].date||todayISO):"")});});
  document.querySelectorAll('.slone').forEach(b=>b.onclick=()=>{const to=b.dataset.to;write("money",b.dataset.id,{status:to,paid:(to==='Paid'?(b.dataset.date||todayISO):"")});});
  document.querySelectorAll('.sledit').forEach(b=>b.onclick=()=>{const g=months.find(e=>e.ym===b.dataset.ym);if(g)openSalaryEdit(g);});
  document.querySelectorAll('.sldel').forEach(b=>b.onclick=()=>{const g=months.find(e=>e.ym===b.dataset.ym);if(!g)return;removeMany("money",g.ids);});
}
function renderPayouts(){
  const M=moneyF().filter(m=>m.dir==="Payout"&&(!F.status||m.status===F.status));
  const total=Math.abs(M.reduce((a,m)=>a+(+m.amt||0),0));
  const pending=Math.abs(M.filter(m=>m.status!=="Paid").reduce((a,m)=>a+(+m.amt||0),0));
  // group rows into payout events by batch (legacy rows without a batch stand alone)
  const groups={};
  M.forEach(m=>{const k=m.batch||m.id;if(!groups[k])groups[k]={batch:k,date:m.date||"",desc:m.desc||"Profit split",rows:[]};groups[k].rows.push(m);if((m.date||"")>groups[k].date)groups[k].date=m.date||groups[k].date;});
  const events=Object.values(groups).map(g=>{
    g.total=Math.abs(g.rows.reduce((a,m)=>a+(+m.amt||0),0));
    g.status=g.rows.every(m=>m.status==="Paid")?"Paid":"Pending";
    g.ids=g.rows.map(m=>m.id);
    return g;
  }).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const ro=!canWrite;
  const eventHtml=events.length?events.map(g=>`
    <div class="poevent${EXPANDED.has('pay:'+g.batch)?'':' collapsed'}" data-grp="pay:${esc(g.batch)}">
      <div class="pohead">
        <button class="pocaret" data-tog="pay:${esc(g.batch)}" title="Collapse">▾</button>
        <div class="poinfo" data-tog="pay:${esc(g.batch)}"><span class="pototal">KD ${KD(g.total)}</span><span class="muted"> · ${esc(g.date||'—')} · ${esc(g.desc)}</span></div>
        <div class="poact">
          <span class="pill ${g.status==='Paid'?'pill-good':'pill-bad'}">${g.status}</span>
          ${ro?"":`<button class="ghost pytoggle" data-batch="${esc(g.batch)}" data-to="${g.status==='Paid'?'Pending':'Paid'}">Mark ${g.status==='Paid'?'pending':'paid'}</button>`}
          ${ro?"":`<button class="ghost pydel" data-batch="${esc(g.batch)}" title="Delete this payout">✕</button>`}
        </div>
      </div>
      <div class="porows">
        ${g.rows.map(m=>`<div class="por"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.partner||'—')}</button><span class="num neg">KD ${KD(Math.abs(+m.amt||0))}</span></div>`).join("")}
      </div>
    </div>`).join(""):'<div class="rowcount">No payouts yet. Add one when you split profits.</div>';
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Total payouts","KD "+KD(total),"warn")}${kpi("Pending","KD "+KD(pending),"bad")}${kpi("Paid","KD "+KD(total-pending),"good")}${kpi("Events",events.length,"")}</div>
    <div class="panel">
      <div class="addbar"><span class="muted" style="flex:1">Payouts are PIVOT profit splits, divided equally among the partners in each split.</span>${events.length>1?`<button class="ghost" id="payXpAll">Expand all</button><button class="ghost" id="payClAll">Collapse all</button>`:""}<button class="btn" id="pyAdd"${canWrite?"":" disabled"}>+ Add payout</button></div>
      <div class="poevents">${eventHtml}</div>
    </div></div>`;
  if($('pyAdd'))$('pyAdd').onclick=openPayoutNew;
  wireCollapse('pay',events.map(e=>e.batch));
  document.querySelectorAll('.pytoggle').forEach(b=>b.onclick=()=>{const g=events.find(e=>e.batch===b.dataset.batch);if(!g)return;const to=b.dataset.to;updateMany("money",g.ids,{status:to,paid:(to==='Paid'?(g.date||todayISO):"")});});
  document.querySelectorAll('.pydel').forEach(b=>b.onclick=()=>{const g=events.find(e=>e.batch===b.dataset.batch);if(!g)return;removeMany("money",g.ids);});
}
function renderAccounts(){
  let rows=store.accounts.map(a=>{
    const open=store.tasks.filter(t=>t.acct===a.id&&t.status!=="Done").length;
    const coll=store.money.filter(m=>m.acct===a.id&&m.dir==="Income"&&m.status==="Paid").reduce((s,m)=>s+(+m.amt||0),0);
    const out=store.money.filter(m=>m.acct===a.id&&m.dir==="Income"&&!voided(m)).reduce((s,m)=>s+(+m.amt||0),0)-coll;
    const eng=store.engagements.filter(e=>e.acct===a.id).length;
    const cost=Math.abs(store.money.filter(m=>m.acct===a.id&&(m.dir==="Expense"||m.dir==="Payout"||m.dir==="Salary")&&m.status==="Paid").reduce((s,m)=>s+(+m.amt||0),0));
    return Object.assign({open,coll,out,eng,cost,margin:coll-cost},a);
  }).filter(a=>(!F.brand||a.brand===F.brand)&&(!F.status||a.lifecycle===F.status)&&(!F.q||((a.id+" "+(a.brand||"")+" "+(a.country||"")+" "+(a.type||"")).toLowerCase().includes(F.q))));
  const _base=rows; rows=arrange(_base,'accounts');
  const ro=canWrite?"":"disabled";
  const head=[["id","ID"],["brand","Brand"],["country","Country"],["type","Type"],["lifecycle","Lifecycle"],["eng","Engagements"],["open","Open"],["coll","Collected"],["out","Outstanding"],["cost","Costs"],["margin","Margin"],["date_added","Added"]];
  $('view').innerHTML=`<div class="view"><div class="panel">
    <div class="addbar"><button class="btn" id="acAdd"${canWrite?"":" disabled"}>+ Add account</button><span class="muted" style="font-size:12px">Click a brand to open its profile.</span></div>
    <div class="tablewrap"><table>
    <thead><tr>${thhead(head)}</tr></thead>
    <tbody>${rows.map(a=>`<tr>
      <td class="id">${esc(a.id)}</td>
      <td class="brandcell"><button class="linkname" data-brand="${esc(a.id)}">${esc(a.brand)}</button></td>
      <td><input class="edit" style="width:104px" data-c="accounts" data-id="${esc(a.id)}" data-f="country" value="${esc(a.country||'')}" ${ro}></td>
      <td class="muted">${esc(a.type||'')}</td>
      <td>${csel("life","accounts",a.id,"lifecycle",a.lifecycle,LIFE,ro)}</td>
      <td class="num">${a.eng}</td><td class="num">${a.open}</td>
      <td class="num pos">${KD(a.coll)}</td><td class="num ${a.out>0?'neg':''}">${KD(a.out)}</td>
      <td class="num ${a.cost>0?'neg':''}">${KD(a.cost)}</td><td class="num ${a.margin<0?'neg':'pos'}">${KD(a.margin)}</td>
      <td class="muted">${esc(a.date_added||'')}</td></tr>`).join("")}</tbody></table></div>
    <div class="rowcount">${rows.length} accounts</div></div></div>`;
  if($('acAdd'))$('acAdd').onclick=openAccountNew;
  bindTable('accounts',_base,renderAccounts);
}

// ----- retainer invoicing -----
function firstOfNextMonth(iso){return shiftMonths(iso.slice(0,7)+"-01",1);}
function isRetainerInv(m){return m.dir==="Income"&&(m.income_type==="Retainer"||/support plan/i.test(m.desc||""));}
function retainerInvoicesDue(){
  const due=[]; const curFirst=todayISO.slice(0,7)+"-01";
  store.accounts.filter(a=>Math.abs(+a.retainer_fee||0)>0&&a.lifecycle!=="Churned"&&a.lifecycle!=="Lost").forEach(a=>{
    const fee=Math.abs(+a.retainer_fee);
    const rets=store.money.filter(m=>m.acct===a.id&&isRetainerInv(m));
    let d = rets.length ? firstOfNextMonth(rets.reduce((mx,m)=>((m.date||"")>mx?(m.date||""):mx),"")) : curFirst;
    let guard=0;
    while(d<=curFirst && guard<60){
      const svc=shiftMonths(d,-1).slice(0,7);
      due.push({acct:a.id, date:d, due:d.slice(0,8)+"10", svc, fee, desc:monthLabel(svc)+" support plan"});
      d=firstOfNextMonth(d); guard++;
    }
  });
  return due;
}
async function generateRetainerInvoices(){
  if(!canWrite){toast("Read-only access");return;}
  const due=retainerInvoicesDue();
  if(!due.length){toast("No retainer invoices due");return;}
  let mx=0;store.money.forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});
  let inv=0;store.money.forEach(m=>{const g=String(m.inv_no||"").match(/INV-(\d+)/);if(g)inv=Math.max(inv,+g[1]);});
  const rows=due.map((x,i)=>({id:"LDG-"+String(mx+1+i).padStart(4,"0"),date:x.date,logged:x.svc+"-01",acct:x.acct,eng:"",dir:"Income",cat:"Client Payment",income_type:"Retainer",desc:x.desc,amt:Math.abs(x.fee),status:"Unpaid",due:x.due,paid:"",inv_no:"INV-"+String(inv+1+i).padStart(4,"0"),notes:"auto // retainer"}));
  await createMany("money",rows);
}
function renderRetainers(){
  const ym=todayISO.slice(0,7);
  const fee=a=>Math.abs(+a.retainer_fee||0);
  const rets=store.accounts.filter(a=>fee(a)>0&&a.lifecycle!=="Churned"&&a.lifecycle!=="Lost");
  const monthCost=id=>Math.abs(store.money.filter(m=>m.acct===id&&(m.dir==="Expense"||m.dir==="Salary"||m.dir==="Payout")&&(m.date||"").slice(0,7)===ym).reduce((s,m)=>s+(+m.amt||0),0));
  const monthColl=id=>store.money.filter(m=>m.acct===id&&m.dir==="Income"&&m.status==="Paid"&&(m.paid||m.date||"").slice(0,7)===ym).reduce((s,m)=>s+(+m.amt||0),0);
  const billedThis=id=>store.money.some(m=>m.acct===id&&m.dir==="Income"&&!voided(m)&&(m.date||"").slice(0,7)===ym);
  const rows=rets.map(a=>{const f=fee(a),c=monthCost(a.id);return {a,f,c,coll:monthColl(a.id),burn:f?Math.round(c/f*100):0,margin:f-c,billed:billedThis(a.id)};}).sort((x,y)=>y.f-x.f);
  const totFee=rows.reduce((s,r)=>s+r.f,0),totCost=rows.reduce((s,r)=>s+r.c,0);
  const bar=(pct,color)=>`<div class="burnwrap"><div class="burnbar" style="width:${Math.min(100,Math.max(2,pct))}%;background:${color}"></div></div>`;
  const cards=rows.length?rows.map(r=>{const col=r.burn>=100?'var(--bad)':(r.burn>=80?'var(--warn)':'var(--good)');return `
    <div class="poevent">
      <div class="pohead">
        <div class="poinfo"><button class="linkname" data-brand="${esc(r.a.id)}" style="font-weight:700;font-size:15px">${esc(r.a.brand)}</button><span class="muted"> · KD ${KD(r.f)}/mo</span></div>
        <div class="poact"><span class="pill ${r.billed?'pill-good':'pill-bad'}">${r.billed?'invoiced this month':'not invoiced'}</span></div>
      </div>
      <div style="padding:10px 14px 14px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:5px"><span>Delivery cost this month · KD ${KD(r.c)}</span><span style="color:${col};font-weight:700">${r.burn}% of fee</span></div>
        ${bar(r.burn,col)}
        <div style="display:flex;gap:20px;margin-top:10px;font-size:13px"><span>Margin this month <b class="${r.margin<0?'neg':'pos'}">KD ${KD(r.margin)}</b></span><span class="muted">Collected · KD ${KD(r.coll)}</span></div>
      </div>
    </div>`;}).join(""):'<div class="rowcount">No retainers yet. Open a brand in Accounts → Edit → set a Monthly retainer, and it appears here.</div>';
  const dueN=retainerInvoicesDue().length;
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Monthly retainer value","KD "+KD(totFee),"accent")}${kpi("Retainers",rows.length,"")}${kpi("Delivery cost (mo)","KD "+KD(totCost),"warn")}${kpi("Total margin (mo)","KD "+KD(totFee-totCost),(totFee-totCost)<0?"bad":"good")}</div>
    <div class="panel">
      <div class="addbar"><span class="muted" style="flex:1;font-size:12px">Burn = this month's delivery cost (expenses, freelancers, payouts on the brand) vs the fee. Amber ≥80%, red ≥100%.</span><button class="btn" id="genRetInv"${canWrite&&dueN?"":" disabled"}>Generate retainer invoices${dueN?` (${dueN})`:""}</button></div>
      <div class="muted" style="font-size:12px;margin:0 0 12px">Invoices bill the month before on the 1st, due the 10th, as "<month> support plan". They land Unpaid until you mark them paid.</div>
      <div class="poevents">${cards}</div></div></div>`;
  if($('genRetInv'))$('genRetInv').onclick=generateRetainerInvoices;
}

const DEAL_STAGES=["Lead","Proposal","Contract","Signed","Lost"];
function dealBrand(d){const a=AMAP[d.acct];return a?a.brand:(d.acct||"—");}
function renderPipeline(){
  const deals=(store.deals||[]).filter(d=>(!F.brand||dealBrand(d)===F.brand)&&(!F.status||d.stage===F.status)&&(!F.q||((d.id+" "+(d.title||"")+" "+dealBrand(d)).toLowerCase().includes(F.q))));
  const val=d=>Math.abs(+d.value||0);
  const byStage=s=>deals.filter(d=>d.stage===s).sort((a,b)=>val(b)-val(a));
  const openStages=["Lead","Proposal","Contract"];
  const openVal=deals.filter(d=>openStages.includes(d.stage)).reduce((s,d)=>s+val(d),0);
  const openN=deals.filter(d=>openStages.includes(d.stage)).length;
  const signed=byStage("Signed").length,lost=byStage("Lost").length;
  const winRate=(signed+lost)?Math.round(signed/(signed+lost)*100):0;
  const signedVal=byStage("Signed").reduce((s,d)=>s+val(d),0);
  const stagePill=d=>{ if(d.stage==="Signed"&&d.signed_date)return `<span class="dchip dchip-good">signed ${esc(d.signed_date)}</span>`; if(d.stage==="Contract")return `<span class="dchip dchip-warn">${d.contract_date?'sent '+esc(d.contract_date):'contract out'}</span>`; return ""; };
  const col=s=>{const items=byStage(s);const tot=items.reduce((x,d)=>x+val(d),0);return `
    <div class="pipecol"><div class="pipehead"><span>${s}</span><span class="muted">${items.length} · KD ${KD(tot)}</span></div>
    <div class="pipebody">${items.length?items.map(d=>`<div class="pipecard">
      <button class="linkname" data-dopen="${esc(d.id)}">${esc(d.title||d.id)}</button>
      <div class="muted" style="font-size:12px"><button class="linkname" data-brand="${esc(d.acct)}" style="font-size:12px">${esc(dealBrand(d))}</button></div>
      <div class="pipeval">KD ${KD(val(d))}</div>${stagePill(d)}
      <select class="edit stagesel" data-c="deals" data-id="${esc(d.id)}" data-f="stage">${opts(DEAL_STAGES,d.stage)}</select>
    </div>`).join(""):'<div class="pipeempty">—</div>'}</div></div>`;};
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Open pipeline","KD "+KD(openVal),"accent")}${kpi("Open deals",openN,"")}${kpi("Signed value","KD "+KD(signedVal),"good")}${kpi("Win rate",winRate+"%",(signed+lost)?"good":"")}</div>
    <div class="pipegrid">${DEAL_STAGES.map(col).join("")}</div>
    <div class="addbar" style="margin-top:12px"><button class="btn" id="dealAdd"${canWrite?"":" disabled"}>+ Add deal</button><span class="muted" style="font-size:12px">A deal is one opportunity for a client. Move it through Lead → Proposal → Contract → Signed.</span></div></div>`;
  if($('dealAdd'))$('dealAdd').onclick=openDealNew;
}
function openDealNew(d){
  if(!canWrite){toast("Read-only access");return;}
  d=d||{stage:"Lead"};
  const edit=!!d.id;
  const svcOpts=`<option value="">—</option>`+(store.services||[]).filter(s=>s.active!=="No"||s.id===d.service).map(s=>`<option value="${esc(s.id)}"${s.id===d.service?" selected":""}>${esc(s.name)}</option>`).join("");
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${edit?esc(d.id):"New deal"}</div><h3>${edit?"Edit":"Add"} deal</h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formgrid">
      ${fld("Client / brand",`<select id="dl_acct">${accountOpts(d.acct||"","")}</select>`)}
      ${fld("Service",`<select id="dl_service">${svcOpts}</select>`)}
      ${fld("Deal title",`<input id="dl_title" value="${esc(d.title||'')}" placeholder="e.g. Shopify build">`)}
      ${fld("Value (KD)",`<input type="number" step="0.001" id="dl_value" value="${d.value!=null?esc(Math.abs(+d.value)):''}" placeholder="0.000">`)}
      ${fld("Stage",`<select id="dl_stage">${opts(DEAL_STAGES,d.stage||"Lead")}</select>`)}
      ${fld("Contract sent",`<input type="date" id="dl_contract_date" value="${esc(d.contract_date||'')}">`)}
      ${fld("Signed on",`<input type="date" id="dl_signed_date" value="${esc(d.signed_date||'')}">`)}
      ${fld("Expected close",`<input type="date" id="dl_close_date" value="${esc(d.close_date||'')}">`)}
    </div>
    <div class="formfull">${fld("Notes",`<textarea id="dl_notes" rows="2">${esc(d.notes||'')}</textarea>`)}</div>
    ${edit&&d.stage==="Signed"?`<div class="formfull"><div class="attn"><div class="r"><span class="t">${(store.projects||[]).some(x=>x.deal===d.id)?'Project deployed for this deal.':'This deal is signed. Deploy its project and tasks.'}</span>${(store.projects||[]).some(x=>x.deal===d.id)?'':`<button class="btn" id="dlDeploy"${canWrite?"":" disabled"}>Deploy project</button>`}</div></div></div>`:''}
    <div class="sheetfoot">${edit?`<button class="del" id="mkDelete">Delete</button>`:""}<span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">${edit?"Save":"Add deal"}</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('dl_'+f);return el?el.value:"";};const acct=g('acct');if(!acct){toast("Pick a client");return;}
    const patch={acct,service:g('service'),title:g('title'),value:Math.abs(parseFloat(g('value'))||0),stage:g('stage'),contract_date:g('contract_date'),signed_date:g('signed_date'),close_date:g('close_date'),notes:g('notes')};
    if(edit){write("deals",d.id,patch);}else{create("deals",nextId("deals","DEAL-",3),patch);}close();};
  if(edit&&$('mkDelete'))$('mkDelete').onclick=()=>{close();remove("deals",d.id);};
  if($('dlDeploy'))$('dlDeploy').onclick=()=>{close();deployProjectFromDeal(d);};
}
function openDeal(id){const d=(store.deals||[]).find(x=>x.id===id);if(d)openDealNew(d);}

const SVC_TYPES=["Retainer","Project"];
function renderServices(){
  const ro=canWrite?"":"disabled";
  const svcMatch=s=>{if(F.status==="Active"&&s.active==="No")return false;if(F.status==="Retired"&&s.active!=="No")return false;if(F.q&&!((s.id+" "+(s.name||"")+" "+(s.type||"")+" "+(s.notes||"")).toLowerCase().includes(F.q)))return false;return true;};
  const _base=(store.services||[]).filter(svcMatch);
  const head=[["id","ID"],["name","Service"],["type","Type"],["price","Price (KD)"],["unit","Unit"],["notes","Notes"],["","Checklist"],["active","Status"],["",""]];
  const svc=arrange(_base,'services');
  const rows=svc.length?svc.map(s=>`<tr>
    <td class="id">${esc(s.id)}</td>
    <td><input class="edit" style="min-width:150px" data-c="services" data-id="${esc(s.id)}" data-f="name" value="${esc(s.name||'')}" ${ro}></td>
    <td><select class="edit" data-c="services" data-id="${esc(s.id)}" data-f="type" ${ro}>${opts(SVC_TYPES,s.type||"Project")}</select></td>
    <td class="num"><input type="number" step="0.001" class="edit num" style="width:96px" data-c="services" data-id="${esc(s.id)}" data-f="price" value="${s.price!=null?esc(s.price):''}" ${ro}></td>
    <td><input class="edit" style="width:80px" data-c="services" data-id="${esc(s.id)}" data-f="unit" value="${esc(s.unit||'')}" ${ro} placeholder="/mo, one-off"></td>
    <td><input class="edit" style="min-width:160px" data-c="services" data-id="${esc(s.id)}" data-f="notes" value="${esc(s.notes||'')}" ${ro} placeholder="What it covers"></td>
    <td><button class="linkmini" data-svopen="${esc(s.id)}">${((s.tasks||'').split('\n').map(x=>x.trim()).filter(Boolean)).length||0} tasks ›</button></td>
    <td><select class="edit" data-c="services" data-id="${esc(s.id)}" data-f="active" ${ro}><option value="Yes"${s.active!=="No"?" selected":""}>Active</option><option value="No"${s.active==="No"?" selected":""}>Retired</option></select></td>
    <td>${canWrite?rowMenu("services",s.id):""}</td></tr>`).join(""):'<tr><td colspan="9" class="rowcount">No services yet. Add the things PIVOT sells so invoices can use them.</td></tr>';
  $('view').innerHTML=`<div class="view"><div class="panel">
    <div class="addbar"><button class="btn" id="svAdd"${canWrite?"":" disabled"}>+ Add service</button><span class="muted" style="font-size:12px">The catalogue of what PIVOT offers. Retainers bill monthly; one-off work is a project. Click a heading to sort or filter.</span></div>
    <div class="tablewrap"><table><thead><tr>${thhead(head,'services')}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="rowcount">${svc.filter(s=>s.active!=="No").length} active services · click the checklist to set the default tasks for a service</div>
  </div></div>`;
  if($('svAdd'))$('svAdd').onclick=openServiceNew;
  bindTable('services',_base,renderServices);
}
function openServiceNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet"><div class="sheethead"><div><div class="id">New service</div><h3>Add service</h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formgrid">${fld("Service name",`<input id="sv_name" placeholder="e.g. Social media retainer">`)}${fld("Type",`<select id="sv_type">${opts(SVC_TYPES,"Retainer")}</select>`)}${fld("Price (KD)",`<input type="number" step="0.001" id="sv_price" placeholder="0.000">`)}${fld("Unit",`<input id="sv_unit" placeholder="/mo, one-off">`)}</div>
    <div class="formfull">${fld("Notes",`<input id="sv_notes" placeholder="What it covers">`)}${fld("Default task checklist (one task per line)",`<textarea id="sv_tasks" rows="4" placeholder="Kickoff call&#10;Collect brand assets&#10;Build&#10;QA and launch"></textarea>`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const name=$('sv_name').value.trim();if(!name){toast("Enter a name");return;}
    create("services",nextId("services","SVC-",3),{name,type:$('sv_type').value,price:Math.abs(parseFloat($('sv_price').value)||0),unit:$('sv_unit').value,notes:$('sv_notes').value,tasks:$('sv_tasks')?$('sv_tasks').value:"",active:true});close();};
}
function openServiceEdit(id){
  const s=(store.services||[]).find(x=>x.id===id);if(!s||!canWrite){if(!canWrite)toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet"><div class="sheethead"><div><div class="id">${esc(s.id)}</div><h3>Edit ${esc(s.name)}</h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formgrid">${fld("Service name",`<input id="se_name" value="${esc(s.name||'')}">`)}${fld("Type",`<select id="se_type">${opts(SVC_TYPES,s.type||"Retainer")}</select>`)}${fld("Price (KD)",`<input type="number" step="0.001" id="se_price" value="${s.price!=null?esc(s.price):''}">`)}${fld("Unit",`<input id="se_unit" value="${esc(s.unit||'')}">`)}</div>
    <div class="formfull">${fld("Notes",`<input id="se_notes" value="${esc(s.notes||'')}">`)}${fld("Default task checklist (one task per line)",`<textarea id="se_tasks" rows="6" placeholder="Kickoff call&#10;Collect brand assets&#10;Build the store&#10;QA and launch">${esc(s.tasks||'')}</textarea>`)}</div>
    <div class="sheetfoot"><button class="del" id="mkDelete">Delete</button><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Save</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{write("services",id,{name:$('se_name').value,type:$('se_type').value,price:Math.abs(parseFloat($('se_price').value)||0),unit:$('se_unit').value,notes:$('se_notes').value,tasks:$('se_tasks').value});close();};
  $('mkDelete').onclick=()=>{close();remove("services",id);};
}

// ---------- Projects ----------
const PROJ_STATUS=["Planned","Active","On Hold","Done"];
function projStats(pid){const ts=store.tasks.filter(t=>t.project===pid);return {total:ts.length,done:ts.filter(t=>t.status==="Done").length};}
function renderProjects(){
  const ro=canWrite?"":"disabled";
  const ord={Active:0,Planned:1,"On Hold":2,Done:3};
  const pBrand=p=>{const a=AMAP[p.acct];return a?a.brand:(p.acct||"");};
  const ps=(store.projects||[]).filter(p=>(!F.brand||pBrand(p)===F.brand)&&(!F.status||(p.status||"Planned")===F.status)&&(!F.q||((p.id+" "+(p.name||"")+" "+pBrand(p)).toLowerCase().includes(F.q)))).slice().sort((a,b)=>((ord[a.status]??1)-(ord[b.status]??1))||(a.name||'').localeCompare(b.name||''));
  const card=p=>{const st=projStats(p.id);const pct=st.total?Math.round(st.done/st.total*100):0;const a=AMAP[p.acct];return `
    <div class="poevent">
      <div class="pohead">
        <div class="poinfo"><button class="linkname" data-popen="${esc(p.id)}" style="font-weight:700;font-size:15px">${esc(p.name||p.id)}</button><span class="muted"> · ${esc(a?a.brand:(p.acct||'—'))}</span></div>
        <div class="poact">${csel("proj","projects",p.id,"status",p.status||"Planned",PROJ_STATUS,ro)}</div>
      </div>
      <div style="padding:10px 14px 14px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:5px"><span>${st.done}/${st.total} tasks done</span><span>${p.due_date?('due '+esc(p.due_date)):''}</span></div>
        <div class="burnwrap"><div class="burnbar" style="width:${Math.max(2,pct)}%;background:var(--good)"></div></div>
      </div>
    </div>`;};
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Active projects",ps.filter(p=>p.status!=="Done").length,"accent")}${kpi("All projects",ps.length,"")}</div>
    <div class="panel"><div class="addbar"><button class="btn" id="prAdd"${canWrite?"":" disabled"}>+ Add project</button><span class="muted" style="font-size:12px">A project groups the work for one piece of a client's engagement. Sign a deal in Pipeline to deploy one with its tasks.</span></div>
    <div class="poevents">${ps.length?ps.map(card).join(""):'<div class="rowcount">No projects yet. Add one, or deploy from a signed deal.</div>'}</div></div></div>`;
  if($('prAdd'))$('prAdd').onclick=()=>openProjectNew();
}
function openProjectNew(p){
  if(!canWrite){toast("Read-only access");return;}
  p=p||{status:"Planned"};const edit=!!p.id;
  const svcOpts=`<option value="">—</option>`+(store.services||[]).filter(s=>s.active!=="No"||s.id===p.service).map(s=>`<option value="${esc(s.id)}"${s.id===p.service?" selected":""}>${esc(s.name)}</option>`).join("");
  $('modal').innerHTML=`<div class="sheet"><div class="sheethead"><div><div class="id">${edit?esc(p.id):"New project"}</div><h3>${edit?"Edit":"Add"} project</h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formgrid">
      ${fld("Client / brand",`<select id="pr_acct">${accountOpts(p.acct||"","")}</select>`)}
      ${fld("Service",`<select id="pr_service">${svcOpts}</select>`)}
      ${fld("Project name",`<input id="pr_name" value="${esc(p.name||'')}" placeholder="e.g. Shopify build">`)}
      ${fld("Status",`<select id="pr_status">${opts(PROJ_STATUS,p.status||"Planned")}</select>`)}
      ${fld("Start",`<input type="date" id="pr_start_date" value="${esc(p.start_date||'')}">`)}
      ${fld("Due",`<input type="date" id="pr_due_date" value="${esc(p.due_date||'')}">`)}
    </div>
    <div class="formfull">${fld("Notes",`<textarea id="pr_notes" rows="2">${esc(p.notes||'')}</textarea>`)}</div>
    <div class="sheetfoot">${edit?`<button class="del" id="mkDelete">Delete</button>`:""}<span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">${edit?"Save":"Add"}</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('pr_'+f);return el?el.value:"";};const name=g('name').trim();if(!name){toast("Enter a project name");return;}
    const patch={acct:g('acct'),service:g('service'),name,status:g('status'),start_date:g('start_date'),due_date:g('due_date'),notes:g('notes')};
    if(edit){write("projects",p.id,patch);}else{create("projects",nextId("projects","PRJ-",3),patch);}close();};
  if(edit&&$('mkDelete'))$('mkDelete').onclick=()=>{close();remove("projects",p.id);};
}
function openProject(id){const p=(store.projects||[]).find(x=>x.id===id);if(p)openProjectDetail(p);}
function openProjectDetail(p){
  const tasks=store.tasks.filter(t=>t.project===p.id);
  const tops=tasks.filter(t=>!t.parent);const subsOf=pid=>tasks.filter(t=>t.parent===pid);
  const a=AMAP[p.acct];const st=projStats(p.id);
  const row=(t,sub)=>`<div class="r" style="${sub?'padding-left:22px':''}"><span class="t"><button class="linkname" data-open="${esc(t.id)}">${esc(t.name||t.id)}</button>${!sub&&canWrite?` <button class="linkmini" data-subtask="${esc(t.id)}">+ sub</button>`:''}</span><span class="${flag(t)[1]}" style="white-space:nowrap">${esc(t.status||'')}</span></div>`;
  const list=tops.length?tops.map(t=>row(t,false)+subsOf(t.id).map(s=>row(s,true)).join("")).join(""):'<div class="rowcount">No tasks yet. Add one below.</div>';
  $('modal').innerHTML=`<div class="sheet"><div class="sheethead"><div><div class="id">${esc(p.id)}</div><h3>${esc(p.name)} <span class="muted" style="font-weight:500">· ${esc(a?a.brand:'')}${p.status?' · '+esc(p.status):''}</span></h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formfull">
      <label class="fld"><span style="display:flex;align-items:center;gap:8px"><span style="flex:1">Tasks · ${st.done}/${st.total} done</span>${canWrite?`<button class="linkmini" id="prTask">+ Task</button>`:''}</span><div class="attn">${list}</div></label>
      ${p.notes?`<label class="fld"><span>Notes</span><div class="attn"><div class="r"><span class="t">${esc(p.notes)}</span></div></div></label>`:''}
    </div>
    <div class="sheetfoot"><span style="flex:1"></span>${canWrite?`<button class="ghost" id="prEdit">Edit</button>`:''}</div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  if($('prEdit'))$('prEdit').onclick=()=>openProjectNew(p);
  if($('prTask'))$('prTask').onclick=()=>{close();openTaskNew({acct:p.acct,project:p.id});};
  document.querySelectorAll('[data-subtask]').forEach(b=>b.onclick=()=>{close();openTaskNew({acct:p.acct,project:p.id,parent:b.dataset.subtask});});
}
async function deployProjectFromDeal(d){
  if(!canWrite){toast("Read-only access");return;}
  if((store.projects||[]).some(p=>p.deal===d.id)){toast("Project already deployed for this deal");return;}
  const svc=(store.services||[]).find(s=>s.id===d.service);
  const pid=nextId("projects","PRJ-",3);
  await create("projects",pid,{acct:d.acct,deal:d.id,service:d.service||"",name:d.title||(svc?svc.name:"Project"),status:"Active",start_date:todayISO,due_date:"",notes:""});
  const lines=((svc&&svc.tasks)||"").split("\n").map(x=>x.trim()).filter(Boolean);
  if(lines.length){
    let mx=0;store.tasks.forEach(t=>{const m=String(t.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});
    const rows=lines.map((name,i)=>({id:"TSK-"+String(mx+1+i).padStart(4,"0"),acct:d.acct,eng:"",name,details:"",owner:"",priority:"Medium",reqby:"PIVOT",logged:todayISO,due:"",done:"",status:"To Do",output:"",notes:"",tags:"project",project:pid,parent:""}));
    await createMany("tasks",rows);
  } else { render(); }
  toast("Project deployed"+(lines.length?(" with "+lines.length+" tasks"):""));
}
function openMemberNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet"><div class="sheethead"><div><div class="id">New member</div><h3>Add team member</h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formgrid">${fld("Name",`<input id="tm_name" placeholder="Name">`)}${fld("Role",`<input id="tm_role" placeholder="e.g. Partner, Staff, Freelance">`)}${fld("Status",`<select id="tm_active"><option value="Yes">Active</option><option value="No">Archived</option></select>`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const name=$('tm_name').value.trim();if(!name){toast("Enter a name");return;}
    create("people",nextId("people","PPL-",3),{name,role:$('tm_role').value,active:$('tm_active').value});close();};
}

function bindSort(key,rerender){document.querySelectorAll('thead th[data-k]').forEach(th=>th.onclick=()=>{const k=th.dataset.k;if(!k)return;const s=state[key];s.dir=(s.k===k)?-s.dir:1;s.k=k;rerender();});}

// each view's own filters; brand + team carry across views, status options are per view
const VIEWFILTERS={
  tasks:{team:true,status:STATUSES},
  mytasks:{},
  invoices:{status:PAY},
  expenses:{status:PAY},
  salaries:{status:PAYOUT_STATUS},
  payouts:{status:PAYOUT_STATUS},
  accounts:{status:LIFE,statusLabel:"All lifecycle"},
  services:{brand:false,status:["Active","Retired"]}
};
function setupFilters(view){
  const cfg=VIEWFILTERS[view];const fc=$('filterctrls');
  if(!cfg){ if(fc)fc.style.display='none'; return; }
  if(fc)fc.style.display='contents';
  const fb=$('fBrand');if(fb)fb.style.display=(cfg.brand===false)?'none':'';
  const ft=$('fTeam');if(ft)ft.style.display=cfg.team?'':'none';
  const fs=$('fStatus');
  if(fs){ const opts=cfg.status||[]; if(F.status&&!opts.includes(F.status))F.status="";
    const cur=F.status; fs.innerHTML=""; fs.add(new Option(cfg.statusLabel||"All status","")); opts.forEach(s=>fs.add(new Option(s,s))); fs.value=cur; fs.style.display=opts.length?'':'none'; }
}
let rafP=false;
function render(){
  if(!booted||!ready())return;
  if(rafP)return; rafP=true;
  requestAnimationFrame(()=>{rafP=false;
    const TITLES={digest:"Home",tasksdash:"Tasks overview",moneydash:"Money overview",mytasks:"My Tasks",tasks:"All Tasks",recurring:"Recurring Tasks",invoices:"Invoices",expenses:"Expenses",salaries:"Salaries",payouts:"Payouts",retainers:"Retainers",accounts:"Accounts",services:"Services",activity:"Activity Log",setup:"Settings"};
    const VIEWS={digest:renderDigest,tasksdash:renderTasksDash,moneydash:renderMoneyDash,mytasks:renderMyTasks,tasks:renderTasks,recurring:renderRecurring,invoices:renderInvoices,expenses:renderExpenses,salaries:renderSalaries,payouts:renderPayouts,retainers:renderRetainers,accounts:renderAccounts,services:renderServices,activity:renderActivity,setup:renderSetup};
    if(!VIEWS[state.view])state.view="tasksdash";
    setupFilters(state.view);
    $('viewtitle').textContent=TITLES[state.view];
    document.querySelectorAll('#nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.view===state.view));
    VIEWS[state.view]();
  });
}

function autoDone(){const st=$('mk_status'),dn=$('mk_done');if(st&&dn)st.addEventListener('change',()=>{if(st.value==='Done'&&!dn.value)dn.value=todayISO;});}
function fld(label,inner){return `<label class="fld"><span>${label}</span>${inner}</label>`;}
function openTask(id){
  const t=store.tasks.find(x=>x.id===id);if(!t)return;const ro=canWrite?"":"disabled";
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${esc(t.id)}</div><h3>${esc(t.name||'Task')} <span class="muted" style="font-weight:500">· ${esc(brandOf(t.acct))}</span></h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Task name",`<input id="mk_name" value="${esc(t.name||'')}" ${ro}>`)}
      ${fld("Brand",`<select id="mk_acct" ${ro}>${brandOpts(t.acct)}</select>`)}
      ${fld("Owner",`<select id="mk_owner" ${ro}><option value="">—</option>${opts(activeOwners(t.owner),t.owner)}</select>`)}
      ${fld("Priority",`<select id="mk_priority" ${ro}>${opts(PRIOS,t.priority)}</select>`)}
      ${fld("Status",`<select id="mk_status" ${ro}>${opts(STATUSES,t.status)}</select>`)}
      ${fld("Requested by",`<select id="mk_reqby" ${ro}>${opts(["PIVOT","Client"],t.reqby)}</select>`)}
      ${fld("Logged",`<input type="date" id="mk_logged" value="${esc(t.logged||'')}" ${ro}>`)}
      ${fld("Due",`<input type="date" id="mk_due" value="${esc(t.due||'')}" ${ro}>`)}
      ${fld("Done",`<input type="date" id="mk_done" value="${esc(t.done||'')}" ${ro}>`)}
      ${fld("Tags (comma-separated)",`<input id="mk_tags" value="${esc(t.tags||'')}" placeholder="e.g. dev, waiting-on-client" ${ro}>`)}
    </div>
    <div class="formfull">
      ${fld("Description (the brief)",`<textarea id="mk_details" rows="4" ${ro}>${esc(t.details||'')}</textarea>`)}
      ${fld("Output (what was done)",`<textarea id="mk_output" rows="4" ${ro}>${esc(t.output||'')}</textarea>`)}
      ${fld("Internal notes",`<textarea id="mk_notes" rows="2" ${ro}>${esc(t.notes||'')}</textarea>`)}
    </div>
    <div class="sheetfoot">
      ${canWrite?`<button class="ghost" id="mkDelete" style="color:var(--bad);border-color:var(--bad-soft)">Delete</button>`:""}
      <span style="flex:1"></span>
      <button class="ghost" id="mkCancel">Close</button>
      ${canWrite?`<button class="btn" id="mkSave">Save</button>`:""}
    </div></div>`;
  $('modal').classList.add('show');
  if(canWrite)autoDone();
  const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;
  $('modal').onclick=e=>{if(e.target===$('modal'))close();};
  if($('mkSave'))$('mkSave').onclick=async()=>{const g=f=>{const el=$('mk_'+f);return el?el.value:"";};
    const st=g('status');let dn=g('done');if(st==='Done'&&!dn)dn=todayISO;
    await write("tasks",id,{name:g('name'),acct:g('acct'),owner:g('owner'),priority:g('priority'),status:st,reqby:g('reqby'),logged:g('logged'),due:g('due'),done:dn,details:g('details'),output:g('output'),notes:g('notes'),tags:g('tags')});logAct("edited","tasks",id,g('name'));close();};
  if($('mkDelete'))$('mkDelete').onclick=()=>{close();remove("tasks",id);};
}
function openTaskNew(preset){
  if(!canWrite){toast("Read-only access");return;}
  preset=preset||{};
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${preset.parent?"New subtask":"New task"}</div><h3>${preset.parent?"Add subtask":"Add task"}</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Task name",`<input id="mk_name" placeholder="What needs doing">`)}
      ${fld("Brand",`<select id="mk_acct">${brandOpts(preset.acct||"")}</select>`)}
      ${fld("Owner",`<select id="mk_owner"><option value="">—</option>${opts(teamActive())}</select>`)}
      ${fld("Priority",`<select id="mk_priority">${opts(PRIOS,"Medium")}</select>`)}
      ${fld("Status",`<select id="mk_status">${opts(STATUSES,"To Do")}</select>`)}
      ${fld("Requested by",`<select id="mk_reqby">${opts(["PIVOT","Client"],"PIVOT")}</select>`)}
      ${fld("Logged",`<input type="date" id="mk_logged" value="${todayISO}">`)}
      ${fld("Due",`<input type="date" id="mk_due">`)}
      ${fld("Done",`<input type="date" id="mk_done">`)}
      ${fld("Tags (comma-separated)",`<input id="mk_tags" placeholder="e.g. dev, waiting-on-client">`)}
    </div>
    <div class="formfull">${fld("Description",`<textarea id="mk_details" rows="3"></textarea>`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add task</button></div>
  </div>`;
  $('modal').classList.add('show');
  const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  autoDone();
  $('mkSave').onclick=()=>{const g=f=>{const el=$('mk_'+f);return el?el.value:"";};const name=g('name').trim();if(!name){toast("Enter a task name");return;}
    const st=g('status');let dn=g('done');if(st==='Done'&&!dn)dn=todayISO;
    create("tasks",nextId("tasks","TSK-",4),{acct:g('acct'),eng:"",name,details:g('details'),owner:g('owner'),priority:g('priority'),reqby:g('reqby'),logged:g('logged')||todayISO,due:g('due'),done:dn,status:st,output:"",notes:"",tags:g('tags'),project:preset.project||"",parent:preset.parent||""});close();};
}
function openTemplateNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">New recurring task</div><h3>Add recurring task</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Task name",`<input id="tp_name" placeholder="Repeats every month">`)}
      ${fld("Brand",`<select id="tp_acct">${brandOpts("")}</select>`)}
      ${fld("Owner",`<select id="tp_owner"><option value="">—</option>${opts(teamActive())}</select>`)}
      ${fld("Priority",`<select id="tp_priority">${opts(PRIOS,"Medium")}</select>`)}
      ${fld("Due day of month (1-28)",`<input type="number" min="1" max="28" id="tp_dueDay" value="1">`)}
      ${fld("Active",`<select id="tp_active">${opts(["Yes","No"],"Yes")}</select>`)}
    </div>
    <div class="formfull">${fld("Description",`<textarea id="tp_details" rows="3"></textarea>`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add</button></div>
  </div>`;
  $('modal').classList.add('show');
  const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('tp_'+f);return el?el.value:"";};const name=g('name').trim();if(!name){toast("Enter a task name");return;}
    const tid="TPL-"+String((store.templates.reduce((mx,d)=>{const mm=String(d.id).match(/(\d+)$/);return mm?Math.max(mx,+mm[1]):mx;},0))+1).padStart(3,"0");
    create("templates",tid,{acct:g('acct'),name,owner:g('owner'),priority:g('priority'),dueDay:Math.min(28,Math.max(1,parseInt(g('dueDay'))||1)),active:g('active'),details:g('details')});close();};
}
function openInvoiceNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">New invoice</div><h3>Add invoice</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Logged · service month",`<input type="date" id="mi_logged" value="${todayISO}">`)}
      ${fld("Issued",`<input type="date" id="mi_date" value="${todayISO}">`)}
      ${fld("Brand",`<select id="mi_acct">${brandOpts("")}</select>`)}
      ${fld("Invoice type",`<select id="mi_income_type">${opts(INCOME_TYPES,"Project")}</select>`)}
      ${fld("Amount (KD)",`<input type="number" step="0.001" id="mi_amt" placeholder="0.000">`)}
      ${fld("Status",`<select id="mi_status">${opts(PAY,"Unpaid")}</select>`)}
      ${fld("Due",`<input type="date" id="mi_due">`)}
    </div>
    <div class="formfull">
      ${fld("Description",`<input id="mi_desc" placeholder="e.g. Shopify setup // Product database">`)}
      ${fld("Note (optional)",`<textarea id="mi_notes" rows="2"></textarea>`)}
    </div>
    <label class="splittoggle"><input type="checkbox" id="mi_split"> <span>Split into installments</span> <span class="muted" style="font-weight:400">(projects paid in parts)</span></label>
    <div id="mi_splitwrap" class="splitwrap" style="display:none">
      <div class="muted" style="font-size:12px;margin-bottom:8px">Each part becomes its own linked invoice with its own number and paid date. The full schedule prints on every part.</div>
      <div class="splitctrl">
        <label>Project total (KD) <input type="number" step="0.001" id="mi_ptotal" placeholder="0.000"></label>
        <label>Parts <select id="mi_parts"><option>2</option><option>3</option><option>4</option></select></label>
        <button type="button" class="ghost" id="mi_even">Split evenly</button>
      </div>
      <div id="mi_partrows" class="partrows"></div>
    </div>
    <div class="muted" style="font-size:12px;padding:6px 2px 0">Retainer: logged is the 1st of the service month, issued the 1st of the next month, due the 10th. Project: logged and issued are usually the same day.</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add invoice</button></div>
  </div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  const DEFLBL=["Advance","On delivery","Milestone 3","Milestone 4"];
  const partRow=(i)=>`<div class="partrow">
    <input class="pp_label" placeholder="${DEFLBL[i]||('Part '+(i+1))}" value="${DEFLBL[i]||('Part '+(i+1))}">
    <input type="number" step="0.001" class="pp_amt" placeholder="0.000">
    <input type="date" class="pp_due" title="Due date">
    <select class="pp_status">${opts(PAY,"Unpaid")}</select>
  </div>`;
  const drawParts=()=>{const n=parseInt($('mi_parts').value)||2;$('mi_partrows').innerHTML=`<div class="partrow phead"><span>Label</span><span>Amount (KD)</span><span>Due</span><span>Status</span></div>`+Array.from({length:n},(_,i)=>partRow(i)).join("");};
  const splitEvenly=()=>{const n=parseInt($('mi_parts').value)||2;const tot=Math.round((parseFloat($('mi_ptotal').value)||0)*1000);if(tot<=0)return;const base=Math.floor(tot/n);const amts=Array.from({length:n},(_,i)=>i===n-1?(tot-base*(n-1)):base);document.querySelectorAll('#mi_partrows .pp_amt').forEach((el,i)=>{el.value=(amts[i]/1000).toFixed(3);});};
  $('mi_split').onchange=e=>{const on=e.target.checked;$('mi_splitwrap').style.display=on?'block':'none';$('mi_amt').disabled=on;$('mi_status').disabled=on;$('mi_due').disabled=on;if(on&&!$('mi_partrows').innerHTML)drawParts();};
  $('mi_parts').onchange=drawParts;$('mi_even').onclick=splitEvenly;
  $('mkSave').onclick=()=>{const g=f=>{const el=$('mi_'+f);return el?el.value:"";};
    const common={logged:(g('logged')||g('date')||todayISO),acct:g('acct'),eng:"",dir:"Income",cat:"Client Payment",income_type:g('income_type')||"Project",desc:g('desc'),notes:g('notes')};
    const issued=g('date')||todayISO;
    if($('mi_split')&&$('mi_split').checked){
      const rows=[...document.querySelectorAll('#mi_partrows .partrow:not(.phead)')].map(r=>({label:r.querySelector('.pp_label').value.trim(),amt:parseFloat(r.querySelector('.pp_amt').value),due:r.querySelector('.pp_due').value,status:r.querySelector('.pp_status').value}));
      if(rows.some(r=>isNaN(r.amt)||r.amt<=0)){toast("Give every part an amount");return;}
      const n=rows.length,ref=nextProjRef(),invs=nextInvNos(n),ids=nextIds("money","LDG-",4,n);
      const payload=rows.map((r,i)=>Object.assign({},common,{id:ids[i],date:issued,amt:Math.abs(r.amt),status:r.status,due:r.due,paid:r.status==='Paid'?issued:"",inv_no:invs[i],proj_ref:ref,inst_no:i+1,inst_count:n,inst_label:r.label}));
      createMany("money",payload);close();return;
    }
    const amt=parseFloat(g('amt'));if(isNaN(amt)){toast("Enter an amount");return;}
    create("money",nextId("money","LDG-",4),Object.assign({},common,{date:issued,amt:Math.abs(amt),status:g('status'),due:g('due'),paid:g('status')==='Paid'?issued:""}));close();};
}
function nextInvNo(){let mx=0;store.money.forEach(m=>{const g=String(m.inv_no||'').match(/INV-(\d+)/);if(g)mx=Math.max(mx,+g[1]);});return "INV-"+String(mx+1).padStart(4,"0");}
function nextInvNos(n){let mx=0;store.money.forEach(m=>{const g=String(m.inv_no||'').match(/INV-(\d+)/);if(g)mx=Math.max(mx,+g[1]);});return Array.from({length:n},(_,i)=>"INV-"+String(mx+1+i).padStart(4,"0"));}
function nextIds(coll,prefix,pad,n){let mx=0;store[coll].forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});return Array.from({length:n},(_,i)=>prefix+String(mx+1+i).padStart(pad,"0"));}
function nextProjRef(){let mx=0;store.money.forEach(m=>{const g=String(m.proj_ref||'').match(/PRJ-(\d+)/);if(g)mx=Math.max(mx,+g[1]);});return "PRJ-"+String(mx+1).padStart(4,"0");}
function projSibs(m){return (m&&m.proj_ref)?store.money.filter(x=>x.proj_ref===m.proj_ref&&x.dir==='Income').sort((a,b)=>((+a.inst_no||0)-(+b.inst_no||0))||String(a.inv_no||'').localeCompare(String(b.inv_no||''))):[];}
// ---------- invoice PDF (print to PDF, three templates by income type) ----------
const PIVOT_CO={name:"The Pivot Strategy",tagline:"Shaping Tomorrow, Today",city:"Kuwait",email:"info@thepivotstrategy.com",web:"www.thepivotstrategy.com"};
function fmtDate(iso){if(!iso)return"";const MM=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const p=(iso||"").split("-");return p.length>=3?`${p[2]} ${MM[(+p[1]||1)-1]} ${p[0]}`:iso;}
function invoiceHTML(m,acct){
  acct=acct||{};
  const type=m.income_type||"Project";
  const tmpl=type==="Retainer"?"retainer":(type==="One-time"?"oneoff":"project");
  const invno="PVT-"+(m.inv_no||m.id);
  const paid=m.status==="Paid";const amt=Math.abs(+m.amt||0);
  const svcMonth=m.logged?monthLabel(String(m.logged).slice(0,7)):"";
  // installment context (linked project parts)
  const sibs=projSibs(m);const isInst=(sibs.length>1)&&(+m.inst_count>1);
  const projTotal=isInst?sibs.reduce((a,s)=>a+Math.abs(+s.amt||0),0):amt;
  const paidToDate=isInst?sibs.filter(s=>s.status==="Paid").reduce((a,s)=>a+Math.abs(+s.amt||0),0):(paid?amt:0);
  const instTag=isInst?`Installment ${m.inst_no} of ${m.inst_count}`:"";
  const typeLine=tmpl==="retainer"?("Retainer"+(svcMonth?" · "+svcMonth:""))
    :tmpl==="oneoff"?"One-off work"
    :("Project"+(isInst?" · "+instTag:""));
  let note;
  if(tmpl==="retainer")note=`This invoice is the monthly retainer fee${svcMonth?` for ${svcMonth}`:""}. Payment is due in full upon receipt.`;
  else if(isInst)note=`This is ${instTag.toLowerCase()} for the project below, which totals KWD ${KD(projTotal)}. Payment for this installment is due upon receipt.`;
  else if(tmpl==="oneoff")note=`This invoice covers the one-off work listed below. Payment is due upon receipt.`;
  else note=`This invoice covers the project work listed below. Payment is due upon receipt.`;
  const parts=String(m.desc||type+" services").split("//").map(x=>x.trim()).filter(Boolean);
  const mainDesc=parts[0]||(type+" services");
  const subs=parts.slice(1);
  const addrHTML=String(acct.bill_addr||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(esc).join("<br>");
  const company=acct.bill_company||acct.brand||"Client";
  const billed=`<b>${esc(company)}</b>`
    +(addrHTML?`<br>${addrHTML}`:"")
    +(acct.country?`<br>${esc(acct.country)}`:"")
    +(acct.bill_attn?`<br>Attn: ${esc(acct.bill_attn)}`:"")
    +(acct.bill_tel?`<br>Tel: ${esc(acct.bill_tel)}`:"")
    +(acct.bill_email?`<br>${esc(acct.bill_email)}`:"")
    +(acct.bill_reg?`<br>CR/Reg: ${esc(acct.bill_reg)}`:"");
  const schedHTML=isInst?`<div class="sched">
      <div class="k" style="margin-bottom:7px">Payment schedule</div>
      <table class="schtab"><tbody>${sibs.map(s=>{const sp=s.status==="Paid";const cur=s.id===m.id;return `<tr class="${cur?'cur':''}">
        <td class="n">${s.inst_no} &nbsp;${esc(s.inst_label||('Installment '+s.inst_no))}${cur?' <span class="thisone">this invoice</span>':''}</td>
        <td class="dt">${sp?('Paid'+(s.paid?' '+esc(fmtDate(s.paid)):'')):(s.due?'Due '+esc(fmtDate(s.due)):'Due on receipt')}</td>
        <td class="amt">KWD ${KD(Math.abs(+s.amt||0))}</td>
        <td class="st"><span class="chip ${sp?'paid':'due'}">${sp?'PAID':'DUE'}</span></td></tr>`;}).join("")}</tbody></table>
      <div class="schfoot">Project total <b>KWD ${KD(projTotal)}</b> &nbsp;·&nbsp; Paid to date KWD ${KD(paidToDate)} &nbsp;·&nbsp; Balance <b>KWD ${KD(projTotal-paidToDate)}</b></div>
    </div>`:"";
  const totalLabel=isInst?"Total due now":"Total due";
  const css=`@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#141414;font-size:12px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;min-height:297mm;margin:0 auto;position:relative;padding-bottom:40mm}
  .hdr{background:#0b0b0d;color:#fff;padding:20mm 16mm 9mm;display:flex;justify-content:space-between;align-items:flex-end}
  .hdr .inv{font-size:34px;font-weight:800;letter-spacing:1px;display:flex;align-items:center;gap:14px}
  .hchip{font-size:11px;font-weight:800;letter-spacing:.08em;padding:5px 13px;border-radius:999px}
  .hchip.paid{background:#1aa14c;color:#fff}.hchip.due{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.55)}
  .hdr .co{text-align:right;font-size:11px;opacity:.82;line-height:1.5}
  .hdr .co b{font-size:15px;display:block;letter-spacing:1px;opacity:1}
  .meta{display:flex;margin:0 16mm;padding:11px 0;border-bottom:1px solid #e7e7ea}
  .meta>div{flex:1;padding:0 14px;border-left:1px solid #ededf0}.meta>div:first-child{padding-left:0;border-left:0}
  .k{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:#8a8d94;font-weight:700}
  .meta .v{font-size:13px;font-weight:600;font-style:italic;margin-top:4px}
  .parties{display:flex;gap:14mm;margin:9mm 16mm 0}.parties .col{flex:1}
  .lbl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;border-bottom:1px solid #141414;padding-bottom:4px;margin-bottom:8px}
  .party{line-height:1.6}
  .note{margin:8mm 16mm 0;background:#f4f4f6;border-left:3px solid #141414;padding:11px 14px;font-size:12px}
  table.items{width:calc(100% - 32mm);margin:8mm 16mm 0;border-collapse:collapse}
  table.items th{background:#141414;color:#fff;text-align:left;padding:9px 14px;font-size:10px;letter-spacing:.06em;text-transform:uppercase}
  table.items th.amt,table.items td.amt{text-align:right;white-space:nowrap}
  table.items td{padding:12px 14px;border-bottom:1px solid #ededf0;font-style:italic;color:#333;vertical-align:top}
  .subs{list-style:none;margin:5px 0 0;padding:0;font-size:10.5px;color:#777;font-style:normal}.subs li:before{content:"– "}
  .sched{margin:7mm 16mm 0}
  table.schtab{width:100%;border-collapse:collapse;font-size:11.5px}
  table.schtab td{padding:8px 12px;border-bottom:1px solid #ededf0;vertical-align:middle}
  table.schtab td.n{font-weight:600}table.schtab td.dt{color:#777}table.schtab td.amt{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}table.schtab td.st{text-align:right;width:70px}
  table.schtab tr.cur td{background:#f4f4f6}
  .thisone{display:inline-block;font-size:8.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#555;border:1px solid #cfcfd4;border-radius:999px;padding:1px 7px;margin-left:7px;vertical-align:middle}
  .chip{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.06em;padding:3px 9px;border-radius:999px}
  .chip.paid{background:#1aa14c;color:#fff}.chip.due{background:#141414;color:#fff}
  .schfoot{margin-top:9px;font-size:11.5px;color:#444;text-align:right}
  .totals{display:flex;justify-content:flex-end;margin:7mm 16mm 0}.totbox{width:78mm}
  .tr{display:flex;justify-content:space-between;padding:6px 14px;font-size:12px}
  .tr.grand{background:#141414;color:#fff;font-weight:800;font-size:13.5px;margin-top:5px}
  .duedate{margin:7mm 16mm 0;font-size:12px;color:#444}
  .foot{position:absolute;bottom:0;left:0;right:0;padding:0 16mm}
  .thanks b{font-size:13px}.thanks p{color:#555;margin-top:2px}
  .botline{border-top:1px solid #141414;margin-top:7mm;padding:7px 0 9mm;text-align:center;font-size:9.5px;color:#9a9ca2;letter-spacing:.02em}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(invno)} ${esc(company)}</title><style>${css}</style></head><body><div class="page">
    <div class="hdr"><div class="inv">INVOICE<span class="hchip ${paid?'paid':'due'}">${paid?'PAID':'DUE'}</span></div><div class="co"><b>PIVOT</b>${esc(PIVOT_CO.name)}<br>${esc(PIVOT_CO.city)} · ${esc(PIVOT_CO.email)}</div></div>
    <div class="meta">
      <div><div class="k">Invoice No.</div><div class="v">${esc(invno)}</div></div>
      <div><div class="k">Issued</div><div class="v">${esc(m.date?fmtDate(m.date):'—')}</div></div>
      <div><div class="k">Due</div><div class="v">${esc(m.due?fmtDate(m.due):'On receipt')}</div></div>
      <div><div class="k">Type</div><div class="v">${esc(typeLine)}</div></div>
    </div>
    <div class="parties">
      <div class="col"><div class="lbl">Billed to</div><div class="party">${billed}</div></div>
      <div class="col"><div class="lbl">From</div><div class="party"><b>${esc(PIVOT_CO.name)}</b><br>${esc(PIVOT_CO.city)}<br>${esc(PIVOT_CO.email)}<br>${esc(PIVOT_CO.web)}</div></div>
    </div>
    <div class="note">${esc(note)}</div>
    <table class="items"><thead><tr><th>Description</th><th class="amt">Amount (KWD)</th></tr></thead>
      <tbody><tr><td>${esc(mainDesc)}${subs.length?`<ul class="subs">${subs.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`:""}</td><td class="amt">${KD(amt)}</td></tr></tbody></table>
    ${schedHTML}
    <div class="totals"><div class="totbox">
      <div class="tr"><span>Subtotal</span><span>KWD ${KD(amt)}</span></div>
      <div class="tr"><span>Sales tax</span><span>0% · 0.000</span></div>
      <div class="tr grand"><span>${esc(totalLabel)}</span><span>KWD ${KD(amt)}</span></div>
    </div></div>
    <div class="duedate">${paid?`Paid${m.paid?` on ${esc(fmtDate(m.paid))}`:""}. Thank you.`:`Please settle ${isInst?'this installment ':''}by <b>${esc(m.due?fmtDate(m.due):'receipt')}</b>.`}</div>
    <div class="foot">
      <div class="thanks"><b>Thank you for choosing PIVOT.</b><p>We look forward to continuing to deliver results. Questions? ${esc(PIVOT_CO.email)}</p></div>
      <div class="botline">${esc(PIVOT_CO.name)} · ${esc(PIVOT_CO.tagline)} · ${esc(PIVOT_CO.web)} · ${esc(PIVOT_CO.email)}</div>
    </div>
  </div></body></html>`;
}
function downloadInvoicePDF(id){
  const m=store.money.find(x=>x.id===id);if(!m||m.dir!=="Income"){toast("Only invoices can be exported");return;}
  const w=window.open('','_blank');if(!w){toast("Allow pop-ups to download the invoice");return;}
  w.document.write(invoiceHTML(m,AMAP[m.acct]));w.document.close();
  const go=()=>{try{w.focus();w.print();}catch(_){}};
  if(w.document.readyState==='complete')setTimeout(go,250);else w.onload=()=>setTimeout(go,250);
}
function openExpenseNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">New expense</div><h3>Add expense</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Date",`<input type="date" id="mx_date" value="${todayISO}">`)}
      ${fld("Brand",`<select id="mx_acct">${brandOpts("")}</select>`)}
      ${fld("Category",`<select id="mx_cat">${opts(EXPCATS,"Other Expense")}</select>`)}
      ${fld("Amount (KD)",`<input type="number" step="0.001" id="mx_amt" placeholder="0.000">`)}
      ${fld("Status",`<select id="mx_status">${opts(PAY,"Paid")}</select>`)}
    </div>
    <div class="formfull">
      ${fld("Description",`<input id="mx_desc">`)}
      ${fld("Note (optional)",`<textarea id="mx_notes" rows="2"></textarea>`)}
    </div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add expense</button></div>
  </div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('mx_'+f);return el?el.value:"";};const amt=parseFloat(g('amt'));if(isNaN(amt)){toast("Enter an amount");return;}
    const st=g('status')||"Paid";
    create("money",nextId("money","LDG-",4),{date:g('date')||todayISO,acct:g('acct'),eng:"",dir:"Expense",cat:g('cat'),desc:g('desc'),amt:-Math.abs(amt),status:st,due:"",paid:(st==='Paid'?(g('date')||todayISO):""),notes:g('notes')});close();};
}
const SALARY_DEFAULTS=[{person:"Daoud",role:"Full-time",amt:500},{person:"Arafa",role:"Full-time",amt:500},{person:"Zawar",role:"Part-time",amt:100}];
function endOfMonthISO(){const d=new Date();const e=new Date(d.getFullYear(),d.getMonth()+1,0);return e.toISOString().slice(0,10);}
// current month on a given day (clamped to the month's last day), used as the default salary issue date
function issueDayISO(day){const d=new Date();const y=d.getFullYear(),m=d.getMonth();const last=new Date(y,m+1,0).getDate();const dd=Math.min(day,last);return `${y}-${String(m+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;}
function salRowHtml(r){r=r||{person:"",role:"",amt:""};return `<div class="slrow" data-id="${esc(r.id||'')}" data-status="${esc(r.status||'')}">
  <input class="sl_p" placeholder="Name" value="${esc(r.person||'')}">
  <select class="sl_r"><option value="">role</option>${opts(ROLES,r.role||"")}</select>
  <input class="sl_a" type="number" step="0.001" placeholder="KD" value="${r.amt!==''&&r.amt!=null?esc(r.amt):''}">
  <button class="ghost slx" title="Remove">✕</button></div>`;}
function openSalaryEdit(g){openSalaryNew(g);}
function openSalaryNew(g){
  if(!canWrite){toast("Read-only access");return;}
  const edit=!!(g&&g.rows&&g.rows.length);
  const initRows=edit?g.rows.map(m=>({id:m.id,person:m.partner||'',role:m.role||'',amt:Math.abs(+m.amt||0),status:m.status})):SALARY_DEFAULTS;
  const dateVal=edit?(g.rows[0].date||g.ym+"-24"):issueDayISO(24);
  const notesVal=edit?(g.rows[0].notes||''):'';
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${edit?esc(monthLabel(g.ym)):"Monthly salaries"}</div><h3>${edit?"Edit month's salaries":"Add month's salaries"}</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Pay date (day of issue)",`<input type="date" id="sl_date" value="${esc(dateVal)}">`)}
      ${fld(edit?"Status for people you add":"Status",`<select id="sl_status">${opts(PAYOUT_STATUS,edit?"Pending":"Paid")}</select>`)}
    </div>
    <div class="formfull">
      ${fld(edit?"People this month":"People paid this month",`<div id="sl_rows">${initRows.map(salRowHtml).join("")}</div><button class="ghost" id="sl_addrow" style="margin-top:8px">+ Add person</button>`)}
      ${edit?'<div class="muted" style="font-size:12px;margin:2px 0 0">People already here keep their own paid or pending status. Change those from the list with each person\'s button.</div>':''}
      <div class="muted" id="sl_preview" style="margin:8px 0 0;font-size:12px"></div>
      ${fld("Note (optional)",`<textarea id="sl_notes" rows="2">${esc(notesVal)}</textarea>`)}
    </div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">${edit?"Save month":"Add month"}</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  const preview=()=>{let t=0;document.querySelectorAll('.sl_a').forEach(a=>t+=Math.abs(parseFloat(a.value)||0));$('sl_preview').textContent="Month total · KD "+KD(t);};
  const wireRows=()=>{document.querySelectorAll('.slx').forEach(b=>b.onclick=()=>{if(document.querySelectorAll('.slrow').length>1)b.closest('.slrow').remove();preview();});document.querySelectorAll('.sl_a').forEach(a=>a.oninput=preview);preview();};
  wireRows();
  $('sl_addrow').onclick=()=>{$('sl_rows').insertAdjacentHTML('beforeend',salRowHtml());wireRows();};
  $('mkSave').onclick=async()=>{const date=$('sl_date').value||issueDayISO(24);const newSt=$('sl_status').value;const notes=$('sl_notes').value;
    const ml=monthLabel(date.slice(0,7));
    const rowsEl=Array.from(document.querySelectorAll('.slrow'));
    const entries=rowsEl.map(r=>({id:r.dataset.id||'',status:r.dataset.status||'',person:r.querySelector('.sl_p').value.trim(),role:r.querySelector('.sl_r').value,amt:parseFloat(r.querySelector('.sl_a').value)})).filter(e=>e.person&&!isNaN(e.amt)&&e.amt>0);
    if(!entries.length){toast("Add at least one person with an amount");return;}
    const mkRow=(e,id,st)=>({id,date,acct:"",eng:"",dir:"Salary",cat:(e.role==="Freelance"?"Freelancer":"Salary"),partner:e.person,role:e.role,desc:`${e.person} ${ml} salary`,amt:-Math.abs(e.amt),status:st,due:"",paid:(st==='Paid'?date:""),notes});
    if(edit){
      for(const e of entries.filter(x=>x.id)){const st=e.status||newSt;await write("money",e.id,mkRow(e,e.id,st));}
      const newOnes=entries.filter(e=>!e.id);
      if(newOnes.length){let mx=0;store.money.forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});
        await createMany("money",newOnes.map((e,i)=>mkRow(e,"LDG-"+String(mx+1+i).padStart(4,"0"),newSt)));}
      const kept=entries.filter(e=>e.id).map(e=>e.id);
      const removed=(g.ids||[]).filter(id=>!kept.includes(id));
      if(removed.length)await removeMany("money",removed);
    }else{
      let mx=0;store.money.forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});
      await createMany("money",entries.map((e,i)=>mkRow(e,"LDG-"+String(mx+1+i).padStart(4,"0"),newSt)));
    }
    close();};
}
function openPayoutNew(){
  if(!canWrite){toast("Read-only access");return;}
  const partnerBoxes=teamActive().map(n=>`<label class="pchk"><input type="checkbox" class="mp_partner" value="${esc(n)}" checked> ${esc(n)}</label>`).join("");
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">New payout</div><h3>Add payout <span class="muted" style="font-weight:500">· PIVOT profit split, divided equally</span></h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Date",`<input type="date" id="mp_date" value="${todayISO}">`)}
      ${fld("Total amount (KD)",`<input type="number" step="0.001" id="mp_amt" placeholder="0.000">`)}
      ${fld("Status",`<select id="mp_status">${opts(PAYOUT_STATUS,"Pending")}</select>`)}
    </div>
    <div class="formfull">
      ${fld("Partners in this split",`<div class="pchks">${partnerBoxes}</div>`)}
      <div class="muted" id="mp_preview" style="margin:-4px 0 8px;font-size:12px"></div>
      ${fld("Description",`<input id="mp_desc" placeholder="e.g. Q3 profit split">`)}
      ${fld("Note (optional)",`<textarea id="mp_notes" rows="2"></textarea>`)}
    </div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add payout</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  const picked=()=>Array.from(document.querySelectorAll('.mp_partner')).filter(c=>c.checked).map(c=>c.value);
  const preview=()=>{const amt=parseFloat($('mp_amt').value)||0;const p=picked();const each=p.length?amt/p.length:0;$('mp_preview').textContent=p.length?`${p.length} partner${p.length===1?'':'s'} · KD ${KD(each)} each`:"Select at least one partner";};
  $('mp_amt').oninput=preview;document.querySelectorAll('.mp_partner').forEach(c=>c.onchange=preview);preview();
  $('mkSave').onclick=()=>{const g=f=>{const el=$('mp_'+f);return el?el.value:"";};const amt=parseFloat(g('amt'));if(isNaN(amt)||amt<=0){toast("Enter a total amount");return;}
    const p=picked();if(!p.length){toast("Pick at least one partner");return;}
    const st=g('status'),date=g('date')||todayISO,paid=(st==='Paid'?date:""),each=amt/p.length;
    const batch="PO-"+Date.now().toString(36).toUpperCase();
    let mx=0;store.money.forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});
    const rows=p.map((name,i)=>({id:"LDG-"+String(mx+1+i).padStart(4,"0"),date,acct:"",eng:"",dir:"Payout",cat:"Partner Payout",partner:name,batch,desc:g('desc')||"Profit split",amt:-Math.abs(each),status:st,due:"",paid,notes:g('notes')}));
    createMany("money",rows);close();};
}
function openAccountNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">New account</div><h3>Add account / brand</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Brand name",`<input id="ma_brand" placeholder="Client / brand">`)}
      ${fld("Type",`<input id="ma_type" placeholder="e.g. Retainer, Project">`)}
      ${fld("Country",`<input id="ma_country" placeholder="e.g. Kuwait">`)}
      ${fld("Lifecycle",`<select id="ma_lifecycle">${opts(LIFE,"Lead")}</select>`)}
      ${fld("Parent account (optional)",`<select id="ma_parent">${accountOpts("","")}</select>`)}
      ${fld("Monthly retainer (KD, optional)",`<input type="number" step="0.001" id="ma_retainer_fee" placeholder="0 = not a retainer">`)}
    </div>
    <div class="secdiv">Billing details <span class="muted" style="font-weight:400">· printed on invoices</span></div>
    <div class="formgrid">
      ${fld("Company name on invoice",`<input id="ma_bill_company" placeholder="defaults to brand name">`)}
      ${fld("Representative name",`<input id="ma_bill_attn" placeholder="e.g. Fadi Nicola">`)}
      ${fld("Representative phone",`<input id="ma_bill_tel" placeholder="e.g. +965 6513 7513">`)}
      ${fld("Representative email",`<input id="ma_bill_email" placeholder="e.g. fadi@client.com">`)}
      ${fld("CR / registration no.",`<input id="ma_bill_reg" placeholder="optional">`)}
    </div>
    <div class="formfull">${fld("Company address",`<textarea id="ma_bill_addr" rows="2" placeholder="Street, floor, area, city"></textarea>`)}</div>
    <div class="formfull">${fld("Notes (optional)",`<textarea id="ma_notes" rows="2"></textarea>`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add account</button></div>
  </div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('ma_'+f);return el?el.value:"";};const brand=g('brand').trim();if(!brand){toast("Enter a brand name");return;}
    create("accounts",nextId("accounts","ACC-",3),{brand,type:g('type'),country:g('country'),lifecycle:g('lifecycle'),parent:g('parent'),notes:g('notes'),date_added:todayISO,retainer_fee:Math.abs(parseFloat(g('retainer_fee'))||0),bill_company:g('bill_company'),bill_addr:g('bill_addr'),bill_attn:g('bill_attn'),bill_tel:g('bill_tel'),bill_email:g('bill_email'),bill_reg:g('bill_reg')});close();};
}
function openAccountEdit(id){
  const a=AMAP[id];if(!a)return;if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${esc(a.id)}</div><h3>Edit ${esc(a.brand)}</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Brand name",`<input id="ae_brand" value="${esc(a.brand||'')}">`)}
      ${fld("Type",`<input id="ae_type" value="${esc(a.type||'')}">`)}
      ${fld("Country",`<input id="ae_country" value="${esc(a.country||'')}">`)}
      ${fld("Lifecycle",`<select id="ae_lifecycle">${opts(LIFE,a.lifecycle)}</select>`)}
      ${fld("Parent account",`<select id="ae_parent">${accountOpts(a.parent||"",a.id)}</select>`)}
      ${fld("Date added",`<input type="date" id="ae_date_added" value="${esc(a.date_added||'')}">`)}
      ${fld("Monthly retainer (KD)",`<input type="number" step="0.001" id="ae_retainer_fee" value="${a.retainer_fee!=null?esc(Math.abs(+a.retainer_fee)):''}" placeholder="0 = not a retainer">`)}
    </div>
    <div class="secdiv">Billing details <span class="muted" style="font-weight:400">· printed on invoices</span></div>
    <div class="formgrid">
      ${fld("Company name on invoice",`<input id="ae_bill_company" value="${esc(a.bill_company||'')}" placeholder="defaults to brand name">`)}
      ${fld("Representative name",`<input id="ae_bill_attn" value="${esc(a.bill_attn||'')}" placeholder="e.g. Fadi Nicola">`)}
      ${fld("Representative phone",`<input id="ae_bill_tel" value="${esc(a.bill_tel||'')}" placeholder="e.g. +965 6513 7513">`)}
      ${fld("Representative email",`<input id="ae_bill_email" value="${esc(a.bill_email||'')}" placeholder="e.g. fadi@client.com">`)}
      ${fld("CR / registration no.",`<input id="ae_bill_reg" value="${esc(a.bill_reg||'')}" placeholder="optional">`)}
    </div>
    <div class="formfull">${fld("Company address",`<textarea id="ae_bill_addr" rows="2" placeholder="Street, floor, area, city">${esc(a.bill_addr||'')}</textarea>`)}</div>
    <div class="formfull">${fld("Notes",`<textarea id="ae_notes" rows="2">${esc(a.notes||'')}</textarea>`)}</div>
    <div class="sheetfoot">${canWrite?`<button class="ghost" id="mkDelete" style="color:var(--bad);border-color:var(--bad-soft)">Delete</button>`:""}<span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Save</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=async()=>{const g=f=>{const el=$('ae_'+f);return el?el.value:"";};
    await write("accounts",id,{brand:g('brand'),type:g('type'),country:g('country'),lifecycle:g('lifecycle'),parent:g('parent'),date_added:g('date_added'),notes:g('notes'),retainer_fee:Math.abs(parseFloat(g('retainer_fee'))||0),bill_company:g('bill_company'),bill_addr:g('bill_addr'),bill_attn:g('bill_attn'),bill_tel:g('bill_tel'),bill_email:g('bill_email'),bill_reg:g('bill_reg')});close();};
  if($('mkDelete'))$('mkDelete').onclick=()=>{close();remove("accounts",id);};
}
function openReport(kind){
  const R=activeRange();const lbl=R.from==='2000-01-01'?'All time':`${R.from} → ${R.to==='9999-12-31'?'now':R.to}`;let title,html,csv,fname;
  if(kind==='money'){
    // Same set and same maths as the Money dashboard (all brands, moneyStats), so every figure here matches it.
    const Mall=store.money;const S=moneyStats(Mall,R.from,R.to);const rng=R.to==='9999-12-31'?'now':R.to;
    const dOf=m=>m.date||'';const pOf=m=>m.paid||m.date||'';
    const inIssue=m=>dOf(m)>=R.from&&dOf(m)<=R.to;const inPaid=m=>m.status==='Paid'&&pOf(m)>=R.from&&pOf(m)<=R.to;
    const abs=m=>Math.abs(+m.amt||0);const sum=a=>a.reduce((t,m)=>t+abs(m),0);
    const TYPES=[["Income","In · Income"],["Expense","Out · Expense"],["Salary","Out · Salary"],["Payout","Out · Payout"]];
    const typeRows=TYPES.map(([d,l])=>{const iss=Mall.filter(m=>m.dir===d&&!voided(m)&&inIssue(m));
      return {l,iss:sum(iss),paid:sum(Mall.filter(m=>m.dir===d&&inPaid(m))),open:sum(iss.filter(m=>m.status!=='Paid')),n:iss.length};});
    const outPaid=Mall.filter(m=>m.dir!=='Income'&&inPaid(m));
    const byCat={};outPaid.forEach(m=>{const k=m.dir+" · "+(m.cat||"Uncategorised");byCat[k]=(byCat[k]||0)+abs(m);});
    const catRows=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
    const byB={};const bb=b=>byB[b]||(byB[b]={billed:0,coll:0,cost:0});
    Mall.forEach(m=>{const b=brandOf(m.acct)||"No brand";
      if(m.dir==='Income'){if(!voided(m)&&inIssue(m))bb(b).billed+=abs(m);if(inPaid(m))bb(b).coll+=abs(m);}
      else if(inPaid(m))bb(b).cost+=abs(m);});
    const brandRows=Object.entries(byB).filter(([,o])=>o.billed||o.coll||o.cost).sort((a,b)=>(b[1].coll-b[1].cost)-(a[1].coll-a[1].cost));
    const byP={};outPaid.filter(m=>m.dir==='Salary'||m.dir==='Payout').forEach(m=>{const k=m.partner||"Unnamed";const o=byP[k]||(byP[k]={sal:0,po:0});if(m.dir==='Salary')o.sal+=abs(m);else o.po+=abs(m);});
    const personRows=Object.entries(byP).sort((a,b)=>(b[1].sal+b[1].po)-(a[1].sal+a[1].po));
    const vd=Mall.filter(m=>voided(m)&&inIssue(m));
    const tbl=(head,body,empty)=>`<div class="tablewrap"><table><thead><tr>${head.map((h,i)=>`<th${i?' class="num"':''}>${h}</th>`).join("")}</tr></thead><tbody>${body||`<tr><td colspan="${head.length}" class="rowcount">${empty}</td></tr>`}</tbody></table></div>`;
    const td=v=>`<td class="num">${KD(v)}</td>`;
    // ledger: every row issued or paid in range, all types and statuses, with a running bank balance over all time
    const led=Mall.filter(m=>inIssue(m)||(m.paid&&m.paid>=R.from&&m.paid<=R.to));
    const runBal={};let rb=0;[...Mall].filter(m=>m.status==='Paid').sort((a,b)=>(pOf(a)+a.id).localeCompare(pOf(b)+b.id)).forEach(m=>{rb+=(m.dir==='Income'?1:-1)*abs(m);runBal[m.id]=rb;});
    title="Financial report";
    html=`<div class="muted" style="font-size:12px">${esc(lbl)} · all brands · issued by issue date, paid by paid date · cancelled and voided left out of totals</div>
      <div class="kpis">${kpi("Billed","KD "+KD(S.perType.income.issued),"accent")}${kpi("Collected","KD "+KD(S.cashIn),"good")}${kpi("Paid out","KD "+KD(S.cashOut),"bad")}${kpi("Cash moved (collected − paid out)","KD "+KD(S.cashflow),S.cashflow<0?"bad":"good")}</div>
      <div class="kpis">${kpi("In the bank now · all time","KD "+KD(S.bankBalance),S.bankBalance<0?"bad":"accent")}${kpi("Still to collect","KD "+KD(S.toCollect),"warn")}${kpi("Still to pay out","KD "+KD(S.toPayOut),"bad")}${kpi("If everything clears","KD "+KD(S.bankBalance+S.toCollect-S.toPayOut),"")}</div>
      <h4 class="rephd">In and out by type</h4>
      ${tbl(["Type","Issued","Paid","Still open","Lines"],typeRows.map(r=>`<tr><td>${r.l}</td>${td(r.iss)}${td(r.paid)}${td(r.open)}<td class="num">${r.n}</td></tr>`).join("")+`<tr class="totrow"><td><b>Total out</b></td>${td(typeRows.slice(1).reduce((t,r)=>t+r.iss,0))}${td(S.cashOut)}${td(typeRows.slice(1).reduce((t,r)=>t+r.open,0))}<td class="num">${typeRows.slice(1).reduce((t,r)=>t+r.n,0)}</td></tr>`,"")}
      <h4 class="rephd">Paid out by category</h4>
      ${tbl(["Category","Paid (KD)"],catRows.map(r=>`<tr><td>${esc(r[0])}</td>${td(r[1])}</tr>`).join(""),"Nothing paid out in range")}
      <h4 class="rephd">By brand · collected minus paid costs</h4>
      ${tbl(["Brand","Billed","Collected","Costs paid","Net"],brandRows.map(([b,o])=>`<tr><td>${esc(b)}</td>${td(o.billed)}${td(o.coll)}${td(o.cost)}<td class="num ${o.coll-o.cost<0?'neg':''}">${KD(o.coll-o.cost)}</td></tr>`).join(""),"No activity in range")}
      <h4 class="rephd">Paid to people</h4>
      ${tbl(["Person","Salary","Payout","Total"],personRows.map(([p,o])=>`<tr><td>${esc(p)}</td>${td(o.sal)}${td(o.po)}${td(o.sal+o.po)}</tr>`).join(""),"No salaries or payouts paid in range")}
      ${vd.length?`<div class="muted" style="font-size:12px">${vd.length} cancelled or voided line${vd.length>1?'s':''} in range (KD ${KD(sum(vd))}), left out of the totals above but included in the CSV.</div>`:""}
      <div class="muted" style="font-size:12px">Ledger CSV: ${led.length} lines, every type and status issued or paid in range.${state.range.preset!=='all'?' For a full audit set the range to All time.':''}</div>`;
    fname=`PIVOT ledger ${R.from==='2000-01-01'?'all time':R.from+'_'+rng} (exported ${todayISO}).csv`;
    csv=()=>{const f3=v=>v==null||v===''?'':(+v).toFixed(3);
      const H=["Ledger ID","Direction","Type","Category","Brand","Account ID","Person","Role","Invoice no","Invoice type","Description","Issued","Service month","Due","Paid on","Status","Counts in totals","Amount (signed KD)","In (KD)","Out (KD)","Cash moved","Running bank balance (KD)","Payout batch","Project ref","Installment","Template","Notes","Created at"];
      const lines=[H.map(csvCell).join(",")];
      led.sort((a,b)=>((a.status==='Paid'?pOf(a):dOf(a))+a.id).localeCompare((b.status==='Paid'?pOf(b):dOf(b))+b.id)).forEach(m=>{const inc=m.dir==='Income';const a=abs(m);
        lines.push([m.id,inc?"In":"Out",m.dir,m.cat,brandOf(m.acct),m.acct,m.partner,m.role,m.inv_no,m.income_type,m.desc,m.date,m.logged,m.due,m.paid,m.status,voided(m)?"No":"Yes",
          f3(inc?a:-a),inc?f3(a):"",inc?"":f3(a),m.status==='Paid'?"Yes":"No",m.status==='Paid'?f3(runBal[m.id]):"",m.batch,m.proj_ref,m.inst_no?(m.inst_no+" of "+(m.inst_count||"?")):"",m.tpl,m.notes,m.created_at].map(csvCell).join(","));});
      dl(fname,lines.join("\n"));};
  } else {
    const T=tasksF();const inR=v=>v&&v>=R.from&&v<=R.to;
    const open=T.filter(t=>t.status!=="Done");
    const created=T.filter(t=>inR(t.logged)).length,completed=T.filter(t=>inR(t.done)).length;
    const byOwner={};open.forEach(t=>{const o=t.owner||"Unassigned";byOwner[o]=(byOwner[o]||0)+1;});
    const rows=Object.entries(byOwner).sort((a,b)=>b[1]-a[1]);
    title="Status report";
    html=`<div class="kpis">${kpi("Open",open.length,"accent")}${kpi("Overdue",open.filter(t=>t.due&&t.due<todayISO).length,"bad")}${kpi("Logged in range",created,"")}${kpi("Completed in range",completed,"good")}</div>
      <div class="tablewrap"><table><thead><tr><th>Owner</th><th>Open tasks</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="num">${r[1]}</td></tr>`).join(""):'<tr><td colspan="2" class="rowcount">No open tasks</td></tr>'}</tbody></table></div>`;
    fname=`PIVOT status report ${todayISO}.csv`;
    csv=()=>exportTasksCSV(open,fname);
  }
  $('modal').innerHTML=`<div class="sheet sheet-report" style="max-width:720px">
    <div class="sheethead"><div><div class="id">${esc(lbl)}</div><h3>${title}</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="reportbody">${html}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Close</button><button class="btn" id="mkCsv">${kind==='money'?'Download full ledger (CSV)':'Download CSV'}</button></div>
  </div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkCsv').onclick=csv;
}
function openMoney(id){
  const m=store.money.find(x=>x.id===id);if(!m)return;const ro=canWrite?"":"disabled";const isExp=m.dir==="Expense";
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${esc(m.id)}</div><h3>${esc(m.desc||(isExp?'Expense':'Invoice'))} <span class="muted" style="font-weight:500">· ${esc(brandOf(m.acct))}</span></h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Type",`<select id="mm_dir" ${ro}>${opts(["Income","Expense","Salary","Payout"],m.dir||"Income")}</select>`)}
      ${m.dir==="Income"?(fld("Logged · service month",`<input type="date" id="mm_logged" value="${esc(m.logged||'')}" ${ro}>`)+fld("Issued",`<input type="date" id="mm_date" value="${esc(m.date||'')}" ${ro}>`)):fld("Date",`<input type="date" id="mm_date" value="${esc(m.date||'')}" ${ro}>`)}
      ${m.dir==="Payout"?"":fld("Brand",`<select id="mm_acct" ${ro}>${brandOpts(m.acct)}</select>`)}
      ${m.dir==="Salary"?(fld("Person",`<input id="mm_partner" value="${esc(m.partner||'')}" ${ro}>`)+fld("Role",`<select id="mm_role" ${ro}><option value="">—</option>${opts(ROLES,m.role)}</select>`)):(m.dir==="Payout"?fld("Partner",`<input id="mm_partner" value="${esc(m.partner||'')}" ${ro}>`):fld("Category",`<input id="mm_cat" value="${esc(m.cat||'')}" ${ro}>`))}
      ${m.dir==="Income"?fld("Invoice type",`<select id="mm_income_type" ${ro}>${opts(INCOME_TYPES,m.income_type||"Project")}</select>`):""}
      ${fld("Amount (KD)",`<input type="number" step="0.001" id="mm_amt" value="${esc(Math.abs(+m.amt||0))}" ${ro}>`)}
      ${fld("Status",`<select id="mm_status" ${ro}>${opts((m.dir==="Payout"||m.dir==="Salary")?PAYOUT_STATUS:PAY,m.status||((m.dir==="Payout"||m.dir==="Salary")?"Pending":"Unpaid"))}</select>`)}
      ${fld("Due",`<input type="date" id="mm_due" value="${esc(m.due||'')}" ${ro}>`)}
      ${fld("Paid on",`<input type="date" id="mm_paid" value="${esc(m.paid||'')}" ${ro}>`)}
    </div>
    <div class="formfull">
      ${fld("Description",`<input id="mm_desc" value="${esc(m.desc||'')}" ${ro}>`)}
      ${fld("Note (e.g. voided or cancelled)",`<textarea id="mm_notes" rows="2" ${ro}>${esc(m.notes||'')}</textarea>`)}
    </div>
    <div class="sheetfoot">
      ${canWrite?`<button class="ghost" id="mkDelete" style="color:var(--bad);border-color:var(--bad-soft)">Delete</button>`:""}
      <span style="flex:1"></span>
      <button class="ghost" id="mkCancel">Close</button>
      ${canWrite?`<button class="btn" id="mkSave">Save</button>`:""}
    </div></div>`;
  $('modal').classList.add('show');
  const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;
  $('modal').onclick=e=>{if(e.target===$('modal'))close();};
  if($('mkSave'))$('mkSave').onclick=async()=>{const g=f=>{const el=$('mm_'+f);return el?el.value:"";};
    const dir=g('dir');const amt=Math.abs(parseFloat(g('amt'))||0)*(dir==="Income"?1:-1);
    const patch={dir,date:g('date'),acct:g('acct'),amt,status:g('status'),due:g('due'),paid:g('paid'),desc:g('desc'),notes:g('notes')};
    if(dir==="Salary"){patch.partner=($('mm_partner')?$('mm_partner').value:(m.partner||""));patch.role=($('mm_role')?$('mm_role').value:(m.role||""));}
    else if(dir==="Payout"){patch.partner=($('mm_partner')?$('mm_partner').value:(m.partner||""));}
    else{patch.cat=($('mm_cat')?$('mm_cat').value:(m.cat||""));if($('mm_income_type'))patch.income_type=$('mm_income_type').value;if($('mm_logged'))patch.logged=$('mm_logged').value;}
    await write("money",id,patch);logAct("edited","money",id,g('desc'));close();};
  if($('mkDelete'))$('mkDelete').onclick=()=>{close();remove("money",id);};
}
function openBrand(acctId){
  const a=AMAP[acctId];if(!a)return;
  const engs=store.engagements.filter(e=>e.acct===acctId);
  const tasks=store.tasks.filter(t=>t.acct===acctId);
  const openT=tasks.filter(t=>t.status!=="Done");
  const overdueT=openT.filter(t=>t.due&&t.due<todayISO).length;
  const inc=store.money.filter(m=>m.acct===acctId&&m.dir==="Income"&&!voided(m));
  const coll=inc.filter(m=>m.status==="Paid").reduce((s,m)=>s+(+m.amt||0),0);
  const out=inc.reduce((s,m)=>s+(+m.amt||0),0)-coll;
  const exp=Math.abs(store.money.filter(m=>m.acct===acctId&&m.dir==="Expense"&&m.status==="Paid").reduce((s,m)=>s+(+m.amt||0),0));
  const payo=Math.abs(store.money.filter(m=>m.acct===acctId&&m.dir==="Payout"&&m.status==="Paid").reduce((s,m)=>s+(+m.amt||0),0));
  const parent=a.parent?AMAP[a.parent]:null;
  const children=store.accounts.filter(x=>x.parent===acctId);
  const topOpen=[...openT].sort((x,y)=>((x.due||"9999")+"").localeCompare((y.due||"9999")+"")).slice(0,8);
  const recentInv=[...inc].sort((x,y)=>((y.date||"")+"").localeCompare((x.date||""))).slice(0,6);
  const chip=x=>`<button class="linkname" data-brand="${esc(x.id)}" style="font-size:12px">${esc(x.brand)}</button>`;
  const famHtml=(parent||children.length)?`<label class="fld"><span>Family</span><div class="attn"><div class="r" style="flex-wrap:wrap;gap:8px">${parent?`<span class="muted">Parent:</span> ${chip(parent)}`:""}${children.length?`<span class="muted"${parent?' style="margin-left:10px"':''}>Brands:</span> ${children.map(chip).join(" ")}`:""}</div></div></label>`:"";
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${esc(a.id)}</div><h3>${esc(a.brand)} <span class="muted" style="font-weight:500">· ${esc(a.type||'')}${a.lifecycle?' · '+esc(a.lifecycle):''}${parent?' · under '+esc(parent.brand):''}</span></h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="kpis" style="margin:0 0 6px">${kpi("Collected","KD "+KD(coll),"good")}${kpi("Outstanding","KD "+KD(out),"bad")}${kpi("Open tasks",openT.length,"accent")}${kpi("Overdue",overdueT,"bad")}</div>
    <div class="formfull">
      ${famHtml}
      <label class="fld"><span>Engagements · ${engs.length}</span><div class="attn">${engs.length?engs.map(e=>`<div class="r"><span class="t">${esc(e.name||e.service||e.id)}${e.model?` <span class="muted">· ${esc(e.model)}</span>`:''}</span><span class="muted" style="white-space:nowrap">${esc(e.status||'')}${e.team?' · '+esc(e.team):''}</span></div>`).join(""):'<div class="rowcount">No engagements recorded.</div>'}</div></label>
      <label class="fld"><span style="display:flex;align-items:center;gap:8px"><span style="flex:1">Open tasks · ${openT.length}</span>${tasks.length?`<button class="linkmini" id="vaTasks">View all →</button>`:''}</span><div class="attn">${topOpen.length?topOpen.map(t=>{const[fl,fc]=flag(t);return `<div class="r"><span class="t"><button class="linkname" data-open="${esc(t.id)}">${esc(t.name||t.id)}</button></span><span class="${fc}" style="white-space:nowrap">${esc(t.due||'—')}</span></div>`;}).join(""):'<div class="rowcount">No open tasks.</div>'}</div></label>
      <label class="fld"><span style="display:flex;align-items:center;gap:8px"><span style="flex:1">Invoices · ${inc.length}</span>${inc.length?`<button class="linkmini" id="vaInv">View all →</button>`:''}</span><div class="attn">${recentInv.length?recentInv.map(m=>`<div class="r"><span class="t"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.inv_no||m.id)}</button> <span class="muted">· ${esc(m.desc||m.date||'')}</span></span><span style="display:flex;gap:8px;align-items:center;white-space:nowrap"><span class="num">KD ${KD(m.amt)}</span><span class="dchip ${m.status==='Paid'?'dchip-good':(owed(m)?'dchip-warn':'')}">${esc(m.status||'')}</span></span></div>`).join(""):'<div class="rowcount">No invoices.</div>'}</div></label>
    </div>
    <div class="sheetfoot"><span class="muted">Paid costs: KD ${KD(exp+payo)}</span><span style="flex:1"></span>${canWrite?`<button class="ghost" id="mkBrandEdit">Edit</button>`:""}<button class="ghost" id="mkBrandExport">Export tasks</button></div>
    </div>`;
  $('modal').classList.add('show');
  const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=close;
  $('modal').onclick=e=>{if(e.target===$('modal'))close();};
  if($('mkBrandEdit'))$('mkBrandEdit').onclick=()=>openAccountEdit(acctId);
  if($('mkBrandExport'))$('mkBrandExport').onclick=()=>exportTasksCSV(tasks,("PIVOT tasks - "+a.brand+" "+todayISO+".csv"));
  const goBrand=view=>{F.brand=a.brand;if($('fBrand'))$('fBrand').value=a.brand;state.view=view;try{localStorage.setItem('pivot_view',view);}catch(_){}close();render();};
  if($('vaTasks'))$('vaTasks').onclick=()=>{state.msort.tasks=[{k:'logged',dir:-1},{k:'seq',dir:-1}];goBrand('tasks');};
  if($('vaInv'))$('vaInv').onclick=()=>{state.msort.invoices=[{k:'date',dir:-1},{k:'seq',dir:-1}];goBrand('invoices');};
}
function renderDigest(){
  const h=new Date().getHours();
  const hello=h<5?"Burning the midnight oil":h<12?"Good morning":h<17?"Good afternoon":h<22?"Good evening":"Still up";
  const subs=["Here's what actually needs you.","Coffee first, then conquer.","Let's clear the deck.","Small shop, big moves.","The numbers missed you.","Let's make today count.","One clean pass and you're done."];
  const S=moneyStats(store.money,'0000-01-01','9999-12-31');
  const retDue=retainerInvoicesDue();const retSum=retDue.reduce((s,x)=>s+Math.abs(+x.fee||0),0);
  const ovInv=store.money.filter(m=>owed(m)&&m.due&&m.due<todayISO);const ovInvSum=ovInv.reduce((s,m)=>s+(+m.amt||0),0);
  const pendPay=store.money.filter(m=>(m.dir==='Salary'||m.dir==='Payout')&&m.status!=='Paid'&&!voided(m));const pendPaySum=Math.abs(pendPay.reduce((s,m)=>s+(+m.amt||0),0));
  const pendExp=store.money.filter(m=>m.dir==='Expense'&&m.status!=='Paid'&&!voided(m));const pendExpSum=Math.abs(pendExp.reduce((s,m)=>s+(+m.amt||0),0));
  const ovTasks=store.tasks.filter(t=>t.status!=='Done'&&t.due&&t.due<todayISO);
  const dueToday=store.tasks.filter(t=>t.status!=='Done'&&t.due===todayISO);
  const plural=(n,w)=>n+' '+w+(n===1?'':'s');
  const items=[];
  if(retDue.length)items.push({cls:'warn',goto:'retainers',txt:`Bill <b>${plural(retDue.length,'retainer')}</b> for last month · <b>KD ${KD(retSum)}</b>`,sub:'due the 10th'});
  if(ovInv.length)items.push({cls:'bad',dm:'collect',txt:`<b>${plural(ovInv.length,'invoice')}</b> overdue · <b>KD ${KD(ovInvSum)}</b> to collect`});
  if(pendPay.length)items.push({cls:'bad',goto:'salaries',txt:`<b>${plural(pendPay.length,'payment')}</b> pending to the team · <b>KD ${KD(pendPaySum)}</b>`});
  if(ovTasks.length)items.push({cls:'bad',dq:'overdue',txt:`<b>${plural(ovTasks.length,'task')}</b> overdue`});
  if(dueToday.length)items.push({cls:'warn',dq:'week',txt:`<b>${plural(dueToday.length,'task')}</b> due today`});
  if(pendExp.length)items.push({cls:'muted',goto:'expenses',txt:`<b>${plural(pendExp.length,'bill')}</b> unpaid · <b>KD ${KD(pendExpSum)}</b>`});
  const row=it=>`<div class="r dgrow" style="cursor:pointer"${it.goto?` data-goto="${it.goto}"`:''}${it.dq?` data-dq="${it.dq}"`:''}${it.dm?` data-dm="${it.dm}"`:''}><span class="t"><span class="dgdot ${it.cls}"></span>${it.txt}${it.sub?` <span class="muted">· ${it.sub}</span>`:''}</span><span class="muted" style="flex:0 0 auto">›</span></div>`;
  const clear=dayPick(["Nothing's on fire. Go build something.","All clear. The rare quiet morning.","Clean slate. Nothing needs you right now.","Inbox-zero energy. Enjoy it while it lasts.","Nothing overdue, nothing owed. Breathe."]);
  const bankCls=S.bankBalance<0?'bad':'good';
  $('view').innerHTML=`<div class="view">
    <div class="dghero"><h1>${hello}, ${esc(firstName())}</h1><p class="muted">${esc(dayPick(subs))}</p></div>
    <div class="panel"><h2>Needs you${items.length?` · ${items.length}`:''}</h2>
      <div class="attn">${items.length?items.map(row).join(""):`<div class="center" style="padding:26px"><h2 style="border:0">${esc(clear)}</h2></div>`}</div></div>
    <div class="kpis">
      <div class="kpi ${bankCls} kpiclick" data-dm="cashpos"><span class="lab">In the bank now</span><span class="val valbig">KD ${KD(S.bankBalance)}</span><span class="bar"></span></div>
      <div class="kpiclick" data-dm="collect">${kpi("Still to collect","KD "+KD(S.toCollect),"warn")}</div>
      <div class="kpiclick" data-dm="pay">${kpi("Still to pay out","KD "+KD(S.toPayOut),"bad")}</div>
    </div>
  </div>`;
}
async function generateMonthly(){
  if(!canWrite){toast("Read-only access");return;}
  const ym=new Date().toISOString().slice(0,7);
  const act=(store.templates||[]).filter(t=>(t.active||"Yes")!=="No"&&t.kind!=="expense");
  if(!act.length){toast("No active templates");return;}
  let base=0;store.tasks.forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)base=Math.max(base,+m[1]);});
  let made=0,skip=0;
  for(const t of act){
    const dd=String(Math.min(28,Math.max(1,parseInt(t.dueDay)||1))).padStart(2,"0");
    const due=ym+"-"+dd;
    if(store.tasks.some(x=>x.acct===t.acct&&(x.name||"")===(t.name||"")&&(x.due||"")===due)){skip++;continue;}
    const id="TSK-"+String(++base).padStart(4,"0");
    await create("tasks",id,{acct:t.acct,eng:"",name:t.name,details:t.details||"",owner:t.owner||"",priority:t.priority||"Medium",reqby:"PIVOT",logged:todayISO,due,done:"",status:"To Do",output:"",notes:"",tags:"retainer"});
    made++;
  }
  toast("Generated "+made+", skipped "+skip+" already there");
}
function renderRecurring(){
  const tpls=(store.templates||[]).filter(t=>t.kind!=="expense");const ro=canWrite?"":"disabled";
  const trows=tpls.length?tpls.map(t=>`<tr>
    <td class="id">${esc(t.id)}</td>
    <td><select class="edit" data-c="templates" data-id="${esc(t.id)}" data-f="acct" ${ro}>${brandOpts(t.acct)}</select></td>
    <td><input class="edit" style="min-width:150px" data-c="templates" data-id="${esc(t.id)}" data-f="name" value="${esc(t.name||'')}" ${ro}></td>
    <td><select class="edit" data-c="templates" data-id="${esc(t.id)}" data-f="owner" ${ro}><option value="">—</option>${opts(activeOwners(t.owner),t.owner)}</select></td>
    <td><select class="edit" data-c="templates" data-id="${esc(t.id)}" data-f="priority" ${ro}>${opts(PRIOS,t.priority||"Medium")}</select></td>
    <td><input type="number" min="1" max="28" class="edit num" style="width:70px" data-c="templates" data-id="${esc(t.id)}" data-f="dueDay" value="${esc(t.dueDay||'')}" ${ro}></td>
    <td><select class="edit" data-c="templates" data-id="${esc(t.id)}" data-f="active" ${ro}>${opts(["Yes","No"],t.active||"Yes")}</select></td>
    <td>${canWrite?rowMenu("templates",t.id):""}</td></tr>`).join(""):`<tr><td colspan="8" class="rowcount">No recurring tasks yet. Click "Add recurring task".</td></tr>`;
  $('view').innerHTML=`<div class="view"><div class="panel">
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <h2 style="margin:0;border:0;padding:0">Recurring tasks</h2><span style="flex:1"></span>
        <button class="btn" id="tplAddBtn"${canWrite?"":" disabled"}>+ Add recurring task</button>
        <button class="ghost" id="genMonthly"${canWrite?"":" disabled"}>Generate this month's tasks</button>
      </div>
      <div class="tablewrap"><table><thead><tr><th>ID</th><th>Brand</th><th>Task</th><th>Owner</th><th>Priority</th><th>Due day</th><th>Active</th><th></th></tr></thead><tbody>${trows}</tbody></table></div>
      <div class="rowcount">Each active recurring task becomes a real task on the 1st of the month (and whenever you press Generate), due on its day. Re-runs skip ones already created.</div>
  </div></div>`;
  if($('tplAddBtn'))$('tplAddBtn').onclick=openTemplateNew;
  if($('genMonthly'))$('genMonthly').onclick=generateMonthly;
}
function renderSetup(){
  const ro=canWrite?"":"disabled";
  const ppl=(store.people||[]).slice().sort((a,b)=>((a.active==="No")-(b.active==="No"))||(a.name||'').localeCompare(b.name||''));
  const teamRows=ppl.length?ppl.map(p=>`<tr>
    <td class="id">${esc(p.id)}</td>
    <td><input class="edit" style="min-width:110px" data-c="people" data-id="${esc(p.id)}" data-f="name" value="${esc(p.name||'')}" ${ro}></td>
    <td><input class="edit" style="width:100px" data-c="people" data-id="${esc(p.id)}" data-f="role" value="${esc(p.role||'')}" ${ro} placeholder="Role"></td>
    <td><input class="edit" style="min-width:150px" type="email" data-c="people" data-id="${esc(p.id)}" data-f="email" value="${esc(p.email||'')}" ${ro} placeholder="name@domain.com"></td>
    <td><select class="edit" data-c="people" data-id="${esc(p.id)}" data-f="active" ${ro}><option value="Yes"${p.active!=="No"?" selected":""}>Active</option><option value="No"${p.active==="No"?" selected":""}>Archived</option></select></td>
    <td>${canWrite?rowMenu("people",p.id):""}</td></tr>`).join(""):'<tr><td colspan="6" class="rowcount">No team yet. Add a member, or run migration-05 to seed the current team.</td></tr>';
  $('view').innerHTML=`<div class="view">
    <div class="panel"><div class="addbar"><h2 style="flex:1;margin:0">Team</h2><button class="btn" id="tmAdd"${canWrite?"":" disabled"}>+ Add member</button></div>
      <div class="muted" style="font-size:12px;margin:2px 0 10px">Active members show in owner, salary and payout pickers. Email feeds the per-person digest.</div>
      <div class="tablewrap"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th></th></tr></thead><tbody>${teamRows}</tbody></table></div>
      <div class="rowcount">${ppl.filter(p=>p.active!=="No").length} active · ${ppl.filter(p=>p.active==="No").length} archived</div>
    </div>
    <div class="panel"><h2>Appearance</h2><div class="body"><div class="themeseg"><button data-theme="system">System</button><button data-theme="light">Light</button><button data-theme="dark">Dark</button></div></div></div>
    <div class="panel"><h2>About</h2><div class="body" style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center"><div><span class="muted">Build</span> &nbsp; <b>PIVOT Command Center ${APPVER}</b></div><div><span class="muted">Status</span> &nbsp; <span id="savestate">${esc(saveStateText)}</span></div></div>
      <div class="rowcount" style="padding-left:0">If the app looks unstyled or an update hasn't shown up, use Refresh data in the ⋯ menu beside your name. It clears the cache and reloads the newest data and version. Data lives in your Supabase database; a nightly backup pushes to a private repo and a daily digest posts to Teams.</div>
    </div></div>
  </div>`;
  document.querySelectorAll('.themeseg button').forEach(b=>b.onclick=()=>setTheme(b.dataset.theme));
  applyTheme();
  if($('tmAdd'))$('tmAdd').onclick=openMemberNew;
}
async function hardRefresh(){
  const b=$('uRefresh');if(b){b.disabled=true;b.textContent='Refreshing…';}
  try{if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)));}}catch(_){}
  try{if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));}}catch(_){}
  // re-download the core assets bypassing the HTTP cache, then reload on a fresh document URL
  try{await Promise.all(['app.js','styles.css','index.html'].map(u=>fetch(u+'?r='+Date.now(),{cache:'reload'}).catch(()=>{})));}catch(_){}
  const base=location.pathname.split('?')[0];
  location.replace(base+'?fresh='+Date.now());
}
async function renderActivity(){
  $('view').innerHTML=`<div class="view"><div class="panel"><h2>Recent activity</h2><div class="center" style="padding:30px"><div class="spin"></div><div class="muted">${esc(quip())}</div></div></div></div>`;
  let items=[];try{const {data}=await sb.from('activity').select('*').order('at',{ascending:false}).limit(120);items=(data||[]).map(r=>({t:r.at,who:r.who,act:r.action,coll:r.coll,id:r.doc_id,label:r.label}));}catch(e){}
  const rows=items.slice(0,120).map(a=>`<div class="r"><span class="t"><b>${esc(a.who||'Someone')}</b> ${esc(a.act)} <span class="muted">${esc(a.coll)}/${esc(a.id)}</span>${a.label?` <span class="muted">· ${esc(a.label)}</span>`:''}</span><span class="muted" style="white-space:nowrap">${esc((a.t||'').replace('T',' ').slice(0,16))}</span></div>`).join("");
  $('view').innerHTML=`<div class="view"><div class="panel"><h2>Recent activity</h2><div class="attn">${items.length?rows:'<div class="rowcount">No activity logged yet. New tasks, edits and deletions will appear here with who made them and when.</div>'}</div></div></div>`;
}
document.addEventListener('click',e=>{const o=e.target.closest('[data-open]');if(o)openTask(o.dataset.open);});
document.addEventListener('click',e=>{const o=e.target.closest('[data-mopen]');if(o)openMoney(o.dataset.mopen);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('modal').classList.contains('show')){$('modal').classList.remove('show');$('modal').innerHTML='';}});
function saveGroups(){try{localStorage.setItem('pivot_nav2',JSON.stringify(state.groups));}catch(_){}}
function applyGroups(){document.querySelectorAll('#nav .sub').forEach(b=>{b.style.display=(state.groups[b.dataset.group]===false)?'none':'';});document.querySelectorAll('#nav .grp').forEach(b=>{const a=b.querySelector('.arw');if(a)a.style.transform=(state.groups[b.dataset.group]===false)?'rotate(-90deg)':'none';});}
$('nav').onclick=e=>{
  const arw=e.target.closest('.arw');
  if(arw){const b=arw.closest('.grp');const g=b.dataset.group;state.groups[g]=!(state.groups[g]!==false);saveGroups();applyGroups();return;}
  const b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('grp')){state.groups[b.dataset.group]=true;saveGroups();applyGroups();}
  state.view=b.dataset.view;try{localStorage.setItem('pivot_view',state.view);}catch(_){}render();
};
applyGroups();
$('addBtn').onclick=e=>{e.stopPropagation();$('addMenu').classList.toggle('show');};
$('addMenu').onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;$('addMenu').classList.remove('show');({task:openTaskNew,account:openAccountNew,invoice:openInvoiceNew,expense:openExpenseNew,salary:openSalaryNew,payout:openPayoutNew,recurring:openTemplateNew}[b.dataset.add])();};
document.addEventListener('click',e=>{if(!e.target.closest('#addMenu')&&!e.target.closest('#addBtn'))$('addMenu').classList.remove('show');});
$('fBrand').onchange=e=>{F.brand=e.target.value;render();};
$('fTeam').onchange=e=>{F.team=e.target.value;render();};
$('fStatus').onchange=e=>{F.status=e.target.value;render();};
$('fSearch').oninput=e=>{F.q=e.target.value.toLowerCase().trim();render();};
if($('fClear'))$('fClear').onclick=()=>{F.brand="";F.team="";F.status="";F.q="";F.quick="";state.colF={};state.colRange={};state.colText={};['fBrand','fTeam','fStatus','fSearch'].forEach(id=>{const el=$(id);if(el)el.value="";});render();};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName||'')&&!$('modal').classList.contains('show')){e.preventDefault();const s=$('fSearch');if(s)s.focus();}});
document.addEventListener('change',e=>{const el=e.target;if(el.classList&&el.classList.contains('edit')&&el.dataset.c){
  if(el.dataset.color)el.setAttribute('style',cstyle(el.dataset.color,el.value));
  let v=el.value;if(el.dataset.f==='amt')v=parseFloat(v)||0;
  const patch={[el.dataset.f]:v};
  if(el.dataset.c==='tasks'&&el.dataset.f==='status'&&v==='Done'){const t=store.tasks.find(x=>x.id===el.dataset.id);if(t&&!t.done){patch.done=todayISO;const row=el.closest('tr');const dIn=row&&row.querySelector('input[data-f="done"]');if(dIn)dIn.value=todayISO;}}
  write(el.dataset.c,el.dataset.id,patch);
  logAct(el.dataset.f==='status'?("set status → "+el.value):("edited "+el.dataset.f),el.dataset.c,el.dataset.id,"");}});
document.addEventListener('click',e=>{const d=e.target.closest('[data-drill]');if(d){const k=d.dataset.drill,v=d.dataset.val;
  if(k==='status'){F.status=v;if($('fStatus'))$('fStatus').value=v;}
  if(k==='team'){F.team=v;if($('fTeam'))$('fTeam').value=v;}
  if(k==='brand'){F.brand=v;if($('fBrand'))$('fBrand').value=v;}
  state.view='tasks';render();}});
document.addEventListener('click',e=>{const d=e.target.closest('[data-del]');if(d)remove(d.dataset.del,d.dataset.id);});
document.addEventListener('click',e=>{const g=e.target.closest('[data-goto]');if(g){if(g.dataset.hl)pendingHL=g.dataset.hl;state.view=g.dataset.goto;try{localStorage.setItem('pivot_view',state.view);}catch(_){}render();}});
document.addEventListener('click',e=>{const d=e.target.closest('[data-dm]');if(d){e.stopPropagation();drillMoney(d.dataset.dm);}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-brand]');if(b)openBrand(b.dataset.brand);});
document.addEventListener('click',e=>{const b=e.target.closest('[data-dopen]');if(b)openDeal(b.dataset.dopen);});
document.addEventListener('click',e=>{const b=e.target.closest('[data-popen]');if(b)openProject(b.dataset.popen);});
document.addEventListener('click',e=>{const b=e.target.closest('[data-svopen]');if(b)openServiceEdit(b.dataset.svopen);});
document.addEventListener('click',e=>{const c=e.target.closest('[data-quick]');if(c){F.quick=c.dataset.quick;render();}});
document.addEventListener('click',e=>{const d=e.target.closest('[data-dq]');if(d){F.quick=d.dataset.dq;state.view='tasks';try{localStorage.setItem('pivot_view','tasks');}catch(_){}render();}});
$('theme').onclick=()=>{const order=['system','light','dark'];setTheme(order[(order.indexOf(state.theme||'system')+1)%3]);};
applyTheme();
