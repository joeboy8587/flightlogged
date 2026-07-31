import { createServerFn } from "@tanstack/react-start";
import { watchtower } from "./neon.server";

// ---------------------------------------------------------------------------
// Advocacy data layer — read-only queries over quiet-math tables the public
// site was not yet surfacing. No writes, no schema changes, no ML changes.
// ---------------------------------------------------------------------------

type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Severity in sentinel_violations arrives either as a label or a 0-100 score. */
export function normalizeSeverity(raw: string | number | null | undefined): "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "INFO" {
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

// ============ 1. Consent-decree accountability scoreboard =================

export type ComplianceItem = {
  id: number;
  paragraph: number | null;
  category: string | null;
  requirement: string;
  status2023: string | null;
  status2024: string | null;
  status2025: string | null;
  notes2025: string | null;
};

export type ReformArea = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  items: ComplianceItem[];
};

export type Scoreboard = {
  areas: ReformArea[];
  totals: { total: number; compliant: number; partial: number; notStarted: number; inProgress: number };
};

export const getComplianceScoreboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<Scoreboard> =>
    cached("scoreboard", async () => {
      const empty: Scoreboard = { areas: [], totals: { total: 0, compliant: 0, partial: 0, notStarted: 0, inProgress: 0 } };
      try {
        const w = watchtower();
        const [areas, items] = await Promise.all([
          w`SELECT id, area_code, area_name, description FROM reform_areas ORDER BY id`,
          w`SELECT id, reform_area_id, sj_paragraph, category, requirement,
                   status_2023, status_2024, status_2025, notes_2025
            FROM compliance_items ORDER BY sj_paragraph NULLS LAST, id`,
        ]);
        const byArea = new Map<number, ComplianceItem[]>();
        for (const r of items as any[]) {
          const item: ComplianceItem = {
            id: Number(r.id),
            paragraph: r.sj_paragraph != null ? Number(r.sj_paragraph) : null,
            category: r.category ?? null,
            requirement: r.requirement ?? "",
            status2023: r.status_2023 ?? null,
            status2024: r.status_2024 ?? null,
            status2025: r.status_2025 ?? null,
            notes2025: r.notes_2025 ?? null,
          };
          const key = Number(r.reform_area_id ?? 0);
          const list = byArea.get(key) ?? [];
          list.push(item);
          byArea.set(key, list);
        }
        const out: ReformArea[] = (areas as any[]).map((a) => ({
          id: Number(a.id),
          code: a.area_code ?? "",
          name: a.area_name ?? "",
          description: a.description ?? null,
          items: byArea.get(Number(a.id)) ?? [],
        }));
        const all = out.flatMap((a) => a.items);
        const count = (s: string) => all.filter((i) => (i.status2025 ?? "").toLowerCase() === s).length;
        return {
          areas: out,
          totals: {
            total: all.length,
            compliant: count("compliant"),
            partial: count("partial"),
            inProgress: count("in_progress"),
            notStarted: count("not_started"),
          },
        };
      } catch (err) {
        console.error("getComplianceScoreboard failed:", err);
        return empty;
      }
    }),
);

// ============ 2. Sentinel ledger (sentinel_violations) ====================

export type LedgerRow = {
  id: number;
  at: string | null;
  registration: string | null;
  aircraftType: string | null;
  altitude: number | null;
  county: string | null;
  violationType: string | null;
  severity: ReturnType<typeof normalizeSeverity>;
  description: string | null;
  hashShort: string | null;
};

export type Ledger = {
  rows: LedgerRow[];
  total: number;
  byCounty: { county: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  lastAt: string | null;
};

export const getSentinelLedger = createServerFn({ method: "GET" }).handler(
  async (): Promise<Ledger> =>
    cached("ledger", async () => {
      const empty: Ledger = { rows: [], total: 0, byCounty: [], bySeverity: [], lastAt: null };
      try {
        const w = watchtower();
        const [rows, counties, totals] = await Promise.all([
          w`SELECT id, detection_timestamp, aircraft_registration, aircraft_type, altitude,
                   violation_type, severity, description, sha256_hash, county
            FROM sentinel_violations
            WHERE latitude IS NOT NULL
            ORDER BY detection_timestamp DESC NULLS LAST
            LIMIT 400`,
          w`SELECT county, COUNT(*)::int AS c FROM sentinel_violations
            WHERE latitude IS NOT NULL AND county IS NOT NULL
            GROUP BY county ORDER BY c DESC LIMIT 20`,
          w`SELECT COUNT(*)::int AS c, MAX(detection_timestamp) AS last_at
            FROM sentinel_violations WHERE latitude IS NOT NULL`,
        ]);
        const mapped: LedgerRow[] = (rows as any[]).map((r) => ({
          id: Number(r.id),
          at: r.detection_timestamp ? new Date(r.detection_timestamp).toISOString() : null,
          registration: r.aircraft_registration || null,
          aircraftType: r.aircraft_type || null,
          altitude: r.altitude != null ? Number(r.altitude) : null,
          county: r.county || null,
          violationType: r.violation_type || null,
          severity: normalizeSeverity(r.severity),
          description: r.description || null,
          hashShort: r.sha256_hash ? String(r.sha256_hash).slice(0, 16) : null,
        }));
        const sevOrder = ["CRITICAL", "HIGH", "MODERATE", "LOW", "INFO"];
        const bySeverity = sevOrder
          .map((s) => ({ severity: s, count: mapped.filter((r) => r.severity === s).length }))
          .filter((s) => s.count > 0);
        const t = (totals as any[])[0] ?? {};
        return {
          rows: mapped,
          total: Number(t.c ?? mapped.length),
          lastAt: t.last_at ? new Date(t.last_at).toISOString() : null,
          byCounty: (counties as any[]).map((c) => ({ county: String(c.county), count: Number(c.c) })),
          bySeverity,
        };
      } catch (err) {
        console.error("getSentinelLedger failed:", err);
        return empty;
      }
    }),
);

// ============ 3. County pulse (hourly_stats + county_baselines) ===========

export type CountyHour = {
  hourStart: string;
  detections: number;
  uniqueAircraft: number;
  below1000: number;
  below500: number;
  hovers: number;
  anomalies: number;
  avgAltitude: number | null;
};

export type CountyPulse = {
  county: string;
  hours: CountyHour[];
  last24: { detections: number; uniqueAircraft: number; below1000: number; below500: number; hovers: number; anomalies: number };
  baseline: { medianAlt: number | null; below500Rate: number | null; below1000Rate: number | null; hoverRate: number | null; learnedAt: string | null; hoursLearned: number };
  worst: LedgerRow[];
  violationCount: number;
};

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

export const getCountyPulse = createServerFn({ method: "GET" })
  .inputValidator((data: { county: string }) => ({ county: String(data.county).slice(0, 40).toUpperCase() }))
  .handler(async ({ data }): Promise<CountyPulse> =>
    cached(`pulse:${data.county}`, async () => {
      const county = data.county;
      const empty: CountyPulse = {
        county,
        hours: [],
        last24: { detections: 0, uniqueAircraft: 0, below1000: 0, below500: 0, hovers: 0, anomalies: 0 },
        baseline: { medianAlt: null, below500Rate: null, below1000Rate: null, hoverRate: null, learnedAt: null, hoursLearned: 0 },
        worst: [],
        violationCount: 0,
      };
      try {
        const w = watchtower();
        const [hours, baseline, worst, vcount] = await Promise.all([
          w`SELECT hour_start, total_detections, unique_aircraft, below_1000ft_count,
                   below_500ft_count, hover_count, anomaly_count, avg_altitude
            FROM hourly_stats
            WHERE county = ${county} AND hour_start > NOW() - INTERVAL '24 hours'
            ORDER BY hour_start ASC`,
          w`SELECT AVG(median_alt) AS median_alt, AVG(below_500ft_rate) AS r500,
                   AVG(below_1000ft_rate) AS r1000, AVG(hover_rate) AS rhover,
                   MAX(learned_at) AS learned_at, COUNT(*)::int AS n
            FROM county_baselines WHERE county = ${county}`,
          w`SELECT id, detection_timestamp, aircraft_registration, aircraft_type, altitude,
                   violation_type, severity, description, sha256_hash, county
            FROM sentinel_violations
            WHERE county = ${county} AND latitude IS NOT NULL
            ORDER BY detection_timestamp DESC NULLS LAST
            LIMIT 5`,
          w`SELECT COUNT(*)::int AS c FROM sentinel_violations
            WHERE county = ${county} AND latitude IS NOT NULL`,
        ]);
        const h: CountyHour[] = (hours as any[]).map((r) => ({
          hourStart: new Date(r.hour_start).toISOString(),
          detections: Number(r.total_detections ?? 0),
          uniqueAircraft: Number(r.unique_aircraft ?? 0),
          below1000: Number(r.below_1000ft_count ?? 0),
          below500: Number(r.below_500ft_count ?? 0),
          hovers: Number(r.hover_count ?? 0),
          anomalies: Number(r.anomaly_count ?? 0),
          avgAltitude: r.avg_altitude != null ? Number(r.avg_altitude) : null,
        }));
        const sum = (k: keyof CountyHour) => h.reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const b = (baseline as any[])[0] ?? {};
        return {
          county,
          hours: h,
          last24: {
            detections: sum("detections"),
            uniqueAircraft: sum("uniqueAircraft"),
            below1000: sum("below1000"),
            below500: sum("below500"),
            hovers: sum("hovers"),
            anomalies: sum("anomalies"),
          },
          baseline: {
            medianAlt: b.median_alt != null ? Number(b.median_alt) : null,
            below500Rate: b.r500 != null ? Number(b.r500) : null,
            below1000Rate: b.r1000 != null ? Number(b.r1000) : null,
            hoverRate: b.rhover != null ? Number(b.rhover) : null,
            learnedAt: b.learned_at ? new Date(b.learned_at).toISOString() : null,
            hoursLearned: Number(b.n ?? 0),
          },
          worst: (worst as any[]).map((r) => ({
            id: Number(r.id),
            at: r.detection_timestamp ? new Date(r.detection_timestamp).toISOString() : null,
            registration: r.aircraft_registration || null,
            aircraftType: r.aircraft_type || null,
            altitude: r.altitude != null ? Number(r.altitude) : null,
            county: r.county || null,
            violationType: r.violation_type || null,
            severity: normalizeSeverity(r.severity),
            description: r.description || null,
            hashShort: r.sha256_hash ? String(r.sha256_hash).slice(0, 16) : null,
          })),
          violationCount: Number(((vcount as any[])[0] ?? {}).c ?? 0),
        };
      } catch (err) {
        console.error("getCountyPulse failed:", err);
        return empty;
      }
    }),
  );

// ============ 4. Chain of custody (merkle_chain) ==========================

export type ChainBlock = {
  blockNumber: number;
  at: string | null;
  tableName: string | null;
  rowCount: number;
  blockHash: string | null;
  previousHash: string | null;
  merkleRoot: string | null;
  algorithm: string | null;
};

export type ChainOfCustody = {
  blocks: ChainBlock[];
  totalBlocks: number;
  totalRows: number;
  firstAt: string | null;
  lastAt: string | null;
  linked: boolean;
};

export const getChainOfCustody = createServerFn({ method: "GET" }).handler(
  async (): Promise<ChainOfCustody> =>
    cached("chain", async () => {
      const empty: ChainOfCustody = { blocks: [], totalBlocks: 0, totalRows: 0, firstAt: null, lastAt: null, linked: false };
      try {
        const w = watchtower();
        const [rows, agg] = await Promise.all([
          w`SELECT block_number, timestamp, table_name, row_count, block_hash,
                   previous_hash, merkle_root, hash_algorithm
            FROM merkle_chain ORDER BY block_number DESC LIMIT 25`,
          w`SELECT COUNT(*)::int AS n, COALESCE(SUM(row_count),0)::bigint AS rows,
                   MIN(timestamp) AS first_at, MAX(timestamp) AS last_at
            FROM merkle_chain`,
        ]);
        const blocks: ChainBlock[] = (rows as any[]).map((r) => ({
          blockNumber: Number(r.block_number),
          at: r.timestamp ? new Date(r.timestamp).toISOString() : null,
          tableName: r.table_name ?? null,
          rowCount: Number(r.row_count ?? 0),
          blockHash: r.block_hash ?? null,
          previousHash: r.previous_hash ?? null,
          merkleRoot: r.merkle_root ?? null,
          algorithm: r.hash_algorithm ?? null,
        }));
        // Every block after the first must reference the prior block's hash.
        const linked = blocks.length > 1 && blocks.slice(0, -1).every((b, i) => b.previousHash === blocks[i + 1].blockHash);
        const a = (agg as any[])[0] ?? {};
        return {
          blocks,
          totalBlocks: Number(a.n ?? blocks.length),
          totalRows: Number(a.rows ?? 0),
          firstAt: a.first_at ? new Date(a.first_at).toISOString() : null,
          lastAt: a.last_at ? new Date(a.last_at).toISOString() : null,
          linked,
        };
      } catch (err) {
        console.error("getChainOfCustody failed:", err);
        return empty;
      }
    }),
);

// ============ 5. Model honesty panel (ensemble_anomaly_scores) ============

export type ModelHonesty = {
  scored7d: number;
  humanReviewed: number;
  falsePositives: number;
  meanDisagreement: number | null;
  highAgreement: number;
  lowAgreement: number;
  lastScoredAt: string | null;
};

export const getModelHonesty = createServerFn({ method: "GET" }).handler(
  async (): Promise<ModelHonesty> =>
    cached("honesty", async () => {
      const empty: ModelHonesty = {
        scored7d: 0, humanReviewed: 0, falsePositives: 0,
        meanDisagreement: null, highAgreement: 0, lowAgreement: 0, lastScoredAt: null,
      };
      try {
        const w = watchtower();
        const rows = await w`
          SELECT COUNT(*)::int AS scored,
                 COUNT(*) FILTER (WHERE validated IS TRUE)::int AS reviewed,
                 COUNT(*) FILTER (WHERE false_positive_reason IS NOT NULL)::int AS fp,
                 AVG(disagreement) AS mean_dis,
                 COUNT(*) FILTER (WHERE disagreement <= 0.2)::int AS high_agree,
                 COUNT(*) FILTER (WHERE disagreement >= 0.5)::int AS low_agree,
                 MAX(scored_at) AS last_at
          FROM ensemble_anomaly_scores
          WHERE scored_at > NOW() - INTERVAL '7 days'
        `;
        const r = (rows as any[])[0] ?? {};
        return {
          scored7d: Number(r.scored ?? 0),
          humanReviewed: Number(r.reviewed ?? 0),
          falsePositives: Number(r.fp ?? 0),
          meanDisagreement: r.mean_dis != null ? Number(r.mean_dis) : null,
          highAgreement: Number(r.high_agree ?? 0),
          lowAgreement: Number(r.low_agree ?? 0),
          lastScoredAt: r.last_at ? new Date(r.last_at).toISOString() : null,
        };
      } catch (err) {
        console.error("getModelHonesty failed:", err);
        return empty;
      }
    }),
);