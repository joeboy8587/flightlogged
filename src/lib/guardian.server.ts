import { neonQuery, neonUserError } from "./neon-gateway.server";
import { finiteNumber as n, normalizedHex, type GuardianRecords, type SourceRows, type ClassificationRecord } from "./guardian";
import { KCSO_TAILS, KCSO_HEX_TO_TAIL } from "./kcso";
import { resolveAircraftIdentity } from "./aircraft-identity.server";
const text = (v: unknown): string | null => v == null ? null : String(v);
async function read<T>(query: string, params: unknown[], map: (row: Record<string, unknown>) => T): Promise<SourceRows<T>> {
  try { const result = await neonQuery(query, params); return { rows: result.rows.map(map), error: null }; }
  catch (error) { console.error("Guardian source read failed", error); return { rows: [], error: neonUserError(error).message }; }
}
export async function loadGuardianRecords(aircraft?: string, county = "SJV"): Promise<GuardianRecords> {
  // Search only a bounded recent observation set, then use the indexed detection_id join.
  // A sample without a matching hypothesis is not a claim of no historical hypotheses.
  let key = normalizedHex(aircraft);
  if (key && !/^[A-F0-9]{6}$/.test(key)) {
    try {
      const identity = await resolveAircraftIdentity(key);
      if (!identity.icao) {
        const error = "No single aircraft identity resolved. Use its six-character aircraft code.";
        return { missions: { rows: [], error }, cycles: { rows: [], error }, dark: { rows: [], error }, readAt: new Date().toISOString(), scope: `Unresolved aircraft ${key}` };
      }
      key = identity.icao;
    } catch (e) {
      console.error("Guardian identity resolution failed", e);
      const error = "Aircraft identity could not be checked. Try again in a moment.";
      return { missions: { rows: [], error }, cycles: { rows: [], error }, dark: { rows: [], error }, readAt: new Date().toISOString(), scope: `Aircraft ${key} identity unavailable` };
    }
  }
  const [missions, cycles, dark] = await Promise.all([
    read(key ? `WITH recent AS MATERIALIZED (
      SELECT id, registration, icao_hex, county, captured_at FROM public.detections
      WHERE icao_hex = ANY($4)
      AND ($1 <> '' OR $2 = 'all' OR ($2 = 'SJV' AND upper(county) = ANY($3)) OR upper(county) = $2)
      ORDER BY captured_at DESC LIMIT 500
    ) SELECT h.id, d.registration, d.icao_hex, d.county, to_json(h.updated_at) AS at,
      h.hypothesis_type, h.confidence_score, h.detection_count, h.status,
      h.reasoning_chain, h.disproof_criteria, h.sha256_hash
      FROM recent d JOIN public.mission_hypotheses h ON h.detection_id=d.id
      ORDER BY h.updated_at DESC, h.id DESC LIMIT 20` : `WITH recent AS MATERIALIZED (
        SELECT * FROM public.mission_hypotheses ORDER BY updated_at DESC,id DESC LIMIT 2000
      ) SELECT h.id,d.registration,d.icao_hex,d.county,to_json(h.updated_at) AS at,
        h.hypothesis_type,h.confidence_score,h.detection_count,h.status,h.reasoning_chain,h.disproof_criteria,h.sha256_hash
        FROM recent h LEFT JOIN public.detections d ON d.id=h.detection_id
        WHERE ($1='' AND ($2='all' OR ($2='SJV' AND upper(d.county)=ANY($3)) OR upper(d.county)=$2))
        ORDER BY h.updated_at DESC,h.id DESC LIMIT 20`, key ? [key, county, ["KERN", "KINGS", "TULARE", "FRESNO"], [key, key.toLowerCase()]] : [key, county, ["KERN", "KINGS", "TULARE", "FRESNO"]], r => ({
      id: String(r.id), aircraft: text(r.registration), icao: text(r.icao_hex), county: text(r.county), at: text(r.at), type: String(r.hypothesis_type), confidence: n(r.confidence_score), observations: n(r.detection_count), status: text(r.status), reasoning: text(r.reasoning_chain), disproof: text(r.disproof_criteria), hash: text(r.sha256_hash),
    })),
    read(`SELECT id, icao_hex, registration, to_json(last_seen_at) AS before,
      to_json(first_seen_at) AS after, to_json(detected_at) AS at, gap_minutes, delta_km,
      hypothesis, concurrent_gaps, feed_ratio, was_parked, sha256_hash
      FROM public.transponder_cycles WHERE ($1 = '' OR icao_hex=ANY($2))
      ORDER BY first_seen_at DESC, id DESC LIMIT 20`, [key, [key, key.toLowerCase()]], r => ({
      id: String(r.id), aircraft: text(r.registration), icao: normalizedHex(r.icao_hex), before: text(r.before), after: text(r.after), at: text(r.at), gapMinutes: n(r.gap_minutes), distanceKm: n(r.delta_km), hypothesis: text(r.hypothesis), concurrentGaps: n(r.concurrent_gaps), feedRatio: n(r.feed_ratio), parked: typeof r.was_parked === "boolean" ? r.was_parked : null, hash: text(r.sha256_hash),
    })),
    key ? read(`SELECT icao_hex,day,brief_gap_count,min_gap_seconds,max_gap_seconds,to_json(updated_at) AS at
      FROM public.brief_dark_windows WHERE icao_hex=ANY($1) ORDER BY day DESC, icao_hex LIMIT 14`, [[key, key.toLowerCase()]], r => ({ icao: String(r.icao_hex), day: String(r.day), count: Number(r.brief_gap_count), minSeconds: n(r.min_gap_seconds), maxSeconds: n(r.max_gap_seconds), at: text(r.at) })) : Promise.resolve({ rows: [], error: null }),
  ]);
  return { missions, cycles, dark, readAt: new Date().toISOString(), scope: key ? `Aircraft ${key} · latest 500 observations checked for hypotheses; latest 20 gap records` : `Mission sample: ${county} matches from latest 2,000 assessments; gaps: all monitored counties, latest 20 records` };
}
export async function loadClassifications(): Promise<SourceRows<ClassificationRecord>> {
  return read(`WITH latest AS (
    SELECT detection_id,registration,icao_hex,captured_at,to_json(captured_at) AS at,rule_violated,
      statute_reference,owner_name,altitude_ft,agl_ft,altitude_source,severity_score,baseline_confidence,
      classification_mode,rule_set_version,sha256_hash FROM public.violation_classifications
    WHERE captured_at IS NOT NULL AND (rule_violated NOT LIKE 'KCSO_%' OR upper(icao_hex)=ANY($2)
      OR (NULLIF(TRIM(icao_hex),'') IS NULL AND upper(registration)=ANY($1)))
    ORDER BY captured_at DESC,detection_id DESC LIMIT 100
  ) SELECT v.*,m.name AS faa_owner,m.n_number FROM latest v
    LEFT JOIN LATERAL (SELECT name,n_number FROM faa_master fm WHERE UPPER(fm.mode_s_code_hex)=UPPER(v.icao_hex) ORDER BY fm.n_number LIMIT 1) m ON true
    ORDER BY v.captured_at DESC,v.detection_id DESC`, [KCSO_TAILS, Object.keys(KCSO_HEX_TO_TAIL)], r => ({
    id: String(r.detection_id) + ":" + String(r.rule_violated), aircraft: r.n_number ? `N${String(r.n_number).replace(/^N/i, "")}` : text(r.registration), icao: normalizedHex(r.icao_hex), at: text(r.at), rule: String(r.rule_violated), statute: text(r.statute_reference), owner: text(r.faa_owner) || text(r.owner_name), recordedOwner: text(r.owner_name), ownerSource: r.faa_owner ? "FAA registry" : "Classification record", altitude: n(r.altitude_ft), agl: n(r.agl_ft), altitudeSource: text(r.altitude_source), severityScore: n(r.severity_score), confidence: text(r.baseline_confidence), mode: text(r.classification_mode), version: text(r.rule_set_version), hash: text(r.sha256_hash),
  }));
}
export async function loadCaseInventory() {
  // No publication marker exists: return counts, not names, claims, notes or people.
  const result = await read(`SELECT
    (SELECT count(*) FROM case_file.cases) AS cases,
    (SELECT count(*) FROM case_file.entities) AS entities,
    (SELECT count(*) FROM case_file.links) AS links,
    (SELECT count(*) FROM case_file.timeline) AS timeline,
    (SELECT count(*) FROM case_file.timeline WHERE verified IS TRUE) AS verified,
    (SELECT count(*) FROM case_file.evidence) AS evidence,
    (SELECT to_json(max(updated_at)) FROM case_file.cases) AS updated
    LIMIT 1`, [], r => ({ cases: Number(r.cases), entities: Number(r.entities), links: Number(r.links), timeline: Number(r.timeline), verified: Number(r.verified), evidence: Number(r.evidence), updated: text(r.updated) }));
  return { inventory: result.rows[0] ?? null, error: result.error };
}