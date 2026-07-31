/** Pure helpers shared by routes and server functions (no server imports). */

export const COUNTY_SLUGS = [
  "kern", "tulare", "kings", "fresno", "san-bernardino", "los-angeles",
  "ventura", "santa-barbara", "madera", "merced", "san-luis-obispo", "inyo",
] as const;

export function slugToCounty(slug: string): string {
  return slug.replace(/-/g, " ").toUpperCase();
}

export function countyToSlug(county: string): string {
  return county.trim().toLowerCase().replace(/\s+/g, "-");
}

export type Severity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "INFO";

/** Severity in sentinel_violations arrives either as a label or a 0-100 score. */
export function normalizeSeverity(raw: string | number | null | undefined): Severity {
  if (raw == null) return "INFO";
  const s = String(raw).trim().toUpperCase();
  const n = Number(s);
  if (!Number.isNaN(n) && s !== "") {
    if (n >= 95) return "CRITICAL";
    if (n >= 85) return "HIGH";
    if (n >= 70) return "MODERATE";
    return "LOW";
  }
  if (s.startsWith("CATASTROPH") || s.startsWith("CRIT")) return "CRITICAL";
  if (s.startsWith("HIGH")) return "HIGH";
  if (s.startsWith("MOD") || s.startsWith("MED")) return "MODERATE";
  if (s.startsWith("LOW")) return "LOW";
  return "INFO";
}