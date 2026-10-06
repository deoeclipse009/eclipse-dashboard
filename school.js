// School timetable: SMA Regina Pacis Surakarta, class XII J, Semester 1 2026/2027.
// Shows today's classes on the home column and the whole week in the School sheet.
const D = window.Dash;

export const CLASS = "XII J";
const TERM = "Semester 1 · 2026/2027";

// Lesson periods (start, end). Editable in the School sheet; edits are saved as "dash.school.times".
const DEFAULT_TIMES = [
  ["07:30","08:10"], ["08:10","08:50"], ["08:50","09:30"], ["09:55","10:35"], ["10:35","11:15"],
  ["11:15","11:55"], ["12:20","13:00"], ["13:00","13:40"], ["13:40","14:20"]
];

const SUBJECTS = {
  "Agama":"Pendidikan Agama", "B. Indo":"Bahasa Indonesia", "B.Jawa":"Bahasa Jawa", "BIO":"Biologi", "BIng":"Bahasa Inggris",
  "BK":"Bimbingan Konseling", "FIS":"Fisika", "Ielts":"IELTS Prep", "KIM":"Kimia", "MAT":"Matematika", "Musik":"Seni Musik",
  "PJOK":"Penjaskes", "PKWU":"Prakarya dan Kewirausahaan", "PKn":"Pendidikan Pancasila", "Pwl":"Perwalian", "Sej":"Sejarah",
  "TKA 2":"TKA 2", "TKA1":"TKA 1", "XIIM3":"XII Minat 3"
};
const TEACHERS = {
  Aa:"Anung Dwi Rahayu", Cc:"Rogatianus Yogo P.", Cie:"CIE", Dd:"Christianto Dedy S.", Ddd:"Mr. Adison", Ee:"Yoana Maria Vianey",
  Eee:"Dr. Mouluke", Fff:"Mr. Asher", Gg:"Agustina Sukmawati", Ggg:"Ms. Marta", J:"Y. Rochmartopo", K:"Andreas Marwanto",
  Ll:"Elisabeth Tetyana Linda C.", Mm:"Nindias Dwikky C.", O:"Elias Anwar", Pp:"Brigitta Armeina Putri A.", Q:"Rini Pramesti",
  S:"Stefani Nike Nurtjahyo", Ss:"Sutiyanti Monika", Vv:"Fila Delfia Zai", X:"Maria Rika Andriyani", Xx:"Chaterien Septia Sirait"
};
// [first period, last period, subject, teacher codes]; keyed by weekday (1 = Monday)
const WEEK = {
  1: [[1,1,"Musik",["Aa"]], [2,2,"PKWU",["Ee"]], [3,4,"B. Indo",["Ll"]], [5,6,"TKA1",["Vv"]], [7,8,"Ielts",["Cie"]]],
  2: [[1,2,"Agama",["O"]], [3,4,"Sej",["Dd"]], [5,6,"KIM",["Gg","Eee"]], [7,8,"FIS",["Xx","Eee"]]],
  3: [[1,2,"TKA 2",["Mm"]], [3,3,"BK",["S"]], [4,5,"MAT",["X"]], [6,7,"BIO",["Q","Ggg"]], [8,8,"Pwl",["S"]]],
  4: [[1,1,"BIng",["S","Fff"]], [2,2,"B.Jawa",["Cc"]], [3,4,"PJOK",["J"]], [5,6,"TKA 2",["Ss"]], [7,8,"TKA1",["K"]]],
  5: [[1,2,"MAT",["X","Ddd"]], [3,4,"XIIM3",["Pp"]], [5,6,"BIng",["S"]], [7,8,"PKn",["Ss"]]]
};
const DAYS = {1:["Senin","Monday"], 2:["Selasa","Tuesday"], 3:["Rabu","Wednesday"], 4:["Kamis","Thursday"], 5:["Jumat","Friday"]};
const LAST = Math.max(...Object.values(WEEK).flat().map(b => b[1]));      // last period that is ever used

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
function times(){
  const saved = D.getSetting("dash.school.times", null);
  return DEFAULT_TIMES.map((d, i) => { const s = Array.isArray(saved) && saved[i]; return s && HM.test(s[0]) && HM.test(s[1]) && s[0] < s[1] ? s : d; });
}
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const hm = d => String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
const dot = t => t.replace(":", ".");

function blocks(dow){
  const T = times();
  return (WEEK[dow] || []).map(b => ({
    p0:b[0], p1:b[1], code:b[2], name:SUBJECTS[b[2]] || b[2], teachers:b[3].map(c => TEACHERS[c] || c),
    from:T[b[0]-1][0], to:T[b[1]-1][1]
  }));
}
// The school day to show: today while there is still a class left, otherwise the next school day.
function current(){
  const now = new Date(), t = hm(now), dow = now.getDay(), today = blocks(dow);
  if (today.length && t < today[today.length-1].to) return {dow, isToday:true, t, list:today};
  let d = dow; do { d = d % 7 + 1; } while (!WEEK[d]);
  return {dow:d, isToday:false, t:"", list:blocks(d), tomorrow:d === dow % 7 + 1};
}
const stateOf = (b, c) => !c.isToday ? "" : c.t >= b.to ? "past" : c.t >= b.from ? "now" : "";

function row(b, st, withTeacher){
  const r = el("div", "cls" + (st ? " " + st : ""));
  const nm = el("span", "nm", b.name);
  if (withTeacher) nm.append(el("small", null, b.teachers.join(" / ")));
  r.title = b.name + " · " + b.teachers.join(" / ");
  r.append(el("span", "tm", dot(b.from) + " – " + dot(b.to)), nm);
  if (st === "now") r.append(el("em", null, "Now"));
  return r;
}

/* ---------- today's classes (home) ---------- */
function renderToday(){
  const box = document.getElementById("schoolToday"); if (!box) return;
  const c = current(); box.innerHTML = "";
  const h = el("div", "sec-h"), wk = el("button", null, "All days");
  h.append(el("span", "lbl", (c.isToday ? DAYS[c.dow][1] : c.tomorrow ? "Tomorrow, " + DAYS[c.dow][1] : DAYS[c.dow][1]) + " · " + CLASS), wk);
  wk.onclick = () => D.openSheet("school");
  box.append(h);
  // how far through the school day we are (shown on phones)
  const mins = t => +t.slice(0,2) * 60 + +t.slice(3), first = c.list[0], last = c.list[c.list.length - 1];
  const bar = el("div", "daybar"), fill = el("i");
  fill.style.width = (c.isToday ? Math.max(0, Math.min(100, (mins(c.t) - mins(first.from)) / (mins(last.to) - mins(first.from)) * 100)) : 0) + "%";
  bar.append(fill); box.append(bar);
  c.list.forEach(b => box.append(row(b, stateOf(b, c), false)));
}

/* ---------- the week (sheet on a computer, view on a phone) ---------- */
let pick = null, editing = false;
function renderWeek(){
  const box = document.getElementById("schoolBody"); if (!box) return;
  const c = current(), T = times(), todayDow = new Date().getDay();
  if (pick == null) pick = c.dow;
  box.innerHTML = "";
  const x = el("button", "sheet-x", "×"); x.setAttribute("aria-label", "Close"); x.onclick = () => D.closeSheets();
  box.append(x, el("h2", null, "School"), el("p", "sub", "SMA Regina Pacis Surakarta · " + CLASS + " · " + TERM));

  // wide grid
  const g = el("div", "wk"); g.style.setProperty("--n", LAST);
  g.append(el("div", "ph"));
  for (let p = 1; p <= LAST; p++){ const ph = el("div", "ph", String(p)); ph.append(el("small", null, dot(T[p-1][0]) + " – " + dot(T[p-1][1]))); g.append(ph); }
  Object.keys(WEEK).forEach((d, i) => {
    const dn = el("div", "dn" + (+d === todayDow ? " on" : ""), DAYS[d][0]); dn.style.gridRow = i + 2; dn.style.gridColumn = 1; g.append(dn);
    let next = 1;
    const put = (p0, p1, node) => { node.style.gridRow = i + 2; node.style.gridColumn = (p0 + 1) + " / span " + (p1 - p0 + 1); g.append(node); };
    blocks(+d).forEach(b => {
      if (b.p0 > next) put(next, b.p0 - 1, el("div", "cell free"));
      const cell = el("div", "cell" + (+d === todayDow ? " on" : "") + (+d === c.dow && stateOf(b, c) === "now" ? " now" : ""));
      cell.title = b.name + " · " + b.teachers.join(" / ") + " · " + dot(b.from) + " – " + dot(b.to);
      cell.append(el("b", null, b.code));
      if (b.name.replace(/\s/g, "") !== b.code.replace(/\s/g, "")) cell.append(el("span", null, b.name));
      cell.append(el("span", null, b.teachers.join(" / ")));
      put(b.p0, b.p1, cell); next = b.p1 + 1;
    });
    if (next <= LAST) put(next, LAST, el("div", "cell free"));
  });
  box.append(g);

  // day by day (phone)
  const dv = el("div", "dv"), tabs = el("div", "tabs");
  Object.keys(WEEK).forEach(d => {
    const b = el("button", +d === pick ? "on" : "", DAYS[d][0]); b.onclick = () => { pick = +d; renderWeek(); }; tabs.append(b);
  });
  dv.append(tabs);
  blocks(pick).forEach(b => dv.append(row(b, pick === c.dow ? stateOf(b, c) : "", true)));
  box.append(dv);

  // lesson times
  const foot = el("div", "foot"), eb = el("button", "pill", editing ? "Done" : "Edit lesson times");
  eb.onclick = () => { editing = !editing; renderWeek(); };
  if (editing){
    const tb = el("div", "times");
    T.slice(0, LAST).forEach((t, i) => {
      const l = el("label", null, "Period " + (i + 1));
      [0, 1].forEach(k => {
        const inp = el("input"); inp.type = "time"; inp.value = t[k]; inp.setAttribute("aria-label", "Period " + (i + 1) + (k ? " end" : " start"));
        inp.onchange = () => { if (!HM.test(inp.value)) return; const all = times().map(a => a.slice()); all[i][k] = inp.value; D.setSetting("dash.school.times", all); renderToday(); };
        l.append(inp);
      });
      tb.append(l);
    });
    box.append(tb);
    const rs = el("button", "pill", "Reset times"); rs.onclick = () => { D.setSetting("dash.school.times", null); renderAll(); };
    foot.append(eb, rs);
  } else foot.append(eb);
  box.append(foot);
}
function renderAll(){ renderToday(); if (!editing) renderWeek(); D.refreshBrief(); }

// for the assistant: what is on today, and what the next school day looks like
window.School = {
  // one line for the daily brief
  brief(){
    const c = current();
    if (c.isToday){
      const now = c.list.find(b => stateOf(b, c) === "now"), next = c.list.find(b => c.t < b.from);
      if (now) return "Now: " + now.name + " until " + dot(now.to) + (next ? " · then " + next.name : " · last class of the day");
      if (next === c.list[0]) return c.list.length + " classes today · " + next.name + " first at " + dot(next.from);
      return "Break · " + next.name + " at " + dot(next.from);
    }
    const had = blocks(new Date().getDay()).length > 0;
    return (had ? "School is done for today" : "No school today") + " · " + (c.tomorrow ? "tomorrow" : DAYS[c.dow][1]) + " starts with " + c.list[0].name + " at " + dot(c.list[0].from);
  },
  context(){
    const c = current(), brief = b => ({subject:b.name, from:b.from, to:b.to, teachers:b.teachers});
    const out = {class:CLASS, showing:c.isToday ? "today" : DAYS[c.dow][1], classes:c.list.map(brief)};
    if (c.isToday){ const n = c.list.find(b => stateOf(b, c) === "now"); if (n) out.now = n.name; }
    return out;
  },
  day: dow => blocks(dow)
};

if (D){
  renderAll();
  setInterval(renderAll, 30000);
  addEventListener("dash:settings", renderAll);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderAll(); });
}
