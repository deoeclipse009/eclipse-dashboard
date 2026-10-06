// IELTS score tracker: log Listening / Reading / Writing / Speaking bands, see the overall band and the trend.
// Saved as the "dash.ielts" setting, so it follows the signed-in account like the other preferences.
const D = window.Dash;
const SKILLS = [["l","Listening"], ["r","Reading"], ["w","Writing"], ["s","Speaking"]];
const MAX_ENTRIES = 150;

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const iso = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const fmt = n => n == null ? "–" : n.toFixed(1);
const band = v => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n >= 0 && n <= 9 ? Math.round(n * 2) / 2 : null; };
const pretty = s => new Date(s + "T00:00:00").toLocaleDateString("en-GB", {day:"numeric", month:"short"});

function load(){
  const d = D.getSetting("dash.ielts", null) || {};
  const entries = (Array.isArray(d.entries) ? d.entries : []).filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  return {target: band(d.target) ?? 7.5, entries};
}
function save(d){ D.setSetting("dash.ielts", {target:d.target, entries:d.entries.slice(-MAX_ENTRIES)}); render(); }

// IELTS overall = mean of the four skills, rounded to the nearest half band (.25 rounds up to .5, .75 up to the next band)
const overall = e => SKILLS.every(k => e[k[0]] != null) ? Math.round((e.l + e.r + e.w + e.s) / 4 * 2 + 1e-9) / 2 : null;
const latest = (entries, key) => { for (let i = entries.length - 1; i >= 0; i--) if (entries[i][key] != null) return entries[i][key]; return null; };
function summary(){
  const d = load(), full = d.entries.filter(e => overall(e) != null), last = full[full.length - 1], prev = full[full.length - 2];
  const skills = {}; SKILLS.forEach(k => skills[k[1].toLowerCase()] = latest(d.entries, k[0]));
  return {target:d.target, overall:last ? overall(last) : null, date:last ? last.date : null, previous:prev ? overall(prev) : null, skills, tests:d.entries.length};
}

function spark(values, target){
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "spark"); svg.setAttribute("viewBox", "0 0 100 30"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
  const all = values.concat(target), lo = Math.min(...all) - .5, hi = Math.max(...all) + .5;
  const y = v => 28 - (v - lo) / (hi - lo) * 26, x = i => values.length === 1 ? 50 : i / (values.length - 1) * 100;
  const path = (d, cls) => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); if (cls) p.setAttribute("class", cls); svg.append(p); };
  path("M0 " + y(target) + "H100", "tg");
  path(values.length === 1 ? "M46 " + y(values[0]) + "H54" : values.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(""));
  return svg;
}
function gapText(s){
  if (s.overall == null) return s.tests ? "Log all four skills in one entry to get an overall band." : "No scores yet.";
  const gap = s.target - s.overall;
  return gap <= 0 ? "Target " + fmt(s.target) + " reached" : fmt(gap) + " to go to " + fmt(s.target);
}

/* ---------- summary card (home) ---------- */
function renderCard(){
  const box = document.getElementById("ieltsCard"); if (!box) return;
  const d = load(), s = summary(); box.innerHTML = "";
  const h = el("h3"), log = el("button", null, "Log a score");
  h.append(el("span", null, "IELTS"), log); log.onclick = () => D.openSheet("track");
  const row = el("button", "row"); row.onclick = () => D.openSheet("track"); row.setAttribute("aria-label", "Open the IELTS tracker");
  const side = el("div", "side"), vals = d.entries.map(overall).filter(v => v != null);
  if (vals.length) side.append(spark(vals.slice(-12), d.target));
  side.append(el("div", "note", gapText(s)));
  row.append(el("div", "big", fmt(s.overall)), side);
  box.append(h, row);
}

/* ---------- tracker (sheet on a computer, view on a phone) ---------- */
let msg = "";
function renderSheet(){
  const box = document.getElementById("trackBody"); if (!box) return;
  if (box.contains(document.activeElement) && document.activeElement.tagName === "INPUT") return;   // don't wipe a half-typed score
  const d = load(), s = summary(); box.innerHTML = "";
  const x = el("button", "sheet-x", "×"); x.setAttribute("aria-label", "Close"); x.onclick = () => D.closeSheets();
  box.append(x, el("h2", null, "IELTS"));

  const head = el("div", "trackhead"), side = el("div", "side"), tg = el("label", "tgt", "Target band"), ti = el("input");
  ti.type = "number"; ti.min = 0; ti.max = 9; ti.step = .5; ti.inputMode = "decimal"; ti.value = d.target;
  ti.onchange = () => { const v = band(ti.value); if (v != null){ d.target = v; ti.blur(); save(d); } };
  tg.append(ti);
  const vals = d.entries.map(overall).filter(v => v != null);
  side.append(tg); if (vals.length) side.append(spark(vals.slice(-20), d.target));
  side.append(el("div", "sub", gapText(s) + (s.overall != null && s.previous != null && s.overall !== s.previous ? " · " + (s.overall > s.previous ? "up " : "down ") + fmt(Math.abs(s.overall - s.previous)) + " since last time" : "")));
  head.append(el("div", "big", fmt(s.overall)), side); box.append(head);

  const sk = el("div", "skills");
  SKILLS.forEach(k => {
    const c = el("div"), v = latest(d.entries, k[0]), best = Math.max(...d.entries.map(e => e[k[0]] ?? -1));
    c.append(el("b", null, fmt(v)), el("span", null, k[1] + (best >= 0 && best > v ? " · best " + fmt(best) : "")));
    sk.append(c);
  });
  box.append(sk);

  // new entry
  const f = el("form", "tform"); f.noValidate = true;
  const inputs = {};
  SKILLS.forEach(k => {
    const l = el("label", null, k[1]), i = el("input");
    i.type = "number"; i.min = 0; i.max = 9; i.step = .5; i.inputMode = "decimal"; i.placeholder = "–"; inputs[k[0]] = i;
    l.append(i); f.append(l);
  });
  const dl = el("label", "wide", "Date"), di = el("input"); di.type = "date"; di.value = iso(new Date()); di.max = iso(new Date()); dl.append(di);
  const act = el("div", "act"), add = el("button", "pill", "Add score"); add.type = "submit"; act.append(add);
  f.append(dl, act);
  f.addEventListener("submit", ev => {
    ev.preventDefault();
    const e = {id:Date.now().toString(36), date:di.value || iso(new Date())}; let any = false, bad = false;
    SKILLS.forEach(k => { const raw = inputs[k[0]].value.trim(); if (!raw){ e[k[0]] = null; return; } const v = band(raw); if (v == null) bad = true; else { e[k[0]] = v; any = true; } });
    if (bad){ msg = "Bands go from 0 to 9, in half steps."; return paintMsg(); }
    if (!any){ msg = "Enter at least one band. A single skill is fine for practice tests."; return paintMsg(); }
    const o = overall(e); msg = o != null ? "Saved. Overall " + fmt(o) + "." : "Saved.";
    document.activeElement && document.activeElement.blur();
    d.entries.push(e); save(d);
  });
  box.append(f);
  const m = el("div", "tmsg", msg); m.id = "trackMsg"; m.setAttribute("role", "status"); box.append(m);

  // history, newest first
  d.entries.slice().reverse().forEach(e => {
    const r = el("div", "erow"), del = el("button", "del", "×"), o = overall(e);
    del.setAttribute("aria-label", "Delete the score from " + pretty(e.date));
    del.onclick = () => { d.entries = d.entries.filter(q => q !== e); msg = ""; save(d); };
    r.append(el("span", "when", pretty(e.date)), el("span", "vals", SKILLS.filter(k => e[k[0]] != null).map(k => k[1][0] + " " + fmt(e[k[0]])).join("  ")), el("span", "ov", o != null ? fmt(o) : ""), del);
    box.append(r);
  });
  if (!d.entries.length) box.append(el("div", "empty", "Add your first score above, or tell the assistant: “I got 7 in reading today”."));
}
function paintMsg(){ const m = document.getElementById("trackMsg"); if (m) m.textContent = msg; }
function render(){ renderCard(); renderSheet(); }

// for the assistant
window.Track = {
  summary,
  log(o){
    const e = {id:Date.now().toString(36), date:/^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : iso(new Date())}; let any = false;
    SKILLS.forEach(k => { const v = o[k[1].toLowerCase()] == null ? null : band(o[k[1].toLowerCase()]); e[k[0]] = v; if (v != null) any = true; });
    if (!any) return null;
    const d = load(); d.entries.push(e); msg = ""; save(d);
    return e;
  }
};

if (D){
  render();
  addEventListener("dash:settings", render);
}
