import { neon } from "@neondatabase/serverless";
const E = neon(process.env.NEON_EVIDENCE_URL);
const W = neon(process.env.NEON_WATCHTOWER_URL);
const r = await E`SELECT COUNT(*)::int AS c FROM court_evidence.flight_detections`;
console.log("flight_detections:", r[0].c);
for (const [lbl, sql, schema, tbl] of [
  ["W","violation_classifications", W, "public","violation_classifications"],
]) {}
async function desc(label, sql, schema, tbl){
  try{
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=${schema} AND table_name=${tbl} ORDER BY ordinal_position`;
    const cnt = await sql.query(`SELECT COUNT(*)::int AS c FROM "${schema}"."${tbl}"`);
    console.log(`\n${label}.${schema}.${tbl} (${cnt[0].c})`);
    for(const c of cols) console.log(` ${c.column_name} :: ${c.data_type}`);
  }catch(e){console.log("err",label,tbl,e.message);}
}
await desc("W", W, "public", "violation_classifications");
await desc("W", W, "public", "faa_regulations");
await desc("E", E, "public", "regulatory_statutes");
await desc("E", E, "public", "consent_decree_violations");
const samp = await W`SELECT * FROM violation_classifications LIMIT 2`;
console.log("\nSAMPLE vc:", JSON.stringify(samp,null,2));
