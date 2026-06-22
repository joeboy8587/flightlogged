import { neon } from "@neondatabase/serverless";
const w = neon(process.env.NEON_WATCHTOWER_URL);
const r = await w`
  SELECT p.observed_registration, p.registered_owner, m.name AS faa_name, p.total_detections
  FROM aircraft_profiles p
  LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex)=UPPER(p.icao_hex)
  WHERE p.observed_registration IN ('N224AM','N528AM','N913KC')
     OR m.name ILIKE '%AIR METHODS%'
     OR m.name ILIKE '%MERCY%' OR m.name ILIKE '%LIFE FLIGHT%' OR m.name ILIKE '%MEDEVAC%'
  ORDER BY p.total_detections DESC NULLS LAST
  LIMIT 30
`;
console.table(r);
const top = await w`SELECT observed_registration, registered_owner, total_detections FROM aircraft_profiles ORDER BY total_detections DESC NULLS LAST LIMIT 10`;
console.log("TOP10:"); console.table(top);
