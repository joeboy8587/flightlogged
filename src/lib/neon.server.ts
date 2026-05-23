import { neon } from "@neondatabase/serverless";

// HTTP-based Neon driver: stateless and safe across Cloudflare Worker requests.
// We intentionally create a fresh client per call to avoid the
// "Cannot perform I/O on behalf of a different request" Workers error that
// occurs when a connection (or any I/O object) is reused across requests.

export function watchtower() {
  const url = process.env.NEON_WATCHTOWER_URL;
  if (!url) throw new Error("NEON_WATCHTOWER_URL not set");
  return neon(url);
}

export function evidence() {
  const url = process.env.NEON_EVIDENCE_URL;
  if (!url) throw new Error("NEON_EVIDENCE_URL not set");
  return neon(url);
}