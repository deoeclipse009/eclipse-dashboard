// Small helpers shared by every endpoint: CORS, JSON, rate limiting.
import { db, ready_ } from "./db.js";

const origins = () => (process.env.ALLOWED_ORIGINS || "https://deoeclipse009.github.io,https://eclipse-deo-dashboard.vercel.app,http://localhost:8765,http://localhost:3000")
  .split(",").map(s => s.trim()).filter(Boolean);

export function cors(req, res) {
  const o = req.headers.origin;
  res.setHeader("Vary", "Origin");
  let allowed = false;
  if (o) {
    try {
      const u = new URL(o);
      allowed = origins().includes(o) || u.hostname.endsWith(".vercel.app");
    } catch {}
  }
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", o);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  res.setHeader("Cache-Control", "no-store");
}

export const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };

// Wraps an endpoint: CORS + preflight, method check, schema ready, error catching.
export function route(methods, fn) {
  return async (req, res) => {
    cors(req, res);
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    if (!methods.includes(req.method)) return json(res, 405, { error: "Method not allowed" });
    try { await ready_(); await fn(req, res); }
    catch (e) { console.error(e); json(res, 500, { error: "Server error" }); }
  };
}

export const clientIp = req => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();

// true when the caller is over the limit
export async function throttled(key, max, windowSec) {
  const now = Math.floor(Date.now() / 1000), c = db();
  const r = await c.execute({ sql: "SELECT count, window_start FROM throttles WHERE key = ?", args: [key] });
  const row = r.rows[0];
  if (!row || now - Number(row.window_start) > windowSec) {
    await c.execute({ sql: "INSERT INTO throttles (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = ?", args: [key, now, now] });
    return false;
  }
  if (Number(row.count) >= max) return true;
  await c.execute({ sql: "UPDATE throttles SET count = count + 1 WHERE key = ?", args: [key] });
  return false;
}

export function body(req) {
  const b = req.body;
  if (b && typeof b === "object") return b;
  try { return JSON.parse(b || "{}"); } catch { return {}; }
}
