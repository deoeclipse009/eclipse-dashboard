// Google Calendar connector (read-only) using Google Identity Services in the browser.
import { googleClientId } from "./config.js";

const D = window.Dash;
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const hm = d => String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
// "connected" and the last list of events are kept with the account, so a device that can't open Google's sign-in
// (or hasn't yet) still shows the calendar that another device fetched
const flag = { get: () => D.getSetting("dash.gcal.on", null), set: () => D.setSetting("dash.gcal.on", 1), del: () => D.setSetting("dash.gcal.on", null) };
const today = () => iso(new Date());
function showShared(){
  if (token) return;
  const c = D.getSetting("dash.gcal.events", null);
  if (c && Array.isArray(c.list)) D.setEvents(c.list.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.due) && e.due >= today()));
}
function share(list){
  let out = list.slice(0, 80).map(e => ({id:String(e.id).slice(0, 40), text:String(e.text).slice(0, 80), due:e.due, time:e.time}));
  while (out.length && JSON.stringify(out).length > 18000) out = out.slice(0, out.length - 10);
  D.setSetting("dash.gcal.events", {at:Date.now(), list:out});
}

let client = null, token = null, exp = 0, pollTimer = null;
// Google's sign-in for browsers lasts about an hour. It is remembered on this device for that hour, so reloading the
// page does not ask again. Google's window only ever opens when the Connect / Refresh button is pressed.
const TOK = "dash.gcal.tok";
const remember = () => { try { localStorage.setItem(TOK, JSON.stringify({t:token, exp})); } catch(e){} };
const forget = () => { token = null; try { localStorage.removeItem(TOK); } catch(e){} };
function recall(){
  try { const v = JSON.parse(localStorage.getItem(TOK)); if (v && v.t && Date.now() < v.exp){ token = v.t; exp = v.exp; return true; } } catch(e){}
  forget(); return false;
}
function startPolling(){ clearInterval(pollTimer); pollTimer = setInterval(loadEvents, 10*60*1000); }

function loadGis(){
  return new Promise((ok, fail) => {
    if (window.google && google.accounts && google.accounts.oauth2) return ok();
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = ok; s.onerror = () => fail(new Error("Couldn't load Google sign-in.")); document.head.append(s);
  });
}
async function ensureClient(){
  await loadGis();
  client ||= google.accounts.oauth2.initTokenClient({
    client_id: googleClientId, scope: SCOPE,
    callback: resp => {
      if (resp.error){ D.setAccount({calendar:"expired"}); D.setMsg("Google Calendar wasn't connected."); return; }
      token = resp.access_token; exp = Date.now() + (resp.expires_in - 180) * 1000; flag.set(); remember();
      D.setAccount({calendar:"on"}); loadEvents(); startPolling();
    },
    error_callback: () => { D.setAccount({calendar: flag.get() ? "expired" : "off"}); }
  });
}
async function request(prompt){
  try { await ensureClient(); client.requestAccessToken({prompt}); }
  catch(e){ D.setMsg(e.message || "Couldn't start Google sign-in."); }
}

async function loadEvents(){
  if (!token || Date.now() > exp){ forget(); clearInterval(pollTimer); D.setAccount({calendar:"expired"}); showShared(); return; }
  const max = new Date(Date.now() + 45*864e5);
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=100"
    + "&timeMin=" + encodeURIComponent(new Date().toISOString()) + "&timeMax=" + encodeURIComponent(max.toISOString());
  try {
    const r = await fetch(url, {headers:{Authorization:"Bearer " + token}});
    if (r.status === 401){ forget(); clearInterval(pollTimer); D.setAccount({calendar:"expired"}); showShared(); return; }
    if (r.status === 403){ D.setMsg("Turn on the Google Calendar API for your Google Cloud project (see SETUP.md)."); return; }
    const j = await r.json();
    const list = (j.items || []).filter(e => e.status !== "cancelled" && e.start).map(e => {
      const allDay = !e.start.dateTime, start = allDay ? null : new Date(e.start.dateTime);
      return {id:e.id, text:e.summary || "(No title)", due: allDay ? e.start.date : iso(start), time: allDay ? null : hm(start)};
    });
    D.setEvents(list); share(list);
  } catch(e){ console.error(e); }
}

if (D){
  if (!googleClientId) D.setAccount({calendarConfigured:false});
  else {
    D.setAccount({calendarConfigured:true, calendar: flag.get() ? "expired" : "off"});
    addEventListener("dash:action", e => {
      const t = e.detail.type;
      if (t === "calendar") request(flag.get() ? "" : "consent");
      else if (t === "calendar-refresh") loadEvents();
      else if (t === "signout" || t === "signout-all"){
        // signing out of this device only: forget the calendar here, leave the account's copy alone
        forget(); clearInterval(pollTimer); D.setEvents([]);
        try { localStorage.removeItem("dash.gcal.on"); localStorage.removeItem("dash.gcal.events"); } catch(e2){}
      }
    });
    showShared();
    addEventListener("dash:settings", () => { showShared(); if (!token) D.setAccount({calendar: flag.get() ? "expired" : "off"}); });
    if (recall()){ D.setAccount({calendar:"on"}); loadEvents(); startPolling(); }   // still inside the hour: carry on, no sign-in window
  }
}
