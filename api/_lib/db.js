// Turso (libSQL) connection and schema. On Vercel the Turso integration sets
// TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. Locally it falls back to a file.
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";

let client, ready;

export function db() {
  if (!client) {
    let url = process.env.TURSO_DATABASE_URL;
    if (!url) { mkdirSync(".data", { recursive: true }); url = "file:.data/dev.db"; }
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     id TEXT PRIMARY KEY, user_id TEXT NOT NULL, device TEXT NOT NULL,
     created_at INTEGER NOT NULL, last_used INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS tasks (
     user_id TEXT NOT NULL, id TEXT NOT NULL, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
     scope TEXT NOT NULL, due TEXT, time TEXT, repeat TEXT, spawned INTEGER NOT NULL DEFAULT 0,
     updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, id))`,
  `CREATE TABLE IF NOT EXISTS settings (
     user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (user_id, key))`,
  `CREATE TABLE IF NOT EXISTS throttles (
     key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start INTEGER NOT NULL)`
];

// Creates the tables the first time any request arrives (cheap and idempotent).
export function ready_() {
  if (!ready) ready = db().batch(SCHEMA, "write").catch(e => { ready = null; throw e; });
  return ready;
}
