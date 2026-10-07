// Per-account preferences (weather city, assistant profile, college prep, ...) and, at the owner's request, the
// connections that would otherwise need setting up on every device: AI provider keys and the Spotify sign-in.
// Only the signed-in owner can read them back.
import { db } from "./_lib/db.js";
import { route, json, body } from "./_lib/http.js";
import { requireUser } from "./_lib/auth.js";

const ALLOWED = ["dash.weather.loc", "dash.voice.speak", "dash.omni.base", "dash.omni.model", "dash.pal.pin", "dash.fold",
  "dash.ai.name", "dash.ai.botname", "dash.ai.about", "dash.ai.provider", "dash.speech.lang", "dash.school.times", "dash.scholar", "dash.task.prio", "dash.college.seeded",
  // connections the owner chose to keep with the account, so one setup covers every device
  "dash.ai.key.gemini", "dash.ai.key.anthropic", "dash.ai.key.openai", "dash.ai.model.gemini", "dash.ai.model.anthropic", "dash.ai.model.openai",
  "dash.omni.key", "dash.spotify.tok", "dash.gcal.on", "dash.gcal.events"];

export default route(["GET", "PUT"], async (req, res) => {
  const a = await requireUser(req, res, json); if (!a) return;
  if (req.method === "GET") {
    const r = await db().execute({ sql: "SELECT key, value FROM settings WHERE user_id = ?", args: [a.user.id] });
    const out = {}; r.rows.forEach(x => { try { out[x.key] = JSON.parse(x.value); } catch {} });
    return json(res, 200, { settings: out });
  }
  const s = body(req).settings || {};
  const stmts = Object.keys(s).filter(k => ALLOWED.includes(k)).map(k => {
    const v = JSON.stringify(s[k] === undefined ? null : s[k]);
    if (v.length > 20000) return null;
    return { sql: "INSERT INTO settings (user_id, key, value) VALUES (?,?,?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value", args: [a.user.id, k, v] };
  }).filter(Boolean);
  if (stmts.length) await db().batch(stmts, "write");
  json(res, 200, { ok: true });
});
