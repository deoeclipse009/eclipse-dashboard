import { db } from "../_lib/db.js";
import { route, json, body, throttled, clientIp } from "../_lib/http.js";
import { checkPassword, createSession, hashPassword } from "../_lib/auth.js";

let dummy; // lets a missing account cost the same time as a wrong password

export default route(["POST"], async (req, res) => {
  const b = body(req);
  const email = String(b.email || "").trim().toLowerCase(), password = String(b.password || "");
  if (!email || !password || password.length > 200) return json(res, 400, { error: "Enter your email and password." });
  if (await throttled("login:" + clientIp(req) + ":" + email, 6, 900)) return json(res, 429, { error: "Too many tries. Wait 15 minutes." });
  const r = await db().execute({ sql: "SELECT id, pass_hash FROM users WHERE email = ?", args: [email] });
  const u = r.rows[0];
  dummy ||= await hashPassword("not-a-real-password");
  const ok = await checkPassword(password, u ? u.pass_hash : dummy);
  if (!u || !ok) return json(res, 401, { error: "Wrong email or password." });
  json(res, 200, { token: await createSession(u.id, req.headers["user-agent"]), user: { email } });
});
