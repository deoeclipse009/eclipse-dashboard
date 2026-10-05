// Passwords (scrypt) and long-lived device sessions. The browser holds a random token;
// only its SHA-256 is stored, so a leaked database can't be used to sign in.
import { scrypt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db.js";

const scryptAsync = promisify(scrypt);
export const SESSION_DAYS = 90;
const DAY = 86400;

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return ["scrypt", 16384, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function checkPassword(pw, stored) {
  const [alg, n, salt, hash] = String(stored).split("$");
  if (alg !== "scrypt") return false;
  const key = await scryptAsync(pw, Buffer.from(salt, "base64"), 64, { N: +n, r: 8, p: 1 });
  const want = Buffer.from(hash, "base64");
  return want.length === key.length && timingSafeEqual(want, key);
}

const sha = t => createHash("sha256").update(t).digest("hex");
const now = () => Math.floor(Date.now() / 1000);

export async function createSession(userId, userAgent) {
  const token = randomBytes(32).toString("base64url");
  const t = now();
  await db().execute({
    sql: "INSERT INTO sessions (id, user_id, device, created_at, last_used, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [sha(token), userId, deviceName(userAgent), t, t, t + SESSION_DAYS * DAY]
  });
  return token;
}

function deviceName(ua = "") {
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "Mac" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return (os + " " + br).slice(0, 40);
}

// Returns {user, sessionId} or null. Slides the expiry forward while the device is in use.
export async function authenticate(req) {
  const m = /^Bearer\s+(\S{20,200})$/.exec(req.headers.authorization || "");
  if (!m) return null;
  const id = sha(m[1]), t = now();
  const r = await db().execute({
    sql: `SELECT s.id AS sid, s.expires_at AS exp, u.id AS uid, u.email AS email
          FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`, args: [id]
  });
  const row = r.rows[0];
  if (!row || Number(row.exp) < t) return null;
  if (Number(row.exp) - t < (SESSION_DAYS - 7) * DAY)
    await db().execute({ sql: "UPDATE sessions SET last_used = ?, expires_at = ? WHERE id = ?", args: [t, t + SESSION_DAYS * DAY, id] });
  return { user: { id: row.uid, email: row.email }, sessionId: id };
}

export async function requireUser(req, res, json) {
  const a = await authenticate(req);
  if (!a) { json(res, 401, { error: "Not signed in" }); return null; }
  return a;
}
