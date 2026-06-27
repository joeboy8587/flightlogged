/**
 * Render a percentage value that may arrive either as a 0..1 share
 * or as an already-scaled 0..100 percent (the DB stores `night_pct`
 * as 0..100, but some derived stats compute fresh 0..1 shares).
 *
 * Rule: if |value| <= 1.0, assume share and multiply by 100.
 * Otherwise treat as already a percent. Clamp to [0, 100].
 */
export function fmtPct(value: number | null | undefined, opts?: { decimals?: number; dash?: string }): string {
  const dash = opts?.dash ?? "—";
  if (value == null || Number.isNaN(value)) return dash;
  const scaled = Math.abs(value) <= 1 ? value * 100 : value;
  const clamped = Math.max(0, Math.min(100, scaled));
  const d = opts?.decimals ?? 0;
  return `${clamped.toFixed(d)}%`;
}

/** Numeric percent (0..100) using the same normalization rule as fmtPct. */
export function toPct(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const scaled = Math.abs(value) <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, scaled));
}

/**
 * Shared clock formatter. All UI surfaces that show a captured-at,
 * detected-at, or last-seen timestamp should route through this helper so
 * the same value reads the same way across every page.
 */
export function fmtClock(value: string | number | Date | null | undefined, dash = "—"): string {
  if (value == null) return dash;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return dash;
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Date-only renderer (no time component). YYYY-MM-DD for table cells. */
export function fmtDate(value: string | number | Date | null | undefined, dash = "—"): string {
  if (value == null) return dash;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return dash;
  return d.toISOString().slice(0, 10);
}

/**
 * Collapse the many ways the database stores county names ("KERN",
 * "Kern County", "kern", "Kern, CA") into a single Title Case label so
 * the same county doesn't appear three times in the same list.
 */
export function normalizeCountyName(raw: string | null | undefined): string {
  if (!raw) return "—";
  const s = String(raw).trim().toLowerCase().replace(/,\s*[a-z]{2}\s*$/, "").replace(/\s+county\s*$/, "").trim();
  if (!s) return "—";
  return s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}