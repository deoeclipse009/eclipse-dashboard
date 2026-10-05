import { db } from "../_lib/db.js";
import { route, json } from "../_lib/http.js";
import { requireUser } from "../_lib/auth.js";

export default route(["GET"], async (req, res) => {
  const a = await requireUser(req, res, json); if (!a) return;
  const r = await db().execute({ sql: "SELECT id, device, last_used FROM sessions WHERE user_id = ? ORDER BY last_used DESC", args: [a.user.id] });
  json(res, 200, { user: { email: a.user.email }, devices: r.rows.map(x => ({ id: x.id.slice(0, 8), device: x.device, lastUsed: Number(x.last_used), current: x.id === a.sessionId })) });
});
