import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.NEON_WATCHTOWER_URL);
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;
// Parallel
const out = await Promise.all(tables.map(async (t) => {
  const name = t.table_name;
  try {
    const [c, cols] = await Promise.all([
      sql.query(`SELECT COUNT(*)::int AS count FROM "${name}"`),
      sql.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [name]),
    ]);
    return { name, count: c[0].count, cols: cols.map(x=>`${x.column_name}:${x.data_type}`) };
  } catch (e) { return { name, error: String(e).slice(0,80) }; }
}));
out.sort((a,b)=>(b.count||0)-(a.count||0));
for (const r of out) {
  if (r.error) { console.log(`# ${r.name} ERR ${r.error}`); continue; }
  console.log(`# ${r.name} (${r.count})`);
  console.log("  " + r.cols.join(", "));
}
