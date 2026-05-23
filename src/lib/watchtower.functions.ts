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
};

export const getRecentLowAltitude = createServerFn({ method: "GET" }).handler(async (): Promise<LowAltDescent[]> => {
  const w = watchtower();
  const rows = await w`
    SELECT d.icao_hex, d.registration, d.captured_at, d.altitude_ft, d.speed_kts, d.county,
           p.registered_owner, p.aircraft_model
    FROM detections d
    LEFT JOIN aircraft_profiles p ON p.icao_hex = d.icao_hex
    WHERE d.altitude_ft IS NOT NULL AND d.altitude_ft < 1500 AND d.on_ground = false
    ORDER BY d.captured_at DESC
    LIMIT 40
  `;
  return rows.map((r: any) => ({
    icao: r.icao_hex,
    registration: r.registration,
    owner: r.registered_owner,
    model: r.aircraft_model,
    capturedAt: new Date(r.captured_at).toISOString(),
    altitude: r.altitude_ft,
    speed: r.speed_kts ? Number(r.speed_kts) : null,
    county: r.county,
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