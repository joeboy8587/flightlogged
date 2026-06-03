import { createServerFn } from "@tanstack/react-start";
import { watchtower, evidence } from "./neon.server";

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
  const w = watchtower();
  const e = evidence();
  const [d, a, an, cv, e1, e2, e3, e4] = await Promise.all([
    w`SELECT COUNT(*)::int AS c, MAX(captured_at) AS last, MIN(captured_at) AS first FROM detections`,
    w`SELECT COUNT(*)::int AS c FROM aircraft_profiles`,
    w`SELECT COUNT(*)::int AS c FROM anomaly_events`,
    w`SELECT COUNT(*)::int AS c FROM convergence_events`,
    e`SELECT COUNT(*)::int AS c FROM court_evidence.flight_detections`,
    e`SELECT COUNT(*)::int AS c FROM court_evidence.biometric_events`,
    e`SELECT COUNT(*)::int AS c FROM court_evidence.biometric_events WHERE related_surveillance = true`,
    e`SELECT COUNT(*)::int AS c FROM court_evidence.unified_events`,
  ]);
  const last = d[0].last ? new Date(d[0].last).toISOString() : null;
  const first = d[0].first ? new Date(d[0].first) : null;
  const windowHours = first && d[0].last ? Math.round(((new Date(d[0].last).getTime() - first.getTime()) / 36e5) * 10) / 10 : 0;
  return {
    totalDetections: d[0].c,
    uniqueAircraft: a[0].c,
    anomalyEvents: an[0].c,
    convergenceEvents: cv[0].c,
    lastDetectionAt: last,
    windowHours,
    flightDetections: e1[0].c,
    biometricEvents: e2[0].c,
    correlatedEvents: e3[0].c,
    unifiedEvents: e4[0].c,
  };
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
  const e = evidence();
  const rows = await e`
    SELECT id, measurement_timestamp, related_aircraft_registration, heart_rate,
           stress_level, bradford_hill_score, evidence_hash
    FROM court_evidence.biometric_events
    WHERE related_surveillance = true
    ORDER BY measurement_timestamp DESC
    LIMIT 30
  `;
  return rows.map((r: any) => ({
    id: r.id,
    timestamp: new Date(r.measurement_timestamp).toISOString(),
    registration: r.related_aircraft_registration,
    altitude: null,
    heartRate: r.heart_rate,
    stress: r.stress_level ? Number(r.stress_level) : null,
    bradfordHill: r.bradford_hill_score,
    evidenceHash: r.evidence_hash,
  }));
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
  const e = evidence();
  const rows = await e`
    SELECT registration, icao24, faa_registrant_name, operator_resolved, aircraft_model,
           kcso_flag, military_flag, medical_flag, xp_services_flag, shell_links,
           occurrences_total, confidence, last_seen
    FROM public.canonical_operator_profiles
    WHERE registration IS NOT NULL
    ORDER BY occurrences_total DESC NULLS LAST
    LIMIT 50
  `;
  return rows.map((r: any) => ({
    registration: r.registration,
    icao24: r.icao24,
    faaName: r.faa_registrant_name,
    operatorResolved: r.operator_resolved,
    aircraftModel: r.aircraft_model,
    kcso: !!r.kcso_flag,
    military: !!r.military_flag,
    medical: !!r.medical_flag,
    xpServices: !!r.xp_services_flag,
    shellLinks: Array.isArray(r.shell_links) ? r.shell_links.length : (r.shell_links ? 1 : 0),
    occurrences: Number(r.occurrences_total ?? 0),
    confidence: r.confidence != null ? Number(r.confidence) : null,
    lastSeen: r.last_seen ? new Date(r.last_seen).toISOString() : null,
  }));
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
  const e = evidence();
  const rows = await e`
    SELECT id, detection_timestamp, aircraft_registration, aircraft_type, altitude,
           latitude, longitude, violation_type, severity, description, sha256_hash
    FROM public.sentinel_violations
    ORDER BY detection_timestamp DESC NULLS LAST
    LIMIT 100
  `;
  const idMap = await faaIdentityMap(
    rows.map((r: any) => ({ registration: r.aircraft_registration })),
  );
  return rows.map((r: any) => {
    const id = lookupIdentity(idMap, r.aircraft_registration, null);
    return {
    id: r.id,
    timestamp: r.detection_timestamp ? new Date(r.detection_timestamp).toISOString() : new Date(0).toISOString(),
    registration: r.aircraft_registration,
    aircraftType: r.aircraft_type,
    altitude: r.altitude,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    violationType: r.violation_type,
    severity: r.severity,
    description: r.description,
    hashShort: r.sha256_hash ? String(r.sha256_hash).slice(0, 16) : null,
      identifiedName: id?.name ?? null,
      registrantCity: id?.city ?? null,
      registrantState: id?.state ?? null,
      registrantType: id?.typeRegistrant ?? null,
    };
  });
});

export type ThreatTierBucket = { tier: number | null; level: string | null; count: number };
export type ThreatTopRow = {
  detectionId: string;
  wti: number;
  tier: number | null;
  level: string | null;
  computedAt: string | null;
  components: Record<string, unknown> | null;
  hashShort: string | null;
};
export type ThreatIndexSummary = {
  total: number;
  buckets: ThreatTierBucket[];
  top: ThreatTopRow[];
  methodVersion: string | null;
  hashedRows: number;
};

export const getThreatIndex = createServerFn({ method: "GET" }).handler(async (): Promise<ThreatIndexSummary> => {
  const e = evidence();
  const [tot, buckets, top, mv, hashed] = await Promise.all([
    e`SELECT COUNT(*)::bigint AS c FROM public.threat_tiers`,
    e`SELECT tier_level, threat_level, COUNT(*)::int AS c
      FROM public.threat_tiers
      GROUP BY tier_level, threat_level
      ORDER BY tier_level DESC NULLS LAST`,
    e`SELECT detection_id, wti_score, tier_level, threat_level, computed_at, components, sha256_hash
      FROM public.threat_tiers
      WHERE wti_score IS NOT NULL
      ORDER BY wti_score DESC
      LIMIT 25`,
    e`SELECT method_version FROM public.threat_tiers WHERE method_version IS NOT NULL LIMIT 1`,
    e`SELECT COUNT(*)::bigint AS c FROM public.threat_tiers WHERE sha256_hash IS NOT NULL`,
  ]);
  return {
    total: Number(tot[0].c),
    buckets: buckets.map((r: any) => ({ tier: r.tier_level, level: r.threat_level, count: r.c })),
    top: top.map((r: any) => ({
      detectionId: String(r.detection_id),
      wti: Number(r.wti_score),
      tier: r.tier_level,
      level: r.threat_level,
      computedAt: r.computed_at ? new Date(r.computed_at).toISOString() : null,
      components: r.components ?? null,
      hashShort: r.sha256_hash ? String(r.sha256_hash).slice(0, 12) : null,
    })),
    methodVersion: mv[0]?.method_version ?? null,
    hashedRows: Number(hashed[0].c),
  };
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
  const e = evidence();
  const [rows, stats, top] = await Promise.all([
    e`
      SELECT id, detected_at, aircraft_registration, icao24, callsign,
             anomaly_type, anomaly_score, confidence_level, model_name, model_version,
             validated, features, sha256_hash
      FROM public.ml_anomaly_detections
      ORDER BY detected_at DESC NULLS LAST
      LIMIT 50
    `,
    e`
      SELECT COUNT(*)::bigint AS total,
             COUNT(*) FILTER (WHERE validated = true)::bigint AS validated_true,
             COUNT(DISTINCT model_name)::int AS models,
             COUNT(DISTINCT model_version)::int AS versions
      FROM public.ml_anomaly_detections
    `,
    e`
      SELECT model_name, model_version, COUNT(*)::bigint AS c
      FROM public.ml_anomaly_detections
      GROUP BY 1, 2
      ORDER BY c DESC
      LIMIT 5
    `,
  ]);
  const idMap = await faaIdentityMap(
    rows.map((r: any) => ({ registration: r.aircraft_registration, icao: r.icao24 })),
  );
  const mapped = rows.map((r: any) => {
    const id = lookupIdentity(idMap, r.aircraft_registration, r.icao24);
    const fk = r.features && typeof r.features === "object" ? Object.keys(r.features).slice(0, 6) : [];
    return {
    id: String(r.id),
    detectedAt: r.detected_at ? new Date(r.detected_at).toISOString() : new Date(0).toISOString(),
    registration: r.aircraft_registration,
    icao24: r.icao24,
    callsign: r.callsign,
    anomalyType: r.anomaly_type,
    anomalyScore: r.anomaly_score != null ? Number(r.anomaly_score) : null,
    confidence: r.confidence_level,
    modelName: r.model_name,
    modelVersion: r.model_version,
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
      distinctModels: Number(stats[0].models),
      distinctVersions: Number(stats[0].versions),
      topModels: (top as any[]).map((r) => ({
        modelName: r.model_name,
        modelVersion: r.model_version,
        count: Number(r.c),
      })),
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
             MAX(d.captured_at) AS last_seen
      FROM detections d
      LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(d.icao_hex)
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