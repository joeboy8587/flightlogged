import { neon } from "@neondatabase/serverless";

// HTTP-based Neon driver: stateless and safe across Cloudflare Worker requests.
// We intentionally create a fresh client per call to avoid the
// "Cannot perform I/O on behalf of a different request" Workers error that
// occurs when a connection (or any I/O object) is reused across requests.

// In development, a missing or unreachable Neon URL can cause a low-level
// "TypeError: fetch failed" that surfaces as a 500. To make failures clearer
// and to allow the app to run without an active Neon connection during
// local dev, this module will return a lightweight stubbed tag function when
// the environment variable is not present. In production we still throw so
// the problem is noticed.

function makeStub(name: string) {
  const fn = async (_strings: TemplateStringsArray, ..._params: any[]) => {
    console.warn(`watchtower stub used for ${name}: NEON URL not set; returning empty result set`);
    return [] as any[];
  };
  return fn as unknown as ((strings: TemplateStringsArray, ...params: any[]) => Promise<any[]>);
}

export function watchtower() {
  const url = process.env.NEON_WATCHTOWER_URL;
  if (!url) {
    // In development, prefer a soft failure that returns empty results so pages can render.
    if (process.env.NODE_ENV !== "production") return makeStub("watchtower");
    throw new Error("NEON_WATCHTOWER_URL not set");
  }
  try {
    return neon(url);
  } catch (err) {
    // Re-throw with extra context to make debugging easier.
    throw new Error(`Failed to create Neon client for watchtower (${String(url)}): ${String(err)}`);
  }
}

export function evidence() {
  // DEPRECATED. The legacy "lucky-wildflower" evidence DB has been retired.
  // Every site page must read from the unbiased "quiet-math" watchtower DB.
  // Any leftover caller is silently redirected so it cannot leak biased data.
  // To find leaks, grep for evidence() and migrate to watchtower().
  console.warn("evidence() is deprecated — redirecting to watchtower() (quiet-math).");
  return watchtower();
}
