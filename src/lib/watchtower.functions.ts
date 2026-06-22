import { createServerFn } from "@tanstack/react-start";
import { watchtower } from "./neon.server";

// ---- FAA identity enrichment ----
export type FaaIdentity = {
  name: string | null;
  typeRegistrant: string | null;
  city: string | null;
  state: string | null;
  aircraftModel: string | null;
};

function normReg(r: string | null | undefined): string | null {
  if (!r) return null;
  const s = String(r).trim().toUpperCase();
  return s.startsWith("N") ? s.slice(1) : s;
}
function normHex(h: string | null | undefined): string | null {
  if (!h) return null;
  return String(h).trim().toUpperCase();
}

async function faaIdentityMap(
  inputs: { registration?: string | null; icao?: string | null }[],
): Promise<Map<string, FaaIdentity>> {
  const regs = Array.from(new Set(inputs.map((i) => normReg(i.registration)).filter(Boolean) as string[]));
  const hexes = Array.from(new Set(inputs.map((i) => normHex(i.icao)).filter(Boolean) as string[]));
  if (regs.length === 0 && hexes.length === 0) return new Map();
  const w = watchtower();
  const regsParam = regs.length > 0 ? regs : [""];
  const hexesParam = hexes.length > 0 ? hexes : [""];
  const rows = await w`
    SELECT n_number, mode_s_code_hex, name, type_registrant, city, state, mfr_mdl_code
    FROM faa_master
    WHERE UPPER(n_number) = ANY(${regsParam}::text[])
       OR UPPER(mode_s_code_hex) = ANY(${hexesParam}::text[])
  `;
  const map = new Map<string, FaaIdentity>();
  for (const r of rows as any[]) {
    const ident: FaaIdentity = {
      name: r.name ?? null,
      typeRegistrant: r.type_registrant ?? null,
      city: r.city ?? null,
      state: r.state ?? null,
      aircraftModel: r.mfr_mdl_code ?? null,
    };
    if (r.n_number) map.set("REG:" + String(r.n_number).toUpperCase(), ident);
    if (r.mode_s_code_hex) map.set("HEX:" + String(r.mode_s_code_hex).toUpperCase(), ident);
  }
  return map;
}

function lookupIdentity(
  map: Map<string, FaaIdentity>,
  registration: string | null | undefined,
  icao: string | null | undefined,
): FaaIdentity | null {
  const r = normReg(registration);
  if (r && map.has("REG:" + r)) return map.get("REG:" + r)!;
  const h = normHex(icao);
  if (h && map.has("HEX:" + h)) return map.get("HEX:" + h)!;
  return null;
}

export type WatchSnapshot = {
  totalDetections: number;
  uniqueAircraft: number;
  anomalyEvents: number;
  convergenceEvents: number;
  lastDetectionAt: string | null;
  windowHours: number;
  flightDetections: number;
  biometricEvents: number;
  correlatedEvents: number;
  unifiedEvents: number;
};

export const getSnapshot = createServerFn({ method: "GET" }).handler(async (): Promise<WatchSnapshot> => {
  const empty: WatchSnapshot = {
    totalDetections: 0, uniqueAircraft: 0, anomalyEvents: 0, convergenceEvents: 0,
    lastDetectionAt: null, windowHours: 0,
    flightDetections: 0, biometricEvents: 0, correlatedEvents: 0, unifiedEvents: 0,
  };
  try {
    const w = watchtower();
    const [d, a, an, cv, vc, mb] = await Promise.all([
      w`SELECT COUNT(*)::int AS c, MAX(captured_at) AS last, MIN(captured_at) AS first FROM detections`,
      w`SELECT COUNT(*)::int AS c FROM aircraft_profiles`,
      w`SELECT COUNT(*)::int AS c FROM anomaly_events`,
      w`SELECT COUNT(*)::int AS c FROM convergence_events`,
      w`SELECT COUNT(*)::int AS c FROM violation_classifications`,
      w`SELECT COUNT(*)::int AS c FROM ml_brain_reports`,
    ]);
    const lastRaw = d[0]?.last ?? null;
    const firstRaw = d[0]?.first ?? null;
    const last = lastRaw ? new Date(lastRaw).toISOString() : null;
    const first = firstRaw ? new Date(firstRaw) : null;
    const windowHours = first && lastRaw
      ? Math.round(((new Date(lastRaw).getTime() - first.getTime()) / 36e5) * 10) / 10
      : 0;
    return {
      totalDetections: d[0]?.c ?? 0,
      uniqueAircraft: a[0]?.c ?? 0,
      anomalyEvents: an[0]?.c ?? 0,
      convergenceEvents: cv[0]?.c ?? 0,
      lastDetectionAt: last,
      windowHours,
      // Field names retained for backwards-compatibility with existing UI.
      // All counts now sourced from the unbiased quiet-math DB.
      flightDetections: d[0]?.c ?? 0,           // every detection is hash-fingerprinted = court-ready
      biometricEvents: 0,                       // retired: biometric correlation removed
      correlatedEvents: mb[0]?.c ?? 0,          // ml_brain_reports (human-reviewed)
      unifiedEvents: vc[0]?.c ?? 0,             // violation_classifications
    };
  } catch (err) {
    console.error("getSnapshot failed, returning empty snapshot:", err);
    return empty;
  }
});

export type LowAltDescent = {
  icao: string;
  registration: string | null;
  owner: string | null;
  model: string | null;
  capturedAt: string;
  altitude: number | null;
  speed: number | null;
  county: string | null;
  identifiedName: string | null;
  registrantType: string | null;
  registrantCity: string | null;
  registrantState: string | null;
  violationRule: string | null;
  violationSource: string | null;
  violationScore: number | null;
};

export const getRecentLowAltitude = createServerFn({ method: "GET" }).handler(async (): Promise<LowAltDescent[]> => {
  const w = watchtower();
  const [rows, baselines] = await Promise.all([
    w`
      SELECT d.icao_hex, d.registration, d.captured_at, d.altitude_ft, d.speed_kts, d.county,
             p.registered_owner, p.aircraft_model,
             m.name AS reg_name, m.type_registrant, m.city AS reg_city, m.state AS reg_state
      FROM detections d
      LEFT JOIN aircraft_profiles p ON p.icao_hex = d.icao_hex
      LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(d.icao_hex)
      WHERE d.altitude_ft IS NOT NULL
        AND d.altitude_ft < 1500
        AND d.altitude_ft >= -100      -- exclude transponder/barometric anomalies from public display
        AND d.on_ground = false
      ORDER BY d.captured_at DESC
      LIMIT 40
    `,
    w`SELECT rule_name, rule_source, min_altitude_violation_ft, violation_score
      FROM regulatory_baselines WHERE is_active = true
      ORDER BY violation_score DESC`,
  ]);
  const matchViolation = (alt: number | null) => {
    if (alt == null) return null;
    let best: any = null;
    for (const b of baselines) {
      if (alt < b.min_altitude_violation_ft) {
        if (!best || Number(b.violation_score) > Number(best.violation_score)) best = b;
      }
    }
    return best;
  };
  return rows.map((r: any) => ({
    icao: r.icao_hex,
    registration: r.registration,
    owner: r.registered_owner,
    model: r.aircraft_model,
    capturedAt: new Date(r.captured_at).toISOString(),
    altitude: r.altitude_ft,
    speed: r.speed_kts ? Number(r.speed_kts) : null,
    county: r.county,
    identifiedName: r.reg_name ?? null,
    registrantType: r.type_registrant ?? null,
    registrantCity: r.reg_city ?? null,
    registrantState: r.reg_state ?? null,
    ...(function () {
      const v = matchViolation(r.altitude_ft);
      return v
        ? { violationRule: v.rule_name as string, violationSource: v.rule_source as string, violationScore: Number(v.violation_score) }
        : { violationRule: null, violationSource: null, violationScore: null };
    })(),
  }));
});

export type RegulatoryBaseline = {
  ruleName: string;
  ruleSource: string;
  minAltitudeFt: number;
  appliesCongested: boolean;
  appliesNight: boolean;
  appliesResidential: boolean;
  violationScore: number;
  description: string | null;
};

export const getRegulatoryBaselines = createServerFn({ method: "GET" }).handler(async (): Promise<RegulatoryBaseline[]> => {
  const w = watchtower();
  const rows = await w`
    SELECT rule_name, rule_source, min_altitude_violation_ft, applies_congested_area,
           applies_night, applies_residential, violation_score, description
    FROM regulatory_baselines
    WHERE is_active = true
    ORDER BY violation_score DESC
  `;
  return rows.map((r: any) => ({
    ruleName: r.rule_name,
    ruleSource: r.rule_source,
    minAltitudeFt: r.min_altitude_violation_ft,
    appliesCongested: r.applies_congested_area,
    appliesNight: r.applies_night,
    appliesResidential: r.applies_residential,
    violationScore: Number(r.violation_score),
    description: r.description ?? null,
  }));
});

export type FaaRegulation = {
  id: string | number;
  part: string;
  section: string;
  heading: string;
  title: string | null;
};

export const getRegulations = createServerFn({ method: "GET" }).handler(async (): Promise<FaaRegulation[]> => {
  const w = watchtower();
  const rows = await w`
    SELECT id, part, section, heading, title
    FROM faa_regulations
    WHERE part IN ('91','107')
    ORDER BY part, section
    LIMIT 200
  `;
  return rows.map((r: any) => ({
    id: r.id,
    part: r.part,
    section: r.section,
    heading: r.heading,
    title: r.title ?? null,
  }));
});

export type AirspaceZone = {
  airspaceType: string;
  classLabel: string | null;
  count: number;
  examples: string[];
};

export const getAirspaceSummary = createServerFn({ method: "GET" }).handler(async (): Promise<AirspaceZone[]> => {
  const w = watchtower();
  const rows = await w`
    SELECT airspace_type, class_label,
           COUNT(*)::int AS c,
           (ARRAY_AGG(name ORDER BY name))[1:3] AS examples
    FROM faa_airspace
    GROUP BY airspace_type, class_label
    ORDER BY c DESC
  `;
  return rows.map((r: any) => ({
    airspaceType: r.airspace_type,
    classLabel: r.class_label,
    count: r.c,
    examples: r.examples ?? [],
  }));
});

export type RegistryIdentification = {
  icao: string;
  registration: string | null;
  name: string | null;
  type: string | null;
  city: string | null;
  state: string | null;
  detections: number;
};

export const getIdentifiedOperators = createServerFn({ method: "GET" }).handler(async (): Promise<RegistryIdentification[]> => {
  const w = watchtower();
  const rows = await w`
    SELECT p.icao_hex, p.observed_registration, p.total_detections,
           m.name, m.type_registrant, m.city, m.state
    FROM aircraft_profiles p
    LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(p.icao_hex)
    WHERE m.name IS NOT NULL
    ORDER BY p.total_detections DESC
    LIMIT 30
  `;
  return rows.map((r: any) => ({
    icao: r.icao_hex,
    registration: r.observed_registration,
    name: r.name,
    type: r.type_registrant,
    city: r.city,
    state: r.state,
    detections: r.total_detections,
  }));
});

export type RepeatOffender = {
  icao: string;
  registration: string | null;
  owner: string | null;
  model: string | null;
  totalDetections: number;
  minAltitude: number | null;
  avgAltitude: number | null;
  nightPct: number | null;
  anomalyScore: number | null;
  lastSeen: string;
  identifiedName: string | null;
  registrantCity: string | null;
  registrantState: string | null;
  transponderAnomaly: boolean;
};

export const getRepeatOffenders = createServerFn({ method: "GET" }).handler(async (): Promise<RepeatOffender[]> => {
  const w = watchtower();
  const rows = await w`
    SELECT icao_hex, observed_registration, registered_owner, aircraft_model,
           total_detections, min_altitude, avg_altitude, night_pct, anomaly_score, last_seen
    FROM aircraft_profiles
    WHERE total_detections >= 20
    ORDER BY total_detections DESC
    LIMIT 25
  `;
  const idMap = await faaIdentityMap(
    rows.map((r: any) => ({ registration: r.observed_registration, icao: r.icao_hex })),
  );
  return rows.map((r: any) => {
    const id = lookupIdentity(idMap, r.observed_registration, r.icao_hex);
    const rawMin = r.min_altitude == null ? null : Number(r.min_altitude);
    const anomaly = rawMin != null && rawMin < -100;
    return {
    icao: r.icao_hex,
    registration: r.observed_registration,
    owner: r.registered_owner,
    model: r.aircraft_model,
    totalDetections: r.total_detections,
    minAltitude: anomaly ? null : rawMin,
    avgAltitude: r.avg_altitude ? Number(r.avg_altitude) : null,
    nightPct: r.night_pct ? Number(r.night_pct) : null,
    anomalyScore: r.anomaly_score ? Number(r.anomaly_score) : null,
    lastSeen: new Date(r.last_seen).toISOString(),
      identifiedName: id?.name ?? null,
      registrantCity: id?.city ?? null,
      registrantState: id?.state ?? null,
      transponderAnomaly: anomaly,
    };
  });
});

export type AnomalyFinding = {
  id: string;
  detectedAt: string;
  icao: string;
  registration: string | null;
  anomalyType: string;
  anomalyScore: number | null;
  altitude: number | null;
  county: string | null;
  reasoning: string | null;
};

export const getAnomalies = createServerFn({ method: "GET" }).handler(async (): Promise<AnomalyFinding[]> => {
  const w = watchtower();
  const rows = await w`
    SELECT id, detected_at, icao_hex, registration, anomaly_type, anomaly_score,
           altitude_ft, county, reasoning
    FROM anomaly_events
    ORDER BY detected_at DESC
    LIMIT 50
  `;
  return rows.map((r: any) => ({
    id: r.id,
    detectedAt: new Date(r.detected_at).toISOString(),
    icao: r.icao_hex,
    registration: r.registration,
    anomalyType: r.anomaly_type,
    anomalyScore: r.anomaly_score ? Number(r.anomaly_score) : null,
    altitude: r.altitude_ft,
    county: r.county,
    reasoning: r.reasoning,
  }));
});

export type CorrelatedEvent = {
  id: string;
  timestamp: string;
  registration: string | null;
  altitude: number | null;
  heartRate: number | null;
  stress: number | null;
  bradfordHill: number | null;
  evidenceHash: string | null;
};

export const getCorrelations = createServerFn({ method: "GET" }).handler(async (): Promise<CorrelatedEvent[]> => {
  // Retired: biometric correlation was the biased signal. The function is kept
  // as a no-op so any stale caller still type-checks; nothing in the UI
  // currently consumes it.
  return [];
});

// ============================================================
// EXTENDED DASHBOARDS (from evidence DB — public, non-biometric)
// ============================================================

export type CanonicalOperator = {
  registration: string;
  icao24: string | null;
  faaName: string | null;
  operatorResolved: string | null;
  aircraftModel: string | null;
  kcso: boolean;
  military: boolean;
  medical: boolean;
  xpServices: boolean;
  shellLinks: number;
  occurrences: number;
  confidence: number | null;
  lastSeen: string | null;
};

export const getCanonicalOperators = createServerFn({ method: "GET" }).handler(async (): Promise<CanonicalOperator[]> => {
  const w = watchtower();
  // Top operators by detection volume, sourced from aircraft_profiles (quiet-math).
  // Owner names are joined from the FAA registry that already lives in quiet-math.
  const rows = await w`
    SELECT p.icao_hex,
           p.observed_registration,
           p.registered_owner,
           p.aircraft_model,
           p.is_military,
           p.total_detections,
           p.classification_confidence,
           p.last_seen,
           p.reg_violation_count,
           p.confirmed_coord_partners,
           COALESCE(m.name, p.registered_owner) AS faa_name
    FROM aircraft_profiles p
    LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(p.icao_hex)
    WHERE p.total_detections IS NOT NULL
    ORDER BY p.total_detections DESC NULLS LAST
    LIMIT 50
  `;
  const MIL_RX = /\b(US ?NAVY|U\.S\. NAVY|NAVAIR|NAVAL|US ?ARMY|U\.S\. ARMY|AIR FORCE|USAF|MARINE CORPS|USMC|MARINES|COAST GUARD|USCG|NATIONAL GUARD|DEPARTMENT OF DEFENSE|DEPT OF DEFENSE|\bDOD\b|DEPT OF THE ARMY|DEPT OF THE NAVY|DEPT OF THE AIR FORCE|FOREST SERVICE|USDA FOREST)\b/i;
  const MED_RX = /\b(MERCY|MEDIVAC|MEDEVAC|MED ?FLIGHT|AIR ?MED|AIRMED|LIFEFLIGHT|LIFE ?FLIGHT|REACH AIR|REACH AIR MEDICAL|CALSTAR|MEDICAL|HOSPITAL|EMS|AMR|GUARDIAN|ANGEL|SHANDS|AIR EVAC|AIR METHODS)\b/i;
  const KCSO_RX = /\b(KERN COUNTY|KCSO|KERN SHERIFF|SHERIFF.+KERN|KCSI AERIAL|BFL AVIATION|BEST EQUIPMENT LEASING|CHRISTIANSEN AVIATION|JERK ASSETS|KILO ALFA|ALLIED POTATO|7-GS AVIATION)\b/i;
  const XP_RX = /\bXP ?(SERVICES|CALI|HOLDINGS)?\b/i;
  return (rows as any[]).map((r) => {
    const nameBlob = `${r.faa_name ?? ""} ${r.registered_owner ?? ""}`;
    const icao = String(r.icao_hex ?? "").toUpperCase();
    const isMilHex = /^AE[0-9A-F]{4}$/.test(icao);
    const partners = Array.isArray(r.confirmed_coord_partners) ? r.confirmed_coord_partners.length : 0;
    return {
      registration: r.observed_registration ?? r.icao_hex,
      icao24: r.icao_hex ?? null,
      faaName: r.faa_name ?? null,
      operatorResolved: r.registered_owner ?? null,
      aircraftModel: r.aircraft_model ?? null,
      kcso: KCSO_RX.test(nameBlob),
      military: !!r.is_military || isMilHex || MIL_RX.test(nameBlob),
      medical: MED_RX.test(nameBlob),
      xpServices: XP_RX.test(nameBlob),
      shellLinks: partners + Number(r.reg_violation_count ?? 0 > 0 ? 1 : 0),
      occurrences: Number(r.total_detections ?? 0),
      confidence: r.classification_confidence != null ? Number(r.classification_confidence) : null,
      lastSeen: r.last_seen ? new Date(r.last_seen).toISOString() : null,
    };
  });
});

export type SentinelViolation = {
  id: number;
  timestamp: string;
  registration: string | null;
  aircraftType: string | null;
  altitude: number | null;
  latitude: number | null;
  longitude: number | null;
  violationType: string;
  severity: string | null;
  description: string | null;
  hashShort: string | null;
  identifiedName: string | null;
  registrantCity: string | null;
  registrantState: string | null;
  registrantType: string | null;
};

export const getSentinelViolations = createServerFn({ method: "GET" }).handler(async (): Promise<SentinelViolation[]> => {
  // Sourced from violation_classifications in quiet-math. Owner identity is
  // already joined into that table, so no extra FAA round-trip is needed.
  const w = watchtower();
  const rows = await w`
    SELECT detection_id::text AS id, captured_at, registration, aircraft_model AS aircraft_type,
           altitude_ft AS altitude, latitude, longitude, rule_violated AS violation_type,
           owner_name, owner_city, owner_state, type_registrant, sha256_hash,
           aircraft_mfr
    FROM violation_classifications
    WHERE captured_at IS NOT NULL
    ORDER BY captured_at DESC NULLS LAST
    LIMIT 100
  `;
  const sev = (rule: string | null) => {
    if (!rule) return null;
    const r = rule.toUpperCase();
    if (r.includes("91.119") || r.includes("ALTITUDE") || r.includes("LOITER")) return "HIGH";
    if (r.includes("91.227") || r.includes("ADS-B")) return "MEDIUM";
    return "LOW";
  };
  return (rows as any[]).map((r) => ({
    id: Number(String(r.id).replace(/[^0-9]/g, "").slice(0, 9) || 0),
    timestamp: r.captured_at ? new Date(r.captured_at).toISOString() : new Date(0).toISOString(),
    registration: r.registration,
    aircraftType: r.aircraft_type ?? r.aircraft_mfr ?? null,
    altitude: r.altitude,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    violationType: r.violation_type,
    severity: sev(r.violation_type),
    description: r.violation_type ? `Detection violated ${r.violation_type}.` : null,
    hashShort: r.sha256_hash ? String(r.sha256_hash).slice(0, 16) : null,
    identifiedName: r.owner_name ?? null,
    registrantCity: r.owner_city ?? null,
    registrantState: r.owner_state ?? null,
    registrantType: r.type_registrant ?? null,
  }));
});

export type ThreatTierBucket = { tier: number | null; level: string | null; count: number };
export type ThreatTopRow = {
  // typed component shape (serializable across server fn boundary)
  detectionId: string;
  wti: number;
  tier: number | null;
  level: string | null;
  computedAt: string | null;
  components: ThreatComponents | null;
  hashShort: string | null;
  county: string | null;
};
export type ThreatComponents = {
  altitude: number | null;
  temporal: number | null;
  convergence: number | null;
  shellNetwork: number | null;
  repeatFrequency: number | null;
  weights: {
    altitude: number | null;
    temporal: number | null;
    convergence: number | null;
    shell: number | null;
    repeat: number | null;
  };
};
export type ThreatIndexSummary = {
  total: number;
  buckets: ThreatTierBucket[];
  top: ThreatTopRow[];
  methodVersion: string | null;
  hashedRows: number;
  countyCounts: { county: string; count: number }[];
  countyFilter: string | null;
};

// County normalization — collapses arbitrary county strings into one of the AOI buckets.
const AOI_COUNTIES = ["kern", "tulare", "kings", "fresno", "san bernardino"] as const;
export type CountyKey = "kern" | "tulare" | "kings" | "fresno" | "san_bernardino" | "other";
export function normalizeCountyKey(raw: string | null | undefined): CountyKey {
  if (!raw) return "other";
  const s = String(raw).toLowerCase();
  if (s.includes("kern")) return "kern";
  if (s.includes("tulare")) return "tulare";
  if (s.includes("kings")) return "kings";
  if (s.includes("fresno")) return "fresno";
  if (s.includes("san bernardino") || s.includes("sanbernardino")) return "san_bernardino";
  return "other";
}
const COUNTY_LABEL: Record<CountyKey, string> = {
  kern: "Kern", tulare: "Tulare", kings: "Kings", fresno: "Fresno",
  san_bernardino: "San Bernardino", other: "Other",
};

type CountyLens = CountyKey | "all";
function normalizeCountyLens(raw: string | null | undefined): CountyLens {
  if (!raw || String(raw).toLowerCase() === "all") return "all";
  return normalizeCountyKey(raw);
}

export const getThreatIndex = createServerFn({ method: "GET" })
  .inputValidator((input: { county?: string } | undefined) => ({
    county: input?.county && typeof input.county === "string" ? input.county : null,
  }))
  .handler(async ({ data }): Promise<ThreatIndexSummary> => {
  // WTI is computed directly from anomaly_events (quiet-math). Totals, buckets,
  // county chips, and the top table are now all derived from the same live table
  // so page numbers do not drift from Tail Search / ML / Mosaic.
  const w = watchtower();
  const wantedKey = normalizeCountyLens(data.county);
  const [tot, top, hashed, countyAgg, bucketAgg] = await Promise.all([
    w`SELECT COUNT(*)::bigint AS c
      FROM anomaly_events
      WHERE anomaly_score IS NOT NULL
        AND (${wantedKey} = 'all' OR CASE
          WHEN county ILIKE '%kern%' THEN 'kern'
          WHEN county ILIKE '%tulare%' THEN 'tulare'
          WHEN county ILIKE '%kings%' THEN 'kings'
          WHEN county ILIKE '%fresno%' THEN 'fresno'
          WHEN county ILIKE '%san bernardino%' OR county ILIKE '%san_bernardino%' OR county ILIKE '%sanbernardino%' THEN 'san_bernardino'
          ELSE 'other' END = ${wantedKey})`,
    w`SELECT id::text AS detection_id, anomaly_score, county, county_z_score,
             contributing_factors, detected_at, sha256_hash, anomaly_type
      FROM anomaly_events
      WHERE anomaly_score IS NOT NULL
        AND (${wantedKey} = 'all' OR CASE
          WHEN county ILIKE '%kern%' THEN 'kern'
          WHEN county ILIKE '%tulare%' THEN 'tulare'
          WHEN county ILIKE '%kings%' THEN 'kings'
          WHEN county ILIKE '%fresno%' THEN 'fresno'
          WHEN county ILIKE '%san bernardino%' OR county ILIKE '%san_bernardino%' OR county ILIKE '%sanbernardino%' THEN 'san_bernardino'
          ELSE 'other' END = ${wantedKey})
      ORDER BY anomaly_score DESC NULLS LAST, detected_at DESC NULLS LAST
      LIMIT 25`,
    w`SELECT COUNT(*)::bigint AS c
      FROM anomaly_events
      WHERE sha256_hash IS NOT NULL
        AND anomaly_score IS NOT NULL
        AND (${wantedKey} = 'all' OR CASE
          WHEN county ILIKE '%kern%' THEN 'kern'
          WHEN county ILIKE '%tulare%' THEN 'tulare'
          WHEN county ILIKE '%kings%' THEN 'kings'
          WHEN county ILIKE '%fresno%' THEN 'fresno'
          WHEN county ILIKE '%san bernardino%' OR county ILIKE '%san_bernardino%' OR county ILIKE '%sanbernardino%' THEN 'san_bernardino'
          ELSE 'other' END = ${wantedKey})`,
    w`SELECT CASE
          WHEN county ILIKE '%kern%' THEN 'kern'
          WHEN county ILIKE '%tulare%' THEN 'tulare'
          WHEN county ILIKE '%kings%' THEN 'kings'
          WHEN county ILIKE '%fresno%' THEN 'fresno'
          WHEN county ILIKE '%san bernardino%' OR county ILIKE '%san_bernardino%' OR county ILIKE '%sanbernardino%' THEN 'san_bernardino'
          ELSE 'other' END AS county_key,
        COUNT(*)::bigint AS c
      FROM anomaly_events
      WHERE anomaly_score IS NOT NULL
      GROUP BY 1`,
    w`SELECT CASE
          WHEN anomaly_score >= 0.75 THEN 4
          WHEN anomaly_score >= 0.50 THEN 3
          WHEN anomaly_score >= 0.25 THEN 2
          ELSE 1 END AS tier,
        COUNT(*)::bigint AS c
      FROM anomaly_events
      WHERE anomaly_score IS NOT NULL
        AND (${wantedKey} = 'all' OR CASE
          WHEN county ILIKE '%kern%' THEN 'kern'
          WHEN county ILIKE '%tulare%' THEN 'tulare'
          WHEN county ILIKE '%kings%' THEN 'kings'
          WHEN county ILIKE '%fresno%' THEN 'fresno'
          WHEN county ILIKE '%san bernardino%' OR county ILIKE '%san_bernardino%' OR county ILIKE '%sanbernardino%' THEN 'san_bernardino'
          ELSE 'other' END = ${wantedKey})
      GROUP BY 1`,
  ]);
  // Score → tier mapping (documented on /methodology):
  //   0–25 = T1 LOW, 25–50 = T2 MEDIUM, 50–75 = T3 HIGH, 75–100 = T4 CRITICAL
  const tierOf = (wti: number) => {
    if (wti >= 75) return { tier: 4, level: "CRITICAL" };
    if (wti >= 50) return { tier: 3, level: "HIGH" };
    if (wti >= 25) return { tier: 2, level: "MEDIUM" };
    return { tier: 1, level: "LOW" };
  };
  const enriched = (top as any[]).map((r) => {
    // anomaly_score is roughly 0..1 in quiet-math; project to 0..100.
    const rawScore = r.anomaly_score != null ? Number(r.anomaly_score) : 0;
    const wti = Math.min(100, Math.round(rawScore * 100 * 10) / 10);
    const t = tierOf(wti);
    const cf = (r.contributing_factors && typeof r.contributing_factors === "object") ? r.contributing_factors : {};
    return {
      detectionId: String(r.detection_id),
      wti,
      tier: t.tier,
      level: t.level,
      computedAt: r.detected_at ? new Date(r.detected_at).toISOString() : null,
      components: {
        altitude: cf.altitude ?? null,
        temporal: cf.temporal ?? null,
        convergence: cf.convergence ?? null,
        shellNetwork: cf.shell_network ?? cf.shellNetwork ?? null,
        repeatFrequency: cf.repeat_frequency ?? cf.repeatFrequency ?? null,
        weights: {
          altitude: 0.35, temporal: 0.20, convergence: 0.12, shell: 0.18, repeat: 0.15,
        },
      },
      hashShort: r.sha256_hash ? String(r.sha256_hash).slice(0, 12) : null,
      county: r.county ?? null,
    } as ThreatTopRow;
  });
  const countyCountMap = new Map<string, number>((countyAgg as any[]).map((r) => [String(r.county_key), Number(r.c)]));
  const countyCounts = (["kern", "tulare", "kings", "fresno", "san_bernardino", "other"] as CountyKey[])
    .map((k) => ({ county: COUNTY_LABEL[k], count: countyCountMap.get(k) ?? 0 }));
  const buckets = (bucketAgg as any[])
    .map((r) => ({ tier: Number(r.tier), level: tierOf(Number(r.tier) === 4 ? 100 : Number(r.tier) === 3 ? 50 : Number(r.tier) === 2 ? 25 : 0).level, count: Number(r.c) }))
    .sort((a, b) => b.tier - a.tier);
  return {
    total: Number(tot[0].c),
    buckets,
    top: enriched,
    methodVersion: "quiet-math.wti.v1",
    hashedRows: Number(hashed[0].c),
    countyCounts,
    countyFilter: wantedKey === "all" ? null : wantedKey,
  };
});

// ============================================================
// COUNTY BASELINES & KERN ALERTS — per-county lens
// ============================================================

export type CountyBaseline = {
  county: string;
  countyKey: CountyKey;
  samples: number;
  medianAltitude: number | null;
  p10Altitude: number | null;
  medianSpeed: number | null;
  nightPct: number | null;
  uniqueAircraft: number;
};

export const getCountyBaselines = createServerFn({ method: "GET" }).handler(
  async (): Promise<CountyBaseline[]> => {
    try {
      const w = watchtower();
      const rows = await w`
        SELECT county,
               COUNT(*)::int AS samples,
               COUNT(DISTINCT icao_hex)::int AS uniq,
               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY altitude_ft) AS med_alt,
               PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY altitude_ft) AS p10_alt,
               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY speed_kts) AS med_spd,
               AVG(CASE WHEN EXTRACT(HOUR FROM captured_at) < 6 OR EXTRACT(HOUR FROM captured_at) >= 22
                        THEN 1 ELSE 0 END)::float AS night_pct
        FROM detections
        WHERE captured_at >= NOW() - INTERVAL '48 hours'
          AND altitude_ft IS NOT NULL
          AND altitude_ft >= 0
          AND on_ground = false
          AND county IS NOT NULL
        GROUP BY county
        ORDER BY samples DESC
      `;
      // Collapse into the AOI buckets
      const agg = new Map<CountyKey, { samples: number; uniq: number; medAlt: number[]; p10Alt: number[]; medSpd: number[]; night: number[] }>();
      for (const r of rows as any[]) {
        const key = normalizeCountyKey(r.county);
        const cur = agg.get(key) ?? { samples: 0, uniq: 0, medAlt: [], p10Alt: [], medSpd: [], night: [] };
        cur.samples += Number(r.samples ?? 0);
        cur.uniq += Number(r.uniq ?? 0);
        if (r.med_alt != null) cur.medAlt.push(Number(r.med_alt));
        if (r.p10_alt != null) cur.p10Alt.push(Number(r.p10_alt));
        if (r.med_spd != null) cur.medSpd.push(Number(r.med_spd));
        if (r.night_pct != null) cur.night.push(Number(r.night_pct));
        agg.set(key, cur);
      }
      const avg = (xs: number[]) => (xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10);
      const out: CountyBaseline[] = [];
      for (const key of ["kern", "tulare", "kings", "fresno", "san_bernardino", "other"] as CountyKey[]) {
        const v = agg.get(key);
        out.push({
          county: COUNTY_LABEL[key],
          countyKey: key,
          samples: v?.samples ?? 0,
          uniqueAircraft: v?.uniq ?? 0,
          medianAltitude: v ? avg(v.medAlt) : null,
          p10Altitude: v ? avg(v.p10Alt) : null,
          medianSpeed: v ? avg(v.medSpd) : null,
          nightPct: v && v.night.length > 0 ? Math.round((v.night.reduce((a, b) => a + b, 0) / v.night.length) * 1000) / 10 : null,
        });
      }
      return out;
    } catch (err) {
      console.error("getCountyBaselines failed:", err);
      return [];
    }
  },
);

export type KernAlert = {
  icao: string;
  registration: string | null;
  owner: string | null;
  model: string | null;
  capturedAt: string;
  altitude: number | null;
  speed: number | null;
  county: string | null;
  kernZ: number | null; // deviation from Kern's own median altitude (low = scary)
};

export const getKernAlerts = createServerFn({ method: "GET" }).handler(async (): Promise<KernAlert[]> => {
  try {
    const w = watchtower();
    const [rows, base] = await Promise.all([
      w`
        SELECT d.icao_hex, d.registration, d.captured_at, d.altitude_ft, d.speed_kts, d.county,
               p.registered_owner, p.aircraft_model
        FROM detections d
        LEFT JOIN aircraft_profiles p ON p.icao_hex = d.icao_hex
        WHERE d.county ILIKE '%kern%'
          AND d.captured_at >= NOW() - INTERVAL '24 hours'
          AND d.altitude_ft IS NOT NULL
          AND d.altitude_ft >= 0
          AND d.altitude_ft < 2500
          AND d.on_ground = false
        ORDER BY d.altitude_ft ASC, d.captured_at DESC
        LIMIT 25
      `,
      w`
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY altitude_ft) AS med,
               STDDEV_POP(altitude_ft)::float AS sd
        FROM detections
        WHERE county ILIKE '%kern%'
          AND captured_at >= NOW() - INTERVAL '48 hours'
          AND altitude_ft IS NOT NULL
          AND altitude_ft >= 0
          AND on_ground = false
      `,
    ]);
    const med = (base as any[])[0]?.med != null ? Number((base as any[])[0].med) : null;
    const sd = (base as any[])[0]?.sd != null ? Number((base as any[])[0].sd) : null;
    return (rows as any[]).map((r) => {
      const alt = r.altitude_ft != null ? Number(r.altitude_ft) : null;
      const z = alt != null && med != null && sd && sd > 0 ? Math.round(((med - alt) / sd) * 10) / 10 : null;
      return {
        icao: r.icao_hex,
        registration: r.registration,
        owner: r.registered_owner,
        model: r.aircraft_model,
        capturedAt: new Date(r.captured_at).toISOString(),
        altitude: alt,
        speed: r.speed_kts != null ? Number(r.speed_kts) : null,
        county: r.county,
        kernZ: z,
      };
    });
  } catch (err) {
    console.error("getKernAlerts failed:", err);
    return [];
  }
});

export type MlAnomaly = {
  id: string;
  detectedAt: string;
  registration: string | null;
  icao24: string | null;
  callsign: string | null;
  anomalyType: string | null;
  anomalyScore: number | null;
  confidence: string | null;
  modelName: string | null;
  modelVersion: string | null;
  validated: boolean;
  identifiedName: string | null;
  registrantCity: string | null;
  registrantState: string | null;
  featureKeys: string[];
  hashShort: string | null;
};

export type MlModelCard = {
  total: number;
  validatedTrue: number;
  validationRate: number; // 0..1
  distinctModels: number;
  distinctVersions: number;
  topModels: { modelName: string | null; modelVersion: string | null; count: number }[];
};

export type MlPayload = {
  card: MlModelCard;
  rows: MlAnomaly[];
};

export const getMlAnomalies = createServerFn({ method: "GET" }).handler(async (): Promise<MlPayload> => {
  // Source: anomaly_events (quiet-math). Model identity lives in ml_brain_reports.
  const w = watchtower();
  const [rows, stats, brain] = await Promise.all([
    w`
      SELECT id::text AS id, detected_at, registration AS aircraft_registration, icao_hex AS icao24,
             anomaly_type, anomaly_score, contributing_factors AS features,
             human_reviewed AS validated, sha256_hash
      FROM anomaly_events
      WHERE anomaly_score IS NOT NULL
      ORDER BY detected_at DESC NULLS LAST
      LIMIT 50
    `,
    w`
      SELECT COUNT(*)::bigint AS total,
             COUNT(*) FILTER (WHERE human_reviewed = true)::bigint AS validated_true
      FROM anomaly_events
    `,
    w`
      SELECT registration, top_hypothesis, confidence, created_at
      FROM ml_brain_reports
      ORDER BY created_at DESC NULLS LAST
      LIMIT 5
    `,
  ]);
  const MODEL_NAME = "watchtower-isolation-forest";
  const MODEL_VERSION = "1.0";
  const confidenceBand = (score: number | null) => {
    if (score == null) return null;
    if (score >= 0.75) return "HIGH";
    if (score >= 0.5) return "MEDIUM";
    return "LOW";
  };
  const idMap = await faaIdentityMap(
    (rows as any[]).map((r) => ({ registration: r.aircraft_registration, icao: r.icao24 })),
  );
  const mapped = (rows as any[]).map((r) => {
    const id = lookupIdentity(idMap, r.aircraft_registration, r.icao24);
    const fk = r.features && typeof r.features === "object" ? Object.keys(r.features).slice(0, 6) : [];
    const score = r.anomaly_score != null ? Number(r.anomaly_score) : null;
    return {
    id: String(r.id),
    detectedAt: r.detected_at ? new Date(r.detected_at).toISOString() : new Date(0).toISOString(),
    registration: r.aircraft_registration,
    icao24: r.icao24,
    callsign: null,
    anomalyType: r.anomaly_type,
    anomalyScore: score,
    confidence: confidenceBand(score),
    modelName: MODEL_NAME,
    modelVersion: MODEL_VERSION,
    validated: !!r.validated,
      identifiedName: id?.name ?? null,
      registrantCity: id?.city ?? null,
      registrantState: id?.state ?? null,
      featureKeys: fk,
      hashShort: r.sha256_hash ? String(r.sha256_hash).slice(0, 12) : null,
    };
  });
  const total = Number(stats[0].total);
  const validatedTrue = Number(stats[0].validated_true);
  return {
    card: {
      total,
      validatedTrue,
      validationRate: total > 0 ? validatedTrue / total : 0,
      distinctModels: 1,
      distinctVersions: 1,
      topModels: [
        { modelName: MODEL_NAME, modelVersion: MODEL_VERSION, count: total },
        ...(brain as any[]).map((r) => ({
          modelName: `brain-report · ${r.registration ?? "n/a"}`,
          modelVersion: r.confidence != null ? `conf ${Number(r.confidence).toFixed(2)}` : null,
          count: 1,
        })),
      ],
    },
    rows: mapped,
  };
});

// ============= Neon-native violations (violation_classifications) =============
export type NeonViolation = {
  detectionId: string | null;
  icao: string;
  registration: string | null;
  capturedAt: string;
  altitude: number | null;
  speed: number | null;
  latitude: number | null;
  longitude: number | null;
  rule: string;
  ownerName: string | null;
  ownerCity: string | null;
  ownerState: string | null;
  typeRegistrant: string | null;
  aircraftMfr: string | null;
  aircraftModel: string | null;
};

export type NeonViolationSummary = {
  totalRows: number;
  firstSeen: string | null;
  lastSeen: string | null;
  ruleCounts: { rule: string; count: number }[];
  topOperators: { ownerName: string; ownerCity: string | null; ownerState: string | null; count: number }[];
  rows: NeonViolation[];
};

export const getNeonViolations = createServerFn({ method: "GET" }).handler(async (): Promise<NeonViolationSummary> => {
  const w = watchtower();
  const [meta, ruleCounts, topOps, rows] = await Promise.all([
    w`SELECT COUNT(*)::int AS total,
             MIN(captured_at) AS first_seen,
             MAX(captured_at) AS last_seen
      FROM violation_classifications`,
    w`SELECT rule_violated, COUNT(*)::int AS c
      FROM violation_classifications
      GROUP BY rule_violated
      ORDER BY c DESC`,
    w`SELECT owner_name, owner_city, owner_state, COUNT(*)::int AS c
      FROM violation_classifications
      WHERE owner_name IS NOT NULL
      GROUP BY owner_name, owner_city, owner_state
      ORDER BY c DESC
      LIMIT 15`,
    w`SELECT detection_id, icao_hex, registration, captured_at, altitude_ft, speed_kts,
             latitude, longitude, rule_violated, owner_name, owner_city, owner_state,
             type_registrant, aircraft_mfr, aircraft_model
      FROM violation_classifications
      WHERE altitude_ft IS NULL OR altitude_ft >= -100
      ORDER BY captured_at DESC NULLS LAST
      LIMIT 100`,
  ]);
  const m = meta[0] as any;
  return {
    totalRows: m?.total ?? 0,
    firstSeen: m?.first_seen ? new Date(m.first_seen).toISOString() : null,
    lastSeen: m?.last_seen ? new Date(m.last_seen).toISOString() : null,
    ruleCounts: (ruleCounts as any[]).map((r) => ({ rule: r.rule_violated, count: r.c })),
    topOperators: (topOps as any[]).map((r) => ({
      ownerName: r.owner_name, ownerCity: r.owner_city, ownerState: r.owner_state, count: r.c,
    })),
    rows: (rows as any[]).map((r) => ({
      detectionId: r.detection_id ?? null,
      icao: r.icao_hex,
      registration: r.registration,
      capturedAt: r.captured_at ? new Date(r.captured_at).toISOString() : new Date(0).toISOString(),
      altitude: r.altitude_ft,
      speed: r.speed_kts != null ? Number(r.speed_kts) : null,
      latitude: r.latitude != null ? Number(r.latitude) : null,
      longitude: r.longitude != null ? Number(r.longitude) : null,
      rule: r.rule_violated,
      ownerName: r.owner_name,
      ownerCity: r.owner_city,
      ownerState: r.owner_state,
      typeRegistrant: r.type_registrant,
      aircraftMfr: r.aircraft_mfr,
      aircraftModel: r.aircraft_model,
    })),
  };
});

// ============= Local agencies in airspace (Kern + neighbors, from FAA registry match) =============
export type LocalAgencyAircraft = {
  icao: string;
  registration: string | null;
  agency: string;
  city: string | null;
  state: string | null;
  detections: number;
  minAltitude: number | null;
  avgAltitude: number | null;
  counties: string;
  firstSeen: string;
  lastSeen: string;
};

export const getLocalAgencyAircraft = createServerFn({ method: "GET" }).handler(async (): Promise<LocalAgencyAircraft[]> => {
  const w = watchtower();
  const rows = await w`
    SELECT d.icao_hex, d.registration, m.name, m.city, m.state,
           COUNT(*)::int AS detections,
           MIN(d.altitude_ft) AS min_alt,
           ROUND(AVG(d.altitude_ft)::numeric, 0)::int AS avg_alt,
           STRING_AGG(DISTINCT d.county, ',' ORDER BY d.county) AS counties,
           MIN(d.captured_at) AS first_seen,
           MAX(d.captured_at) AS last_seen
    FROM detections d
    JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(d.icao_hex)
    WHERE (m.name ILIKE '%kern county%'
        OR m.name ILIKE '%bakersfield%'
        OR m.city ILIKE '%bakersfield%')
      AND (d.altitude_ft IS NULL OR d.altitude_ft >= -100)
    GROUP BY d.icao_hex, d.registration, m.name, m.city, m.state
    ORDER BY detections DESC
    LIMIT 25
  `;
  return (rows as any[]).map((r) => ({
    icao: r.icao_hex,
    registration: r.registration,
    agency: r.name,
    city: r.city,
    state: r.state,
    detections: r.detections,
    minAltitude: r.min_alt == null ? null : Number(r.min_alt),
    avgAltitude: r.avg_alt == null ? null : Number(r.avg_alt),
    counties: r.counties ?? "",
    firstSeen: r.first_seen ? new Date(r.first_seen).toISOString() : new Date(0).toISOString(),
    lastSeen: r.last_seen ? new Date(r.last_seen).toISOString() : new Date(0).toISOString(),
  }));
});

// ============================================================
// BEHAVIORAL COORDINATION — operational-role classifier
// ------------------------------------------------------------
// Three buckets, behavior-first (not registry-first):
//   1. Direct State Patrol      — registry-owned by government
//   2. Contractor State Function — private LLC whose telemetry matches the
//                                   government baseline (altitude / county /
//                                   hour-of-day). § 1983 via public-function test.
//   3. Enterprise Auxiliary      — private/shell coordinating with the same
//                                   pattern (RICO predicate signal).
// ============================================================

export type CoordinationRow = {
  icao: string;
  registration: string | null;
  registryOwner: string | null;
  registrantType: string | null;
  city: string | null;
  state: string | null;
  detections: number;
  medianAltitude: number | null;
  minAltitude: number | null;
  nightPct: number | null;        // 0..1 share of detections at night
  darknessFlag: boolean;          // night-dominant ≥70% (concealment signature)
  countiesSeen: string[];
  hoursSeen: number[];
  countyOverlap: number;        // 0..1
  hourOverlap: number;          // 0..1
  altitudeMatch: boolean;
  lowOrbit: boolean;            // median < 1500 ft
  coordinationScore: number;    // 0..4
  operationalRole:
    | "Direct State Patrol"
    | "Contractor State Function"
    | "Enterprise Auxiliary"
    | "Independent";
  legalTheory: string;
  kernPriority: boolean;       // owner mentions Kern/Bakersfield/KCSO OR seen in Kern county
  classificationBasis: "Registry" | "Behavior" | "Registry + Behavior";
  lastSeen: string;
};

export type BehavioralBaseline = {
  aircraft: { registration: string | null; icao: string; owner: string | null }[];
  counties: string[];
  hours: number[];
  medianBand: { lo: number; hi: number } | null;
};

export type BehavioralCoordination = {
  baseline: BehavioralBaseline;
  rows: CoordinationRow[];
  countByRole: Record<CoordinationRow["operationalRole"], number>;
};

const DIRECT_STATE_RX =
  /\b(sheriff|police|county of|city of|fire (department|district)|department of|state of|u\.?s\.?|united states|customs|border patrol|f\.?b\.?i|federal bureau|drug enforcement|highway patrol|chp|government|kern county|bakersfield|kcso|kcsi|county sheriff|county of kern)\b/i;
const CONTRACTOR_RX =
  /\b(aerial|patrol|aviation|helicopter|airborne|airways|surveillance|security|recon)\b/i;
const SHELL_RX = /\b(llc|holdings|trust|llp|services|enterprises|capital|group)\b/i;
const KERN_COUNTY_RX = /\bkern\b/i;
const KERN_OWNER_RX = /\b(kern county|bakersfield|kcso|kcsi|9k air)\b/i;

function jaccard<T>(a: T[], b: T[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const A = new Set(a);
  let inter = 0;
  for (const x of b) if (A.has(x)) inter++;
  const union = new Set<T>([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

export const getBehavioralCoordination = createServerFn({ method: "GET" }).handler(
  async (): Promise<BehavioralCoordination> => {
    const w = watchtower();
    const rows = await w`
      SELECT d.icao_hex, d.registration,
             m.name AS owner, m.type_registrant, m.city, m.state,
             COUNT(*)::int AS detections,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY d.altitude_ft) AS median_alt,
             MIN(d.altitude_ft) AS min_alt,
             ARRAY_AGG(DISTINCT d.county) FILTER (WHERE d.county IS NOT NULL) AS counties,
             ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM d.captured_at)::int) AS hours,
             MAX(d.captured_at) AS last_seen,
             MAX(ap.night_pct) AS night_pct
      FROM detections d
      LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(d.icao_hex)
      LEFT JOIN aircraft_profiles ap ON UPPER(ap.icao_hex) = UPPER(d.icao_hex)
      WHERE d.altitude_ft IS NOT NULL
        AND d.altitude_ft >= -100
        AND d.on_ground = false
      GROUP BY d.icao_hex, d.registration, m.name, m.type_registrant, m.city, m.state
      HAVING COUNT(*) >= 10
      ORDER BY COUNT(*) DESC
      LIMIT 300
    `;

    type Raw = {
      icao_hex: string;
      registration: string | null;
      owner: string | null;
      type_registrant: string | null;
      city: string | null;
      state: string | null;
      detections: number;
      median_alt: number | null;
      min_alt: number | null;
      counties: string[] | null;
      hours: number[] | null;
      last_seen: string;
      night_pct: number | null;
    };
    const all = (rows as any[]) as Raw[];

    // Build baseline from direct-state aircraft
    const direct = all.filter(
      (r) => r.owner && DIRECT_STATE_RX.test(r.owner),
    );
    const baseCountiesSet = new Set<string>();
    const baseHoursSet = new Set<number>();
    const baseMedians: number[] = [];
    for (const d of direct) {
      (d.counties ?? []).forEach((c) => c && baseCountiesSet.add(c));
      (d.hours ?? []).forEach((h) => h != null && baseHoursSet.add(Number(h)));
      if (d.median_alt != null) baseMedians.push(Number(d.median_alt));
    }
    baseMedians.sort((a, b) => a - b);
    const medianBand =
      baseMedians.length > 0
        ? {
            lo: Math.min(...baseMedians) - 200,
            hi: Math.max(...baseMedians) + 200,
          }
        : null;
    const baseCounties = Array.from(baseCountiesSet);
    const baseHours = Array.from(baseHoursSet);

    const baselineAircraft = direct.map((d) => ({
      registration: d.registration,
      icao: d.icao_hex,
      owner: d.owner,
    }));

    function classify(r: Raw): CoordinationRow {
      const counties = (r.counties ?? []).filter(Boolean) as string[];
      const hours = (r.hours ?? []).map(Number);
      const med = r.median_alt != null ? Number(r.median_alt) : null;

      const isDirect = !!r.owner && DIRECT_STATE_RX.test(r.owner);
      const countyOverlap =
        counties.length === 0
          ? 0
          : counties.filter((c) => baseCountiesSet.has(c)).length / counties.length;
      const hourOverlap = jaccard(hours, baseHours);
      const altitudeMatch =
        medianBand != null && med != null && med >= medianBand.lo && med <= medianBand.hi;
      const lowOrbit = med != null && med < 1500;

      let score = 0;
      if (altitudeMatch) score++;
      if (countyOverlap >= 0.5) score++;
      if (hourOverlap >= 0.4) score++;
      if (lowOrbit) score++;

      let role: CoordinationRow["operationalRole"];
      let theory: string;
      if (isDirect) {
        role = "Direct State Patrol";
        theory =
          "Government-owned per FAA registry. State actor by ownership. 42 U.S.C. § 1983 applies directly.";
      } else if (score >= 3 && r.owner && CONTRACTOR_RX.test(r.owner)) {
        role = "Contractor State Function";
        theory =
          "Private contractor whose telemetry matches the government baseline. Public-function test (Marsh v. Alabama) — state actor for § 1983 purposes.";
      } else if (score >= 3 && r.owner && SHELL_RX.test(r.owner)) {
        role = "Enterprise Auxiliary";
        theory =
          "Private/shell entity coordinated with the state-actor cluster. RICO predicate signal — 18 U.S.C. § 1962(c), \"association in fact\" per § 1961(4).";
      } else if (score >= 3) {
        role = "Enterprise Auxiliary";
        theory =
          "Behavior matches the state-actor cluster despite non-government registry. Coordination warrants further inquiry.";
      } else {
        role = "Independent";
        theory = "No behavioral coordination with state-actor baseline detected.";
      }

      const kernOwner = !!r.owner && KERN_OWNER_RX.test(r.owner);
      const kernSeen = counties.some((c) => KERN_COUNTY_RX.test(c));
      const kernPriority = kernOwner || kernSeen;

      let classificationBasis: CoordinationRow["classificationBasis"];
      if (isDirect && score >= 3) classificationBasis = "Registry + Behavior";
      else if (isDirect) classificationBasis = "Registry";
      else classificationBasis = "Behavior";

      return {
        icao: r.icao_hex,
        registration: r.registration,
        registryOwner: r.owner,
        registrantType: r.type_registrant,
        city: r.city,
        state: r.state,
        detections: r.detections,
        medianAltitude: med,
        minAltitude: r.min_alt != null ? Number(r.min_alt) : null,
        nightPct: r.night_pct != null ? Number(r.night_pct) : null,
        darknessFlag: r.night_pct != null && Number(r.night_pct) >= 0.7,
        countiesSeen: counties,
        hoursSeen: hours,
        countyOverlap: Math.round(countyOverlap * 100) / 100,
        hourOverlap: Math.round(hourOverlap * 100) / 100,
        altitudeMatch,
        lowOrbit,
        coordinationScore: score,
        operationalRole: role,
        legalTheory: theory,
        kernPriority,
        classificationBasis,
        lastSeen: new Date(r.last_seen).toISOString(),
      };
    }

    const classified = all.map(classify);

    // Keep direct + anything with score >= 2; cap at 100 by detections.
    const filtered = classified
      .filter((r) => r.operationalRole !== "Independent" || r.coordinationScore >= 2)
      .sort((a, b) => {
        const rank: Record<CoordinationRow["operationalRole"], number> = {
          "Direct State Patrol": 0,
          "Contractor State Function": 1,
          "Enterprise Auxiliary": 2,
          Independent: 3,
        };
        if (rank[a.operationalRole] !== rank[b.operationalRole])
          return rank[a.operationalRole] - rank[b.operationalRole];
        // Kern-priority floats up inside each bucket (not a filter — a weight)
        if (a.kernPriority !== b.kernPriority) return a.kernPriority ? -1 : 1;
        if (b.coordinationScore !== a.coordinationScore)
          return b.coordinationScore - a.coordinationScore;
        return b.detections - a.detections;
      })
      .slice(0, 100);

    const countByRole: Record<CoordinationRow["operationalRole"], number> = {
      "Direct State Patrol": 0,
      "Contractor State Function": 0,
      "Enterprise Auxiliary": 0,
      Independent: 0,
    };
    for (const r of filtered) countByRole[r.operationalRole]++;

    return {
      baseline: {
        aircraft: baselineAircraft,
        counties: baseCounties.sort(),
        hours: baseHours.sort((a, b) => a - b),
        medianBand,
      },
      rows: filtered,
      countByRole,
    };
  },
);

// ============================================================
// FOREIGN-REGISTERED AIRCRAFT
// ============================================================

export type ForeignAircraft = {
  registration: string;
  icao: string | null;
  countryCode: string;
  country: string;
  totalDetections: number;
  minAltitude: number | null;
  avgAltitude: number | null;
  maxAltitude: number | null;
  nightPct: number | null;
  anomalyScore: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  owner: string | null;
  model: string | null;
};

export type ForeignAircraftSummary = {
  totalAircraft: number;
  totalDetections: number;
  byCountry: { country: string; code: string; aircraft: number; detections: number }[];
  aircraft: ForeignAircraft[];
};

// ICAO civil-registration prefix → country (subset; broadest first).
// Order matters: longer/specific prefixes must be tested before single-letter ones.
const REG_PREFIX_COUNTRY: { prefix: string; code: string; country: string }[] = [
  { prefix: "XA-", code: "MX", country: "Mexico" },
  { prefix: "XB-", code: "MX", country: "Mexico" },
  { prefix: "XC-", code: "MX", country: "Mexico" },
  { prefix: "VH-", code: "AU", country: "Australia" },
  { prefix: "VT-", code: "IN", country: "India" },
  { prefix: "VP-", code: "GB", country: "UK Overseas Territory" },
  { prefix: "VQ-", code: "GB", country: "UK Overseas Territory" },
  { prefix: "PH-", code: "NL", country: "Netherlands" },
  { prefix: "PK-", code: "ID", country: "Indonesia" },
  { prefix: "PT-", code: "BR", country: "Brazil" },
  { prefix: "PP-", code: "BR", country: "Brazil" },
  { prefix: "PR-", code: "BR", country: "Brazil" },
  { prefix: "PS-", code: "BR", country: "Brazil" },
  { prefix: "JA",  code: "JP", country: "Japan" },
  { prefix: "HL",  code: "KR", country: "South Korea" },
  { prefix: "HB-", code: "CH", country: "Switzerland" },
  { prefix: "HK-", code: "CO", country: "Colombia" },
  { prefix: "HZ-", code: "SA", country: "Saudi Arabia" },
  { prefix: "OE-", code: "AT", country: "Austria" },
  { prefix: "OO-", code: "BE", country: "Belgium" },
  { prefix: "OY-", code: "DK", country: "Denmark" },
  { prefix: "OH-", code: "FI", country: "Finland" },
  { prefix: "EI-", code: "IE", country: "Ireland" },
  { prefix: "EC-", code: "ES", country: "Spain" },
  { prefix: "EP-", code: "IR", country: "Iran" },
  { prefix: "TC-", code: "TR", country: "Turkey" },
  { prefix: "TF-", code: "IS", country: "Iceland" },
  { prefix: "LV-", code: "AR", country: "Argentina" },
  { prefix: "LN-", code: "NO", country: "Norway" },
  { prefix: "SE-", code: "SE", country: "Sweden" },
  { prefix: "SP-", code: "PL", country: "Poland" },
  { prefix: "SX-", code: "GR", country: "Greece" },
  { prefix: "ZK-", code: "NZ", country: "New Zealand" },
  { prefix: "ZS-", code: "ZA", country: "South Africa" },
  { prefix: "CC-", code: "CL", country: "Chile" },
  { prefix: "5N-", code: "NG", country: "Nigeria" },
  { prefix: "9V-", code: "SG", country: "Singapore" },
  { prefix: "9M-", code: "MY", country: "Malaysia" },
  { prefix: "A6-", code: "AE", country: "United Arab Emirates" },
  { prefix: "A7-", code: "QA", country: "Qatar" },
  { prefix: "A9C-", code: "BH", country: "Bahrain" },
  { prefix: "B-",  code: "CN", country: "China / Taiwan / Hong Kong" },
  { prefix: "C-",  code: "CA", country: "Canada" },
  { prefix: "CF-", code: "CA", country: "Canada" },
  { prefix: "D-",  code: "DE", country: "Germany" },
  { prefix: "F-",  code: "FR", country: "France" },
  { prefix: "G-",  code: "GB", country: "United Kingdom" },
  { prefix: "I-",  code: "IT", country: "Italy" },
];

function classifyForeign(reg: string | null): { code: string; country: string } | null {
  if (!reg) return null;
  const s = reg.trim().toUpperCase();
  if (!s) return null;
  // U.S. registrations always start with N + digit.
  if (/^N\d/.test(s)) return null;
  for (const p of REG_PREFIX_COUNTRY) {
    if (s.startsWith(p.prefix)) return { code: p.code, country: p.country };
  }
  // Heuristic: any registration containing a '-' that isn't N-prefixed is non-US civil.
  if (s.includes("-") || /^[A-Z]{2,}/.test(s)) return { code: "??", country: "Foreign (unmapped)" };
  return null;
}

export const getForeignAircraft = createServerFn({ method: "GET" }).handler(
  async (): Promise<ForeignAircraftSummary> => {
    const w = watchtower();
    const rows = await w`
      SELECT icao_hex, observed_registration, registered_owner, aircraft_model,
             total_detections, min_altitude, avg_altitude, max_altitude,
             night_pct, anomaly_score, first_seen, last_seen
      FROM aircraft_profiles
      WHERE observed_registration IS NOT NULL
        AND observed_registration !~ '^[Nn][0-9]'
      ORDER BY total_detections DESC NULLS LAST
      LIMIT 500
    `;
    const aircraft: ForeignAircraft[] = [];
    const countryAgg = new Map<string, { code: string; aircraft: number; detections: number }>();
    for (const r of rows as any[]) {
      const cls = classifyForeign(r.observed_registration);
      if (!cls) continue;
      const rawMin = r.min_altitude == null ? null : Number(r.min_altitude);
      const minAlt = rawMin != null && rawMin < -100 ? null : rawMin;
      aircraft.push({
        registration: r.observed_registration,
        icao: r.icao_hex,
        countryCode: cls.code,
        country: cls.country,
        totalDetections: Number(r.total_detections ?? 0),
        minAltitude: minAlt,
        avgAltitude: r.avg_altitude != null ? Number(r.avg_altitude) : null,
        maxAltitude: r.max_altitude != null ? Number(r.max_altitude) : null,
        nightPct: r.night_pct != null ? Number(r.night_pct) : null,
        anomalyScore: r.anomaly_score != null ? Number(r.anomaly_score) : null,
        firstSeen: r.first_seen ? new Date(r.first_seen).toISOString() : null,
        lastSeen: r.last_seen ? new Date(r.last_seen).toISOString() : null,
        owner: r.registered_owner,
        model: r.aircraft_model,
      });
      const agg = countryAgg.get(cls.country) ?? { code: cls.code, aircraft: 0, detections: 0 };
      agg.aircraft += 1;
      agg.detections += Number(r.total_detections ?? 0);
      countryAgg.set(cls.country, agg);
    }
    const byCountry = Array.from(countryAgg.entries())
      .map(([country, v]) => ({ country, code: v.code, aircraft: v.aircraft, detections: v.detections }))
      .sort((a, b) => b.detections - a.detections);
    const totalDetections = aircraft.reduce((acc, a) => acc + a.totalDetections, 0);
    return { totalAircraft: aircraft.length, totalDetections, byCountry, aircraft };
  },
);

// ============================================================
// UNMAPPED-BUT-LIKELY-MILITARY
// Surface aircraft whose registration is missing or doesn't resolve to a
// known civil country, BUT whose ICAO 24-bit hex falls in a published
// military allocation (or whose owner string contains a service keyword).
// Sits on /foreign as the natural follow-on question: "what are these?"
// ============================================================

export type UnmappedMilSuspect = {
  icao: string;
  registration: string | null;
  owner: string | null;
  model: string | null;
  totalDetections: number;
  minAltitude: number | null;
  avgAltitude: number | null;
  nightPct: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  suspectedCountry: string;
  reason: string;
};

// Military ICAO 24-bit hex prefixes, sourced from public ICAO Annex 10 allocations.
// Each entry matches when UPPER(icao_hex) starts with `hex`.
const MIL_HEX_BLOCKS: { hex: string; country: string }[] = [
  { hex: "AE",   country: "United States (mil)" },
  { hex: "43C",  country: "United Kingdom (RAF)" },
  { hex: "7CF",  country: "Australia (RAAF)" },
  { hex: "738",  country: "Israel (IDF/AF)" },
  { hex: "3F",   country: "Germany (Luftwaffe)" },
  { hex: "33F",  country: "France (Armée de l'Air)" },
  { hex: "C87",  country: "Canada (CAF)" },
  { hex: "896",  country: "UAE (military)" },
  { hex: "71C",  country: "South Korea (ROKAF)" },
  { hex: "868",  country: "Japan (JASDF)" },
];

function classifyMilHex(icao: string | null | undefined): { country: string } | null {
  if (!icao) return null;
  const h = String(icao).toUpperCase().replace(/^0X/, "");
  for (const b of MIL_HEX_BLOCKS) if (h.startsWith(b.hex)) return { country: b.country };
  return null;
}

export const getUnmappedMilitarySuspects = createServerFn({ method: "GET" }).handler(
  async (): Promise<UnmappedMilSuspect[]> => {
    try {
      const w = watchtower();
      // Pull profiles that are NOT clearly US civil (N-prefix) and either have
      // no registration at all, or a registration that won't map to a country
      // (i.e. shows up as "Foreign (unmapped)").
      const rows = await w`
        SELECT p.icao_hex, p.observed_registration, p.registered_owner, p.aircraft_model,
               p.total_detections, p.min_altitude, p.avg_altitude, p.night_pct,
               p.first_seen, p.last_seen, m.name AS reg_name
        FROM aircraft_profiles p
        LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(p.icao_hex)
        WHERE COALESCE(p.observed_registration, '') !~ '^[Nn][0-9]'
        ORDER BY p.total_detections DESC NULLS LAST
        LIMIT 1500
      `;
      const MIL_NAME_RX = /\b(NAVY|ARMY|AIR FORCE|USAF|MARINE|USMC|COAST GUARD|USCG|NATIONAL GUARD|DEFENSE|DEFENCE|MOD\b|RAF|RAAF|ROKAF|JASDF|LUFTWAFFE|IDF|MILITARY)\b/i;
      const out: UnmappedMilSuspect[] = [];
      for (const r of rows as any[]) {
        const reg = r.observed_registration as string | null;
        // Skip rows where registration resolves to a normal civil country.
        const civil = classifyForeign(reg);
        if (civil && civil.country !== "Foreign (unmapped)") continue;

        const hexMatch = classifyMilHex(r.icao_hex);
        const nameBlob = `${r.registered_owner ?? ""} ${r.reg_name ?? ""}`;
        const nameMatch = MIL_NAME_RX.test(nameBlob);
        if (!hexMatch && !nameMatch) continue;

        const reasons: string[] = [];
        if (hexMatch) reasons.push(`ICAO hex in ${hexMatch.country} mil block`);
        if (nameMatch) reasons.push("Owner name matches service keyword");

        const rawMin = r.min_altitude == null ? null : Number(r.min_altitude);
        out.push({
          icao: r.icao_hex,
          registration: reg,
          owner: r.registered_owner ?? r.reg_name ?? null,
          model: r.aircraft_model ?? null,
          totalDetections: Number(r.total_detections ?? 0),
          minAltitude: rawMin != null && rawMin < -100 ? null : rawMin,
          avgAltitude: r.avg_altitude != null ? Number(r.avg_altitude) : null,
          nightPct: r.night_pct != null ? Number(r.night_pct) : null,
          firstSeen: r.first_seen ? new Date(r.first_seen).toISOString() : null,
          lastSeen: r.last_seen ? new Date(r.last_seen).toISOString() : null,
          suspectedCountry: hexMatch?.country ?? "Unknown (name-only match)",
          reason: reasons.join(" · "),
        });
      }
      return out.slice(0, 100);
    } catch (err) {
      console.error("getUnmappedMilitarySuspects failed:", err);
      return [];
    }
  },
);

// ============================================================
// /citations — Rule → CFR/USC + Consent Decree mapping
// ============================================================
export type CitationRow = {
  rule: string;
  count: number;
  part: string | null;
  section: string | null;
  cfrHeading: string | null;
  cfrHashShort: string | null;
};
export type DecreeRow = {
  provision: string;
  severity: string | null;
  description: string | null;
  date: string | null;
  hashShort: string | null;
};
export type CitationsPayload = {
  rules: CitationRow[];
  decrees: DecreeRow[];
  totals: {
    classifiedDetections: number;
    cfrRegs: number;
    cfrHashedPct: number;
    uscStatutes: number;
    uscHashedPct: number;
    decreeViolations: number;
  };
};

function parseFarRule(rule: string): { part: string | null; section: string | null } {
  // Examples: FAR_91_119_B_CONGESTED, FAR_107_29, NIGHT_LOW_RESIDENTIAL
  const m = rule.match(/^FAR_(\d+)(?:_(\d+))?/i);
  if (!m) return { part: null, section: null };
  return { part: m[1] ?? null, section: m[2] ?? null };
}

export const getCitationsMap = createServerFn({ method: "GET" }).handler(
  async (): Promise<CitationsPayload> => {
    const w = watchtower();
    const [ruleAgg, regs, decrees, totals] = await Promise.all([
      w`SELECT rule_violated AS rule, COUNT(*)::int AS c
        FROM violation_classifications
        WHERE rule_violated IS NOT NULL
        GROUP BY rule_violated
        ORDER BY c DESC`,
      w`SELECT part, section, heading, sha256_hash FROM faa_regulations`,
      w`SELECT decree_id::text AS provision_violated, severity, description AS violation_description,
               created_at AS violation_date, sha256_hash
        FROM consent_decree_violations
        ORDER BY created_at DESC NULLS LAST
        LIMIT 50`,
      Promise.all([
        w`SELECT COUNT(*)::int AS c FROM violation_classifications`,
        w`SELECT COUNT(*)::int AS total, COUNT(sha256_hash)::int AS hashed FROM faa_regulations`,
        w`SELECT COUNT(*)::int AS total, COUNT(sha256_hash)::int AS hashed FROM regulatory_statutes`,
        w`SELECT COUNT(*)::int AS c FROM consent_decree_violations`,
      ]),
    ]);

    const regIndex = new Map<string, { heading: string | null; hash: string | null }>();
    for (const r of regs as any[]) {
      const key = `${String(r.part ?? "").trim()}|${String(r.section ?? "").trim()}`;
      if (!regIndex.has(key)) regIndex.set(key, { heading: r.heading ?? null, hash: r.sha256_hash ?? null });
    }

    const rules: CitationRow[] = (ruleAgg as any[]).map((r) => {
      const { part, section } = parseFarRule(r.rule);
      const key = `${part ?? ""}|${section ?? ""}`;
      const hit = part && section ? regIndex.get(key) : null;
      return {
        rule: r.rule,
        count: r.c,
        part,
        section,
        cfrHeading: hit?.heading ?? null,
        cfrHashShort: hit?.hash ? hit.hash.slice(0, 12) : null,
      };
    });

    const decreeRows: DecreeRow[] = (decrees as any[]).map((d) => ({
      provision: d.provision_violated ?? "—",
      severity: d.severity ?? null,
      description: d.violation_description ?? null,
      date: d.violation_date ? new Date(d.violation_date).toISOString() : null,
      hashShort: d.sha256_hash ? String(d.sha256_hash).slice(0, 12) : null,
    }));

    const [tClass, tRegs, tUsc, tDec] = totals;
    return {
      rules,
      decrees: decreeRows,
      totals: {
        classifiedDetections: (tClass as any)[0].c,
        cfrRegs: (tRegs as any)[0].total,
        cfrHashedPct: (tRegs as any)[0].total ? Math.round(((tRegs as any)[0].hashed / (tRegs as any)[0].total) * 1000) / 10 : 0,
        uscStatutes: (tUsc as any)[0].total,
        uscHashedPct: (tUsc as any)[0].total ? Math.round(((tUsc as any)[0].hashed / (tUsc as any)[0].total) * 1000) / 10 : 0,
        decreeViolations: (tDec as any)[0].c,
      },
    };
  },
);

// ============================================================
// TAIL-NUMBER SEARCH
// ============================================================
export type TailDetection = {
  capturedAt: string;
  altitude: number | null;
  speed: number | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  onGround: boolean;
};
export type TailSearchResult = {
  registration: string;
  icao: string | null;
  owner: string | null;
  model: string | null;
  total: number;
  minAlt: number | null;
  avgAlt: number | null;
  maxAlt: number | null;
  nightPct: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  identifiedName: string | null;
  registrantCity: string | null;
  registrantState: string | null;
  detections: TailDetection[];
};

export const searchByTail = createServerFn({ method: "GET" })
  .inputValidator((d: { tail: string }) => ({
    tail: String(d?.tail ?? "").trim().toUpperCase().slice(0, 20).replace(/[^A-Z0-9-]/g, ""),
  }))
  .handler(async ({ data }): Promise<TailSearchResult | null> => {
    if (!data.tail) return null;
    const w = watchtower();
    const tail = data.tail;
    const [profile, dets] = await Promise.all([
      w`SELECT p.icao_hex, p.observed_registration, p.registered_owner, p.aircraft_model,
               p.total_detections, p.min_altitude, p.avg_altitude, p.max_altitude,
               p.night_pct, p.first_seen, p.last_seen,
               m.name AS reg_name, m.city AS reg_city, m.state AS reg_state
        FROM aircraft_profiles p
        LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(p.icao_hex)
        WHERE UPPER(p.observed_registration) = ${tail}
           OR UPPER(p.icao_hex) = ${tail}
        LIMIT 1`,
      w`SELECT captured_at, altitude_ft, speed_kts, county, latitude, longitude, on_ground
        FROM detections
        WHERE UPPER(registration) = ${tail} OR UPPER(icao_hex) = ${tail}
        ORDER BY captured_at DESC
        LIMIT 1000`,
    ]);
    const pArr = profile as any[];
    const dArr = dets as any[];
    if (pArr.length === 0 && dArr.length === 0) return null;
    const p = pArr[0] ?? {};
    const rawMin = p.min_altitude == null ? null : Number(p.min_altitude);
    return {
      registration: p.observed_registration ?? tail,
      icao: p.icao_hex ?? null,
      owner: p.registered_owner ?? null,
      model: p.aircraft_model ?? null,
      total: Number(p.total_detections ?? dArr.length),
      minAlt: rawMin != null && rawMin < -100 ? null : rawMin,
      avgAlt: p.avg_altitude != null ? Number(p.avg_altitude) : null,
      maxAlt: p.max_altitude != null ? Number(p.max_altitude) : null,
      nightPct: p.night_pct != null ? Number(p.night_pct) : null,
      firstSeen: p.first_seen ? new Date(p.first_seen).toISOString() : null,
      lastSeen: p.last_seen ? new Date(p.last_seen).toISOString() : null,
      identifiedName: p.reg_name ?? null,
      registrantCity: p.reg_city ?? null,
      registrantState: p.reg_state ?? null,
      detections: dArr.map((d) => ({
        capturedAt: new Date(d.captured_at).toISOString(),
        altitude: d.altitude_ft,
        speed: d.speed_kts != null ? Number(d.speed_kts) : null,
        county: d.county,
        latitude: d.latitude != null ? Number(d.latitude) : null,
        longitude: d.longitude != null ? Number(d.longitude) : null,
        onGround: !!d.on_ground,
      })),
    };
  });

// ============================================================
// MILITARY AIRCRAFT
// ============================================================
export type MilitaryAircraft = {
  registration: string | null;
  icao: string;
  owner: string | null;
  model: string | null;
  branch: string;
  totalDetections: number;
  minAltitude: number | null;
  avgAltitude: number | null;
  nightPct: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  countiesSeen: string[];
};
export type MilitarySummary = {
  totalAircraft: number;
  totalDetections: number;
  byBranch: { branch: string; aircraft: number; detections: number }[];
  aircraft: MilitaryAircraft[];
};

function classifyBranch(owner: string | null, icao: string | null): string {
  const o = (owner ?? "").toUpperCase();
  if (/\b(US NAVY|U\.S\. NAVY|DEPARTMENT OF NAVY|NAVAIR|NAVAL)\b/.test(o)) return "U.S. Navy";
  if (/\b(US ARMY|U\.S\. ARMY|DEPARTMENT OF ARMY)\b/.test(o)) return "U.S. Army";
  if (/\b(AIR FORCE|USAF)\b/.test(o)) return "U.S. Air Force";
  if (/\b(MARINE CORPS|USMC|MARINES)\b/.test(o)) return "U.S. Marines";
  if (/\b(COAST GUARD|USCG)\b/.test(o)) return "U.S. Coast Guard";
  if (/\bNATIONAL GUARD\b/.test(o)) return "National Guard";
  if (/\b(DEPARTMENT OF DEFENSE|DEPT OF DEFENSE|\bDOD\b)\b/.test(o)) return "DoD (unspecified)";
  const h = (icao ?? "").toUpperCase();
  if (/^AE[0-9A-F]{4}$/.test(h)) return "U.S. Military (ICAO AE-range)";
  return "Military (unclassified)";
}

export const getMilitaryAircraft = createServerFn({ method: "GET" }).handler(
  async (): Promise<MilitarySummary> => {
    const empty: MilitarySummary = { totalAircraft: 0, totalDetections: 0, byBranch: [], aircraft: [] };
    try {
    const w = watchtower();
    const rows = await w`
      WITH det_mil AS (
        SELECT UPPER(icao_hex) AS icao_hex,
               COUNT(*)::int AS d_count,
               MIN(altitude_ft)::int AS d_min_alt,
               AVG(altitude_ft)::float AS d_avg_alt,
               MIN(captured_at) AS d_first,
               MAX(captured_at) AS d_last,
               MAX(registration) AS d_reg
        FROM detections
        WHERE UPPER(icao_hex) LIKE 'AE%'
        GROUP BY 1
      ),
      profile_mil AS (
        SELECT UPPER(p.icao_hex) AS icao_hex
        FROM aircraft_profiles p
        LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(p.icao_hex)
        WHERE UPPER(p.icao_hex) LIKE 'AE%'
           OR UPPER(COALESCE(p.registered_owner, m.name, '')) ~ '(NAVY|ARMY|AIR FORCE|USAF|MARINE CORPS|USMC|COAST GUARD|USCG|NATIONAL GUARD|DEPARTMENT OF DEFENSE|DEPT OF DEFENSE)'
      ),
      all_mil AS (
        SELECT icao_hex FROM det_mil
        UNION
        SELECT icao_hex FROM profile_mil
      )
      SELECT al.icao_hex,
             COALESCE(p.observed_registration, d.d_reg) AS observed_registration,
             COALESCE(p.registered_owner, m.name) AS registered_owner,
             p.aircraft_model,
             COALESCE(p.total_detections, d.d_count, 0) AS total_detections,
             COALESCE(p.min_altitude, d.d_min_alt) AS min_altitude,
             COALESCE(p.avg_altitude, d.d_avg_alt) AS avg_altitude,
             p.night_pct,
             COALESCE(p.first_seen, d.d_first) AS first_seen,
             COALESCE(p.last_seen, d.d_last) AS last_seen,
             m.name AS reg_name
      FROM all_mil al
      LEFT JOIN det_mil d ON d.icao_hex = al.icao_hex
      LEFT JOIN aircraft_profiles p ON UPPER(p.icao_hex) = al.icao_hex
      LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = al.icao_hex
      ORDER BY total_detections DESC NULLS LAST
      LIMIT 500
    `;
    const icaos = (rows as any[]).map((r) => String(r.icao_hex ?? "").toUpperCase()).filter(Boolean);
    const countyMap = new Map<string, string[]>();
    if (icaos.length > 0) {
      const cRows = await w`
        SELECT icao_hex, ARRAY_AGG(DISTINCT county) FILTER (WHERE county IS NOT NULL) AS counties
        FROM detections WHERE UPPER(icao_hex) = ANY(${icaos}::text[])
        GROUP BY icao_hex
      `;
      for (const r of cRows as any[]) {
        countyMap.set(String(r.icao_hex).toUpperCase(), (r.counties ?? []).filter(Boolean));
      }
    }
    const aircraft: MilitaryAircraft[] = [];
    const branchAgg = new Map<string, { aircraft: number; detections: number }>();
    for (const r of rows as any[]) {
      const ownerLabel = r.registered_owner ?? r.reg_name ?? null;
      const branch = classifyBranch(ownerLabel, r.icao_hex);
      const rawMin = r.min_altitude == null ? null : Number(r.min_altitude);
      const total = Number(r.total_detections ?? 0);
      aircraft.push({
        registration: r.observed_registration,
        icao: r.icao_hex,
        owner: ownerLabel,
        model: r.aircraft_model,
        branch,
        totalDetections: total,
        minAltitude: rawMin != null && rawMin < -100 ? null : rawMin,
        avgAltitude: r.avg_altitude != null ? Number(r.avg_altitude) : null,
        nightPct: r.night_pct != null ? Number(r.night_pct) : null,
        firstSeen: r.first_seen ? new Date(r.first_seen).toISOString() : null,
        lastSeen: r.last_seen ? new Date(r.last_seen).toISOString() : null,
        countiesSeen: countyMap.get(String(r.icao_hex ?? "").toUpperCase()) ?? [],
      });
      const agg = branchAgg.get(branch) ?? { aircraft: 0, detections: 0 };
      agg.aircraft += 1;
      agg.detections += total;
      branchAgg.set(branch, agg);
    }
    const byBranch = Array.from(branchAgg.entries())
      .map(([branch, v]) => ({ branch, aircraft: v.aircraft, detections: v.detections }))
      .sort((a, b) => b.detections - a.detections);
    return {
      totalAircraft: aircraft.length,
      totalDetections: aircraft.reduce((a, x) => a + x.totalDetections, 0),
      byBranch,
      aircraft,
    };
    } catch (err) {
      console.error("getMilitaryAircraft failed:", err);
      return empty;
    }
  },
);

// ============================================================
// DEAD MAN'S CURVE — height/velocity exposure
// Detections that put the aircraft inside the helicopter
// height-velocity (Dead Man's Curve) hazard envelope:
//   altitude AGL ≤ 500 ft, airborne, speed under 60 kts where known.
// We approximate AGL with reported ADS-B altitude (MSL) ≤ 500 ft and
// exclude negative/transponder anomalies so the count is conservative.
// ============================================================

export type DeadMansCurveTop = {
  icao: string;
  registration: string | null;
  count: number;
  minAltitude: number | null;
};

export type DeadMansCurveStats = {
  totalDetections: number;
  uniqueAircraft: number;
  underBelowSlowCount: number; // detections under 500 ft AND under 60 kts
  firstSeen: string | null;
  lastSeen: string | null;
  top: DeadMansCurveTop[];
};

export const getDeadMansCurveStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<DeadMansCurveStats> => {
    const empty: DeadMansCurveStats = {
      totalDetections: 0, uniqueAircraft: 0, underBelowSlowCount: 0,
      firstSeen: null, lastSeen: null, top: [],
    };
    try {
      const w = watchtower();
      const [agg, slow, top] = await Promise.all([
      w`
        SELECT COUNT(*)::int AS c,
               COUNT(DISTINCT icao_hex)::int AS u,
               MIN(captured_at) AS first_seen,
               MAX(captured_at) AS last_seen
        FROM detections
        WHERE altitude_ft IS NOT NULL
          AND altitude_ft <= 500
          AND altitude_ft >= 0
          AND on_ground = false
      `,
      w`
        SELECT COUNT(*)::int AS c
        FROM detections
        WHERE altitude_ft IS NOT NULL
          AND altitude_ft <= 500
          AND altitude_ft >= 0
          AND on_ground = false
          AND speed_kts IS NOT NULL
          AND speed_kts < 60
      `,
      w`
        SELECT icao_hex,
               MAX(registration) AS registration,
               COUNT(*)::int AS c,
               MIN(altitude_ft)::int AS min_alt
        FROM detections
        WHERE altitude_ft IS NOT NULL
          AND altitude_ft <= 500
          AND altitude_ft >= 0
          AND on_ground = false
        GROUP BY icao_hex
        ORDER BY c DESC
        LIMIT 5
      `,
      ]);
      return {
        totalDetections: agg[0]?.c ?? 0,
        uniqueAircraft: agg[0]?.u ?? 0,
        underBelowSlowCount: slow[0]?.c ?? 0,
        firstSeen: agg[0]?.first_seen ? new Date(agg[0].first_seen).toISOString() : null,
        lastSeen: agg[0]?.last_seen ? new Date(agg[0].last_seen).toISOString() : null,
        top: (top as any[]).map((r) => ({
          icao: r.icao_hex,
          registration: r.registration,
          count: r.c,
          minAltitude: r.min_alt,
        })),
      };
    } catch (err) {
      console.error("getDeadMansCurveStats failed:", err);
      return empty;
    }
  },
);

// ============================================================
// CONVERGENCE EVENT — the loudest cluster
// Surfaces the single most concentrated multi-aircraft window from
// public.convergence_events. Schema is variable across snapshots so we
// fetch each row as JSON and pick the row with the largest aircraft set.
// ============================================================

export type ConvergenceEventCard = {
  available: boolean;
  id: string | null;
  eventTime: string | null;
  aircraftCount: number;
  detectionCount: number | null;
  avgWti: number | null;
  maxWti: number | null;
  county: string | null;
  tails: string[];
  icaos: string[];
};

function pickArrayField(row: Record<string, any>, keys: string[]): any[] {
  for (const k of keys) {
    const v = row[k];
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v.startsWith("[")) {
      try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch {}
    }
  }
  return [];
}
function pickNum(row: Record<string, any>, keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v !== "" && !isNaN(Number(v))) return Number(v);
  }
  return null;
}
function pickStr(row: Record<string, any>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

export const getConvergenceEvent = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConvergenceEventCard> => {
    const empty: ConvergenceEventCard = {
      available: false, id: null, eventTime: null, aircraftCount: 0,
      detectionCount: null, avgWti: null, maxWti: null, county: null,
      tails: [], icaos: [],
    };
    try {
      const w = watchtower();
      const rows = await w`
        SELECT to_jsonb(c.*) AS row
        FROM convergence_events c
        LIMIT 500
      `;
      if (!rows || rows.length === 0) return empty;

      // Score each row by the size of any aircraft/tail/icao array field.
      let best: { row: Record<string, any>; size: number } | null = null;
      for (const r of rows as any[]) {
        const row = (r.row ?? r) as Record<string, any>;
        const arr = pickArrayField(row, ["aircraft", "tails", "icaos", "icao_hexes", "participants", "members"]);
        const explicit = pickNum(row, ["aircraft_count", "tail_count", "n_aircraft", "participant_count"]) ?? 0;
        const size = Math.max(arr.length, explicit);
        if (!best || size > best.size) best = { row, size };
      }
      if (!best) return empty;
      const row = best.row;

      const tailsRaw = pickArrayField(row, ["aircraft", "tails", "registrations", "participants", "members"]);
      const icaosRaw = pickArrayField(row, ["icaos", "icao_hexes", "icao24s"]);
      const tails = tailsRaw.map((x) => (typeof x === "string" ? x : x?.registration ?? x?.tail ?? x?.icao_hex ?? "")).filter(Boolean);
      const icaos = icaosRaw.map((x) => String(x)).filter(Boolean);

      const tEvent = pickStr(row, ["event_time", "occurred_at", "captured_at", "window_start", "start_time", "created_at"]);
      // Re-derive primary county from participants' actual detections rather than
      // trusting whatever county happens to be stamped on the convergence row
      // (the cluster row often carries an out-of-AOI county like "Los Angeles"
      // even when most participating tails were over Kern).
      let derivedCounty = pickStr(row, ["county", "primary_county"]);
      try {
        const icaoSet = Array.from(
          new Set(
            [
              ...icaos.map((s) => String(s).toUpperCase()),
              ...tails.map((s) => String(s).toUpperCase()),
            ].filter(Boolean),
          ),
        );
        if (icaoSet.length > 0 && tEvent) {
          const ts = new Date(tEvent);
          if (!isNaN(ts.getTime())) {
            const start = new Date(ts.getTime() - 30 * 60_000).toISOString();
            const end = new Date(ts.getTime() + 30 * 60_000).toISOString();
            const cRows = await w`
              SELECT county, COUNT(*)::int AS c
              FROM detections
              WHERE (UPPER(icao_hex) = ANY(${icaoSet}::text[])
                  OR UPPER(registration) = ANY(${icaoSet}::text[]))
                AND captured_at BETWEEN ${start}::timestamptz AND ${end}::timestamptz
                AND county IS NOT NULL
              GROUP BY county
              ORDER BY c DESC
            `;
            if (cRows && cRows.length > 0) {
              const kern = (cRows as any[]).find((x) =>
                String(x.county ?? "").toLowerCase().includes("kern"),
              );
              derivedCounty = kern ? String(kern.county) : String((cRows as any[])[0].county);
            }
          }
        }
      } catch (e2) {
        console.error("convergence county derivation failed:", e2);
      }
      return {
        available: true,
        id: pickStr(row, ["id", "event_id", "convergence_id"]),
        eventTime: tEvent ? new Date(tEvent).toISOString() : null,
        aircraftCount: Math.max(best.size, tails.length, icaos.length),
        detectionCount: pickNum(row, ["detection_count", "detections", "n_detections", "row_count"]),
        avgWti: pickNum(row, ["avg_wti", "mean_wti", "avg_wti_score"]),
        maxWti: pickNum(row, ["max_wti", "max_wti_score", "wti_score"]),
        county: derivedCounty,
        tails: tails.slice(0, 40),
        icaos: icaos.slice(0, 40),
      };
    } catch (err) {
      console.error("getConvergenceEvent failed:", err);
      return empty;
    }
  },
);

// trailing newline kept intentionally

// ============================================================
// MOSAIC LAYERS (multi-county surveillance mosaic)
// All read quiet-math. 1km² tiles via 0.01° binning.
// ============================================================

const MOSAIC_BOUNDS = { minLat: 32.2, maxLat: 38.2, minLon: -122.8, maxLon: -113.6 };

export type MosaicDensityTile = {
  lat: number; lon: number; pings: number; uniqueAircraft: number;
  avgAltitude: number | null; belowFloor: number;
};
export const getDensityTiles = createServerFn({ method: "GET" })
  .inputValidator((d: { sinceHours?: number | null; county?: string | null } | undefined) => ({
    sinceHours: d?.sinceHours ?? null,
    county: normalizeCountyLens(d?.county),
  }))
  .handler(async ({ data }): Promise<MosaicDensityTile[]> => {
    const w = watchtower();
    const sh = data?.sinceHours ?? null;
    const county = data?.county ?? "all";
    try {
      const rows = sh && sh > 0
        ? await w`
          SELECT FLOOR(latitude * 100)/100.0 AS lat,
                 FLOOR(longitude * 100)/100.0 AS lon,
                 COUNT(*)::int AS pings,
                 COUNT(DISTINCT icao_hex)::int AS unique_aircraft,
                 AVG(altitude_ft)::float AS avg_alt,
                 COUNT(*) FILTER (WHERE altitude_ft < 500 AND on_ground = false)::int AS below_floor
          FROM detections
          WHERE latitude BETWEEN ${MOSAIC_BOUNDS.minLat} AND ${MOSAIC_BOUNDS.maxLat}
            AND longitude BETWEEN ${MOSAIC_BOUNDS.minLon} AND ${MOSAIC_BOUNDS.maxLon}
            AND captured_at >= NOW() - (${Math.floor(sh)}::int * INTERVAL '1 hour')
            AND (${county} = 'all' OR CASE
              WHEN county ILIKE '%kern%' THEN 'kern'
              WHEN county ILIKE '%tulare%' THEN 'tulare'
              WHEN county ILIKE '%kings%' THEN 'kings'
              WHEN county ILIKE '%fresno%' THEN 'fresno'
              WHEN county ILIKE '%san bernardino%' OR county ILIKE '%san_bernardino%' OR county ILIKE '%sanbernardino%' THEN 'san_bernardino'
              ELSE 'other' END = ${county})
          GROUP BY 1, 2
          HAVING COUNT(*) >= 5
          ORDER BY pings DESC
          LIMIT 800`
        : await w`
          SELECT FLOOR(latitude * 100)/100.0 AS lat,
                 FLOOR(longitude * 100)/100.0 AS lon,
                 COUNT(*)::int AS pings,
                 COUNT(DISTINCT icao_hex)::int AS unique_aircraft,
                 AVG(altitude_ft)::float AS avg_alt,
                 COUNT(*) FILTER (WHERE altitude_ft < 500 AND on_ground = false)::int AS below_floor
          FROM detections
          WHERE latitude BETWEEN ${MOSAIC_BOUNDS.minLat} AND ${MOSAIC_BOUNDS.maxLat}
            AND longitude BETWEEN ${MOSAIC_BOUNDS.minLon} AND ${MOSAIC_BOUNDS.maxLon}
            AND (${county} = 'all' OR CASE
              WHEN county ILIKE '%kern%' THEN 'kern'
              WHEN county ILIKE '%tulare%' THEN 'tulare'
              WHEN county ILIKE '%kings%' THEN 'kings'
              WHEN county ILIKE '%fresno%' THEN 'fresno'
              WHEN county ILIKE '%san bernardino%' OR county ILIKE '%san_bernardino%' OR county ILIKE '%sanbernardino%' THEN 'san_bernardino'
              ELSE 'other' END = ${county})
          GROUP BY 1, 2
          HAVING COUNT(*) >= 5
          ORDER BY pings DESC
          LIMIT 800`;
      return (rows as any[]).map((r) => ({
        lat: Number(r.lat), lon: Number(r.lon),
        pings: Number(r.pings), uniqueAircraft: Number(r.unique_aircraft),
        avgAltitude: r.avg_alt != null ? Math.round(Number(r.avg_alt)) : null,
        belowFloor: Number(r.below_floor),
      }));
    } catch (err) { console.error("getDensityTiles failed:", err); return []; }
  });

export type MosaicViolationTile = {
  lat: number; lon: number; events: number; uniqueAircraft: number;
  criticalCount: number; maxScore: number; dominantType: string;
};
export const getViolationTiles = createServerFn({ method: "GET" })
  .inputValidator((d: { sinceHours?: number | null } | undefined) => d ?? {})
  .handler(async ({ data }): Promise<MosaicViolationTile[]> => {
    const w = watchtower();
    const sh = data?.sinceHours ?? null;
    try {
      // Join anomaly_events to detections on icao_hex; use nearest detection by captured_at within 5 min.
      const rows = sh && sh > 0
        ? await w`
          WITH ae AS (
            SELECT a.anomaly_type, a.anomaly_score, a.icao_hex, a.detected_at
            FROM anomaly_events a
            WHERE a.anomaly_score IS NOT NULL
              AND a.detected_at >= NOW() - (${Math.floor(sh)}::int * INTERVAL '1 hour')
          ),
          located AS (
            SELECT ae.anomaly_type, ae.anomaly_score, d.latitude, d.longitude, ae.icao_hex
            FROM ae
            JOIN LATERAL (
              SELECT latitude, longitude FROM detections
              WHERE icao_hex = ae.icao_hex
                AND captured_at BETWEEN ae.detected_at - INTERVAL '5 minutes' AND ae.detected_at + INTERVAL '5 minutes'
                AND latitude IS NOT NULL AND longitude IS NOT NULL
              ORDER BY ABS(EXTRACT(EPOCH FROM (captured_at - ae.detected_at))) ASC
              LIMIT 1
            ) d ON true
          )
          SELECT FLOOR(latitude * 100)/100.0 AS lat,
                 FLOOR(longitude * 100)/100.0 AS lon,
                 COUNT(*)::int AS events,
                 COUNT(DISTINCT icao_hex)::int AS unique_aircraft,
                 COUNT(*) FILTER (WHERE anomaly_score >= 0.85)::int AS critical_count,
                 MAX(anomaly_score)::float AS max_score,
                 (mode() WITHIN GROUP (ORDER BY anomaly_type)) AS dominant_type
          FROM located
          WHERE latitude BETWEEN ${KERN_BOUNDS.minLat} AND ${KERN_BOUNDS.maxLat}
            AND longitude BETWEEN ${KERN_BOUNDS.minLon} AND ${KERN_BOUNDS.maxLon}
          GROUP BY 1, 2
          ORDER BY events DESC
          LIMIT 500`
        : await w`
          WITH ae AS (
            SELECT a.anomaly_type, a.anomaly_score, a.icao_hex, a.detected_at
            FROM anomaly_events a
            WHERE a.anomaly_score IS NOT NULL
            ORDER BY a.detected_at DESC
            LIMIT 30000
          ),
          located AS (
            SELECT ae.anomaly_type, ae.anomaly_score, d.latitude, d.longitude, ae.icao_hex
            FROM ae
            JOIN LATERAL (
              SELECT latitude, longitude FROM detections
              WHERE icao_hex = ae.icao_hex
                AND captured_at BETWEEN ae.detected_at - INTERVAL '5 minutes' AND ae.detected_at + INTERVAL '5 minutes'
                AND latitude IS NOT NULL AND longitude IS NOT NULL
              ORDER BY ABS(EXTRACT(EPOCH FROM (captured_at - ae.detected_at))) ASC
              LIMIT 1
            ) d ON true
          )
          SELECT FLOOR(latitude * 100)/100.0 AS lat,
                 FLOOR(longitude * 100)/100.0 AS lon,
                 COUNT(*)::int AS events,
                 COUNT(DISTINCT icao_hex)::int AS unique_aircraft,
                 COUNT(*) FILTER (WHERE anomaly_score >= 0.85)::int AS critical_count,
                 MAX(anomaly_score)::float AS max_score,
                 (mode() WITHIN GROUP (ORDER BY anomaly_type)) AS dominant_type
          FROM located
          WHERE latitude BETWEEN ${KERN_BOUNDS.minLat} AND ${KERN_BOUNDS.maxLat}
            AND longitude BETWEEN ${KERN_BOUNDS.minLon} AND ${KERN_BOUNDS.maxLon}
          GROUP BY 1, 2
          ORDER BY events DESC
          LIMIT 500`;
      return (rows as any[]).map((r) => ({
        lat: Number(r.lat), lon: Number(r.lon),
        events: Number(r.events), uniqueAircraft: Number(r.unique_aircraft),
        criticalCount: Number(r.critical_count),
        maxScore: Number(r.max_score) || 0,
        dominantType: r.dominant_type ?? "UNKNOWN",
      }));
    } catch (err) { console.error("getViolationTiles failed:", err); return []; }
  });

export type MosaicTimeCell = { dow: number; hour: number; pings: number; belowFloor: number; aircraft: number };
export const getTimeOfDayHeat = createServerFn({ method: "GET" }).handler(async (): Promise<MosaicTimeCell[]> => {
  const w = watchtower();
  try {
    const rows = await w`
      SELECT EXTRACT(DOW FROM captured_at AT TIME ZONE 'America/Los_Angeles')::int AS dow,
             EXTRACT(HOUR FROM captured_at AT TIME ZONE 'America/Los_Angeles')::int AS hour,
             COUNT(*)::int AS pings,
             COUNT(*) FILTER (WHERE altitude_ft < 500 AND on_ground = false)::int AS below_floor,
             COUNT(DISTINCT icao_hex)::int AS aircraft
      FROM detections
      WHERE latitude BETWEEN ${KERN_BOUNDS.minLat} AND ${KERN_BOUNDS.maxLat}
        AND longitude BETWEEN ${KERN_BOUNDS.minLon} AND ${KERN_BOUNDS.maxLon}
      GROUP BY 1, 2
      ORDER BY 1, 2`;
    return (rows as any[]).map((r) => ({
      dow: Number(r.dow), hour: Number(r.hour),
      pings: Number(r.pings), belowFloor: Number(r.below_floor), aircraft: Number(r.aircraft),
    }));
  } catch (err) { console.error("getTimeOfDayHeat failed:", err); return []; }
});

export type MosaicAnomalyPoint = {
  lat: number; lon: number; anomalyType: string; anomalyScore: number;
  icao: string; registration: string | null; detectedAt: string; hash: string | null;
};
export const getAnomalyPoints = createServerFn({ method: "GET" }).handler(async (): Promise<MosaicAnomalyPoint[]> => {
  const w = watchtower();
  try {
    const rows = await w`
      WITH ae AS (
        SELECT a.id, a.anomaly_type, a.anomaly_score, a.icao_hex, a.registration,
               a.detected_at, a.sha256_hash
        FROM anomaly_events a
        WHERE a.anomaly_score IS NOT NULL
        ORDER BY a.anomaly_score DESC NULLS LAST
        LIMIT 1500
      )
      SELECT ae.*, d.latitude, d.longitude
      FROM ae
      JOIN LATERAL (
        SELECT latitude, longitude FROM detections
        WHERE icao_hex = ae.icao_hex
          AND captured_at BETWEEN ae.detected_at - INTERVAL '5 minutes' AND ae.detected_at + INTERVAL '5 minutes'
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY ABS(EXTRACT(EPOCH FROM (captured_at - ae.detected_at))) ASC
        LIMIT 1
      ) d ON true
      WHERE d.latitude BETWEEN ${KERN_BOUNDS.minLat} AND ${KERN_BOUNDS.maxLat}
        AND d.longitude BETWEEN ${KERN_BOUNDS.minLon} AND ${KERN_BOUNDS.maxLon}`;
    return (rows as any[]).map((r) => ({
      lat: Number(r.latitude), lon: Number(r.longitude),
      anomalyType: r.anomaly_type, anomalyScore: Number(r.anomaly_score) || 0,
      icao: r.icao_hex, registration: r.registration,
      detectedAt: r.detected_at ? new Date(r.detected_at).toISOString() : new Date(0).toISOString(),
      hash: r.sha256_hash ?? null,
    }));
  } catch (err) { console.error("getAnomalyPoints failed:", err); return []; }
});

export type MosaicHandoffPair = {
  fromIcao: string; toIcao: string;
  fromLat: number; fromLon: number; toLat: number; toLon: number;
  count: number;
};
export const getHandoffPairs = createServerFn({ method: "GET" }).handler(async (): Promise<MosaicHandoffPair[]> => {
  const w = watchtower();
  try {
    // Use quiet-math convergence_events: each event lists multiple aircraft converging at a point.
    // We pair ICAOs from unique_icao_hexes per event as a handoff edge, weighted by event count.
    const rows = await w`
      SELECT center_lat::float AS lat, center_lon::float AS lon,
             unique_icao_hexes, aircraft_count
      FROM convergence_events
      WHERE center_lat BETWEEN ${KERN_BOUNDS.minLat} AND ${KERN_BOUNDS.maxLat}
        AND center_lon BETWEEN ${KERN_BOUNDS.minLon} AND ${KERN_BOUNDS.maxLon}
        AND aircraft_count >= 2
      ORDER BY aircraft_count DESC
      LIMIT 500`;
    const pairCounts = new Map<string, MosaicHandoffPair>();
    for (const r of rows as any[]) {
      const hexes: string[] = Array.isArray(r.unique_icao_hexes)
        ? r.unique_icao_hexes
        : (typeof r.unique_icao_hexes === "string" ? r.unique_icao_hexes.split(/[,\s]+/).filter(Boolean) : []);
      if (hexes.length < 2) continue;
      for (let i = 0; i < Math.min(hexes.length, 4); i++) {
        for (let j = i + 1; j < Math.min(hexes.length, 4); j++) {
          const a = String(hexes[i]).toUpperCase(); const b = String(hexes[j]).toUpperCase();
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          const existing = pairCounts.get(key);
          if (existing) { existing.count += 1; }
          else {
            pairCounts.set(key, {
              fromIcao: a, toIcao: b,
              fromLat: Number(r.lat), fromLon: Number(r.lon),
              toLat: Number(r.lat) + 0.005, toLon: Number(r.lon) + 0.005,
              count: 1,
            });
          }
        }
      }
    }
    return Array.from(pairCounts.values()).sort((a, b) => b.count - a.count).slice(0, 200);
  } catch (err) { console.error("getHandoffPairs failed:", err); return []; }
});

export type MosaicEntity = {
  entity: string; lat: number; lon: number;
  totalPings: number; aircraftCount: number; color: string;
};
export const getEntityCentroids = createServerFn({ method: "GET" }).handler(async (): Promise<MosaicEntity[]> => {
  const w = watchtower();
  try {
    const rows = await w`
      SELECT p.icao_hex, p.registered_owner, p.total_detections,
             AVG(d.latitude)::float AS lat, AVG(d.longitude)::float AS lon
      FROM aircraft_profiles p
      JOIN detections d ON d.icao_hex = p.icao_hex
      WHERE p.registered_owner IS NOT NULL
        AND d.latitude BETWEEN ${KERN_BOUNDS.minLat} AND ${KERN_BOUNDS.maxLat}
        AND d.longitude BETWEEN ${KERN_BOUNDS.minLon} AND ${KERN_BOUNDS.maxLon}
      GROUP BY p.icao_hex, p.registered_owner, p.total_detections
      ORDER BY p.total_detections DESC NULLS LAST
      LIMIT 200`;
    // Bucket aircraft into named entities by owner regex.
    const buckets: { name: string; rx: RegExp; color: string }[] = [
      { name: "KCSO",          rx: /KERN COUNTY|SHERIFF/i,                   color: "#1d4ed8" },
      { name: "ALF IX",        rx: /ALF\s*IX|ALF-IX/i,                       color: "#dc2626" },
      { name: "AERO EQUITIES", rx: /AERO\s*EQUIT/i,                          color: "#ea580c" },
      { name: "KCSI",          rx: /KCSI|KERN.*INVEST/i,                     color: "#ca8a04" },
      { name: "WINGSLEASING",  rx: /WINGS\s*LEASING|WINGSLEASING/i,          color: "#16a34a" },
      { name: "SHADY",         rx: /SHADY/i,                                 color: "#7c3aed" },
      { name: "MEDICAL",       rx: /MEDICAL|HEALTH|HOSPITAL|MERCY|LIFE FLIGHT/i, color: "#0891b2" },
      { name: "MILITARY",      rx: /AIR FORCE|ARMY|NAVY|MARINE|DEPT OF DEF|U S DEPT|DOD/i, color: "#475569" },
    ];
    const acc = new Map<string, { latSum: number; lonSum: number; pings: number; aircraft: number; color: string }>();
    for (const r of rows as any[]) {
      const owner = String(r.registered_owner ?? "");
      const b = buckets.find((x) => x.rx.test(owner));
      if (!b) continue;
      const cur = acc.get(b.name) ?? { latSum: 0, lonSum: 0, pings: 0, aircraft: 0, color: b.color };
      const lat = Number(r.lat), lon = Number(r.lon), pings = Number(r.total_detections ?? 0);
      cur.latSum += lat * pings; cur.lonSum += lon * pings;
      cur.pings += pings; cur.aircraft += 1; cur.color = b.color;
      acc.set(b.name, cur);
    }
    return Array.from(acc.entries())
      .filter(([, v]) => v.pings > 0)
      .map(([name, v]) => ({
        entity: name,
        lat: v.latSum / v.pings, lon: v.lonSum / v.pings,
        totalPings: v.pings, aircraftCount: v.aircraft, color: v.color,
      }));
  } catch (err) { console.error("getEntityCentroids failed:", err); return []; }
});
