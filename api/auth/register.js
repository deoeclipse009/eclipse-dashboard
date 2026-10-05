// Creating an account needs the invite code (SIGNUP_CODE) so strangers can't use your database.
import { randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "../_lib/db.js";
import { route, json, body, throttled, clientIp } from "../_lib/http.js";
import { hashPassword, createSession } from "../_lib/auth.js";

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

export default route(["POST"], async (req, res) => {
  const code = process.env.SIGNUP_CODE;
  if (!code) return json(res, 403, { error: "Sign-up is switched off. Set SIGNUP_CODE on the server." });
  if (await throttled("register:" + clientIp(req), 5, 3600)) return json(res, 429, { error: "Too many tries. Wait an hour." });
  const b = body(req);
  const email = String(b.email || "").trim().toLowerCase(), password = String(b.password || "");
  if (!same(b.code || "", code)) return json(res, 403, { error: "That invite code isn't right." });
  if (!/^[^@\s]{1,64}@[^@\s]{1,255}$/.test(email)) return json(res, 400, { error: "That email address doesn't look right." });
  if (password.length < 10 || password.length > 200) return json(res, 400, { error: "Use a password of at least 10 characters." });
  const exists = await db().execute({ sql: "SELECT 1 FROM users WHERE email = ?", args: [email] });
  if (exists.rows.length) return json(res, 409, { error: "That email already has an account. Sign in instead." });
  const id = randomUUID();
  await db().execute({ sql: "INSERT INTO users (id, email, pass_hash, created_at) VALUES (?, ?, ?, ?)", args: [id, email, await hashPassword(password), Math.floor(Date.now() / 1000)] });
  json(res, 200, { token: await createSession(id, req.headers["user-agent"]), user: { email } });
});
