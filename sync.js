// Sign-in, device memory and the task/settings database (Turso, through the /api functions).
import { apiBase } from "./config.js";

const D = window.Dash;
const base = String(apiBase || "").replace(/\/+$/, "");
const K = { token: "dash.token", user: "dash.user", dirty: "dash.dirty" };
const SYNCED = ["dash.weather.loc", "dash.voice.speak", "dash.omni.base", "dash.omni.model", "dash.pal.pin", "dash.fold",
  "dash.ai.name", "dash.ai.botname", "dash.ai.about", "dash.ai.provider", "dash.speech.lang", "dash.school.times", "dash.ielts"];

const ls = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
const sig = t => JSON.stringify([t.text, !!t.done, t.scope, t.due || null, t.time || null, t.repeat || null, !!t.spawned]);
const clean = t => ({id:t.id, text:t.text, done:!!t.done, scope:t.scope, due:t.due || null, time:t.time || null, repeat:t.repeat || null, spawned:!!t.spawned});

let user = null, remote = new Map(), busy = false, again = false, polling = null;

function authHeaders(){ const t = ls.get(K.token); return t ? {Authorization:"Bearer " + t} : {}; }
async function api(path, method = "GET", body){
  const r = await fetch(base + path, {
    method, headers:Object.assign({"Content-Type":"application/json"}, authHeaders()),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (r.status === 401 && ls.get(K.token)){ expire("Your session ended. Please sign in again."); throw new Error("signed out"); }
  return r;
}

/* ---------- tasks ---------- */
function replaceLocal(arr){
  remote = new Map(arr.map(t => [t.id, sig(t)]));
  D.setTasks(arr);
}
async function pull(){
  if (!user || busy) return;
  try {
    const r = await api("/api/tasks"); if (!r.ok) return;
    const arr = (await r.json()).tasks || [];
    const local = D.getTasks();
    const same = arr.length === local.length && arr.every(t => { const l = local.find(x => x.id === t.id); return l && sig(l) === sig(t); });
    if (!same) replaceLocal(arr); else remote = new Map(arr.map(t => [t.id, sig(t)]));
  } catch(e){ /* offline: keep what's on screen */ }
}
function push(){
  if (!user) return;
  ls.set(K.dirty, "1");
  if (busy){ again = true; return; }
  flush();
}
async function flush(){
  busy = true;
  try {
    do {
      again = false;
      const tasks = D.getTasks(), ids = new Set(tasks.map(t => t.id));
      const upserts = tasks.filter(t => remote.get(t.id) !== sig(t)).map(clean);
      const deletes = [...remote.keys()].filter(id => !ids.has(id));
      for (let i = 0; i < Math.max(1, Math.ceil(Math.max(upserts.length, deletes.length) / 400)); i++) {
        const u = upserts.slice(i*400, (i+1)*400), d = deletes.slice(i*400, (i+1)*400);
        if (!u.length && !d.length) break;
        const r = await api("/api/tasks", "POST", {upserts:u, deletes:d});
        if (!r.ok) throw new Error("save failed");
        u.forEach(t => remote.set(t.id, sig(t))); d.forEach(id => remote.delete(id));
      }
    } while (again);
    ls.del(K.dirty);
  } catch(e){ if (e.message !== "signed out") D.setMsg("Couldn't save to the database. It will retry on the next change."); }
  busy = false;
}

/* ---------- settings ---------- */
let settingsTimer = null, pendingSettings = {};
function pushSetting(k, v){
  if (!user || !SYNCED.includes(k)) return;
  pendingSettings[k] = v; clearTimeout(settingsTimer);
  settingsTimer = setTimeout(async () => {
    const s = pendingSettings; pendingSettings = {};
    try { await api("/api/settings", "PUT", {settings:s}); } catch(e){}
  }, 600);
}
async function pullSettings(){
  try { const r = await api("/api/settings"); if (r.ok) D.applySettings((await r.json()).settings); } catch(e){}
}

/* ---------- session ---------- */
function begin(u, firstTime){
  user = u; ls.set(K.user, JSON.stringify(u));
  D.setAccount({user:u}); D.onSave(push); D.onSetting(pushSetting);
  D.unlock();
  (async () => {
    try {
      const r = await api("/api/tasks"), arr = r.ok ? (await r.json()).tasks : null;
      if (arr){
        if (!firstTime && ls.get(K.dirty)){          // edits made offline that never reached the database: this device wins
          remote = new Map(arr.map(t => [t.id, sig(t)])); await flush();
        } else if (arr.length || !D.getTasks().length) replaceLocal(arr);   // database has data: it wins
        else { remote = new Map(); await flush(); }                          // new account: adopt this device's tasks
      }
    } catch(e){ /* offline: keep what's on screen */ }
    await pullSettings();
  })();
  clearInterval(polling); polling = setInterval(pull, 30000);
}
function expire(msg){
  user = null; ls.del(K.token); clearInterval(polling);
  D.onSave(null); D.onSetting(null); D.setAccount({user:null}); D.lock(msg);
}
async function signOut(all){
  try { await api("/api/auth/logout", "POST", {all:!!all}); } catch(e){}
  ls.del(K.token); ls.del(K.user); ls.del(K.dirty); user = null; clearInterval(polling);
  D.onSave(null); D.onSetting(null);
  D.setTasks([]); D.setEvents([]); D.setAccount({user:null, calendar:"off"});
  D.lock("");
}
async function enter(kind, d){
  D.gateBusy(true); D.gateMsg("");
  try {
    const r = await fetch(base + "/api/auth/" + kind, {method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:d.email, password:d.password, code:d.code})});
    const j = await r.json().catch(() => ({}));
    if (!r.ok){ D.gateMsg(j.error || "Something went wrong."); return; }
    ls.set(K.token, j.token); begin(j.user, true);
  } catch(e){ D.gateMsg("Couldn't reach the server. Check your connection."); }
  finally { D.gateBusy(false); }
}

if (D){
  window.__syncReady = true;
  if (!base){
    D.setAccount({configured:false}); D.unlock();
  } else {
    D.setAccount({configured:true});
    addEventListener("dash:action", e => {
      const t = e.detail.type;
      if (t === "login") enter("login", e.detail);
      else if (t === "register") enter("register", e.detail);
      else if (t === "signout") signOut(false);
      else if (t === "signout-all") signOut(true);
    });
    addEventListener("online", pull);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(); });
    let saved = null; try { saved = JSON.parse(ls.get(K.user)); } catch(e){}
    if (ls.get(K.token) && saved) begin(saved, false);      // remembered device: straight in
    else D.lock("");
  }
}
