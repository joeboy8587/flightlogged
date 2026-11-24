/** Single policy eligibility list shared by public feeds and dossiers. */
export const KCSO_TAILS = ["N912KC", "N913KC", "N597E", "N911KC", "N97E"] as const;
export const KCSO_HEX_TO_TAIL: Record<string, string> = { AC9EFD: "N912KC", ACA2B4: "N913KC", AC9B46: "N911KC", A7B7CC: "N597E", AD81B0: "N97E" };
export function isKcsoAircraft(registration: string | null | undefined, icao?: string | null): boolean {
  const hex = String(icao ?? "").trim().toUpperCase();
  if (hex) return Boolean(KCSO_HEX_TO_TAIL[hex]);
  return (KCSO_TAILS as readonly string[]).includes(String(registration ?? "").trim().toUpperCase());
}