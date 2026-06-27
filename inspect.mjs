import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.NEON_WATCHTOWER_URL);
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;
const cols = await sql`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`;
const byTable = {};
for (const c of cols) (byTable[c.table_name] ||= []).push(`${c.column_name}:${c.data_type}`);
for (const t of tables) console.log(`# ${t.table_name}\n  ${(byTable[t.table_name]||[]).join(", ")}`);
