// College prep: the applications and tests you are working towards, your grades, and your portfolio.
// Applications are the "dash.scholar" setting; grades and portfolio are "dash.portfolio". Both follow the signed-in
// account and are never part of the site's public files.
const D = window.Dash;
const STATUS = [["researching","Planning"], ["preparing","Preparing"], ["applied","Submitted"], ["interview","Interview"], ["awarded","Done"], ["closed","Dropped"]];
const STEPS = STATUS.slice(0, 5);                       // the track; "Dropped" sits beside it
const KINDS = ["Scholarship", "University", "Test"];
// what the list starts with, once; dates are left empty on purpose so you enter the official ones
const STARTER = [["GKS (Global Korea Scholarship)","Scholarship"], ["KAIST scholarship","Scholarship"], ["SAT, November","Test"], ["SAT, December","Test"]];
const LABEL = Object.fromEntries(STATUS), DONE = ["awarded","closed"], SENT = ["applied","interview","awarded","closed"];
const MAX = 60;

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const iso = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const days = s => Math.round((new Date(s + "T00:00:00") - new Date(iso(new Date()) + "T00:00:00")) / 864e5);
const pretty = s => new Date(s + "T00:00:00").toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric"});
const inDays = n => n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? "in " + n + " days" : n === -1 ? "yesterday" : -n + " days ago";
const safeLink = s => { try { const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : ""; } catch(e){ return ""; } };

/* ---------- applications ---------- */
function load(){
  const d = D.getSetting("dash.scholar", null) || {};
  return (Array.isArray(d.items) ? d.items : []).filter(x => x && x.id && x.name).map(x => ({
    id:String(x.id), name:String(x.name).slice(0,120), deadline:isDate(x.deadline) ? x.deadline : null,
    status:LABEL[x.status] ? x.status : "researching", kind:KINDS.includes(x.kind) ? x.kind : "Scholarship", note:String(x.note || "").slice(0,200), link:safeLink(x.link || "")
  }));
}
function seed(){
  if (D.getSetting("dash.college.seeded", false) || load().length) return;
  D.setSetting("dash.college.seeded", true);
  D.setSetting("dash.scholar", {items:STARTER.map((x, i) => ({id:"start" + i, name:x[0], kind:x[1], deadline:null, status:"preparing", note:"", link:""}))});
}
function save(items){ D.setSetting("dash.scholar", {items:items.slice(0, MAX)}); render(); D.refreshBrief(); }
// open ones first (soonest date on top, undated after), finished ones last
const rank = x => (DONE.includes(x.status) ? "2" : "1") + (x.deadline || "9999");
const sorted = items => items.slice().sort((a, b) => rank(a).localeCompare(rank(b)) || a.name.localeCompare(b.name));
// the next date you still have to act on
const nextDue = items => sorted(items).find(x => !SENT.includes(x.status) && x.deadline && days(x.deadline) >= 0) || null;

/* ---------- grades + portfolio ---------- */
// Everything read from storage or pasted in goes through here, so the rest of the file can trust the shape.
function tidy(p){
  p = p && typeof p === "object" ? p : {};
  const grades = (Array.isArray(p.grades) ? p.grades : []).slice(0, 12).map(g => ({
    term:String((g && g.term) || "").slice(0, 60),
    subjects:Object.entries((g && g.subjects && typeof g.subjects === "object") ? g.subjects : {}).slice(0, 30)
      .map(([k, v]) => [String(k).slice(0, 60), Number(v)]).filter(x => x[0] && Number.isFinite(x[1]) && x[1] >= 0 && x[1] <= 100)
  })).filter(g => g.term && g.subjects.length);
  const sections = (Array.isArray(p.sections) ? p.sections : []).slice(0, 12).map(s => ({
    title:String((s && s.title) || "").slice(0, 80),
    items:(Array.isArray(s && s.items) ? s.items : []).slice(0, 30).map(i => String(i).trim().slice(0, 400)).filter(Boolean)
  })).filter(s => s.title && s.items.length);
  return {grades, sections};
}
const portfolio = () => tidy(D.getSetting("dash.portfolio", null));
const avg = g => Math.round(g.subjects.reduce((n, x) => n + x[1], 0) / g.subjects.length * 100) / 100;
function importData(text){
  let raw; try { raw = JSON.parse(text); } catch(e){ return "That is not the data block. Paste it exactly as it was given, from the first { to the last }."; }
  const p = tidy(raw);
  if (!p.grades.length && !p.sections.length) return "The block has no grades or portfolio sections in it.";
  const out = {grades:p.grades.map(g => ({term:g.term, subjects:Object.fromEntries(g.subjects)})), sections:p.sections};
  if (JSON.stringify(out).length > 19000) return "That is too much to keep in one go. Shorten the longest entries and try again.";
  D.setSetting("dash.portfolio", out); return "";
}

/* ---------- summary card (home) ---------- */
function renderCard(){
  const box = document.getElementById("scholarCard"); if (!box) return;
  const items = load(), n = nextDue(items); box.innerHTML = "";
  const h = el("h3"), add = el("button", null, "Open");
  h.append(el("span", null, "College prep"), add); add.onclick = () => D.openSheet("scholar");
  box.append(h);
  const row = el("button", "row"); row.onclick = () => D.openSheet("scholar"); row.setAttribute("aria-label", "Open college prep");
  const side = el("div", "side"), open = items.filter(x => !DONE.includes(x.status)).length, sent = items.filter(x => x.status === "applied" || x.status === "interview").length;
  const g = portfolio().grades, last = g.length ? "Latest average " + avg(g[g.length - 1]).toFixed(2) : "";
  if (n){
    const d = days(n.deadline);
    row.append(el("div", "big", String(d)));
    side.append(el("div", "nm", (d === 1 ? "day" : "days") + " to " + n.name), el("div", "note", pretty(n.deadline) + " · " + open + " open, " + sent + " submitted"));
  } else {
    row.append(el("div", "big", String(open)));
    side.append(el("div", "nm", items.length ? "open, no dates set yet" : "Nothing tracked yet"), el("div", "note", last || (items.length ? "Add the deadlines and test dates to see a countdown." : "Add the scholarships, universities and tests you are preparing for.")));
  }
  row.append(side); box.append(row);
}

/* ---------- the sheet: Applications / Grades / Portfolio ---------- */
let view = "apps", adding = false, importing = false, msg = "";

function spark(values){
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "spark"); svg.setAttribute("viewBox", "0 0 100 30"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
  const lo = Math.min(...values) - .6, hi = Math.max(...values) + .6, y = v => 27 - (v - lo) / (hi - lo) * 24, x = i => values.length === 1 ? 50 : i / (values.length - 1) * 100;
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", values.length === 1 ? "M40 15H60" : values.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(""));
  svg.append(p); return svg;
}

function appsView(box, items){
  const bar = el("div", "cbar"), addB = el("button", "pill", adding ? "Close" : "Add one");
  addB.onclick = () => { adding = !adding; msg = ""; renderSheet(true); };
  bar.append(el("span", "smsg", msg), addB); box.append(bar);

  if (adding){
    const f = el("form", "sform"); f.noValidate = true;
    const mk = (label, type, ph, cls) => { const l = el("label", cls, label), i = el("input"); i.type = type; if (ph) i.placeholder = ph; l.append(i); f.append(l); return i; };
    const name = mk("Name", "text", "e.g. GKS, KAIST, SAT", "wide"), due = mk("Deadline or test date", "date");
    const kl = el("label", null, "Type"), kind = el("select"); KINDS.forEach(k => kind.append(el("option", null, k))); kl.append(kind); f.append(kl);
    const note = mk("Note", "text", "What it needs, target score", "wide"), link = mk("Link", "url", "https://");
    name.maxLength = 120; note.maxLength = 200; name.autocomplete = "off"; note.autocomplete = "off";
    const act = el("div", "act"), m = el("span", "smsg"), go = el("button", "pill solid", "Add"); go.type = "submit"; act.append(m, go); f.append(act);
    f.addEventListener("submit", ev => {
      ev.preventDefault();
      const n = name.value.trim();
      if (!n){ m.textContent = "Give it a name first."; name.focus(); return; }
      if (link.value.trim() && !safeLink(link.value.trim())){ m.textContent = "That link doesn't look right."; return; }
      document.activeElement && document.activeElement.blur();
      adding = false; msg = "Added.";
      save(items.concat({id:Date.now().toString(36), name:n, deadline:isDate(due.value) ? due.value : null, status:"researching", kind:kind.value, note:note.value.trim(), link:safeLink(link.value.trim())}));
    });
    box.append(f);
  }

  sorted(items).forEach(it => {
    const d = it.deadline ? days(it.deadline) : null, late = d != null && d < 0 && !SENT.includes(it.status), dropped = it.status === "closed";
    const card = el("div", "app" + (dropped || late ? " closed" : "")), top = el("div", "app-top"), main = el("div", "app-main");
    const nm = el("div", "app-name");
    if (it.link){ const a = el("a", null, it.name); a.href = it.link; a.target = "_blank"; a.rel = "noopener noreferrer"; nm.append(a); } else nm.textContent = it.name;
    main.append(el("div", "app-kind", it.kind), nm); if (it.note) main.append(el("div", "app-note", it.note));

    const when = el("div", "app-when"), dateIn = el("input");
    when.append(el("b", null, it.deadline ? pretty(it.deadline) : "Set a date"));
    if (it.deadline && !DONE.includes(it.status)) when.append(el("small", null, late ? "date passed" : SENT.includes(it.status) ? "submitted" : inDays(d)));
    dateIn.type = "date"; dateIn.value = it.deadline || ""; dateIn.className = "pick"; dateIn.setAttribute("aria-label", "Date for " + it.name);
    dateIn.onchange = () => { it.deadline = isDate(dateIn.value) ? dateIn.value : null; dateIn.blur(); msg = ""; save(items); };
    when.append(dateIn);
    const del = el("button", "del", "×"); del.setAttribute("aria-label", "Remove " + it.name);
    del.onclick = () => { msg = ""; save(items.filter(q => q.id !== it.id)); };
    top.append(main, when, del); card.append(top);

    // progress: tap a step to move there
    const at = STEPS.findIndex(s => s[0] === it.status), track = el("div", "track"), labels = el("div", "track-l");
    STEPS.forEach((s, i) => {
      const b = el("button", !dropped && i <= at ? "on" : ""); b.title = s[1]; b.setAttribute("aria-label", it.name + ": set to " + s[1]);
      b.onclick = () => { it.status = s[0]; msg = ""; save(items); }; track.append(b);
      labels.append(el("span", !dropped && i === at ? "on" : "", s[1]));
    });
    const drop = el("button", "drop", dropped ? "Reopen" : "Drop");
    drop.onclick = () => { it.status = dropped ? "preparing" : "closed"; msg = ""; save(items); };
    card.append(track, labels, drop); box.append(card);
  });
  if (!items.length) box.append(el("div", "empty", "Add your first one, or tell the assistant: “track the KAIST application, deadline 5 January”."));
}

function importBox(box, has){
  if (has && !importing){
    const b = el("button", "drop", "Replace this data"); b.onclick = () => { importing = true; renderSheet(true); }; box.append(b); return;
  }
  const w = el("div", "import");
  w.append(el("p", "sub", has ? "Paste the new data block. It replaces what is here." : "Paste your data block here once. It is saved to your account, shows on every device you sign in on, and is not part of the public site."));
  const ta = el("textarea"); ta.placeholder = "{ \"grades\": [ ... ], \"sections\": [ ... ] }"; ta.spellcheck = false; ta.setAttribute("aria-label", "Portfolio data");
  const row = el("div", "act"), m = el("span", "smsg"), go = el("button", "pill solid", "Save");
  go.onclick = () => { const err = importData(ta.value.trim()); if (err){ m.textContent = err; return; } importing = false; ta.blur(); renderSheet(true); renderCard(); };
  row.append(m, go); w.append(ta, row); box.append(w);
}

function gradesView(box, p){
  if (p.grades.length){
    const avgs = p.grades.map(avg), last = avgs[avgs.length - 1], first = avgs[0], head = el("div", "ghead"), side = el("div", "side");
    side.append(spark(avgs), el("div", "note", "Latest semester average" + (avgs.length > 1 ? " · " + (last >= first ? "up " : "down ") + Math.abs(last - first).toFixed(2) + " since " + p.grades[0].term : "")));
    head.append(el("div", "big", last.toFixed(2)), side); box.append(head);
    const list = el("div", "gradebox"), lo = Math.min(...avgs, 85) - 1;
    p.grades.forEach((g, i) => {
      const d = el("details", "sem"), s = el("summary"), bar = el("span", "bar"), fill = el("i");
      fill.style.width = Math.max(4, (avgs[i] - lo) / (100 - lo) * 100) + "%"; bar.append(fill);
      s.append(el("span", "nm", g.term), bar, el("span", "avg", avgs[i].toFixed(2))); d.append(s);
      const subs = el("div", "subs");
      g.subjects.slice().sort((a, b) => b[1] - a[1]).forEach(x => { const r = el("div"); r.append(el("span", null, x[0]), el("b", null, String(x[1]))); subs.append(r); });
      d.append(subs); list.append(d);
    });
    box.append(list);
  } else box.append(el("div", "empty", "No grades here yet."));
  importBox(box, p.grades.length > 0);
}
function portfolioView(box, p){
  p.sections.forEach(s => {
    const c = el("div", "psec"), ul = el("ul");
    s.items.forEach(i => ul.append(el("li", null, i)));
    c.append(el("h3", null, s.title), ul); box.append(c);
  });
  if (!p.sections.length) box.append(el("div", "empty", "No portfolio here yet."));
  importBox(box, p.sections.length > 0);
}

function renderSheet(force){
  const box = document.getElementById("scholarBody"); if (!box) return;
  if (!force && box.contains(document.activeElement) && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;   // don't wipe something half-typed
  const items = load(), p = portfolio(); box.innerHTML = "";
  const x = el("button", "sheet-x", "×"); x.setAttribute("aria-label", "Close"); x.onclick = () => D.closeSheets();
  const open = items.filter(i => !DONE.includes(i.status)).length, g = p.grades;
  box.append(x, el("h2", null, "College prep"), el("p", "sub", open + " open · " + items.filter(i => i.status === "applied" || i.status === "interview").length + " submitted" + (g.length ? " · average " + avg(g[g.length - 1]).toFixed(2) : "")));
  const tabs = el("div", "tabs ctabs");
  [["apps","Applications"], ["grades","Grades"], ["folio","Portfolio"]].forEach(t => {
    const b = el("button", view === t[0] ? "on" : "", t[1]); b.onclick = () => { view = t[0]; adding = importing = false; msg = ""; renderSheet(true); }; tabs.append(b);
  });
  box.append(tabs);
  const body = el("div", "cbody"); box.append(body);
  if (view === "grades") gradesView(body, p); else if (view === "folio") portfolioView(body, p); else appsView(body, items);
}
function render(){ renderCard(); renderSheet(); }

// for the assistant, the brief and the key dates on the home column
window.Scholar = {
  context: () => sorted(load()).map(x => ({id:x.id, name:x.name, kind:x.kind, date:x.deadline, status:LABEL[x.status], note:x.note || null})),
  profile(){ const p = portfolio(); return {semesterAverages:p.grades.map(g => ({term:g.term, average:avg(g)})), sections:p.sections}; },
  deadlines: () => load().filter(x => !SENT.includes(x.status) && x.deadline).map(x => ({text:x.name + (x.kind === "Test" ? "" : " deadline"), due:x.deadline})),
  add(o){
    const n = String(o.name || "").trim().slice(0,120); if (!n) return null;
    const it = {id:Date.now().toString(36), name:n, deadline:isDate(o.deadline) ? o.deadline : null, status:LABEL[o.status] ? o.status : "researching", kind:KINDS.includes(o.kind) ? o.kind : "Scholarship", note:String(o.note || "").trim().slice(0,200), link:""};
    msg = ""; save(load().concat(it)); return it;
  },
  setStatus(id, status){
    const items = load(), it = items.find(x => x.id === String(id)), key = (STATUS.find(k => k[0] === status || k[1].toLowerCase() === String(status).toLowerCase()) || [])[0];
    if (!it || !key) return false;
    it.status = key; msg = ""; save(items); return true;
  },
  importData
};

if (D){
  seed(); render(); D.refreshBrief();
  addEventListener("dash:settings", render);
}
