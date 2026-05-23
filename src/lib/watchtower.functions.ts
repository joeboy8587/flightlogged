import { createServerFn } from "@tanstack/react-start";
import { watchtower, evidence } from "./neon.server";

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
      WHERE d.altitude_ft IS NOT NULL AND d.altitude_ft < 1500 AND d.on_ground = false
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
  return rows.map((r: any) => ({
    icao: r.icao_hex,
    registration: r.observed_registration,
    owner: r.registered_owner,
    model: r.aircraft_model,
    totalDetections: r.total_detections,
    minAltitude: r.min_altitude,
    avgAltitude: r.avg_altitude ? Number(r.avg_altitude) : null,
    nightPct: r.night_pct ? Number(r.night_pct) : null,
    anomalyScore: r.anomaly_score ? Number(r.anomaly_score) : null,
    lastSeen: new Date(r.last_seen).toISOString(),
  }));
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