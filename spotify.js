// Shows the song playing on the user's Spotify account, with album art.
// Uses Authorization Code + PKCE, so no client secret is needed in the browser.
import { spotifyClientId } from "./firebase-config.js";

const D = window.Dash;
const ID = (spotifyClientId || "").trim();
const REDIRECT = location.origin + location.pathname;
const SCOPE = "user-read-currently-playing user-read-playback-state user-modify-playback-state";
const K = {tok:"dash.spotify.tok", ver:"dash.spotify.verifier", st:"dash.spotify.state"};
const ls = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
let timer = null, lastPlaying = false, msgTimer = null;
const hasControls = () => ((ls.get(K.tok) || {}).scope || "").includes("user-modify-playback-state");

if (D){
  if (!ID) D.setSpotify({configured:false, connected:false});
  else boot();
}

async function boot(){
  D.setSpotify({configured:true, connected:!!ls.get(K.tok), controls:hasControls()});
  const q = new URLSearchParams(location.search);
  if (q.get("code") && q.get("state") && q.get("state") === ls.get(K.st)){
    try { await exchange({grant_type:"authorization_code", code:q.get("code"), redirect_uri:REDIRECT, code_verifier:ls.get(K.ver)}); }
    catch(e){ console.error(e); D.setMsg("Spotify sign-in failed."); }
    history.replaceState(null, "", location.pathname);
    ls.del(K.ver); ls.del(K.st);
  } else if (q.get("error") && q.get("state") === ls.get(K.st)){
    history.replaceState(null, "", location.pathname);
  }
  if (ls.get(K.tok)){ D.setSpotify({connected:true, controls:hasControls()}); poll(); }

  addEventListener("dash:action", e => {
    if (e.detail.type === "spotify-connect") connect();
    if (e.detail.type === "spotify-cmd") control(e.detail.cmd);
    if (e.detail.type === "spotify-disconnect"){
      ls.del(K.tok); clearTimeout(timer); D.setNowPlaying(null); D.setSpotify({connected:false});
    }
  });
}

async function connect(){
  const verifier = b64(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const state = b64(crypto.getRandomValues(new Uint8Array(12)));
  ls.set(K.ver, verifier); ls.set(K.st, state);
  location.href = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
    client_id:ID, response_type:"code", redirect_uri:REDIRECT, scope:SCOPE, state,
    code_challenge_method:"S256", code_challenge:challenge
  });
}

async function exchange(params){
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:ID, ...params})
  });
  if (!r.ok) throw new Error("token "+r.status);
  const j = await r.json(), old = ls.get(K.tok) || {};
  ls.set(K.tok, {access:j.access_token, refresh:j.refresh_token || old.refresh, scope:j.scope || old.scope || "", exp:Date.now() + (j.expires_in-60)*1000});
}

async function accessToken(){
  const t = ls.get(K.tok); if (!t) return null;
  if (t.exp > Date.now()) return t.access;
  try { await exchange({grant_type:"refresh_token", refresh_token:t.refresh}); return ls.get(K.tok).access; }
  catch(e){ ls.del(K.tok); D.setSpotify({connected:false}); D.setNowPlaying(null); return null; }
}

async function poll(){
  clearTimeout(timer);
  let wait = 5000;
  try {
    const tk = await accessToken();
    if (!tk) return;
    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode", {headers:{Authorization:"Bearer "+tk}});
    if (r.status === 200){
      const j = await r.json(), it = j.item;
      if (it){
        const isEp = it.type === "episode";
        const imgs = (isEp ? (it.images || (it.show && it.show.images)) : it.album && it.album.images) || [];
        lastPlaying = !!j.is_playing;
        D.setNowPlaying({
          id:it.id, title:it.name, playing:!!j.is_playing,
          artist: isEp ? (it.show ? it.show.name : "Podcast") : it.artists.map(a=>a.name).join(", "),
          art: (imgs[1] || imgs[0] || {}).url || "", url:(it.external_urls || {}).spotify || "",
          progress:j.progress_ms || 0, duration:it.duration_ms || 1, ts:Date.now()
        });
      } else { lastPlaying = false; D.setNowPlaying(null); }
    } else if (r.status === 204){ lastPlaying = false; D.setNowPlaying(null); }
    else if (r.status === 401) ls.set(K.tok, {...ls.get(K.tok), exp:0});
    else if (r.status === 429) wait = (parseInt(r.headers.get("Retry-After"),10) || 10) * 1000;
  } catch(e){ wait = 15000; }
  timer = setTimeout(poll, wait);
}

function flash(msg){
  D.setSpotify({msg}); clearTimeout(msgTimer);
  msgTimer = setTimeout(() => D.setSpotify({msg:""}), 6000);
}

// play / pause / next / previous (needs Spotify Premium and the playback-control permission)
async function control(cmd){
  if (!["play","pause","toggle","next","previous"].includes(cmd)) return;
  if (!hasControls()){ flash("Reconnect Spotify to allow playback controls."); return; }
  const tk = await accessToken(); if (!tk) return;
  let method = "POST", path = cmd;
  if (cmd === "play" || cmd === "pause" || cmd === "toggle"){
    method = "PUT"; path = cmd === "toggle" ? (lastPlaying ? "pause" : "play") : cmd;
  }
  try {
    const r = await fetch("https://api.spotify.com/v1/me/player/" + path, {method, headers:{Authorization:"Bearer " + tk}});
    if (r.status === 403) flash("Spotify Premium is needed for playback controls.");
    else if (r.status === 404) flash("No active Spotify device. Open Spotify and press play once.");
    else if (r.status === 401) flash("Spotify sign-in expired. Try again.");
    else if (r.status >= 400) flash("Spotify said no (" + r.status + ").");
    else setTimeout(poll, 600);
  } catch(e){ flash("Couldn't reach Spotify."); }
}
