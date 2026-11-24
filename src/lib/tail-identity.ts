/** Registry identity takes precedence over unverified observed-tail aliases. */
export function selectTailProfile<T extends { icao_hex: string; total_detections?: number | string | null }>(
  profiles: T[], registryHex: string | null, input: string,
): T | undefined {
  const normalize = (value: string) => value.trim().toUpperCase();
  const hex = /^[A-F0-9]{6}$/.test(input) ? input : registryHex;
  const candidates = hex
    ? profiles.filter((profile) => normalize(profile.icao_hex) === normalize(hex))
    : profiles;
  if (!hex && new Set(candidates.map(profile => normalize(profile.icao_hex))).size > 1) return undefined;
  // Case-variant rows are not additive; prefer the most complete maintained row.
  return [...candidates].sort((a, b) => Number(b.total_detections ?? 0) - Number(a.total_detections ?? 0)
    || a.icao_hex.localeCompare(b.icao_hex))[0];
}

/** A provided aircraft code must never fall back to a different tail's registry record. */
export function lookupRegistryIdentity<T>(map: Map<string, T>, registration?: string | null, icao?: string | null): T | null {
  const hex = String(icao ?? "").trim().toUpperCase();
  if (hex) return map.get(`HEX:${hex}`) ?? null;
  const tail = String(registration ?? "").trim().toUpperCase().replace(/^N/, "");
  return tail ? map.get(`REG:${tail}`) ?? null : null;
}

export function uniqueAircraftProfiles<T extends { icao_hex: string; total_detections?: number | string | null }>(rows: T[]): T[] {
  const byHex = new Map<string, T>();
  for (const row of rows) {
    const key = String(row.icao_hex).trim().toUpperCase();
    const previous = byHex.get(key);
    if (key && (!previous || Number(row.total_detections ?? 0) > Number(previous.total_detections ?? 0))) byHex.set(key, row);
  }
  return [...byHex.values()];
}