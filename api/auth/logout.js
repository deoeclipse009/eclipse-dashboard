// Signs this device out. With {"all": true} it signs out every device.
import { db } from "../_lib/db.js";
import { route, json, body } from "../_lib/http.js";
import { authenticate } from "../_lib/auth.js";

export default route(["POST"], async (req, res) => {
  const a = await authenticate(req);
  if (a) {
    if (body(req).all) await db().execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [a.user.id] });
    else await db().execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [a.sessionId] });
  }
  json(res, 200, { ok: true });
});
