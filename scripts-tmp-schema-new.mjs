import { neon } from "@neondatabase/serverless";
const E = neon(process.env.NEON_EVIDENCE_URL);
const W = neon(process.env.NEON_WATCHTOWER_URL);

// Look for tables related to decrees, titles, consent decrees, statutes
for (const [name, sql] of [["EVIDENCE", E], ["WATCHTOWER", W]]) {
  console.log(`\n=== ${name}: candidate tables (decree/title/statute/regulation/citation) ===`);
  const t = await sql`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type='BASE TABLE'
      AND table_schema NOT IN ('pg_catalog','information_schema')
      AND (table_name ILIKE '%decree%' OR table_name ILIKE '%title%' OR table_name ILIKE '%statute%'
           OR table_name ILIKE '%regulation%' OR table_name ILIKE '%citation%' OR table_name ILIKE '%cfr%'
           OR table_name ILIKE '%violation%' OR table_name ILIKE '%legal%' OR table_name ILIKE '%law%'
           OR table_name ILIKE '%consent%')
    ORDER BY 1,2`;
  for (const r of t) console.log(`  ${r.table_schema}.${r.table_name}`);
}

// hash coverage in watchtower threat_tiers
console.log(`\n=== WATCHTOWER threat_tiers hash coverage ===`);
const h = await W`SELECT COUNT(*) AS total, COUNT(sha256_hash) AS hashed FROM threat_tiers`;
console.log(h);
