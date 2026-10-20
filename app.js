
const STATUSES=["To Do","In Progress","Review","Done","On Hold"];
const PRIOS=["High","Medium","Low"];
const LIFE=["Lead","Active","Paused","Churned","Lost","Internal"];
const STAGES=["Lead","Proposal","Won","Lost"];
const PAY=["Paid","Partial","Unpaid","Voided","Cancelled"];
const PAYOUT_STATUS=["Pending","Paid"];
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
const store={accounts:[],engagements:[],tasks:[],money:[],templates:[],people:[],services:[],deals:[]};
const loaded={accounts:false,engagements:false,tasks:false,money:false,templates:false,people:false,services:false,deals:false};
const SOFT=new Set(['people','services','deals']); // tables that may not exist yet; must not block boot
let AMAP={}, canWrite=false, booted=false, myName="Someone", PEOPLE={};
let sb=null, session=null;
const ALLCOLLS=["accounts","engagements","tasks","money","templates","people","services","deals"];
const F={brand:"",team:"",status:"",q:"",quick:""};
const state={view:(()=>{try{return localStorage.getItem('pivot_view')||"dashboard"}catch(e){return"dashboard"}})(),sortT:{k:"due",dir:1},sortM:{k:"date",dir:-1},me:(()=>{try{return localStorage.getItem('pivot_me')||""}catch(e){return""}})(),
  range:(()=>{try{return JSON.parse(localStorage.getItem('pivot_range'))||{preset:'mtd',from:'',to:''}}catch(e){return{preset:'mtd',from:'',to:''}}})(),
  cmp:(()=>{try{return localStorage.getItem('pivot_cmp')||'prev_period'}catch(e){return'prev_period'}})(),
  groups:(()=>{try{return JSON.parse(localStorage.getItem('pivot_nav2'))||{tasks:false,money:false}}catch(e){return{tasks:false,money:false}}})(),
  theme:(()=>{try{return localStorage.getItem('pivot_theme')||'system'}catch(e){return'system'}})(),
  sortA:{k:"coll",dir:-1}};
const todayISO=new Date().toISOString().slice(0,10);

const $=id=>document.getElementById(id);
const esc=s=>(s==null?"":String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KD=n=>(n==null||isNaN(n)?0:n).toLocaleString(undefined,{minimumFractionDigits:3,maximumFractionDigits:3});
const brandOf=id=>AMAP[id]?AMAP[id].brand:(id||"");
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1400);}
let saveStateText="connecting…",pendingHL="";const APPVER="v31 · Supabase";
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
    <div class="usermenu" id="uMenu"><button id="uPass">Change password</button><button class="danger" id="uOut">Sign out</button></div>`;
  $('uDots').onclick=e=>{e.stopPropagation();$('uMenu').classList.toggle('show');};
  $('uOut').onclick=signOut;
  $('uPass').onclick=openChangePassword;
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
    rowMenuEl.innerHTML=`${canOpen?'<button data-mi="open">Open</button>':''}<button data-mi="del" class="danger">Delete</button>`;
    document.body.appendChild(rowMenuEl);
    const w=160,left=Math.min(window.innerWidth-w-8,Math.max(8,r.right-w));
    rowMenuEl.style.top=(r.bottom+4)+'px';rowMenuEl.style.left=left+'px';
    rowMenuEl.onclick=ev=>{const b=ev.target.closest('[data-mi]');if(!b)return;const mi=b.dataset.mi;closeRowMenu();
      if(mi==='del')remove(coll,id);else if(mi==='open'){if(coll==='tasks')openTask(id);else if(coll==='money')openMoney(id);}};
    return;}
  if(!e.target.closest('.rowmenu'))closeRowMenu();});
window.addEventListener('scroll',()=>closeRowMenu(),true);
const _tip=document.createElement('div');_tip.id='tip';document.body.appendChild(_tip);
document.addEventListener('mousemove',e=>{const b=e.target.closest('[data-tip]');if(b){_tip.textContent=b.getAttribute('data-tip');_tip.classList.add('show');_tip.style.left=Math.min(window.innerWidth-160,e.clientX+12)+'px';_tip.style.top=(e.clientY-14)+'px';}else _tip.classList.remove('show');});

function fromDB(coll,r){ if(coll==='money'){const o=Object.assign({},r);o.desc=r.description;o.date=r.txn_date;return o;} if(coll==='templates'){const o=Object.assign({},r);o.dueDay=r.due_day;o.active=r.active?"Yes":"No";return o;} if(coll==='people'||coll==='services'){const o=Object.assign({},r);o.active=(r.active===false?"No":"Yes");return o;} return r; }
function toDB(coll,obj){ const o=Object.assign({},obj);
  if(coll==='money'){ if('desc' in o){o.description=o.desc;delete o.desc;} if('date' in o){o.txn_date=o.date||null;delete o.date;} ['due','paid','txn_date'].forEach(k=>{if(o[k]==='')o[k]=null;}); }
  if(coll==='tasks'){ ['logged','due','done'].forEach(k=>{if(o[k]==='')o[k]=null;}); }
  if(coll==='templates'){ if('dueDay' in o){o.due_day=parseInt(o.dueDay)||1;delete o.dueDay;} if('active' in o){o.active=(o.active!=="No"&&o.active!==false);} }
  if(coll==='people'||coll==='services'){ if('active' in o){o.active=(o.active!=="No"&&o.active!==false);} }
  if(coll==='deals'){ ['contract_date','signed_date','close_date'].forEach(k=>{if(o[k]==='')o[k]=null;}); }
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
const ready=()=>COLLS.every(c=>loaded[c]);

async function write(coll,id,patch){
  if(!canWrite){toast("Read-only access");return;}
  const {error}=await sb.from(coll).update(toDB(coll,patch)).eq('id',id);
  if(error){ toast("Save failed"); console.error(error); } else { toast("Saved"); applyLocal(coll,id,patch); }
}
async function create(coll,id,data){ if(!canWrite){toast("Read-only access");return;} const row=Object.assign({id},toDB(coll,data)); const {error}=await sb.from(coll).insert(row); if(error){ toast("Add failed"); console.error(error);} else { toast("Added"); logAct("added",coll,id,data.name||data.desc||""); await fetchColl(coll); render(); } }
async function remove(coll,id){ if(!canWrite){toast("Read-only access");return;} const row=(store[coll]||[]).find(r=>r.id===id); const {error}=await sb.from(coll).delete().eq("id",id); if(error){ toast("Delete failed"); console.error(error);} else { logAct("deleted",coll,id,""); await fetchColl(coll); render(); if(row)undoToast("Deleted",coll,[row]); else toast("Deleted"); } }
async function restoreRows(coll,rows){ if(!canWrite||!rows||!rows.length)return; const payload=rows.map(r=>toDB(coll,Object.assign({},r))); const {error}=await sb.from(coll).insert(payload); if(error){ toast("Undo failed"); console.error(error); return; } rows.forEach(r=>logAct("restored",coll,r.id,r.desc||r.name||"")); await fetchColl(coll); render(); toast(rows.length>1?("Restored "+rows.length):"Restored"); }
function undoToast(msg,coll,rows){ const t=$('toast'); if(!t)return; const hide=()=>{t.classList.remove('show');t.style.pointerEvents='';t.innerHTML='';}; t.innerHTML=`<span>${esc(msg)}</span><button id="undoBtn" class="undobtn">Undo</button>`; t.classList.add('show'); t.style.pointerEvents='auto'; clearTimeout(t._t); t._t=setTimeout(hide,7000); const b=$('undoBtn'); if(b)b.onclick=()=>{clearTimeout(t._t);hide();restoreRows(coll,rows);}; }
async function createMany(coll,rows){ if(!canWrite){toast("Read-only access");return;} if(!rows.length)return; const payload=rows.map(r=>toDB(coll,r)); const {error}=await sb.from(coll).insert(payload); if(error){ toast("Add failed"); console.error(error);} else { toast("Added "+rows.length); rows.forEach(r=>logAct("added",coll,r.id,r.desc||"")); await fetchColl(coll); render(); } }
async function removeMany(coll,ids){ if(!canWrite){toast("Read-only access");return;} if(!ids.length)return; const rows=(store[coll]||[]).filter(r=>ids.includes(r.id)); const {error}=await sb.from(coll).delete().in("id",ids); if(error){ toast("Delete failed"); console.error(error);} else { ids.forEach(id=>logAct("deleted",coll,id,"")); await fetchColl(coll); render(); undoToast("Deleted "+ids.length,coll,rows); } }
async function updateMany(coll,ids,patch){ if(!canWrite){toast("Read-only access");return;} if(!ids.length)return; const {error}=await sb.from(coll).update(toDB(coll,patch)).in("id",ids); if(error){ toast("Save failed"); console.error(error);} else { toast("Saved"); await fetchColl(coll); render(); } }
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

function rebuildBrandFilter(){const s=$('fBrand');const cur=s.value;s.length=1;[...new Set(store.accounts.map(a=>a.brand))].sort().forEach(b=>s.add(new Option(b,b)));s.value=cur;}
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
  life:{Active:["var(--good-soft)","var(--good)"],Lead:["var(--info-soft)","var(--info)"],Paused:["var(--warn-soft)","var(--warn)"],Churned:["var(--hold-soft)","var(--hold)"],Lost:["var(--bad-soft)","var(--bad)"],Internal:["var(--accent-soft)","var(--accent)"]}};
function cstyle(kind,val){const map=CMAP[kind]||{};let c=map[val];if(!c&&val){const key=String(val).trim().toLowerCase();const hit=Object.keys(map).find(k=>k.toLowerCase()===key);if(hit)c=map[hit];}return c?`background-color:${c[0]};color:${c[1]};border-color:transparent`:"";}
function csel(kind,coll,id,field,val,list,ro){return `<select class="edit csel" data-color="${kind}" data-c="${coll}" data-id="${esc(id)}" data-f="${field}" style="${cstyle(kind,val)}" ${ro}>${opts(list,val)}</select>`;}

function donut(parts,size=150){const tot=parts.reduce((a,p)=>a+p.v,0)||1,R=size/2,r=R*0.62;let a0=-Math.PI/2,paths="";
  parts.forEach(p=>{const fr=p.v/tot,a1=a0+fr*2*Math.PI,x0=R+R*Math.cos(a0),y0=R+R*Math.sin(a0),x1=R+R*Math.cos(a1),y1=R+R*Math.sin(a1),
   xi1=R+r*Math.cos(a1),yi1=R+r*Math.sin(a1),xi0=R+r*Math.cos(a0),yi0=R+r*Math.sin(a0),big=fr>0.5?1:0;
   if(p.v>0)paths+=`<path class="pieslice" ${p.k?`data-drill="status" data-val="${esc(p.k)}" data-tip="${esc(p.k)}: ${p.v}"`:""} d="M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${xi1} ${yi1} A${r} ${r} 0 ${big} 0 ${xi0} ${yi0} Z" fill="${p.c}"/>`;a0=a1;});
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${paths}<text x="${R}" y="${R-2}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--ink)" font-family="var(--mono)">${tot}</text><text x="${R}" y="${R+16}" text-anchor="middle" font-size="11" fill="var(--muted)">tasks</text></svg>`;}
function hbars(items,unit,drill){const max=Math.max(1,...items.map(i=>i.v));return `<div style="display:flex;flex-direction:column;gap:8px">`+
  items.map(i=>`<div ${drill?`class="drill" data-drill="${drill}" data-val="${esc(i.l)}"`:""} style="display:grid;grid-template-columns:92px 1fr auto;gap:8px;align-items:center${drill?';cursor:pointer':''}">
   <span class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(i.l)}</span>
   <span style="background:var(--surface-2);border-radius:6px;overflow:hidden"><span style="display:block;height:14px;width:${i.v/max*100}%;background:${i.c||'var(--accent)'}"></span></span>
   <span class="num">${unit==='kd'?KD(i.v):i.v}</span></div>`).join("")+`</div>`;}
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
  let Mall=moneyF().filter(m=>m.dir==='Income'&&!voided(m));
  if(Mall.length){const minD=Mall.reduce((a,m)=>(m.date&&m.date<a)?m.date:a,'9999-12-31');if(from<minD)from=minD;}
  if(to>todayISO)to=todayISO;
  const byMonth=daysBetween(from,to)>45;const map={};
  Mall.forEach(m=>{const dt=m.date||'';if(dt<from||dt>to)return;const key=byMonth?dt.slice(0,7):dt;map[key]=(map[key]||0)+(+m.amt||0);});
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
      <div class="panel"><h2>Needs attention — soonest due</h2><div class="attn">${attn.length?attn.map(t=>{const[fl,fc]=flag(t);return `<div class="r"><span class="t"><button class="linkname" data-open="${esc(t.id)}">${esc(t.name||t.id)}</button> <span class="muted">· ${esc(brandOf(t.acct))}</span></span><span class="${fc}">${esc(t.due||'')}</span></div>`;}).join(""):'<div class="rowcount">Nothing due.</div>'}</div></div>
      <div class="panel"><h2>Tasks by status</h2><div class="body" style="display:flex;justify-content:center">${donut(sParts.map(p=>({v:p.v,c:p.c,k:p.name})))}</div><div class="legend">${sParts.map(p=>`<span class="drill" data-drill="status" data-val="${esc(p.name)}"><span class="sw" style="background:${p.c}"></span>${p.name} ${p.v}</span>`).join("")}</div></div>
      <div class="panel"><h2>Open tasks by owner</h2><div class="body">${ownerItems.length?hbars(ownerItems,null,'team'):'<div class="muted">No open tasks</div>'}</div></div>
    </div>
    <div class="panel"><h2>Busiest brands (open work)</h2><div class="body">${topBrand.length?hbars(topBrand,null,'brand'):'<div class="muted">—</div>'}</div></div>
  </div>`;
  wireRange(renderTasksDash);
  if($('repBtn'))$('repBtn').onclick=()=>openReport('tasks');
}
function renderMoneyDash(){
  const Mall=moneyF();
  const R=activeRange(),C=cmpRange(R.from,R.to);
  const inR=(m,from,to)=>{const dt=m.date||'';return dt>=from&&dt<=to;};
  const paidR=(m,from,to)=>{const dt=m.paid||m.date||'';return dt>=from&&dt<=to;};
  const agg=(from,to)=>{
    const billed=Mall.filter(m=>m.dir==='Income'&&!voided(m)&&inR(m,from,to)).reduce((a,m)=>a+(+m.amt||0),0);
    const collected=Mall.filter(m=>m.dir==='Income'&&m.status==='Paid'&&paidR(m,from,to)).reduce((a,m)=>a+(+m.amt||0),0);
    const expenses=Math.abs(Mall.filter(m=>m.dir==='Expense'&&inR(m,from,to)).reduce((a,m)=>a+(+m.amt||0),0));
    const payouts=Math.abs(Mall.filter(m=>m.dir==='Payout'&&m.status==='Paid'&&paidR(m,from,to)).reduce((a,m)=>a+(+m.amt||0),0));
    const salaries=Math.abs(Mall.filter(m=>m.dir==='Salary'&&m.status==='Paid'&&paidR(m,from,to)).reduce((a,m)=>a+(+m.amt||0),0));
    return {billed,collected,expenses,payouts,salaries,net:collected-expenses-salaries-payouts};};
  const cur=agg(R.from,R.to),prev=C?agg(C.from,C.to):null;
  const rate=cur.billed?Math.round(cur.collected/cur.billed*100):0;
  const prevRate=prev&&prev.billed?Math.round(prev.collected/prev.billed*100):null;
  const unpaid=Mall.filter(owed);
  const chase=[...unpaid].sort((a,b)=>((a.due||"9999")+"").localeCompare((b.due||"9999")+"")).slice(0,8);
  const chaseTot=unpaid.reduce((s,m)=>s+(+m.amt||0),0);
  const overdueInv=unpaid.filter(m=>m.due&&m.due<todayISO).length;
  const cats={};Mall.filter(m=>m.dir==='Expense'&&inR(m,R.from,R.to)).forEach(m=>{const k=m.cat||"Other";cats[k]=(cats[k]||0)+Math.abs(+m.amt||0);});
  const topCat=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([l,v])=>({l,v}));
  const series=moneySeries(R.from,R.to);
  const M2=moneyF();const bm={};
  M2.forEach(m=>{const b=brandOf(m.acct);if(!b)return;if(!bm[b])bm[b]={rev:0,cost:0};if(m.dir==='Income'&&m.status==='Paid')bm[b].rev+=(+m.amt||0);else if(m.dir==='Expense'||m.dir==='Payout'||m.dir==='Salary')bm[b].cost+=Math.abs(+m.amt||0);});
  const cashIn=store.money.filter(m=>m.dir==='Income'&&m.status==='Paid').reduce((s,m)=>s+(+m.amt||0),0);
  const cashExp=Math.abs(store.money.filter(m=>m.dir==='Expense'&&m.status==='Paid').reduce((s,m)=>s+(+m.amt||0),0));
  const cashPayPaid=Math.abs(store.money.filter(m=>m.dir==='Payout'&&m.status==='Paid').reduce((s,m)=>s+(+m.amt||0),0));
  const cashSalPaid=Math.abs(store.money.filter(m=>m.dir==='Salary'&&m.status==='Paid').reduce((s,m)=>s+(+m.amt||0),0));
  const cashOnHand=cashIn-cashExp-cashPayPaid-cashSalPaid;
  const payPending=Math.abs(store.money.filter(m=>m.dir==='Payout'&&m.status!=='Paid').reduce((s,m)=>s+(+m.amt||0),0));
  const marginRows=Object.entries(bm).map(([l,o])=>({l,v:o.rev-o.cost})).filter(x=>x.v!==0).sort((a,b)=>b.v-a.v).slice(0,8);
  const age={cur:0,b30:0,b60:0,b60p:0};
  M2.filter(owed).forEach(m=>{const amt=+m.amt||0;if(!m.due||m.due>=todayISO){age.cur+=amt;return;}const d=daysBetween(m.due,todayISO);if(d<=30)age.b30+=amt;else if(d<=60)age.b60+=amt;else age.b60p+=amt;});
  $('view').innerHTML=`<div class="view">
    ${rangeBar(`<button class="ghost" id="repBtn">Export report</button>`)}
    <div class="kpis"><div class="kpi good" style="grid-column:span 2"><span class="lab">Cash available now · not yet spent</span><span class="val valbig">KD ${KD(cashOnHand)}</span><span class="bar"></span></div>${kpi("Payouts pending","KD "+KD(payPending),"bad")}</div>
    <div class="kpis">${kpi("Collected","KD "+KD(cur.collected),"good",prev?delta(cur.collected,prev.collected,true):"")}${kpi("Billed","KD "+KD(cur.billed),"accent",prev?delta(cur.billed,prev.billed,true):"")}${kpi("Expenses","KD "+KD(cur.expenses),"warn",prev?delta(cur.expenses,prev.expenses,false):"")}${kpi("Salaries","KD "+KD(cur.salaries),"warn",prev?delta(cur.salaries,prev.salaries,false):"")}${kpi("Payouts","KD "+KD(cur.payouts),"warn",prev?delta(cur.payouts,prev.payouts,false):"")}${kpi("Net","KD "+KD(cur.net),"accent",prev?delta(cur.net,prev.net,true):"")}${kpi("Collection rate",rate+"%","good",prevRate!=null?delta(rate,prevRate,true):"")}</div>
    <div class="panel"><h2>Billed over time</h2><div class="body">${series.length?vbars(series,'kd'):'<div class="muted">No income in range</div>'}</div></div>
    <div class="grid3">
      <div class="panel"><h2>Invoices to chase ${overdueInv?`<span class="flag-over" style="font-size:11px;font-weight:700">· ${overdueInv} overdue</span>`:""}</h2><div class="attn">${chase.length?chase.map(m=>{const od=m.due&&m.due<todayISO;return `<div class="r" data-goto="invoices" data-hl="${esc(m.id)}" style="cursor:pointer"><span class="t"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.desc||m.id)}</button> <span class="muted">· ${esc(brandOf(m.acct))}</span></span><span class="${od?'flag-over':'flag-soon'}" style="white-space:nowrap">KD ${KD(m.amt)}${m.due?` · ${esc(m.due)}`:''}</span></div>`;}).join(""):'<div class="rowcount">All invoices settled.</div>'}</div><div class="rowcount">KD ${KD(chaseTot)} outstanding · ${unpaid.length} invoice${unpaid.length===1?'':'s'} (live, all dates)</div></div>
      <div class="panel"><h2>Cash in range</h2><div class="body">${hbars([{l:"Collected",v:cur.collected,c:"var(--good)"},{l:"Billed",v:cur.billed,c:"var(--accent)"},{l:"Expenses",v:cur.expenses,c:"var(--warn)"}],'kd')}</div></div>
      <div class="panel"><h2>Expenses by category</h2><div class="body">${topCat.length?hbars(topCat,'kd'):'<div class="muted">No expenses in range</div>'}</div></div>
    </div>
    <div class="grid2">
      <div class="panel"><h2>Profit by brand <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">· collected − direct costs</span></h2><div class="attn">${marginRows.length?marginRows.map(r=>`<div class="r"><span class="t">${esc(r.l)}</span><span class="num ${r.v<0?'neg':'pos'}">KD ${KD(r.v)}</span></div>`).join(""):'<div class="rowcount">No data in range.</div>'}</div></div>
      <div class="panel"><h2>Receivables aging</h2><div class="attn">
        <div class="r"><span class="t">Not due yet</span><span class="num">KD ${KD(age.cur)}</span></div>
        <div class="r"><span class="t">1–30 days overdue</span><span class="num flag-soon">KD ${KD(age.b30)}</span></div>
        <div class="r"><span class="t">31–60 days overdue</span><span class="num flag-soon">KD ${KD(age.b60)}</span></div>
        <div class="r"><span class="t">60+ days overdue</span><span class="num flag-over">KD ${KD(age.b60p)}</span></div>
      </div><div class="rowcount">KD ${KD(age.cur+age.b30+age.b60+age.b60p)} outstanding across all unpaid invoices</div></div>
    </div></div>`;
  wireRange(renderMoneyDash);
  if($('repBtn'))$('repBtn').onclick=()=>openReport('money');
}

function sortBy(arr,k,dir){return [...arr].sort((a,b)=>{let x=a[k],y=b[k];if(k==='amt'){x=+a.amt||0;y=+b.amt||0;}x=x==null?"":x;y=y==null?"":y;return x>y?dir:x<y?-dir:0;});}
let _SS=null;
function thhead(head){return head.map(h=>h[0]?`<th data-k="${h[0]}">${h[1]}${_SS&&_SS.k===h[0]?(_SS.dir>0?" \u25B2":" \u25BC"):""}</th>`:"<th></th>").join("");}

function renderTasks(){
  _SS=state.sortT;
  let T=sortBy(applyQuick(tasksF()),state.sortT.k,state.sortT.dir);
  const cap=T.length>350?350:T.length;
  const chips=[["","All"],["open","Open"],["overdue","Overdue"],["week","Due this week"],["unassigned","Unassigned"],["high","High priority"],["done","Done"]];
  const head=[["id","ID"],["brand","Brand"],["name","Task"],["owner","Owner"],["priority","Priority"],["due","Due"],["status","Status"],["flag","Flag"],["",""]];
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Shown",T.length,"accent")}${kpi("Open",T.filter(t=>t.status!=="Done").length,"")}${kpi("Overdue",T.filter(t=>t.status!=="Done"&&t.due&&t.due<todayISO).length,"bad")}${kpi("High open",T.filter(t=>t.status!=="Done"&&t.priority==="High").length,"warn")}</div>
    <div class="panel">
      <div class="addbar">
        <button class="btn" id="ntAdd"${canWrite?"":" disabled"}>+ Add task</button>
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
        <td class="${fc}">${fl}</td>
        <td>${canWrite?rowMenu("tasks",t.id):""}</td></tr>`;}).join("")}</tbody></table></div>
      <div class="rowcount">${T.length>cap?`Showing first ${cap} of ${T.length}. Narrow with filters.`:`${T.length} tasks`}</div>
    </div></div>`;
  $('ntAdd').onclick=openTaskNew;
  $('tExport').onclick=()=>{const nm="PIVOT tasks"+(F.brand?" - "+F.brand:"")+(F.quick?" ("+F.quick+")":"")+" "+todayISO+".csv";exportTasksCSV(T,nm);};
  bindSort('sortT',renderTasks);
}

function renderMyTasks(){
  const me=state.me||"";
  const mine=me?store.tasks.filter(t=>t.owner===me):[];
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
  _SS=state.sortM;
  let M=sortBy(moneyF().filter(m=>m.dir==="Income"),state.sortM.k,state.sortM.dir);
  const collected=M.filter(m=>m.status==="Paid").reduce((a,m)=>a+(+m.amt||0),0);
  const billed=M.filter(m=>!voided(m)).reduce((a,m)=>a+(+m.amt||0),0);
  const overdue=M.filter(m=>owed(m)&&m.due&&m.due<todayISO).reduce((a,m)=>a+(+m.amt||0),0);
  const head=[["inv_no","Invoice #"],["date","Date"],["brand","Brand"],["desc","Description"],["amt","Amount"],["status","Status"],["due","Due"],["",""]];
  const ro=canWrite?"":"disabled";
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Billed","KD "+KD(billed),"accent")}${kpi("Collected","KD "+KD(collected),"good")}${kpi("Outstanding","KD "+KD(billed-collected),"bad")}${kpi("Overdue","KD "+KD(overdue),"warn")}</div>
    <div class="panel">
      <div class="addbar"><button class="btn" id="niAdd"${canWrite?"":" disabled"}>+ Add invoice</button></div>
      <div class="tablewrap"><table><thead><tr>${thhead(head)}</tr></thead>
      <tbody>${M.map(m=>{const od=owed(m)&&m.due&&m.due<todayISO;return `<tr id="mrow-${esc(m.id)}">
        <td class="id">${esc(m.inv_no||m.id)}</td>
        <td><input type="date" class="edit" data-c="money" data-id="${esc(m.id)}" data-f="date" value="${esc(m.date||'')}" ${ro}></td>
        <td><select class="edit" data-c="money" data-id="${esc(m.id)}" data-f="acct" ${ro}>${brandOpts(m.acct)}</select></td>
        <td style="min-width:200px"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.desc||m.id)}</button>${m.notes?`<div class="tagrow"><span class="tag" style="color:var(--hold);background:var(--hold-soft)">note</span></div>`:""}</td>
        <td class="num pos"><input type="number" step="0.001" class="edit num" style="width:104px" data-c="money" data-id="${esc(m.id)}" data-f="amt" value="${esc(m.amt)}" ${ro}></td>
        <td>${csel("pay","money",m.id,"status",m.status,PAY,ro)}</td>
        <td class="${od?'flag-over':''}"><input type="date" class="edit" data-c="money" data-id="${esc(m.id)}" data-f="due" value="${esc(m.due||'')}" ${ro}></td>
        <td>${canWrite?rowMenu("money",m.id):""}</td></tr>`;}).join("")}</tbody></table></div>
      <div class="rowcount">${M.length} invoices</div>
    </div></div>`;
  if(pendingHL){const el=$('mrow-'+pendingHL);pendingHL="";if(el){el.classList.add('hlrow');el.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>el.classList.remove('hlrow'),3000);}}
  $('niAdd').onclick=openInvoiceNew;
  bindSort('sortM',renderInvoices);
}

function renderExpenses(){
  _SS=state.sortM;
  let M=sortBy(moneyF().filter(m=>m.dir==="Expense"),state.sortM.k,state.sortM.dir);
  const total=Math.abs(M.filter(m=>!voided(m)).reduce((a,m)=>a+(+m.amt||0),0));
  const paid=Math.abs(M.filter(m=>m.status==="Paid").reduce((a,m)=>a+(+m.amt||0),0));
  const pending=Math.abs(M.filter(m=>owed(m)).reduce((a,m)=>a+(+m.amt||0),0));
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
        <div class="addbar"><button class="ghost" id="reAdd"${canWrite?"":" disabled"}>+ Create recurring</button><button class="btn" id="reGen"${canWrite&&dueCount?"":" disabled"}>Generate due${dueCount?` (${dueCount})`:""}</button></div>
        <div class="muted" style="font-size:12px;margin-top:6px">Generated lines land as pending until you mark them paid; past-dated ones that already auto-charged come in as paid.</div>
      </div>
    </div>
    <div class="panel">
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
  if($('reAdd'))$('reAdd').onclick=openExpTemplateNew;
  if($('reGen'))$('reGen').onclick=generateDueExpenses;
  document.querySelectorAll('[data-etpl]').forEach(b=>b.onclick=()=>openExpTemplateEdit(b.dataset.etpl));
  bindSort('sortM',renderExpenses);
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
  const M=moneyF().filter(m=>m.dir==="Salary");
  const total=Math.abs(M.reduce((a,m)=>a+(+m.amt||0),0));
  const pending=Math.abs(M.filter(m=>m.status!=="Paid").reduce((a,m)=>a+(+m.amt||0),0));
  // group into monthly payroll runs by the month of the date
  const groups={};
  M.forEach(m=>{const ym=(m.date||"").slice(0,7)||"—";if(!groups[ym])groups[ym]={ym,rows:[]};groups[ym].rows.push(m);});
  const months=Object.values(groups).map(g=>{
    g.total=Math.abs(g.rows.reduce((a,m)=>a+(+m.amt||0),0));
    g.status=g.rows.every(m=>m.status==="Paid")?"Paid":"Pending";
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
          <span class="pill ${g.status==='Paid'?'pill-good':'pill-bad'}">${g.status==='Paid'?'Sent':'Pending'}</span>
          ${ro?"":`<button class="ghost sltoggle" data-ym="${esc(g.ym)}" data-to="${g.status==='Paid'?'Pending':'Paid'}">Mark ${g.status==='Paid'?'pending':'sent'}</button>`}
          ${ro?"":`<button class="ghost sldel" data-ym="${esc(g.ym)}" title="Delete this month">✕</button>`}
        </div>
      </div>
      <div class="porows">
        ${g.rows.map(m=>`<div class="por"><span class="porperson"><button class="linkname" data-mopen="${esc(m.id)}">${esc(m.partner||m.desc||'—')}</button>${m.role?`<span class="rtag">${esc(m.role)}</span>`:""}</span><span class="num neg">KD ${KD(Math.abs(+m.amt||0))}</span></div>`).join("")}
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
  document.querySelectorAll('.sldel').forEach(b=>b.onclick=()=>{const g=months.find(e=>e.ym===b.dataset.ym);if(!g)return;removeMany("money",g.ids);});
}
function renderPayouts(){
  const M=moneyF().filter(m=>m.dir==="Payout");
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
  _SS=state.sortA;
  let rows=store.accounts.map(a=>{
    const open=store.tasks.filter(t=>t.acct===a.id&&t.status!=="Done").length;
    const coll=store.money.filter(m=>m.acct===a.id&&m.dir==="Income"&&m.status==="Paid").reduce((s,m)=>s+(+m.amt||0),0);
    const out=store.money.filter(m=>m.acct===a.id&&m.dir==="Income").reduce((s,m)=>s+(+m.amt||0),0)-coll;
    const eng=store.engagements.filter(e=>e.acct===a.id).length;
    const cost=Math.abs(store.money.filter(m=>m.acct===a.id&&(m.dir==="Expense"||m.dir==="Payout"||m.dir==="Salary")).reduce((s,m)=>s+(+m.amt||0),0));
    return Object.assign({open,coll,out,eng,cost,margin:coll-cost},a);
  }).filter(a=>!F.brand||a.brand===F.brand);
  rows=sortBy(rows,state.sortA.k,state.sortA.dir);
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
  bindSort('sortA',renderAccounts);
}

function renderRetainers(){
  const ym=todayISO.slice(0,7);
  const fee=a=>Math.abs(+a.retainer_fee||0);
  const rets=store.accounts.filter(a=>fee(a)>0);
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
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Monthly retainer value","KD "+KD(totFee),"accent")}${kpi("Retainers",rows.length,"")}${kpi("Delivery cost (mo)","KD "+KD(totCost),"warn")}${kpi("Blended margin (mo)","KD "+KD(totFee-totCost),(totFee-totCost)<0?"bad":"good")}</div>
    <div class="panel"><div class="muted" style="font-size:12px;margin-bottom:12px">Burn = this month's delivery cost (expenses, freelancers, payouts tagged to the brand) against the retainer fee. Amber ≥80%, red ≥100% — you're servicing at a loss.</div>
    <div class="poevents">${cards}</div></div></div>`;
}

const DEAL_STAGES=["Lead","Proposal","Contract","Signed","Lost"];
function dealBrand(d){const a=AMAP[d.acct];return a?a.brand:(d.acct||"—");}
function renderPipeline(){
  const deals=(store.deals||[]);
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
    <div class="sheetfoot">${edit?`<button class="del" id="mkDelete">Delete</button>`:""}<span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">${edit?"Save":"Add deal"}</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('dl_'+f);return el?el.value:"";};const acct=g('acct');if(!acct){toast("Pick a client");return;}
    const patch={acct,service:g('service'),title:g('title'),value:Math.abs(parseFloat(g('value'))||0),stage:g('stage'),contract_date:g('contract_date'),signed_date:g('signed_date'),close_date:g('close_date'),notes:g('notes')};
    if(edit){write("deals",d.id,patch);}else{create("deals",nextId("deals","DEAL-",3),patch);}close();};
  if(edit&&$('mkDelete'))$('mkDelete').onclick=()=>{close();remove("deals",d.id);};
}
function openDeal(id){const d=(store.deals||[]).find(x=>x.id===id);if(d)openDealNew(d);}

const SVC_TYPES=["Retainer","Project"];
function renderServices(){
  const ro=canWrite?"":"disabled";
  const svc=(store.services||[]).slice().sort((a,b)=>((a.active==="No")-(b.active==="No"))||(a.name||'').localeCompare(b.name||''));
  const rows=svc.length?svc.map(s=>`<tr>
    <td class="id">${esc(s.id)}</td>
    <td><input class="edit" style="min-width:150px" data-c="services" data-id="${esc(s.id)}" data-f="name" value="${esc(s.name||'')}" ${ro}></td>
    <td><select class="edit" data-c="services" data-id="${esc(s.id)}" data-f="type" ${ro}>${opts(SVC_TYPES,s.type||"Project")}</select></td>
    <td class="num"><input type="number" step="0.001" class="edit num" style="width:96px" data-c="services" data-id="${esc(s.id)}" data-f="price" value="${s.price!=null?esc(s.price):''}" ${ro}></td>
    <td><input class="edit" style="width:80px" data-c="services" data-id="${esc(s.id)}" data-f="unit" value="${esc(s.unit||'')}" ${ro} placeholder="/mo, one-off"></td>
    <td><input class="edit" style="min-width:180px" data-c="services" data-id="${esc(s.id)}" data-f="notes" value="${esc(s.notes||'')}" ${ro} placeholder="What it covers"></td>
    <td><select class="edit" data-c="services" data-id="${esc(s.id)}" data-f="active" ${ro}><option value="Yes"${s.active!=="No"?" selected":""}>Active</option><option value="No"${s.active==="No"?" selected":""}>Retired</option></select></td>
    <td>${canWrite?rowMenu("services",s.id):""}</td></tr>`).join(""):'<tr><td colspan="8" class="rowcount">No services yet. Add the things PIVOT sells — retainers and project types — so deals and invoices can reference them.</td></tr>';
  $('view').innerHTML=`<div class="view"><div class="panel">
    <div class="addbar"><button class="btn" id="svAdd"${canWrite?"":" disabled"}>+ Add service</button><span class="muted" style="font-size:12px">The catalogue of what PIVOT offers. Retainers bill monthly; projects are one-off.</span></div>
    <div class="tablewrap"><table><thead><tr><th>ID</th><th>Service</th><th>Type</th><th>Price (KD)</th><th>Unit</th><th>Notes</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="rowcount">${svc.filter(s=>s.active!=="No").length} active services</div>
  </div></div>`;
  if($('svAdd'))$('svAdd').onclick=openServiceNew;
}
function openServiceNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet"><div class="sheethead"><div><div class="id">New service</div><h3>Add service</h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formgrid">${fld("Service name",`<input id="sv_name" placeholder="e.g. Social media retainer">`)}${fld("Type",`<select id="sv_type">${opts(SVC_TYPES,"Retainer")}</select>`)}${fld("Price (KD)",`<input type="number" step="0.001" id="sv_price" placeholder="0.000">`)}${fld("Unit",`<input id="sv_unit" placeholder="/mo, one-off">`)}</div>
    <div class="formfull">${fld("Notes",`<input id="sv_notes" placeholder="What it covers">`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const name=$('sv_name').value.trim();if(!name){toast("Enter a name");return;}
    create("services",nextId("services","SVC-",3),{name,type:$('sv_type').value,price:Math.abs(parseFloat($('sv_price').value)||0),unit:$('sv_unit').value,notes:$('sv_notes').value,active:true});close();};
}
function renderTeam(){
  const ppl=(store.people||[]).slice().sort((a,b)=>((a.active==="No")-(b.active==="No"))||(a.name||'').localeCompare(b.name||''));
  const ro=canWrite?"":"disabled";
  const row=p=>`<tr>
    <td class="id">${esc(p.id)}</td>
    <td><input class="edit" style="min-width:140px" data-c="people" data-id="${esc(p.id)}" data-f="name" value="${esc(p.name||'')}" ${ro}></td>
    <td><input class="edit" style="width:120px" data-c="people" data-id="${esc(p.id)}" data-f="role" value="${esc(p.role||'')}" ${ro} placeholder="e.g. Partner"></td>
    <td><select class="edit" data-c="people" data-id="${esc(p.id)}" data-f="active" ${ro}><option value="Yes"${p.active!=="No"?" selected":""}>Active</option><option value="No"${p.active==="No"?" selected":""}>Archived</option></select></td>
    <td>${canWrite?rowMenu("people",p.id):""}</td></tr>`;
  $('view').innerHTML=`<div class="view"><div class="panel">
    <div class="addbar"><button class="btn" id="tmAdd"${canWrite?"":" disabled"}>+ Add member</button><span class="muted" style="font-size:12px">Active members appear in owner, salary and payout pickers. Archived (Churned) ones don't.</span></div>
    <div class="tablewrap"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
    <tbody>${ppl.length?ppl.map(row).join(""):'<tr><td colspan="5" class="rowcount">No team members yet — add one, or run migration-05 to seed the current team.</td></tr>'}</tbody></table></div>
    <div class="rowcount">${ppl.filter(p=>p.active!=="No").length} active · ${ppl.filter(p=>p.active==="No").length} archived</div>
  </div></div>`;
  if($('tmAdd'))$('tmAdd').onclick=openMemberNew;
}
function openMemberNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet"><div class="sheethead"><div><div class="id">New member</div><h3>Add team member</h3></div><button class="del" id="mkClose">✕</button></div>
    <div class="formgrid">${fld("Name",`<input id="tm_name" placeholder="Name">`)}${fld("Role",`<input id="tm_role" placeholder="e.g. Partner, Staff, Freelance">`)}${fld("Status",`<select id="tm_active">${opts(["Active","Churned"],"Active")}</select>`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const name=$('tm_name').value.trim();if(!name){toast("Enter a name");return;}
    create("people",nextId("people","PPL-",3),{name,role:$('tm_role').value,active:($('tm_active').value!=="Churned")});close();};
}

function bindSort(key,rerender){document.querySelectorAll('thead th[data-k]').forEach(th=>th.onclick=()=>{const k=th.dataset.k;if(!k)return;const s=state[key];s.dir=(s.k===k)?-s.dir:1;s.k=k;rerender();});}

let rafP=false;
function render(){
  if(!booted||!ready())return;
  if(rafP)return; rafP=true;
  requestAnimationFrame(()=>{rafP=false;
    const TITLES={tasksdash:"Tasks overview",moneydash:"Money overview",mytasks:"My Tasks",digest:"Digest",tasks:"All Tasks",recurring:"Recurring Tasks",invoices:"Invoices",expenses:"Expenses",salaries:"Salaries",payouts:"Payouts",retainers:"Retainers",accounts:"Accounts",pipeline:"Pipeline",services:"Services",activity:"Activity Log",setup:"Settings"};
    const VIEWS={tasksdash:renderTasksDash,moneydash:renderMoneyDash,mytasks:renderMyTasks,digest:renderDigest,tasks:renderTasks,recurring:renderRecurring,invoices:renderInvoices,expenses:renderExpenses,salaries:renderSalaries,payouts:renderPayouts,retainers:renderRetainers,accounts:renderAccounts,pipeline:renderPipeline,services:renderServices,activity:renderActivity,setup:renderSetup};
    if(!VIEWS[state.view])state.view="tasksdash";
    const noFilter=new Set(['setup','activity','recurring','digest','retainers','pipeline','services']);
    const fc=$('filterctrls');if(fc)fc.style.display=noFilter.has(state.view)?'none':'contents';
    $('viewtitle').textContent=TITLES[state.view];
    document.querySelectorAll('#nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.view===state.view));
    VIEWS[state.view]();
  });
}

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
      ${fld("Description — what the task is (the brief)",`<textarea id="mk_details" rows="4" ${ro}>${esc(t.details||'')}</textarea>`)}
      ${fld("Output — what was done (filled by whoever did it)",`<textarea id="mk_output" rows="4" ${ro}>${esc(t.output||'')}</textarea>`)}
      ${fld("Internal notes",`<textarea id="mk_notes" rows="2" ${ro}>${esc(t.notes||'')}</textarea>`)}
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
  if($('mkSave'))$('mkSave').onclick=async()=>{const g=f=>{const el=$('mk_'+f);return el?el.value:"";};
    const st=g('status');let dn=g('done');if(st==='Done'&&!dn)dn=todayISO;
    await write("tasks",id,{name:g('name'),acct:g('acct'),owner:g('owner'),priority:g('priority'),status:st,reqby:g('reqby'),logged:g('logged'),due:g('due'),done:dn,details:g('details'),output:g('output'),notes:g('notes'),tags:g('tags')});logAct("edited","tasks",id,g('name'));close();};
  if($('mkDelete'))$('mkDelete').onclick=()=>{close();remove("tasks",id);};
}
function openTaskNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">New task</div><h3>Add task</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Task name",`<input id="mk_name" placeholder="What needs doing">`)}
      ${fld("Brand",`<select id="mk_acct">${brandOpts("")}</select>`)}
      ${fld("Owner",`<select id="mk_owner"><option value="">—</option>${opts(teamActive())}</select>`)}
      ${fld("Priority",`<select id="mk_priority">${opts(PRIOS,"Medium")}</select>`)}
      ${fld("Status",`<select id="mk_status">${opts(STATUSES,"To Do")}</select>`)}
      ${fld("Requested by",`<select id="mk_reqby">${opts(["PIVOT","Client"],"PIVOT")}</select>`)}
      ${fld("Logged",`<input type="date" id="mk_logged" value="${todayISO}">`)}
      ${fld("Due",`<input type="date" id="mk_due">`)}
      ${fld("Tags (comma-separated)",`<input id="mk_tags" placeholder="e.g. dev, waiting-on-client">`)}
    </div>
    <div class="formfull">${fld("Description — what the task is",`<textarea id="mk_details" rows="3"></textarea>`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add task</button></div>
  </div>`;
  $('modal').classList.add('show');
  const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('mk_'+f);return el?el.value:"";};const name=g('name').trim();if(!name){toast("Enter a task name");return;}
    const st=g('status');const dn=st==='Done'?todayISO:"";
    create("tasks",nextId("tasks","TSK-",4),{acct:g('acct'),eng:"",name,details:g('details'),owner:g('owner'),priority:g('priority'),reqby:g('reqby'),logged:g('logged')||todayISO,due:g('due'),done:dn,status:st,output:"",notes:"",tags:g('tags')});close();};
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
      ${fld("Date",`<input type="date" id="mi_date" value="${todayISO}">`)}
      ${fld("Brand",`<select id="mi_acct">${brandOpts("")}</select>`)}
      ${fld("Amount (KD)",`<input type="number" step="0.001" id="mi_amt" placeholder="0.000">`)}
      ${fld("Status",`<select id="mi_status">${opts(PAY,"Unpaid")}</select>`)}
      ${fld("Due",`<input type="date" id="mi_due">`)}
      ${fld("Category",`<input id="mi_cat" value="Client Payment">`)}
    </div>
    <div class="formfull">
      ${fld("Description — what was billed",`<input id="mi_desc" placeholder="e.g. October retainer">`)}
      ${fld("Note (optional)",`<textarea id="mi_notes" rows="2"></textarea>`)}
    </div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add invoice</button></div>
  </div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('mi_'+f);return el?el.value:"";};const amt=parseFloat(g('amt'));if(isNaN(amt)){toast("Enter an amount");return;}
    create("money",nextId("money","LDG-",4),{date:g('date')||todayISO,acct:g('acct'),eng:"",dir:"Income",cat:g('cat')||"Client Payment",desc:g('desc'),amt:Math.abs(amt),status:g('status'),due:g('due'),paid:"",notes:g('notes'),inv_no:nextInvNo()});close();};
}
function nextInvNo(){let mx=0;store.money.forEach(m=>{const g=String(m.inv_no||'').match(/INV-(\d+)/);if(g)mx=Math.max(mx,+g[1]);});return "INV-"+String(mx+1).padStart(4,"0");}
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
function salRowHtml(r){r=r||{person:"",role:"",amt:""};return `<div class="slrow">
  <input class="sl_p" placeholder="Name" value="${esc(r.person||'')}">
  <select class="sl_r"><option value="">role</option>${opts(ROLES,r.role||"")}</select>
  <input class="sl_a" type="number" step="0.001" placeholder="KD" value="${r.amt!==''&&r.amt!=null?esc(r.amt):''}">
  <button class="ghost slx" title="Remove">✕</button></div>`;}
function openSalaryNew(){
  if(!canWrite){toast("Read-only access");return;}
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">Monthly salaries</div><h3>Add month's salaries</h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="formgrid">
      ${fld("Month (pay date)",`<input type="date" id="sl_date" value="${endOfMonthISO()}">`)}
      ${fld("Status",`<select id="sl_status">${opts(PAYOUT_STATUS,"Paid")}</select>`)}
    </div>
    <div class="formfull">
      ${fld("People paid this month",`<div id="sl_rows">${SALARY_DEFAULTS.map(salRowHtml).join("")}</div><button class="ghost" id="sl_addrow" style="margin-top:8px">+ Add person</button>`)}
      <div class="muted" id="sl_preview" style="margin:8px 0 0;font-size:12px"></div>
      ${fld("Note (optional)",`<textarea id="sl_notes" rows="2"></textarea>`)}
    </div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add month</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  const preview=()=>{let t=0;document.querySelectorAll('.sl_a').forEach(a=>t+=Math.abs(parseFloat(a.value)||0));$('sl_preview').textContent="Month total · KD "+KD(t);};
  const wireRows=()=>{document.querySelectorAll('.slx').forEach(b=>b.onclick=()=>{if(document.querySelectorAll('.slrow').length>1)b.closest('.slrow').remove();preview();});document.querySelectorAll('.sl_a').forEach(a=>a.oninput=preview);preview();};
  wireRows();
  $('sl_addrow').onclick=()=>{$('sl_rows').insertAdjacentHTML('beforeend',salRowHtml());wireRows();};
  $('mkSave').onclick=()=>{const date=$('sl_date').value||endOfMonthISO();const st=$('sl_status').value;const notes=$('sl_notes').value;const paid=(st==='Paid'?date:"");
    const ml=monthLabel(date.slice(0,7));
    const rowsEl=Array.from(document.querySelectorAll('.slrow'));
    const entries=rowsEl.map(r=>({person:r.querySelector('.sl_p').value.trim(),role:r.querySelector('.sl_r').value,amt:parseFloat(r.querySelector('.sl_a').value)})).filter(e=>e.person&&!isNaN(e.amt)&&e.amt>0);
    if(!entries.length){toast("Add at least one person with an amount");return;}
    let mx=0;store.money.forEach(d=>{const m=String(d.id).match(/(\d+)$/);if(m)mx=Math.max(mx,+m[1]);});
    const rows=entries.map((e,i)=>({id:"LDG-"+String(mx+1+i).padStart(4,"0"),date,acct:"",eng:"",dir:"Salary",cat:(e.role==="Freelance"?"Freelancer":"Salary"),partner:e.person,role:e.role,desc:`${e.person} ${ml} salary`,amt:-Math.abs(e.amt),status:st,due:"",paid,notes}));
    createMany("money",rows);close();};
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
    <div class="formfull">${fld("Notes (optional)",`<textarea id="ma_notes" rows="2"></textarea>`)}</div>
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Add account</button></div>
  </div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=()=>{const g=f=>{const el=$('ma_'+f);return el?el.value:"";};const brand=g('brand').trim();if(!brand){toast("Enter a brand name");return;}
    create("accounts",nextId("accounts","ACC-",3),{brand,type:g('type'),country:g('country'),lifecycle:g('lifecycle'),parent:g('parent'),notes:g('notes'),date_added:todayISO,retainer_fee:Math.abs(parseFloat(g('retainer_fee'))||0)});close();};
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
    <div class="formfull">${fld("Notes",`<textarea id="ae_notes" rows="2">${esc(a.notes||'')}</textarea>`)}</div>
    <div class="sheetfoot">${canWrite?`<button class="ghost" id="mkDelete" style="color:var(--bad);border-color:var(--bad-soft)">Delete</button>`:""}<span style="flex:1"></span><button class="ghost" id="mkCancel">Cancel</button><button class="btn" id="mkSave">Save</button></div></div>`;
  $('modal').classList.add('show');const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=$('mkCancel').onclick=close;$('modal').onclick=e=>{if(e.target===$('modal'))close();};
  $('mkSave').onclick=async()=>{const g=f=>{const el=$('ae_'+f);return el?el.value:"";};
    await write("accounts",id,{brand:g('brand'),type:g('type'),country:g('country'),lifecycle:g('lifecycle'),parent:g('parent'),date_added:g('date_added'),notes:g('notes'),retainer_fee:Math.abs(parseFloat(g('retainer_fee'))||0)});close();};
  if($('mkDelete'))$('mkDelete').onclick=()=>{close();remove("accounts",id);};
}
function openReport(kind){
  const R=activeRange();const lbl=`${R.from} → ${R.to==='9999-12-31'?'now':R.to}`;let title,html,csv,fname;
  if(kind==='money'){
    const Mall=moneyF();const inR=m=>{const dt=m.date||'';return dt>=R.from&&dt<=R.to;};
    const inv=Mall.filter(m=>m.dir==='Income'&&inR(m)&&!voided(m));
    const exp=Mall.filter(m=>m.dir==='Expense'&&inR(m));
    const collected=inv.filter(m=>m.status==='Paid').reduce((a,m)=>a+(+m.amt||0),0);
    const billed=inv.reduce((a,m)=>a+(+m.amt||0),0);
    const expenses=Math.abs(exp.reduce((a,m)=>a+(+m.amt||0),0));
    const byB={};inv.forEach(m=>{const b=brandOf(m.acct);byB[b]=(byB[b]||0)+(+m.amt||0);});
    const rows=Object.entries(byB).sort((a,b)=>b[1]-a[1]);
    title="Financial report";
    html=`<div class="kpis">${kpi("Billed","KD "+KD(billed),"accent")}${kpi("Collected","KD "+KD(collected),"good")}${kpi("Expenses","KD "+KD(expenses),"warn")}${kpi("Net","KD "+KD(collected-expenses),"accent")}</div>
      <div class="tablewrap"><table><thead><tr><th>Brand</th><th>Billed (KD)</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="num">${KD(r[1])}</td></tr>`).join(""):'<tr><td colspan="2" class="rowcount">No income in range</td></tr>'}</tbody></table></div>`;
    fname=`PIVOT financial report ${R.from}_${R.to==='9999-12-31'?'now':R.to}.csv`;
    csv=()=>{const lines=[["Ledger ID","Date","Brand","Type","Description","Amount","Status","Due"].map(csvCell).join(",")];
      [...inv,...exp].sort((a,b)=>((a.date||'')+"").localeCompare(b.date||'')).forEach(m=>lines.push([m.id,m.date,brandOf(m.acct),m.dir,m.desc,m.amt,m.status,m.due].map(csvCell).join(",")));
      lines.push("");
      [["Billed",billed],["Collected",collected],["Expenses",expenses],["Net",collected-expenses]].forEach(p=>lines.push(["","","","",p[0],p[1],"",""].map(csvCell).join(",")));
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
    <div class="sheetfoot"><span style="flex:1"></span><button class="ghost" id="mkCancel">Close</button><button class="btn" id="mkCsv">Download CSV</button></div>
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
      ${fld("Date",`<input type="date" id="mm_date" value="${esc(m.date||'')}" ${ro}>`)}
      ${m.dir==="Payout"?"":fld("Brand",`<select id="mm_acct" ${ro}>${brandOpts(m.acct)}</select>`)}
      ${m.dir==="Salary"?(fld("Person",`<input id="mm_partner" value="${esc(m.partner||'')}" ${ro}>`)+fld("Role",`<select id="mm_role" ${ro}><option value="">—</option>${opts(ROLES,m.role)}</select>`)):(m.dir==="Payout"?fld("Partner",`<input id="mm_partner" value="${esc(m.partner||'')}" ${ro}>`):fld("Category",`<input id="mm_cat" value="${esc(m.cat||'')}" ${ro}>`))}
      ${fld("Amount (KD)",`<input type="number" step="0.001" id="mm_amt" value="${esc(Math.abs(+m.amt||0))}" ${ro}>`)}
      ${fld("Status",`<select id="mm_status" ${ro}>${opts((m.dir==="Payout"||m.dir==="Salary")?PAYOUT_STATUS:PAY,m.status||((m.dir==="Payout"||m.dir==="Salary")?"Pending":"Unpaid"))}</select>`)}
      ${fld("Due",`<input type="date" id="mm_due" value="${esc(m.due||'')}" ${ro}>`)}
      ${fld("Paid on",`<input type="date" id="mm_paid" value="${esc(m.paid||'')}" ${ro}>`)}
    </div>
    <div class="formfull">
      ${fld("Description",`<input id="mm_desc" value="${esc(m.desc||'')}" ${ro}>`)}
      ${fld("Note — e.g. voided by us, or cancelled by client",`<textarea id="mm_notes" rows="2" ${ro}>${esc(m.notes||'')}</textarea>`)}
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
    else{patch.cat=($('mm_cat')?$('mm_cat').value:(m.cat||""));}
    await write("money",id,patch);logAct("edited","money",id,g('desc'));close();};
  if($('mkDelete'))$('mkDelete').onclick=()=>{close();remove("money",id);};
}
function openBrand(acctId){
  const a=AMAP[acctId];if(!a)return;
  const engs=store.engagements.filter(e=>e.acct===acctId);
  const tasks=store.tasks.filter(t=>t.acct===acctId);
  const openT=tasks.filter(t=>t.status!=="Done");
  const overdueT=openT.filter(t=>t.due&&t.due<todayISO).length;
  const inc=store.money.filter(m=>m.acct===acctId&&m.dir==="Income");
  const coll=inc.filter(m=>m.status==="Paid").reduce((s,m)=>s+(+m.amt||0),0);
  const out=inc.reduce((s,m)=>s+(+m.amt||0),0)-coll;
  const exp=Math.abs(store.money.filter(m=>m.acct===acctId&&m.dir==="Expense").reduce((s,m)=>s+(+m.amt||0),0));
  const payo=Math.abs(store.money.filter(m=>m.acct===acctId&&m.dir==="Payout").reduce((s,m)=>s+(+m.amt||0),0));
  const parent=a.parent?AMAP[a.parent]:null;
  const children=store.accounts.filter(x=>x.parent===acctId);
  const topOpen=[...openT].sort((x,y)=>((x.due||"9999")+"").localeCompare((y.due||"9999")+"")).slice(0,8);
  const chip=x=>`<button class="linkname" data-brand="${esc(x.id)}" style="font-size:12px">${esc(x.brand)}</button>`;
  const famHtml=(parent||children.length)?`<label class="fld"><span>Family</span><div class="attn"><div class="r" style="flex-wrap:wrap;gap:8px">${parent?`<span class="muted">Parent:</span> ${chip(parent)}`:""}${children.length?`<span class="muted"${parent?' style="margin-left:10px"':''}>Brands:</span> ${children.map(chip).join(" ")}`:""}</div></div></label>`:"";
  $('modal').innerHTML=`<div class="sheet">
    <div class="sheethead"><div><div class="id">${esc(a.id)}</div><h3>${esc(a.brand)} <span class="muted" style="font-weight:500">· ${esc(a.type||'')}${a.lifecycle?' · '+esc(a.lifecycle):''}${parent?' · under '+esc(parent.brand):''}</span></h3></div><button class="del" id="mkClose" title="Close">✕</button></div>
    <div class="kpis" style="margin:0 0 6px">${kpi("Collected","KD "+KD(coll),"good")}${kpi("Outstanding","KD "+KD(out),"bad")}${kpi("Open tasks",openT.length,"accent")}${kpi("Overdue",overdueT,"bad")}</div>
    <div class="formfull">
      ${famHtml}
      <label class="fld"><span>Engagements · ${engs.length}</span><div class="attn">${engs.length?engs.map(e=>`<div class="r"><span class="t">${esc(e.name||e.service||e.id)}${e.model?` <span class="muted">· ${esc(e.model)}</span>`:''}</span><span class="muted" style="white-space:nowrap">${esc(e.status||'')}${e.team?' · '+esc(e.team):''}</span></div>`).join(""):'<div class="rowcount">No engagements recorded.</div>'}</div></label>
      <label class="fld"><span>Open tasks · soonest first</span><div class="attn">${topOpen.length?topOpen.map(t=>{const[fl,fc]=flag(t);return `<div class="r"><span class="t"><button class="linkname" data-open="${esc(t.id)}">${esc(t.name||t.id)}</button></span><span class="${fc}" style="white-space:nowrap">${esc(t.due||'—')}</span></div>`;}).join(""):'<div class="rowcount">No open tasks.</div>'}</div></label>
    </div>
    <div class="sheetfoot"><span class="muted">Costs: KD ${KD(exp+payo)}</span><span style="flex:1"></span>${canWrite?`<button class="ghost" id="mkBrandEdit">Edit</button>`:""}<button class="ghost" id="mkBrandExport">Export</button><button class="btn" id="mkBrandTasks">View tasks</button></div>
    </div>`;
  $('modal').classList.add('show');
  const close=()=>{$('modal').classList.remove('show');$('modal').innerHTML='';};
  $('mkClose').onclick=close;
  $('modal').onclick=e=>{if(e.target===$('modal'))close();};
  if($('mkBrandEdit'))$('mkBrandEdit').onclick=()=>openAccountEdit(acctId);
  if($('mkBrandExport'))$('mkBrandExport').onclick=()=>exportTasksCSV(tasks,("PIVOT tasks - "+a.brand+" "+todayISO+".csv"));
  if($('mkBrandTasks'))$('mkBrandTasks').onclick=()=>{F.brand=a.brand;if($('fBrand'))$('fBrand').value=a.brand;state.view='tasks';try{localStorage.setItem('pivot_view','tasks');}catch(_){}close();render();};
}
function renderDigest(){
  const open=store.tasks.filter(t=>t.status!=="Done");
  const byDue=(a,b)=>((a.due||"9999-99-99")+"").localeCompare((b.due||"9999-99-99")+"");
  const isOv=t=>t.due&&t.due<todayISO;
  const isWk=t=>t.due&&t.due>=todayISO&&(new Date(t.due)-new Date(todayISO))<=7*864e5;
  const totOv=open.filter(isOv).length,totWk=open.filter(isWk).length;
  const names=[...new Set(open.map(t=>t.owner||"Unassigned"))].sort((a,b)=>{
    const oa=open.filter(t=>(t.owner||"Unassigned")===a&&isOv(t)).length;
    const ob=open.filter(t=>(t.owner||"Unassigned")===b&&isOv(t)).length;return ob-oa||a.localeCompare(b);});
  const line=t=>`<div class="r"><span class="t"><button class="linkname" data-open="${esc(t.id)}">${esc(t.name||t.id)}</button> <span class="muted">· ${esc(brandOf(t.acct))}</span></span><span style="display:flex;gap:6px;align-items:center;flex:0 0 auto"><span style="font-size:10px;${cstyle('priority',t.priority)};padding:1px 7px;border-radius:5px">${esc(t.priority||'')}</span><span class="${flag(t)[1]}" style="white-space:nowrap">${esc(t.due||'')}</span></span></div>`;
  const sections=names.map(n=>{
    const ov=open.filter(t=>(t.owner||"Unassigned")===n&&isOv(t)).sort(byDue);
    const wk=open.filter(t=>(t.owner||"Unassigned")===n&&isWk(t)).sort(byDue);
    if(!ov.length&&!wk.length)return"";
    return `<div class="panel"><h2>${esc(n)} <span class="muted" style="font-weight:500">· ${ov.length} overdue · ${wk.length} due this week</span></h2><div class="attn">${ov.length?`<div class="rowcount" style="color:var(--bad);font-weight:700">Overdue</div>`+ov.map(line).join(""):""}${wk.length?`<div class="rowcount" style="color:var(--warn);font-weight:700">Due this week</div>`+wk.map(line).join(""):""}</div></div>`;
  }).filter(Boolean).join("");
  $('view').innerHTML=`<div class="view">
    <div class="kpis">${kpi("Overdue",totOv,"bad")}${kpi("Due this week",totWk,"warn")}${kpi("Open total",open.length,"accent")}${kpi("People",names.length,"")}</div>
    ${sections||'<div class="center"><h2>Nothing overdue or due this week</h2><p>Everyone is clear for the next 7 days.</p></div>'}
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
      <div style="display:flex;gap:24px;flex-wrap:wrap"><div><span class="muted">Build</span> &nbsp; <b>PIVOT Command Center ${APPVER}</b></div><div><span class="muted">Status</span> &nbsp; <span id="savestate">${esc(saveStateText)}</span></div></div>
      <div class="rowcount" style="padding-left:0">Data lives in your Supabase database. A nightly backup pushes to a private repo; a daily digest posts to Teams.</div>
    </div></div>
  </div>`;
  document.querySelectorAll('.themeseg button').forEach(b=>b.onclick=()=>setTheme(b.dataset.theme));
  applyTheme();
  if($('tmAdd'))$('tmAdd').onclick=openMemberNew;
}
async function renderActivity(){
  $('view').innerHTML='<div class="view"><div class="panel"><h2>Recent activity</h2><div class="center" style="padding:30px"><div class="spin"></div></div></div></div>';
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
STATUSES.forEach(s=>$('fStatus').add(new Option(s,s)));
$('fSearch').oninput=e=>{F.q=e.target.value.toLowerCase().trim();render();};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName||'')&&!$('modal').classList.contains('show')){e.preventDefault();const s=$('fSearch');if(s)s.focus();}});
document.addEventListener('change',e=>{const el=e.target;if(el.classList&&el.classList.contains('edit')&&el.dataset.c){
  if(el.dataset.color)el.setAttribute('style',cstyle(el.dataset.color,el.value));
  let v=el.value;if(el.dataset.f==='amt')v=parseFloat(v)||0;
  const patch={[el.dataset.f]:v};
  if(el.dataset.c==='tasks'&&el.dataset.f==='status'&&v==='Done'){const t=store.tasks.find(x=>x.id===el.dataset.id);if(t&&!t.done)patch.done=todayISO;}
  write(el.dataset.c,el.dataset.id,patch);
  logAct(el.dataset.f==='status'?("set status → "+el.value):("edited "+el.dataset.f),el.dataset.c,el.dataset.id,"");}});
document.addEventListener('click',e=>{const d=e.target.closest('[data-drill]');if(d){const k=d.dataset.drill,v=d.dataset.val;
  if(k==='status'){F.status=v;if($('fStatus'))$('fStatus').value=v;}
  if(k==='team'){F.team=v;if($('fTeam'))$('fTeam').value=v;}
  if(k==='brand'){F.brand=v;if($('fBrand'))$('fBrand').value=v;}
  state.view='tasks';render();}});
document.addEventListener('click',e=>{const d=e.target.closest('[data-del]');if(d)remove(d.dataset.del,d.dataset.id);});
document.addEventListener('click',e=>{const g=e.target.closest('[data-goto]');if(g){if(g.dataset.hl)pendingHL=g.dataset.hl;state.view=g.dataset.goto;try{localStorage.setItem('pivot_view',state.view);}catch(_){}render();}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-brand]');if(b)openBrand(b.dataset.brand);});
document.addEventListener('click',e=>{const b=e.target.closest('[data-dopen]');if(b)openDeal(b.dataset.dopen);});
document.addEventListener('click',e=>{const c=e.target.closest('[data-quick]');if(c){F.quick=c.dataset.quick;render();}});
$('theme').onclick=()=>{const order=['system','light','dark'];setTheme(order[(order.indexOf(state.theme||'system')+1)%3]);};
applyTheme();
