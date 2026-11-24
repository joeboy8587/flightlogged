import { watchtower } from "./neon.server";
import { tailForms } from "./aircraft";
import { selectTailProfile } from "./tail-identity";

/** FAA-first identity resolution; observed-tail aliases never override a registry hex. */
export async function resolveAircraftIdentity(input: string) {
  const { raw, nform, nless } = tailForms(input);
  const w = watchtower();
  const registryRows = await w`SELECT n_number, registration, mode_s_code_hex, name, city, state, county,
      year_mfr, type_registrant, cert_issue_date, expiration_date, status_code, serial_number, eng_mfr_mdl
    FROM faa_master
    WHERE UPPER(TRIM(n_number)) = ${nless} OR UPPER(TRIM(mode_s_code_hex)) = ${raw}
    ORDER BY CASE WHEN UPPER(TRIM(mode_s_code_hex)) = ${raw} THEN 0 ELSE 1 END, n_number
    LIMIT 1`;
  const registry = registryRows[0];
  const registryHex = registry?.mode_s_code_hex ? String(registry.mode_s_code_hex).trim().toUpperCase() : null;
  const explicitHex = /^[A-F0-9]{6}$/.test(raw) ? raw : null;
  const requestedHex = explicitHex ?? registryHex;
  const profiles = await w`SELECT * FROM aircraft_profiles
    WHERE (${requestedHex}::text IS NOT NULL AND icao_hex IN (${requestedHex ?? ""}, ${requestedHex?.toLowerCase() ?? ""}))
       OR (${requestedHex}::text IS NULL AND UPPER(observed_registration) IN (${raw}, ${nform}, ${nless}))
    ORDER BY total_detections DESC NULLS LAST, icao_hex LIMIT 20`;
  const profile = selectTailProfile(profiles, registryHex, raw);
  const icao = requestedHex ?? (profile?.icao_hex ? String(profile.icao_hex).trim().toUpperCase() : null);
  const registration = registry?.n_number ? `N${String(registry.n_number).replace(/^N/i, "")}`
    : profile?.observed_registration ?? (explicitHex ? null : nform);
  return { profile, registry, icao, registration };
}

/** Bounded registry enrichment by aircraft code, never by a potentially reused tail. */
export async function registryByHex(hexes: string[]): Promise<Map<string, any>> {
  const keys = [...new Set(hexes.map(h => h.trim().toUpperCase()).filter(Boolean))];
  if (!keys.length) return new Map();
  const w = watchtower();
  const rows = await w`SELECT DISTINCT ON (UPPER(mode_s_code_hex)) mode_s_code_hex, n_number, name
    FROM faa_master WHERE UPPER(mode_s_code_hex) = ANY(${keys})
    ORDER BY UPPER(mode_s_code_hex), n_number LIMIT ${keys.length}`;
  return new Map(rows.map(row => [String(row.mode_s_code_hex).trim().toUpperCase(), row]));
}

export async function enrichProfileIdentities<T extends { icao_hex: string; observed_registration?: string | null; registered_owner?: string | null }>(rows: T[]): Promise<T[]> {
  const registry = await registryByHex(rows.map(r => r.icao_hex));
  return rows.map(row => {
    const match = registry.get(String(row.icao_hex).trim().toUpperCase());
    return { ...row,
      observed_registration: match?.n_number ? `N${String(match.n_number).replace(/^N/i, "")}` : row.observed_registration,
      registered_owner: match?.name ?? row.registered_owner,
    };
  });
}