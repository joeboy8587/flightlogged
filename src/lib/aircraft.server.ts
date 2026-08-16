import { watchtower } from "./neon.server";
import { tailForms } from "./aircraft";

/** ---- Types returned to the UI (plain DTOs only) ---- */
export type DossierIdentity = {
  icao: string | null;
  registration: string | null;
  callsigns: string[];
  owner: string | null;
  operatorResolved: string | null;
  model: string | null;
  manufacturerYear: number | null;
  registrantType: string | null;
  city: string | null;
  state: string | null;
  county: string | null;
  certIssue: string | null;
  expiration: string | null;
  statusCode: string | null;
  serial: string | null;
  engine: string | null;
  isMilitary: boolean;
  kcsoFlag: boolean;
  medicalFlag: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
  totalDetections: number | null;
  minAltitude: number | null;
  avgAltitude: number | null;
  maxAltitude: number | null;
  avgSpeed: number | null;
  nightPct: number | null;
  weekendPct: number | null;
  primaryCounty: string | null;
  spreadKm: number | null;
  anomalyScore: number | null;
  anomalyReasons: string[];
  mlClassification: string | null;
  classificationConfidence: number | null;
  tacticalRole: string | null;
  integrityFailureRate: number | null;
  sha256: string | null;
};

export type DossierSignature = {
  cluster: number | null;
  profileScore: number | null;
  driftScore: number | null;
  stabilityScore: number | null;
  modelVersion: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  updatedAt: string | null;
  embeddingDims: number | null;
  topDimensions: { key: string; value: number }[];
  features: { key: string; value: number }[];
  explanation: string | null;
};

export type DossierViolationGroup = { rule: string; count: number; minAlt: number | null; lastSeen: string | null; statute: string | null };
export type DossierViolationRow = {
  capturedAt: string | null; rule: string; altitude: number | null; county: string | null;
  severity: number | string | null; statute: string | null; sha256: string | null; description: string | null;
};
export type DossierAnomalyGroup = { type: string; count: number; maxScore: number | null; lastSeen: string | null };
export type DossierAnomalyRow = {
  detectedAt: string | null; type: string; score: number | null; altitude: number | null;
  county: string | null; reasoning: string | null; sha256: string | null; reviewed: boolean;
};
export type DossierHandoff = { partner: string; partnerIcao: string | null; partnerOwner: string | null };
export type DossierCorridor = { zone: string; role: string | null; pattern: string | null; detections: number | null; minAltitude: number | null; lastSeen: string | null };
export type DossierCorrections = {
  scored: number; validated: number; falsePositives: number;
  avgEnsemble: number | null; avgDisagreement: number | null;
  models: { key: string; value: number }[];
  reasons: { reason: string; count: number }[];
};
export type DossierSpoofing = {
  sourceType: string | null; detectionCount: number | null; firstSeen: string | null;
  lastSeen: string | null; broadcastInterval: number | null; coincides: boolean | null;
} | null;
export type DossierReceipt = { wtpr: string; anomalyType: string | null; legalStatus: string | null; courtReady: boolean; sha256: string | null; capturedAt: string | null };
export type DossierPeer = { icao: string; registration: string | null; owner: string | null; profileScore: number | null };
export type DossierPeerMatch = DossierPeer & { similarity: number | null };
export type DossierPattern = {
  type: string; description: string | null; confidence: number | null; evidenceCount: number | null;
  peakHour: number | null; activeDays: number | null; isActive: boolean; lastMatched: string | null;
  fleetSize: number | null; sha256: string | null;
};

export type AircraftDossier = {
  query: string;
  identity: DossierIdentity;
  signature: DossierSignature | null;
  violationGroups: DossierViolationGroup[];
  violations: DossierViolationRow[];
  sentinel: DossierViolationRow[];
  anomalyGroups: DossierAnomalyGroup[];
  anomalies: DossierAnomalyRow[];
  handoffs: DossierHandoff[];
  corridors: DossierCorridor[];
  corrections: DossierCorrections;
  spoofing: DossierSpoofing;
  receipts: DossierReceipt[];
  peers: DossierPeer[];
  neighbors: DossierPeerMatch[];
  patterns: DossierPattern[];
  generatedAt: string;
};

const num = (v: unknown): number | null => (v == null || v === "" ? null : Number.isNaN(Number(v)) ? null : Number(v));
const str = (v: unknown): string | null => (v == null ? null : String(v));
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);

function jsonPairs(v: unknown, limit = 40): { key: string; value: number }[] {
  if (!v || typeof v !== "object") return [];
  return Object.entries(v as Record<string, unknown>)
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter((p) => Number.isFinite(p.value))
    .slice(0, limit);
}

/** 5-minute in-memory cache so repeat views never re-hammer Neon. */
const CACHE = new Map<string, { at: number; value: AircraftDossier | null }>();
const TTL = 5 * 60 * 1000;

export async function loadDossier(input: string): Promise<AircraftDossier | null> {
  const { raw, nform, nless } = tailForms(input);
  if (!raw) return null;
  const hit = CACHE.get(raw);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const w = watchtower();

  const idRows = (await w`
    SELECT p.*, c.operator_resolved, c.kcso_flag, c.medical_flag, c.faa_registrant_name,
           m.name AS m_name, m.city AS m_city, m.state AS m_state, m.county AS m_county,
           m.year_mfr, m.type_registrant, m.cert_issue_date, m.expiration_date,
           m.status_code, m.serial_number, m.eng_mfr_mdl, m.registration AS m_reg
      FROM aircraft_profiles p
      LEFT JOIN canonical_operator_profiles c ON UPPER(c.icao_hex) = UPPER(p.icao_hex)
      LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(p.icao_hex)
     WHERE UPPER(p.icao_hex) = ${raw}
        OR UPPER(p.observed_registration) IN (${raw}, ${nform}, ${nless})
     ORDER BY p.total_detections DESC NULLS LAST
     LIMIT 1`) as any[];

  let base = idRows[0];
  if (!base) {
    // No ML profile: fall back to the FAA registry so the page still resolves.
    const faa = (await w`
      SELECT n_number, registration, name, city, state, county, year_mfr, type_registrant,
             cert_issue_date, expiration_date, status_code, serial_number, eng_mfr_mdl,
             mode_s_code_hex
        FROM faa_master
       WHERE UPPER(n_number) IN (${nless}, ${raw})
          OR UPPER(registration) IN (${raw}, ${nform})
          OR UPPER(mode_s_code_hex) = ${raw}
       LIMIT 1`) as any[];
    if (!faa[0]) { CACHE.set(raw, { at: Date.now(), value: null }); return null; }
    base = {
      icao_hex: faa[0].mode_s_code_hex, observed_registration: faa[0].registration ?? `N${faa[0].n_number}`,
      m_name: faa[0].name, m_city: faa[0].city, m_state: faa[0].state, m_county: faa[0].county,
      year_mfr: faa[0].year_mfr, type_registrant: faa[0].type_registrant,
      cert_issue_date: faa[0].cert_issue_date, expiration_date: faa[0].expiration_date,
      status_code: faa[0].status_code, serial_number: faa[0].serial_number, eng_mfr_mdl: faa[0].eng_mfr_mdl,
    };
  }

  const icao = base.icao_hex ? String(base.icao_hex).toUpperCase() : raw;
  const reg = base.observed_registration ? String(base.observed_registration).toUpperCase() : nform;
  const regForms = [reg, reg.startsWith("N") ? reg.slice(1) : `N${reg}`, raw, nform, nless];

  const [deep, expl, vGroups, vRows, sRows, aGroups, aRows, ens, reasons, spoof, corr, wtpr, peers] = await Promise.all([
    w`SELECT behavioral_cluster, profile_score, drift_score, stability_score, model_version,
             window_start, window_end, updated_at, top_anomaly_dimensions, feature_vector,
             array_length(profile_embedding, 1) AS dims
        FROM aircraft_deep_profiles WHERE UPPER(icao_hex) = ${icao} LIMIT 1`,
    w`SELECT explanation FROM profiler_explanations WHERE UPPER(icao_hex) = ${icao}
       ORDER BY created_at DESC LIMIT 1`,
    w`SELECT rule_violated, COUNT(*)::int AS c, MIN(altitude_ft)::int AS min_alt,
             MAX(captured_at) AS last_seen, MIN(statute_reference) AS statute
        FROM violation_classifications WHERE UPPER(icao_hex) = ${icao}
       GROUP BY rule_violated ORDER BY c DESC LIMIT 20`,
    w`SELECT captured_at, rule_violated, altitude_ft, latitude, longitude, severity_score,
             statute_reference, sha256_hash, description
        FROM violation_classifications WHERE UPPER(icao_hex) = ${icao}
       ORDER BY captured_at DESC LIMIT 25`,
    w`SELECT detection_timestamp, violation_type, altitude, county, severity, description, sha256_hash
        FROM sentinel_violations WHERE UPPER(aircraft_registration) = ANY(${regForms})
       ORDER BY detection_timestamp DESC LIMIT 25`,
    w`SELECT anomaly_type, COUNT(*)::int AS c, MAX(anomaly_score)::float AS max_score,
             MAX(detected_at) AS last_seen
        FROM anomaly_events WHERE UPPER(icao_hex) = ${icao}
       GROUP BY anomaly_type ORDER BY c DESC LIMIT 20`,
    w`SELECT detected_at, anomaly_type, anomaly_score, altitude_ft, county, reasoning,
             sha256_hash, human_reviewed
        FROM anomaly_events WHERE UPPER(icao_hex) = ${icao}
       ORDER BY detected_at DESC LIMIT 20`,
    w`SELECT COUNT(*)::int AS scored,
             COUNT(validated_at)::int AS validated,
             COUNT(false_positive_reason)::int AS fp,
             AVG(ensemble_score)::float AS avg_ens,
             AVG(disagreement)::float AS avg_dis,
             AVG(isolation_forest_score)::float AS iforest,
             AVG(lof_score)::float AS lof,
             AVG(temporal_score)::float AS temporal,
             AVG(neural_score)::float AS neural,
             AVG(kinematic_score)::float AS kinematic,
             AVG(gcn_score)::float AS gcn
        FROM ensemble_anomaly_scores WHERE UPPER(icao_hex) = ${icao}`,
    w`SELECT false_positive_reason AS reason, COUNT(*)::int AS c
        FROM ensemble_anomaly_scores
       WHERE UPPER(icao_hex) = ${icao} AND false_positive_reason IS NOT NULL
       GROUP BY 1 ORDER BY c DESC LIMIT 10`,
    w`SELECT source_type, detection_count, first_seen, last_seen,
             broadcast_interval_seconds, coincides_with_operations
        FROM spoofing_sources WHERE UPPER(icao_hex) = ${icao} LIMIT 1`,
    w`SELECT zone_name, network_role, pattern, zone_detections, min_altitude, last_seen
        FROM corridor_aircraft
       WHERE UPPER(icao_hex) = ${icao} OR UPPER(registration) = ANY(${regForms})
       ORDER BY zone_detections DESC NULLS LAST LIMIT 10`,
    w`SELECT wtpr, anomaly_type, legal_status, court_ready, sha256, captured_at
        FROM wtpr_registry
       WHERE UPPER(icao_hex) = ${icao} OR UPPER(registration) = ANY(${regForms})
       ORDER BY created_at DESC LIMIT 15`,
    w`SELECT d.icao_hex, d.profile_score, p.observed_registration, p.registered_owner
        FROM aircraft_deep_profiles d
        LEFT JOIN aircraft_profiles p ON UPPER(p.icao_hex) = UPPER(d.icao_hex)
       WHERE d.behavioral_cluster = (
               SELECT behavioral_cluster FROM aircraft_deep_profiles WHERE UPPER(icao_hex) = ${icao} LIMIT 1)
         AND UPPER(d.icao_hex) <> ${icao}
       ORDER BY d.profile_score DESC NULLS LAST LIMIT 8`,
  ]);

  const partners = Array.from(new Set(arr(base.confirmed_coord_partners).map((p) => p.toUpperCase()))).slice(0, 24);
  let handoffs: DossierHandoff[] = partners.map((p) => ({ partner: p, partnerIcao: null, partnerOwner: null }));
  if (partners.length) {
    const pRows = (await w`
      SELECT icao_hex, observed_registration, registered_owner
        FROM aircraft_profiles
       WHERE UPPER(observed_registration) = ANY(${partners.map((p) => p.toUpperCase())})
       LIMIT 24`) as any[];
    const byReg = new Map(pRows.map((r) => [String(r.observed_registration ?? "").toUpperCase(), r]));
    handoffs = partners.map((p) => {
      const r = byReg.get(p.toUpperCase());
      return { partner: p, partnerIcao: str(r?.icao_hex), partnerOwner: str(r?.registered_owner) };
    });
  }

  const d0 = (deep as any[])[0];
  const e0 = (ens as any[])[0] ?? {};

  const value: AircraftDossier = {
    query: raw,
    identity: {
      icao,
      registration: reg,
      callsigns: arr(base.observed_callsigns).slice(0, 12),
      owner: str(base.registered_owner ?? base.faa_registrant_name ?? base.m_name),
      operatorResolved: str(base.operator_resolved),
      model: str(base.aircraft_model),
      manufacturerYear: num(base.year_mfr),
      registrantType: str(base.type_registrant),
      city: str(base.m_city),
      state: str(base.m_state),
      county: str(base.m_county),
      certIssue: str(base.cert_issue_date),
      expiration: str(base.expiration_date),
      statusCode: str(base.status_code),
      serial: str(base.serial_number),
      engine: str(base.eng_mfr_mdl),
      isMilitary: Boolean(base.is_military),
      kcsoFlag: Boolean(base.kcso_flag),
      medicalFlag: Boolean(base.medical_flag),
      firstSeen: str(base.first_seen),
      lastSeen: str(base.last_seen),
      totalDetections: num(base.total_detections),
      minAltitude: num(base.min_altitude),
      avgAltitude: num(base.avg_altitude),
      maxAltitude: num(base.max_altitude),
      avgSpeed: num(base.avg_speed),
      nightPct: num(base.night_pct),
      weekendPct: num(base.weekend_pct),
      primaryCounty: str(base.primary_county),
      spreadKm: num(base.spread_km),
      anomalyScore: num(base.anomaly_score),
      anomalyReasons: arr(base.anomaly_reasons).slice(0, 10),
      mlClassification: str(base.ml_classification),
      classificationConfidence: num(base.classification_confidence),
      tacticalRole: str(base.tactical_role),
      integrityFailureRate: num(base.integrity_failure_rate),
      sha256: str(base.sha256_hash),
    },
    signature: d0
      ? {
          cluster: num(d0.behavioral_cluster),
          profileScore: num(d0.profile_score),
          driftScore: num(d0.drift_score),
          stabilityScore: num(d0.stability_score),
          modelVersion: str(d0.model_version),
          windowStart: str(d0.window_start),
          windowEnd: str(d0.window_end),
          updatedAt: str(d0.updated_at),
          embeddingDims: num(d0.dims),
          topDimensions: jsonPairs(d0.top_anomaly_dimensions, 8),
          features: jsonPairs(d0.feature_vector, 40),
          explanation: str((expl as any[])[0]?.explanation),
        }
      : null,
    violationGroups: (vGroups as any[]).map((r) => ({
      rule: str(r.rule_violated) ?? "UNCLASSIFIED", count: Number(r.c),
      minAlt: num(r.min_alt), lastSeen: str(r.last_seen), statute: str(r.statute),
    })),
    violations: (vRows as any[]).map((r) => ({
      capturedAt: str(r.captured_at), rule: str(r.rule_violated) ?? "UNCLASSIFIED",
      altitude: num(r.altitude_ft), county: null, severity: num(r.severity_score),
      statute: str(r.statute_reference), sha256: str(r.sha256_hash), description: str(r.description),
    })),
    sentinel: (sRows as any[]).map((r) => ({
      capturedAt: str(r.detection_timestamp), rule: str(r.violation_type) ?? "UNCLASSIFIED",
      altitude: num(r.altitude), county: str(r.county), severity: str(r.severity),
      statute: null, sha256: str(r.sha256_hash), description: str(r.description),
    })),
    anomalyGroups: (aGroups as any[]).map((r) => ({
      type: str(r.anomaly_type) ?? "UNTYPED", count: Number(r.c),
      maxScore: num(r.max_score), lastSeen: str(r.last_seen),
    })),
    anomalies: (aRows as any[]).map((r) => ({
      detectedAt: str(r.detected_at), type: str(r.anomaly_type) ?? "UNTYPED",
      score: num(r.anomaly_score), altitude: num(r.altitude_ft), county: str(r.county),
      reasoning: str(r.reasoning), sha256: str(r.sha256_hash), reviewed: Boolean(r.human_reviewed),
    })),
    handoffs,
    corridors: (corr as any[]).map((r) => ({
      zone: str(r.zone_name) ?? "—", role: str(r.network_role), pattern: str(r.pattern),
      detections: num(r.zone_detections), minAltitude: num(r.min_altitude), lastSeen: str(r.last_seen),
    })),
    corrections: {
      scored: Number(e0.scored ?? 0),
      validated: Number(e0.validated ?? 0),
      falsePositives: Number(e0.fp ?? 0),
      avgEnsemble: num(e0.avg_ens),
      avgDisagreement: num(e0.avg_dis),
      models: [
        { key: "Isolation forest", value: num(e0.iforest) },
        { key: "Local outlier factor", value: num(e0.lof) },
        { key: "Temporal", value: num(e0.temporal) },
        { key: "Neural", value: num(e0.neural) },
        { key: "Kinematic", value: num(e0.kinematic) },
        { key: "Graph (GCN)", value: num(e0.gcn) },
      ].filter((m): m is { key: string; value: number } => m.value != null),
      reasons: (reasons as any[]).map((r) => ({ reason: String(r.reason), count: Number(r.c) })),
    },
    spoofing: (spoof as any[])[0]
      ? {
          sourceType: str((spoof as any[])[0].source_type),
          detectionCount: num((spoof as any[])[0].detection_count),
          firstSeen: str((spoof as any[])[0].first_seen),
          lastSeen: str((spoof as any[])[0].last_seen),
          broadcastInterval: num((spoof as any[])[0].broadcast_interval_seconds),
          coincides: (spoof as any[])[0].coincides_with_operations ?? null,
        }
      : null,
    receipts: (wtpr as any[]).map((r) => ({
      wtpr: String(r.wtpr), anomalyType: str(r.anomaly_type), legalStatus: str(r.legal_status),
      courtReady: Boolean(r.court_ready), sha256: str(r.sha256), capturedAt: str(r.captured_at),
    })),
    peers: Array.from(
      new Map(
        (peers as any[]).map((r) => [
          String(r.icao_hex).toUpperCase(),
          {
            icao: String(r.icao_hex).toUpperCase(),
            registration: str(r.observed_registration),
            owner: str(r.registered_owner),
            profileScore: num(r.profile_score),
          },
        ]),
      ).values(),
    ),
    generatedAt: new Date().toISOString(),
  };

  CACHE.set(raw, { at: Date.now(), value });
  return value;
}

/** Directory of the most-profiled aircraft, for the /aircraft index. */
export type FleetRow = {
  icao: string; registration: string | null; owner: string | null; model: string | null;
  totalDetections: number | null; minAltitude: number | null; anomalyScore: number | null;
  cluster: number | null; profileScore: number | null; lastSeen: string | null;
  isMilitary: boolean; tacticalRole: string | null;
};

const FLEET_CACHE = new Map<string, { at: number; rows: FleetRow[] }>();

export async function loadFleet(sort: "score" | "detections" | "lowest"): Promise<FleetRow[]> {
  const hit = FLEET_CACHE.get(sort);
  if (hit && Date.now() - hit.at < TTL) return hit.rows;
  const w = watchtower();
  const rows = (await (sort === "detections"
    ? w`SELECT p.icao_hex, p.observed_registration, p.registered_owner, p.aircraft_model,
               p.total_detections, p.min_altitude, p.anomaly_score, p.last_seen,
               p.is_military, p.tactical_role, d.behavioral_cluster, d.profile_score
          FROM aircraft_deep_profiles d
          JOIN aircraft_profiles p ON UPPER(p.icao_hex) = UPPER(d.icao_hex)
         WHERE p.total_detections IS NOT NULL
         ORDER BY p.total_detections DESC NULLS LAST LIMIT 60`
    : sort === "lowest"
    ? w`SELECT p.icao_hex, p.observed_registration, p.registered_owner, p.aircraft_model,
               p.total_detections, p.min_altitude, p.anomaly_score, p.last_seen,
               p.is_military, p.tactical_role, d.behavioral_cluster, d.profile_score
          FROM aircraft_deep_profiles d
          JOIN aircraft_profiles p ON UPPER(p.icao_hex) = UPPER(d.icao_hex)
         WHERE p.total_detections IS NOT NULL AND p.min_altitude IS NOT NULL AND p.min_altitude > -50
         ORDER BY p.min_altitude ASC LIMIT 60`
    : w`SELECT p.icao_hex, p.observed_registration, p.registered_owner, p.aircraft_model,
               p.total_detections, p.min_altitude, p.anomaly_score, p.last_seen,
               p.is_military, p.tactical_role, d.behavioral_cluster, d.profile_score
          FROM aircraft_deep_profiles d
          JOIN aircraft_profiles p ON UPPER(p.icao_hex) = UPPER(d.icao_hex)
         WHERE p.total_detections IS NOT NULL
         ORDER BY d.profile_score DESC NULLS LAST, p.total_detections DESC NULLS LAST LIMIT 60`)) as any[];
  const out: FleetRow[] = rows.map((r) => ({
    icao: String(r.icao_hex).toUpperCase(),
    registration: str(r.observed_registration),
    owner: str(r.registered_owner),
    model: str(r.aircraft_model),
    totalDetections: num(r.total_detections),
    minAltitude: num(r.min_altitude),
    anomalyScore: num(r.anomaly_score),
    cluster: num(r.behavioral_cluster),
    profileScore: num(r.profile_score),
    lastSeen: str(r.last_seen),
    isMilitary: Boolean(r.is_military),
    tacticalRole: str(r.tactical_role),
  }));
  FLEET_CACHE.set(sort, { at: Date.now(), rows: out });
  return out;
}