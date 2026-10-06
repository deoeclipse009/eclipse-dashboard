// College prep: scholarships, universities and tests you are working towards, when each is due, and how far along it is.
// Saved as the "dash.scholar" setting, so it follows the signed-in account like the other preferences.
const D = window.Dash;
const STATUS = [["researching","Planning"], ["preparing","Preparing"], ["applied","Submitted"], ["interview","Interview"], ["awarded","Done"], ["closed","Dropped"]];
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
// open applications first (soonest deadline on top, undated after), finished ones last
const rank = x => (DONE.includes(x.status) ? "2" : "1") + (x.deadline || "9999");
const sorted = items => items.slice().sort((a, b) => rank(a).localeCompare(rank(b)) || a.name.localeCompare(b.name));
// the next deadline you still have to act on
const nextDue = items => sorted(items).find(x => !SENT.includes(x.status) && x.deadline && days(x.deadline) >= 0) || null;

/* ---------- summary card (home) ---------- */
function renderCard(){
  const box = document.getElementById("scholarCard"); if (!box) return;
  const items = load(), n = nextDue(items); box.innerHTML = "";
  const h = el("h3"), add = el("button", null, items.length ? "Open" : "Add one");
  h.append(el("span", null, "College prep"), add); add.onclick = () => D.openSheet("scholar");
  box.append(h);
  const row = el("button", "row"); row.onclick = () => D.openSheet("scholar"); row.setAttribute("aria-label", "Open college prep");
  const side = el("div", "side"), open = items.filter(x => !DONE.includes(x.status)).length, sent = items.filter(x => x.status === "applied" || x.status === "interview").length;
  if (n){
    const d = days(n.deadline);
    row.append(el("div", "big", String(d)));
    side.append(el("div", "nm", (d === 1 ? "day" : "days") + " to " + n.name), el("div", "note", pretty(n.deadline) + " · " + open + " open, " + sent + " submitted"));
  } else {
    row.append(el("div", "big", String(open)));
    side.append(el("div", "nm", items.length ? "open, no dates set yet" : "Nothing tracked yet"), el("div", "note", items.length ? "Add the deadlines and test dates to see a countdown." : "Add the scholarships, universities and tests you are preparing for."));
  }
  row.append(side); box.append(row);
}

/* ---------- tracker (sheet on a computer, view on a phone) ---------- */
let msg = "";
function renderSheet(){
  const box = document.getElementById("scholarBody"); if (!box) return;
  if (box.contains(document.activeElement) && /^(INPUT|SELECT)$/.test(document.activeElement.tagName)) return;   // don't wipe a half-typed entry
  const items = load(); box.innerHTML = "";
  const x = el("button", "sheet-x", "×"); x.setAttribute("aria-label", "Close"); x.onclick = () => D.closeSheets();
  const open = items.filter(i => !DONE.includes(i.status)).length;
  box.append(x, el("h2", null, "College prep"), el("p", "sub", items.length ? open + " open · " + items.filter(i => i.status === "applied" || i.status === "interview").length + " submitted · " + items.filter(i => i.status === "awarded").length + " done" : "Scholarships, universities and tests in one place."));

  // new entry
  const f = el("form", "sform"); f.noValidate = true;
  const mk = (label, type, ph, cls) => { const l = el("label", cls, label), i = el("input"); i.type = type; if (ph) i.placeholder = ph; l.append(i); f.append(l); return i; };
  const name = mk("Name", "text", "e.g. GKS, KAIST, SAT", "wide"), due = mk("Deadline or test date", "date");
  const kl = el("label", null, "Type"), kind = el("select"); KINDS.forEach(k => kind.append(el("option", null, k))); kl.append(kind); f.append(kl);
  const note = mk("Note", "text", "What it needs, target score", "wide"), link = mk("Link", "url", "https://");
  name.maxLength = 120; note.maxLength = 200; name.autocomplete = "off"; note.autocomplete = "off";
  const act = el("div", "act"), go = el("button", "pill", "Add"); go.type = "submit";
  const m = el("span", "smsg", msg); m.id = "scholarMsg"; m.setAttribute("role", "status"); act.append(m, go); f.append(act);
  f.addEventListener("submit", ev => {
    ev.preventDefault();
    const n = name.value.trim();
    if (!n){ msg = "Give it a name first."; m.textContent = msg; name.focus(); return; }
    if (link.value.trim() && !safeLink(link.value.trim())){ msg = "That link doesn't look right."; m.textContent = msg; return; }
    document.activeElement && document.activeElement.blur();
    msg = "Added.";
    save(items.concat({id:Date.now().toString(36), name:n, deadline:isDate(due.value) ? due.value : null, status:"researching", kind:kind.value, note:note.value.trim(), link:safeLink(link.value.trim())}));
  });
  box.append(f);

  sorted(items).forEach(it => {
    const d = it.deadline ? days(it.deadline) : null, late = d != null && d < 0 && !SENT.includes(it.status);
    const r = el("div", "srow" + (DONE.includes(it.status) || late ? " closed" : "")), main = el("div", "main"), b = el("b");
    if (it.link){ const a = el("a", null, it.name); a.href = it.link; a.target = "_blank"; a.rel = "noopener noreferrer"; b.append(a); } else b.textContent = it.name;
    main.append(b, el("small", null, it.kind + (it.note ? " · " + it.note : "")));
    const when = el("div", "when", it.deadline ? pretty(it.deadline) : "Set a date");
    const dateIn = el("input"); dateIn.type = "date"; dateIn.value = it.deadline || ""; dateIn.className = "pick"; dateIn.setAttribute("aria-label", "Date for " + it.name);
    dateIn.onchange = () => { it.deadline = isDate(dateIn.value) ? dateIn.value : null; dateIn.blur(); msg = ""; save(items); };
    if (it.deadline && !DONE.includes(it.status)) when.append(el("small", null, late ? "date passed" : SENT.includes(it.status) ? "submitted" : inDays(d)));
    when.append(dateIn);
    const st = el("button", "pill st s-" + it.status, LABEL[it.status]);
    st.title = "Tap to move to the next stage"; st.setAttribute("aria-label", it.name + ": " + LABEL[it.status] + ". Tap to move to the next stage.");
    st.onclick = () => { it.status = STATUS[(STATUS.findIndex(s => s[0] === it.status) + 1) % STATUS.length][0]; msg = ""; save(items); };
    const del = el("button", "del", "×"); del.setAttribute("aria-label", "Remove " + it.name);
    del.onclick = () => { msg = ""; save(items.filter(q => q.id !== it.id)); };
    r.append(main, when, st, del); box.append(r);
  });
  if (!items.length) box.append(el("div", "empty", "Add your first one above, or tell the assistant: “track the KAIST application, deadline 5 January”."));
}
function render(){ renderCard(); renderSheet(); }

// for the assistant, the brief and the key dates on the home column
window.Scholar = {
  context: () => sorted(load()).map(x => ({id:x.id, name:x.name, kind:x.kind, date:x.deadline, status:LABEL[x.status], note:x.note || null})),
  deadlines: () => load().filter(x => !SENT.includes(x.status) && x.deadline).map(x => ({text:x.name + (x.kind === "Test" ? "" : " deadline"), due:x.deadline})),
  add(o){
    const n = String(o.name || "").trim().slice(0,120); if (!n) return null;
    const it = {id:Date.now().toString(36), name:n, deadline:isDate(o.deadline) ? o.deadline : null, status:LABEL[o.status] ? o.status : "researching", kind:KINDS.includes(o.kind) ? o.kind : "Scholarship", note:String(o.note || "").trim().slice(0,200), link:""};
    msg = ""; save(load().concat(it)); return it;
  },
  setStatus(id, status){
    const items = load(), it = items.find(x => x.id === String(id)), key = (STATUS.find(k => k[0] === status || k[1].toLowerCase() === String(status).toLowerCase()) || [])[0];
    if (!it || !key) return false; status = key;
    it.status = status; msg = ""; save(items); return true;
  }
};

if (D){
  seed(); render(); D.refreshBrief();
  addEventListener("dash:settings", render);
}
