// GET: every task of the signed-in user.
// POST: {upserts:[task...], deletes:[id...]} applied in one transaction.
import { db } from "../_lib/db.js";
import { route, json, body } from "../_lib/http.js";
import { requireUser } from "../_lib/auth.js";

const SCOPES = ["today", "week", "month"], REPEATS = ["daily", "weekly", "monthly"];
const toTask = r => ({ id: r.id, text: r.text, done: !!r.done, scope: r.scope, due: r.due, time: r.time, repeat: r.repeat, spawned: !!r.spawned });

function clean(t) {
  if (!t || typeof t !== "object") return null;
  const id = String(t.id || ""), text = String(t.text || "").trim();
  if (!/^[a-z0-9]{1,40}$/i.test(id) || !text || text.length > 500) return null;
  return {
    id, text, done: t.done ? 1 : 0, spawned: t.spawned ? 1 : 0,
    scope: SCOPES.includes(t.scope) ? t.scope : "today",
    due: /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : null,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) ? t.time : null,
    repeat: REPEATS.includes(t.repeat) ? t.repeat : null
  };
}

export default route(["GET", "POST"], async (req, res) => {
  const a = await requireUser(req, res, json); if (!a) return;
  const uid = a.user.id;
  if (req.method === "GET") {
    const r = await db().execute({ sql: "SELECT * FROM tasks WHERE user_id = ?", args: [uid] });
    return json(res, 200, { tasks: r.rows.map(toTask) });
  }
  const b = body(req);
  const ups = (Array.isArray(b.upserts) ? b.upserts : []).slice(0, 500).map(clean).filter(Boolean);
  const dels = (Array.isArray(b.deletes) ? b.deletes : []).slice(0, 500).map(String).filter(id => /^[a-z0-9]{1,40}$/i.test(id));
  const t = Date.now();
  const stmts = [
    ...ups.map(x => ({
      sql: `INSERT INTO tasks (user_id, id, text, done, scope, due, time, repeat, spawned, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(user_id, id) DO UPDATE SET text=excluded.text, done=excluded.done, scope=excluded.scope, due=excluded.due,
            time=excluded.time, repeat=excluded.repeat, spawned=excluded.spawned, updated_at=excluded.updated_at`,
      args: [uid, x.id, x.text, x.done, x.scope, x.due, x.time, x.repeat, x.spawned, t]
    })),
    ...dels.map(id => ({ sql: "DELETE FROM tasks WHERE user_id = ? AND id = ?", args: [uid, id] }))
  ];
  if (stmts.length) await db().batch(stmts, "write");
  json(res, 200, { ok: true, upserted: ups.length, deleted: dels.length });
});
