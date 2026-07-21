import { createServerFn } from "@tanstack/react-start";
import { watchtower } from "./neon.server";

// Scan artifacts + human-review dismissals live in the watchtower (quiet-math)
// Neon DB. Tables are auto-created on first read so no manual migration is
// required. All inserts go through the /api/public/scans/ingest route which
// verifies an HMAC signature against SCAN_INGEST_SECRET.

let ensured = false;
async function ensureTables() {
  if (ensured) return;
  const w = watchtower();
  await w`
    CREATE TABLE IF NOT EXISTS scan_artifacts (
      scan_id uuid PRIMARY KEY,
      ts timestamptz NOT NULL,
      method_version text NOT NULL DEFAULT 'unknown',
      candidates int NOT NULL DEFAULT 0,
      flagged int NOT NULL DEFAULT 0,
      kinematic_hits int NOT NULL DEFAULT 0,
      handoffs int NOT NULL DEFAULT 0,
      detections int NOT NULL DEFAULT 0,
      subject_absent boolean NOT NULL DEFAULT false,
      merkle_root text,
      payload jsonb
    )
  `;
  await w`CREATE INDEX IF NOT EXISTS scan_artifacts_ts_idx ON scan_artifacts (ts DESC)`;
  await w`
    CREATE TABLE IF NOT EXISTS review_dismissals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      anomaly_id text,
      reviewer_note text,
      dismissed_at timestamptz NOT NULL DEFAULT now(),
      published boolean NOT NULL DEFAULT true
    )
  `;
  ensured = true;
}

export type ScanArtifact = {
  scanId: string;
  ts: string;
  methodVersion: string;
  candidates: number;
  flagged: number;
  kinematicHits: number;
  handoffs: number;
  detections: number;
  subjectAbsent: boolean;
  merkleRoot: string | null;
};

function mapRow(r: any): ScanArtifact {
  return {
    scanId: r.scan_id,
    ts: new Date(r.ts).toISOString(),
    methodVersion: r.method_version,
    candidates: Number(r.candidates ?? 0),
    flagged: Number(r.flagged ?? 0),
    kinematicHits: Number(r.kinematic_hits ?? 0),
    handoffs: Number(r.handoffs ?? 0),
    detections: Number(r.detections ?? 0),
    subjectAbsent: Boolean(r.subject_absent),
    merkleRoot: r.merkle_root ?? null,
  };
}

export const getLatestScan = createServerFn({ method: "GET" }).handler(async (): Promise<ScanArtifact | null> => {
  try {
    await ensureTables();
    const w = watchtower();
    const rows = await w`SELECT * FROM scan_artifacts ORDER BY ts DESC LIMIT 1`;
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (err) {
    console.error("getLatestScan failed:", err);
    return null;
  }
});

export const getRecentScans = createServerFn({ method: "GET" }).handler(async (): Promise<ScanArtifact[]> => {
  try {
    await ensureTables();
    const w = watchtower();
    const rows = await w`SELECT * FROM scan_artifacts ORDER BY ts DESC LIMIT 24`;
    return (rows as any[]).map(mapRow);
  } catch (err) {
    console.error("getRecentScans failed:", err);
    return [];
  }
});

export type FunnelStats = {
  detections: number;
  candidates: number;
  kinematicHits: number;
  handoffs: number;
  flagged: number;
  scanTs: string | null;
};

export const getFunnelStats = createServerFn({ method: "GET" }).handler(async (): Promise<FunnelStats> => {
  const latest = await (async () => {
    try {
      await ensureTables();
      const w = watchtower();
      const rows = await w`SELECT * FROM scan_artifacts ORDER BY ts DESC LIMIT 1`;
      return rows[0] ? mapRow(rows[0]) : null;
    } catch { return null; }
  })();
  if (latest) {
    return {
      detections: latest.detections,
      candidates: latest.candidates,
      kinematicHits: latest.kinematicHits,
      handoffs: latest.handoffs,
      flagged: latest.flagged,
      scanTs: latest.ts,
    };
  }
  // Fallback: derive a live funnel from the public detections / anomaly_events
  // tables so the strip is never blank before the ML box starts POSTing artifacts.
  try {
    const w = watchtower();
    const [det, cand, anom, last] = await Promise.all([
      w`SELECT COUNT(*)::int AS c FROM detections WHERE captured_at >= now() - interval '24 hours'`,
      w`SELECT COUNT(DISTINCT icao_hex)::int AS c FROM detections WHERE captured_at >= now() - interval '24 hours'`,
      w`SELECT COUNT(*)::int AS c FROM anomaly_events WHERE detected_at >= now() - interval '24 hours'`,
      w`SELECT MAX(captured_at) AS t FROM detections`,
    ]);
    const flagged = Number(anom[0]?.c ?? 0);
    return {
      detections: Number(det[0]?.c ?? 0),
      candidates: Number(cand[0]?.c ?? 0),
      kinematicHits: flagged,
      handoffs: flagged,
      flagged,
      scanTs: last[0]?.t ? new Date(last[0].t).toISOString() : null,
    };
  } catch (err) {
    console.error("getFunnelStats fallback failed:", err);
    return { detections: 0, candidates: 0, kinematicHits: 0, handoffs: 0, flagged: 0, scanTs: null };
  }
});

export type ObjectivityStats = {
  uniqueAircraft: number;
  everFlagged: number;
  neverFlagged: number;
  everFlaggedPct: number;
  neverFlaggedPct: number;
  observationHours: number;
};

export const getObjectivityStats = createServerFn({ method: "GET" }).handler(async (): Promise<ObjectivityStats> => {
  try {
    const w = watchtower();
    const [ac, flagged, span] = await Promise.all([
      w`SELECT COUNT(DISTINCT icao_hex)::int AS c FROM detections`,
      w`SELECT COUNT(DISTINCT icao_hex)::int AS c FROM anomaly_events`,
      w`SELECT MIN(captured_at) AS first, MAX(captured_at) AS last FROM detections`,
    ]);
    const unique = Number(ac[0]?.c ?? 0);
    const flag = Number(flagged[0]?.c ?? 0);
    const first = span[0]?.first ? new Date(span[0].first) : null;
    const last = span[0]?.last ? new Date(span[0].last) : null;
    const hours = first && last ? Math.round(((last.getTime() - first.getTime()) / 36e5) * 10) / 10 : 0;
    const never = Math.max(0, unique - flag);
    return {
      uniqueAircraft: unique,
      everFlagged: flag,
      neverFlagged: never,
      everFlaggedPct: unique > 0 ? Math.round((flag / unique) * 1000) / 10 : 0,
      neverFlaggedPct: unique > 0 ? Math.round((never / unique) * 1000) / 10 : 0,
      observationHours: hours,
    };
  } catch (err) {
    console.error("getObjectivityStats failed:", err);
    return { uniqueAircraft: 0, everFlagged: 0, neverFlagged: 0, everFlaggedPct: 0, neverFlaggedPct: 0, observationHours: 0 };
  }
});

// Same math, but scoped to the San Joaquin Valley Area of Interest
// (Kern, Kings, Tulare, Fresno, San Bernardino). Lets us publish
// "Global vs AOI" side-by-side on /methodology so readers see how
// the threshold behaves inside our primary observation zone versus
// everywhere the sensors happen to catch a target.
const AOI_COUNTIES = ["Kern", "Kings", "Tulare", "Fresno", "San Bernardino"];
export const getObjectivityStatsAoi = createServerFn({ method: "GET" }).handler(async (): Promise<ObjectivityStats> => {
  try {
    const w = watchtower();
    const [ac, flagged, span] = await Promise.all([
      w`SELECT COUNT(DISTINCT icao_hex)::int AS c FROM detections WHERE county = ANY(${AOI_COUNTIES})`,
      w`SELECT COUNT(DISTINCT icao_hex)::int AS c FROM anomaly_events WHERE county = ANY(${AOI_COUNTIES})`,
      w`SELECT MIN(captured_at) AS first, MAX(captured_at) AS last FROM detections WHERE county = ANY(${AOI_COUNTIES})`,
    ]);
    const unique = Number(ac[0]?.c ?? 0);
    const flag = Number(flagged[0]?.c ?? 0);
    const first = span[0]?.first ? new Date(span[0].first) : null;
    const last = span[0]?.last ? new Date(span[0].last) : null;
    const hours = first && last ? Math.round(((last.getTime() - first.getTime()) / 36e5) * 10) / 10 : 0;
    const never = Math.max(0, unique - flag);
    return {
      uniqueAircraft: unique,
      everFlagged: flag,
      neverFlagged: never,
      everFlaggedPct: unique > 0 ? Math.round((flag / unique) * 1000) / 10 : 0,
      neverFlaggedPct: unique > 0 ? Math.round((never / unique) * 1000) / 10 : 0,
      observationHours: hours,
    };
  } catch (err) {
    console.error("getObjectivityStatsAoi failed:", err);
    return { uniqueAircraft: 0, everFlagged: 0, neverFlagged: 0, everFlaggedPct: 0, neverFlaggedPct: 0, observationHours: 0 };
  }
});

export const getReviewDismissalCount = createServerFn({ method: "GET" }).handler(async (): Promise<{ month: number; total: number }> => {
  try {
    await ensureTables();
    const w = watchtower();
    const [month, total] = await Promise.all([
      w`SELECT COUNT(*)::int AS c FROM review_dismissals WHERE published = true AND dismissed_at >= (now() - interval '30 days')`,
      w`SELECT COUNT(*)::int AS c FROM review_dismissals WHERE published = true`,
    ]);
    return { month: Number(month[0]?.c ?? 0), total: Number(total[0]?.c ?? 0) };
  } catch (err) {
    console.error("getReviewDismissalCount failed:", err);
    return { month: 0, total: 0 };
  }
});