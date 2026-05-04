// Shared utilities for API test scripts
import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const OUTPUT_DIR = join(__dirname, "output");
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

export const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

export function log(label, msg) {
  console.log(`${colors.blue}[${label}]${colors.reset} ${msg}`);
}
export function ok(label, msg) {
  console.log(`${colors.green}✓ [${label}]${colors.reset} ${msg}`);
}
export function fail(label, err) {
  console.log(`${colors.red}✗ [${label}]${colors.reset} ${err?.message || err}`);
  if (err?.stack && process.env.DEBUG) console.log(colors.gray + err.stack + colors.reset);
}
export function warn(label, msg) {
  console.log(`${colors.yellow}⚠ [${label}]${colors.reset} ${msg}`);
}

export function require_env(...keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

export function saveOutput(filename, data) {
  const path = join(OUTPUT_DIR, filename);
  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    writeFileSync(path, data);
  } else {
    writeFileSync(path, typeof data === "string" ? data : JSON.stringify(data, null, 2));
  }
  return path;
}

export async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}: ${typeof body === "string" ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}
