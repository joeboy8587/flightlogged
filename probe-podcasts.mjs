import { neon } from "@neondatabase/serverless";
const w = neon(process.env.NEON_WATCHTOWER_URL);
try {
  const ops = await w`SELECT canonical_name, total_detections, fleet_size FROM canonical_operators WHERE canonical_name IS NOT NULL ORDER BY total_detections DESC NULLS LAST LIMIT 5`;
  console.log("ops", ops);
} catch (e) { console.log("ops ERR", e.message); }
try {
  const anom = await w`SELECT anomaly_type, COUNT(*)::int AS c FROM anomaly_events WHERE anomaly_type IS NOT NULL GROUP BY anomaly_type ORDER BY c DESC LIMIT 5`;
  console.log("anom", anom);
} catch (e) { console.log("anom ERR", e.message); }
try {
  const cty = await w`SELECT county, COUNT(*)::int AS c FROM detections WHERE county IS NOT NULL GROUP BY county ORDER BY c DESC LIMIT 5`;
  console.log("cty", cty);
} catch (e) { console.log("cty ERR", e.message); }
