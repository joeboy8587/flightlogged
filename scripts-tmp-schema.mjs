import { neon } from "@neondatabase/serverless";
const W = neon(process.env.NEON_WATCHTOWER_URL);
const E = neon(process.env.NEON_EVIDENCE_URL);

async function summarize(label, sql) {
  console.log(`\n=== ${label} ===`);
  const tables = await sql`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type='BASE TABLE'
      AND table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name`;
  // group by schema, count
  const bySchema = {};
  for (const t of tables) (bySchema[t.table_schema] ||= []).push(t.table_name);
  for (const [s, arr] of Object.entries(bySchema)) console.log(`  schema ${s}: ${arr.length} tables`);

  // for public schema, get sizes
  const sizes = await sql`
    SELECT relname AS table_name,
           n_live_tup AS rows,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='r' AND n.nspname='public'
    ORDER BY n_live_tup DESC NULLS LAST
    LIMIT 30`;
  console.log(`\n  Top public tables by rows:`);
  for (const r of sizes) console.log(`    ${r.table_name.padEnd(50)} ${String(r.rows).padStart(10)} rows  ${r.size}`);
}

await summarize("WATCHTOWER", W);
await summarize("EVIDENCE", E);
