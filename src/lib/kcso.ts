/** Single policy eligibility list shared by public feeds and dossiers. */
export const KCSO_TAILS = ["N912KC", "N913KC", "N597E", "N911KC", "N97E"] as const;
export const KCSO_HEX_TO_TAIL: Record<string, string> = { ACA2B4: "N913KC", AD81B0: "N97E" };
export function isKcsoAircraft(registration: string | null | undefined, icao?: string | null): boolean {
  return (KCSO_TAILS as readonly string[]).includes(String(registration ?? "").trim().toUpperCase())
    || Boolean(KCSO_HEX_TO_TAIL[String(icao ?? "").trim().toUpperCase()]);
}