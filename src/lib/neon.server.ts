import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

let _watch: Sql | null = null;
let _evidence: Sql | null = null;

export function watchtower(): Sql {
  if (!_watch) {
    const url = process.env.NEON_WATCHTOWER_URL;
    if (!url) throw new Error("NEON_WATCHTOWER_URL not set");
    _watch = postgres(url, { ssl: "require", max: 3, idle_timeout: 20 });
  }
  return _watch;
}

export function evidence(): Sql {
  if (!_evidence) {
    const url = process.env.NEON_EVIDENCE_URL;
    if (!url) throw new Error("NEON_EVIDENCE_URL not set");
    _evidence = postgres(url, { ssl: "require", max: 3, idle_timeout: 20 });
  }
  return _evidence;
}