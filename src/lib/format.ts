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