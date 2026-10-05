// Google Calendar connector (read-only) using Google Identity Services in the browser.
import { googleClientId } from "./config.js";

const D = window.Dash;
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const hm = d => String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
const flag = { get(){ try { return localStorage.getItem("dash.gcal.on"); } catch(e){ return null; } }, set(){ try { localStorage.setItem("dash.gcal.on","1"); } catch(e){} }, del(){ try { localStorage.removeItem("dash.gcal.on"); } catch(e){} } };

let client = null, token = null, exp = 0, pollTimer = null, refreshTimer = null;

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
      token = resp.access_token; exp = Date.now() + (resp.expires_in - 180) * 1000; flag.set();
      D.setAccount({calendar:"on"}); loadEvents();
      clearInterval(pollTimer); pollTimer = setInterval(loadEvents, 10*60*1000);
      clearTimeout(refreshTimer); refreshTimer = setTimeout(() => request(""), Math.max(60000, exp - Date.now()));   // renew before it lapses
    },
    error_callback: () => { D.setAccount({calendar: flag.get() ? "expired" : "off"}); }
  });
}
async function request(prompt){
  try { await ensureClient(); client.requestAccessToken({prompt}); }
  catch(e){ D.setMsg(e.message || "Couldn't start Google sign-in."); }
}

async function loadEvents(){
  if (!token || Date.now() > exp + 120000){ D.setAccount({calendar:"expired"}); return; }
  const max = new Date(Date.now() + 45*864e5);
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=100"
    + "&timeMin=" + encodeURIComponent(new Date().toISOString()) + "&timeMax=" + encodeURIComponent(max.toISOString());
  try {
    const r = await fetch(url, {headers:{Authorization:"Bearer " + token}});
    if (r.status === 401){ token = null; D.setAccount({calendar:"expired"}); return; }
    if (r.status === 403){ D.setMsg("Turn on the Google Calendar API for your Google Cloud project (see SETUP.md)."); return; }
    const j = await r.json();
    D.setEvents((j.items || []).filter(e => e.status !== "cancelled" && e.start).map(e => {
      const allDay = !e.start.dateTime, start = allDay ? null : new Date(e.start.dateTime);
      return {id:e.id, text:e.summary || "(No title)", due: allDay ? e.start.date : iso(start), time: allDay ? null : hm(start)};
    }));
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
        token = null; clearInterval(pollTimer); clearTimeout(refreshTimer); flag.del(); D.setEvents([]);
      }
    });
    if (flag.get()) setTimeout(() => request(""), 1500);   // quietly renew on load; if the browser blocks it the panel shows Reconnect
  }
}
