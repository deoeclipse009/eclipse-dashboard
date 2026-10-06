// Per-account preferences (weather city, assistant profile, scholarship tracker, ...). Never put secrets here: API keys stay on the device.
import { db } from "./_lib/db.js";
import { route, json, body } from "./_lib/http.js";
import { requireUser } from "./_lib/auth.js";

const ALLOWED = ["dash.weather.loc", "dash.voice.speak", "dash.omni.base", "dash.omni.model", "dash.pal.pin", "dash.fold",
  "dash.ai.name", "dash.ai.botname", "dash.ai.about", "dash.ai.provider", "dash.speech.lang", "dash.school.times", "dash.scholar", "dash.task.prio", "dash.college.seeded"];

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
