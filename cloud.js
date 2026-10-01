// Accounts (Firebase Auth), task database (Firestore) and Google Calendar.
import { firebaseConfig } from "./firebase-config.js";

const D = window.Dash;
const V = "10.14.1";
const CDN = m => `https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
const configured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const hm = d => String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
const tryStore = {
  get(k){ try{ return JSON.parse(sessionStorage.getItem(k)); }catch(e){ return null; } },
  set(k,v){ try{ sessionStorage.setItem(k,JSON.stringify(v)); }catch(e){} },
  del(k){ try{ sessionStorage.removeItem(k); }catch(e){} }
};
const niceError = err => {
  const c = (err && err.code) || "";
  if (/invalid-credential|wrong-password|user-not-found/.test(c)) return "Wrong email or password.";
  if (c.includes("email-already-in-use")) return "That email already has an account. Try Sign in.";
  if (c.includes("weak-password")) return "Use a password with at least 6 characters.";
  if (c.includes("invalid-email")) return "That email address doesn't look right.";
  if (c.includes("popup-closed") || c.includes("cancelled-popup")) return "Sign-in window closed.";
  if (c.includes("popup-blocked")) return "The browser blocked the sign-in window. Allow pop-ups and retry.";
  if (c.includes("credential-already-in-use")) return "That Google account is already linked to another user.";
  if (c.includes("operation-not-allowed")) return "This sign-in method isn't enabled in the Firebase console yet.";
  if (c.includes("unauthorized-domain")) return "Add this site's domain under Firebase Auth > Settings > Authorized domains.";
  if (c.includes("network")) return "Network problem. Check your connection.";
  return (err && err.message) || "Something went wrong.";
};

if (!configured || !D){
  D && D.setAccount({configured:false});
} else {
  init().catch(err => { console.error(err); D.setAccount({configured:true}); D.setMsg("Couldn't load Firebase: "+niceError(err)); });
}

async function init(){
  const [appM, authM, fsM] = await Promise.all([import(CDN("app")), import(CDN("auth")), import(CDN("firestore"))]);
  const app = appM.initializeApp(firebaseConfig);
  const auth = authM.getAuth(app);
  let db;
  try {
    db = fsM.initializeFirestore(app, {localCache: fsM.persistentLocalCache({tabManager: fsM.persistentMultipleTabManager()})});
  } catch(e){ db = fsM.getFirestore(app); }

  D.setAccount({configured:true});

  /* ----- tasks <-> Firestore: users/{uid}/tasks/{taskId} ----- */
  let uid = null, unsub = null, remote = new Map(), wasSignedIn = false;
  const sig = t => JSON.stringify([t.text, !!t.done, t.scope, t.due || null, t.time || null, t.repeat || null, !!t.spawned]);
  const data = t => ({text:t.text, done:!!t.done, scope:t.scope, due:t.due || null, time:t.time || null, repeat:t.repeat || null, spawned:!!t.spawned});
  const col = () => fsM.collection(db, "users", uid, "tasks");

  async function push(tasks){
    if (!uid) return;
    try {
      const batch = fsM.writeBatch(db), ids = new Set();
      tasks.forEach(t => {
        ids.add(t.id);
        if (remote.get(t.id) !== sig(t)) batch.set(fsM.doc(col(), t.id), data(t));
      });
      remote.forEach((_, id) => { if (!ids.has(id)) batch.delete(fsM.doc(col(), id)); });
      await batch.commit();
    } catch(e){ console.error(e); D.setMsg("Couldn't save to the database: "+niceError(e)); }
  }

  authM.onAuthStateChanged(auth, user => {
    if (unsub){ unsub(); unsub = null; }
    remote = new Map();
    if (!user){
      uid = null; D.onSave(null);
      D.setAccount({user:null, calendar:"off"}); D.setEvents([]);
      if (wasSignedIn){ wasSignedIn = false; D.setTasks([]); }   // don't leave one person's tasks on a shared screen
      return;
    }
    wasSignedIn = true; uid = user.uid;
    D.setAccount({user:{email:user.email, name:user.displayName}});
    let first = true;
    unsub = fsM.onSnapshot(col(), snap => {
      const arr = [];
      remote = new Map();
      snap.forEach(d => { const t = {id:d.id, ...d.data()}; remote.set(d.id, sig(t)); arr.push(t); });
      if (first){
        if (snap.metadata.fromCache && !arr.length) return;      // wait for the server before deciding it's empty
        first = false;
        if (!arr.length){ push(D.getTasks()); return; }           // brand-new account: upload what's on this device
      }
      D.setTasks(arr);
    }, err => { console.error(err); D.setMsg("Database error: "+niceError(err)); });
    D.onSave(push);
    resumeCalendar();
  });

  /* ----- Google Calendar (read-only) ----- */
  const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
  let calTimer = null;
  const token = () => { const t = tryStore.get("dash.gcal.token"); return t && t.exp > Date.now() ? t.v : null; };

  function resumeCalendar(){
    if (token()) startCalendar();
    else D.setAccount({calendar: localStorage.getItem("dash.gcal.on") ? "expired" : "off"});
  }
  function startCalendar(){
    D.setAccount({calendar:"on"});
    loadEvents();
    clearInterval(calTimer); calTimer = setInterval(loadEvents, 10*60*1000);
  }
  function stopCalendar(state){
    clearInterval(calTimer); calTimer = null;
    D.setAccount({calendar:state});
  }
  async function loadEvents(){
    const tk = token();
    if (!tk){ stopCalendar("expired"); return; }
    const max = new Date(Date.now() + 45*864e5);
    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=100"
      + "&timeMin=" + encodeURIComponent(new Date().toISOString()) + "&timeMax=" + encodeURIComponent(max.toISOString());
    try {
      const r = await fetch(url, {headers:{Authorization:"Bearer "+tk}});
      if (r.status === 401 || r.status === 403){
        tryStore.del("dash.gcal.token"); stopCalendar("expired");
        if (r.status === 403) D.setMsg("Google Calendar API isn't enabled for this Firebase project yet (see SETUP.md).");
        return;
      }
      const j = await r.json();
      D.setEvents((j.items || []).filter(e => e.status !== "cancelled" && e.start).map(e => {
        const allDay = !e.start.dateTime, start = allDay ? null : new Date(e.start.dateTime);
        return {id:e.id, text:e.summary || "(No title)", due: allDay ? e.start.date : iso(start), time: allDay ? null : hm(start)};
      }));
    } catch(e){ console.error(e); }
  }
  async function connectCalendar(){
    const gp = new authM.GoogleAuthProvider();
    gp.addScope(CAL_SCOPE);
    const u = auth.currentUser;
    const hasGoogle = u && u.providerData.some(p => p.providerId === "google.com");
    const res = (u && !hasGoogle) ? await authM.linkWithPopup(u, gp) : await authM.signInWithPopup(auth, gp);
    const cred = authM.GoogleAuthProvider.credentialFromResult(res);
    if (!cred || !cred.accessToken) throw new Error("Google didn't return calendar access.");
    tryStore.set("dash.gcal.token", {v:cred.accessToken, exp:Date.now() + 55*60*1000});
    try { localStorage.setItem("dash.gcal.on", "1"); } catch(e){}
    startCalendar();
  }

  /* ----- buttons in the account panel ----- */
  addEventListener("dash:action", async e => {
    const {type, email, password} = e.detail;
    try {
      D.setMsg("");
      if (type === "signin"){
        if (!email || !password) return D.setMsg("Enter your email and password.");
        await authM.signInWithEmailAndPassword(auth, email, password);
      } else if (type === "signup"){
        if (!email || !password) return D.setMsg("Enter an email and a password.");
        await authM.createUserWithEmailAndPassword(auth, email, password);
      } else if (type === "google"){
        await authM.signInWithPopup(auth, new authM.GoogleAuthProvider());
      } else if (type === "signout"){
        tryStore.del("dash.gcal.token"); try { localStorage.removeItem("dash.gcal.on"); } catch(e){}
        await authM.signOut(auth);
      } else if (type === "calendar"){
        await connectCalendar();
      } else if (type === "calendar-refresh"){
        await loadEvents();
      }
    } catch(err){ console.error(err); D.setMsg(niceError(err)); }
  });
}
