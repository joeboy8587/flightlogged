import { neon } from "@neondatabase/serverless";
const E = neon(process.env.NEON_EVIDENCE_URL);
const W = neon(process.env.NEON_WATCHTOWER_URL);

async function describe(label, sql, schema, tbl) {
  try {
    const cols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema=${schema} AND table_name=${tbl}
      ORDER BY ordinal_position`;
    const cnt = await sql.query(`SELECT COUNT(*)::int AS c FROM "${schema}"."${tbl}"`);
    console.log(`\n${label}.${schema}.${tbl}  (${cnt[0].c} rows)`);
    for (const c of cols) console.log(`  ${c.column_name.padEnd(36)} ${c.data_type}`);
  } catch (e) { console.log(`  err: ${e.message}`); }
}

// EVIDENCE - threat_tiers hash coverage
try {
  const h = await E`SELECT COUNT(*)::int AS total, COUNT(sha256_hash)::int AS hashed FROM threat_tiers`;
  console.log("EVIDENCE threat_tiers hash:", h[0]);
} catch (e) { console.log("threat_tiers err:", e.message); }

// New legal mapping tables
await describe("E", E, "public", "regulatory_statutes");
await describe("E", E, "public", "consent_decree_violations");
await describe("E", E, "public", "faa_regulations");
await describe("E", E, "public", "sentinel_violations");
await describe("E", E, "public", "violations_during_investigations");
await describe("E", E, "public", "aircraft_violations");
await describe("W", W, "public", "regulatory_statutes");
await describe("W", W, "public", "consent_decree_violations");
await describe("W", W, "public", "evidence_legal_enrichment");
await describe("W", W, "public", "violation_classifications");
await describe("W", W, "public", "faa_regulations");
