import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.NEON_WATCHTOWER_URL);
try {
  const r = await sql`SELECT
    (SELECT COUNT(*)::int FROM detections) AS detections,
    (SELECT COUNT(DISTINCT icao_hex)::int FROM detections) AS aircraft,
    (SELECT COUNT(*)::int FROM anomaly_events) AS anomalies,
    (SELECT COUNT(*)::int FROM violation_classifications) AS violations`;
  console.log("snap", r);
} catch (e) { console.log("snap err", e.message); }
for (const q of [
  "SELECT canonical_name, total_detections, fleet_size FROM canonical_operators LIMIT 2",
  "SELECT anomaly_type, COUNT(*)::int c FROM anomaly_events GROUP BY anomaly_type LIMIT 2",
  "SELECT county, COUNT(*)::int c FROM detections WHERE county IS NOT NULL GROUP BY county LIMIT 2",
]) {
  try { console.log(q, await sql([q])); } catch (e) { console.log(q, "ERR", e.message); }
}
