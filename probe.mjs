import postgres from 'postgres';
for (const [name, url] of [['WATCHTOWER', process.env.NEON_WATCHTOWER_URL], ['EVIDENCE', process.env.NEON_EVIDENCE_URL]]) {
  console.log(`\n=== ${name} ===`);
  if (!url) { console.log('NO URL'); continue; }
  try {
    const sql = postgres(url, { ssl: 'require', max: 1 });
    const tables = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name`;
    console.log('TABLES:', tables.length);
    for (const t of tables) {
      const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=${t.table_schema} AND table_name=${t.table_name} ORDER BY ordinal_position`;
      let cnt = '?';
      try { const r = await sql.unsafe(`SELECT COUNT(*)::int as c FROM "${t.table_schema}"."${t.table_name}"`); cnt = r[0].c; } catch {}
      console.log(`  ${t.table_schema}.${t.table_name} (${cnt} rows): ${cols.map(c=>c.column_name+':'+c.data_type).join(', ')}`);
    }
    await sql.end();
  } catch (e) { console.log('ERR', e.message); }
}
