import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.NEON_WATCHTOWER_URL);

// Get row counts and column info for all tables
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;

const results = [];
for (const t of tables) {
  const name = t.table_name;
  try {
    const [{ count }] = await sql.query(`SELECT COUNT(*)::int AS count FROM "${name}"`);
    const cols = await sql.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [name]);
    results.push({ name, count, cols: cols.map(c => `${c.column_name}:${c.data_type}`) });
  } catch (e) {
    results.push({ name, error: String(e).slice(0,80) });
  }
}
results.sort((a,b)=> (b.count||0)-(a.count||0));
for (const r of results) {
  if (r.error) { console.log(`\n# ${r.name} ERR ${r.error}`); continue; }
  console.log(`\n# ${r.name} (${r.count} rows)`);
  console.log("  " + r.cols.join(", "));
}
