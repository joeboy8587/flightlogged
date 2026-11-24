/** Registry identity takes precedence over unverified observed-tail aliases. */
export function selectTailProfile<T extends { icao_hex: string; total_detections?: number | string | null }>(
  profiles: T[], registryHex: string | null, input: string,
): T | undefined {
  const normalize = (value: string) => value.trim().toUpperCase();
  const hex = /^[A-F0-9]{6}$/.test(input) ? input : registryHex;
  const candidates = hex
    ? profiles.filter((profile) => normalize(profile.icao_hex) === normalize(hex))
    : profiles;
  // Case-variant rows are not additive; prefer the most complete maintained row.
  return [...candidates].sort((a, b) => Number(b.total_detections ?? 0) - Number(a.total_detections ?? 0)
    || a.icao_hex.localeCompare(b.icao_hex))[0];
}