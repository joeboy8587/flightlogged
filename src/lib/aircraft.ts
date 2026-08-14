/**
 * Pure helpers for the per-aircraft dossier. No server imports — safe to
 * import from routes and from *.functions.ts modules alike.
 */

export type TailForms = { raw: string; nform: string; nless: string };

/** Normalize any user-supplied tail / hex into the three lookup forms. */
export function tailForms(input: string): TailForms {
  const raw = String(input ?? "").trim().toUpperCase().slice(0, 20).replace(/[^A-Z0-9-]/g, "");
  const nless = raw.startsWith("N") ? raw.slice(1) : raw;
  const nform = raw.startsWith("N") ? raw : `N${raw}`;
  return { raw, nform, nless };
}

/** Plain-English label for each machine rule code. */
export function ruleLabel(code: string | null | undefined): string {
  const c = String(code ?? "").toUpperCase();
  if (c.includes("137")) return "Agricultural operation (authorized low flight)";
  if (c.includes("NIGHT") && c.includes("LOW")) return "Low pass over homes at night";
  if (c.includes("NIGHT")) return "Night operations over residential area";
  if (c.includes("CONGESTED")) return "Below 1,000 ft over a congested area";
  if (c.includes("POPULATED")) return "Below 500 ft over a populated area";
  if (c.includes("119")) return "Minimum safe altitude (14 CFR 91.119)";
  if (c.includes("SPOOF") || c.includes("MASKED")) return "Identity or altitude masking";
  if (c.includes("COORD")) return "Multi-aircraft coordination pattern";
  return code ? code.replace(/_/g, " ").toLowerCase() : "Unclassified";
}

/** Statute cite for a rule code, when the machine did not supply one. */
export function ruleStatute(code: string | null | undefined): string {
  const c = String(code ?? "").toUpperCase();
  if (c.includes("137.51")) return "14 CFR 137.51";
  if (c.includes("137")) return "14 CFR 137.53";
  if (c.includes("119_C") || c.includes("POPULATED")) return "14 CFR 91.119(c)";
  if (c.includes("119") || c.includes("CONGESTED")) return "14 CFR 91.119(b)";
  return "14 CFR 91.119";
}

/** Human label for the deep-profile feature keys the ML box emits. */
export function featureLabel(key: string): string {
  const map: Record<string, string> = {
    avg_altitude: "Average altitude (ft)",
    min_altitude: "Lowest altitude (ft)",
    max_altitude: "Highest altitude (ft)",
    std_altitude: "Altitude variability",
    avg_speed: "Average speed (kts)",
    std_speed: "Speed variability",
    night_pct: "Night activity (%)",
    weekend_pct: "Weekend activity (%)",
    low_alt_ratio: "Share of passes under 1,000 ft",
    very_low_ratio: "Share of passes under 500 ft",
    on_ground_ratio: "Share of reports on the ground",
    masked_ratio: "Share of reports with masked identity",
    mlat_ratio: "Share derived by multilateration",
    tisb_ratio: "Share rebroadcast (TIS-B)",
    spi_ratio: "Special-position-indicator share",
    alert_ratio: "Transponder alert share",
    heading_variance: "Heading variability (orbiting)",
    avg_vertical_rate: "Average climb/descent (ft/min)",
    std_vertical_rate: "Climb/descent variability",
    inside_2nm_ratio: "Share within 2 nm of a monitored point",
    inside_5nm_ratio: "Share within 5 nm of a monitored point",
    avg_distance_km: "Average distance from centroid (km)",
    anomaly_count: "Flagged events in window",
    max_anomaly_score: "Highest anomaly score in window",
    det_count: "Reports in window",
    lifetime_detections: "Lifetime reports",
    is_military: "Military registration",
    avg_nic: "Navigation integrity (avg)",
    avg_nac_v: "Velocity accuracy (avg)",
  };
  return map[key] ?? key.replace(/_/g, " ");
}

/** Sort order for the sections a dossier renders (used by the page nav). */
export const DOSSIER_SECTIONS = [
  { id: "identity", label: "Identity & registry" },
  { id: "signature", label: "Behavior signature" },
  { id: "patterns", label: "Patterns" },
  { id: "violations", label: "Violations" },
  { id: "handoffs", label: "Handoffs & coordination" },
  { id: "corrections", label: "Corrections" },
  { id: "receipts", label: "Receipts" },
] as const;