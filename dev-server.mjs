// Local test server: serves the static site and runs the /api functions against a local database file.
// Usage: SIGNUP_CODE=something node dev-server.mjs   (http://localhost:8765)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = process.env.PORT || 8765, TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) {
    const file = join(process.cwd(), url.pathname.replace(/\/$/, "") + (url.pathname.endsWith(".js") ? "" : ".js"));
    let target = file;
    try { await readFile(target); } catch { target = file.replace(/\.js$/, "/index.js"); }
    try {
      const chunks = []; for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      req.body = raw && /json/.test(req.headers["content-type"] || "") ? JSON.parse(raw) : raw;
      const mod = await import(pathToFileURL(target).href);
      return await mod.default(req, res);
    } catch (e) { console.error(e); res.statusCode = 404; return res.end("not found"); }
  }
  const rel = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
  if (rel.startsWith("/api") || /node_modules|\.data|\.git/.test(rel)) { res.statusCode = 404; return res.end(); }
  try { const data = await readFile(join(process.cwd(), rel)); res.setHeader("Content-Type", TYPES[extname(rel)] || "application/octet-stream"); res.end(data); }
  catch { res.statusCode = 404; res.end("not found"); }
}).listen(PORT, () => console.log("http://localhost:" + PORT));
