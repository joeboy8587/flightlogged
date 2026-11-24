import { createServerFn } from "@tanstack/react-start";
import { watchtower } from "./neon.server";

// Live verification of the numbers cited in the Surveillance Grid evidence
// package (EP-2026-0707-SURVEILLANCE-GRID + WTPR-2026-0707-SURVEILLANCE-GRID-001).
// Every field returned here is a direct read from the quiet-math (watchtower)
// Neon DB — the unbiased ML system, not the report author.
export type SurveillanceGridVerification = {
  generatedAt: string;
  n913kc: {
    totalDetections: number | null;
    minAltitude: number | null;
    below500ft: number | null;
    classifiedViolations: number | null;
    convergenceEvents: number | null;
  };
  n912kc: {
    classifiedViolations: number | null;
  };
  n989rr: {
    minAltitude: number | null;
    detections: number | null;
  };
  totals: {
    detections: number | null;
    uniqueAircraft: number | null;
    classifiedViolations: number | null;
    violatingAircraft: number | null;
    convergenceEvents: number | null;
  };
  monthly: { month: string; violations: number }[];
  aeroEquities: { aircraftCount: number; detections: number } | null;
  shellLlcAircraft: number | null;
  stmpd19Convergence: { detectedAt: string; aircraftCount: number; county: string | null } | null;
};

const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
  try { return await p; } catch (e) { console.error("SG verify:", e); return fallback; }
};

export const getSurveillanceGridVerification = createServerFn({ method: "GET" }).handler(
  async (): Promise<SurveillanceGridVerification> => {
    const w = watchtower();
    const { resolveAircraftIdentity } = await import("./aircraft-identity.server");
    const [n913Identity, n912Identity, n989Identity] = await Promise.all([
      safe(resolveAircraftIdentity("N913KC"), null), safe(resolveAircraftIdentity("N912KC"), null), safe(resolveAircraftIdentity("N989RR"), null),
    ]);
    const n913Hex = n913Identity?.icao ?? "";
    const n912Hex = n912Identity?.icao ?? "";
    const n989Hex = n989Identity?.icao ?? "";
    const [
      n913Profile, n913Low, n913Viol, n913Conv,
      n912Viol, n989, totals, totVio, totConv,
      monthly, aero, shell, stmpd,
    ] = await Promise.all([
      Promise.resolve(n913Identity?.profile ? [n913Identity.profile] : []),
      n913Hex ? safe(w`SELECT COUNT(*)::int AS c FROM detections WHERE icao_hex IN (${n913Hex}, ${n913Hex.toLowerCase()}) AND altitude_ft < 500 AND altitude_ft >= 0` as Promise<any[]>, [] as any[]) : Promise.resolve([]),
      n913Hex ? safe(w`SELECT COUNT(*)::int AS c FROM violation_classifications WHERE icao_hex IN (${n913Hex}, ${n913Hex.toLowerCase()})` as Promise<any[]>, [] as any[]) : Promise.resolve([]),
      n913Hex ? safe(w`SELECT COUNT(*)::int AS c FROM convergence_events WHERE unique_icao_hexes && ARRAY[${n913Hex}, ${n913Hex.toLowerCase()}]::text[]` as Promise<any[]>, [] as any[]) : Promise.resolve([]),
      n912Hex ? safe(w`SELECT COUNT(*)::int AS c FROM violation_classifications WHERE icao_hex IN (${n912Hex}, ${n912Hex.toLowerCase()})` as Promise<any[]>, [] as any[]) : Promise.resolve([]),
      n989Hex ? safe(w`SELECT MIN(altitude_ft)::int AS min, COUNT(*)::int AS c FROM detections WHERE icao_hex IN (${n989Hex}, ${n989Hex.toLowerCase()}) AND altitude_ft > 0` as Promise<any[]>, [] as any[]) : Promise.resolve([]),
      safe(w`SELECT COUNT(*)::int AS c, COUNT(DISTINCT UPPER(icao_hex))::int AS craft FROM detections` as Promise<any[]>, [] as any[]),
      safe(w`SELECT COUNT(*)::int AS c, COUNT(DISTINCT UPPER(icao_hex))::int AS craft FROM violation_classifications` as Promise<any[]>, [] as any[]),
      safe(w`SELECT COUNT(*)::int AS c FROM convergence_events` as Promise<any[]>, [] as any[]),
      safe(w`SELECT DATE_TRUNC('month', captured_at) AS mo, COUNT(*)::int AS c FROM violation_classifications GROUP BY 1 ORDER BY 1 DESC LIMIT 3` as Promise<any[]>, [] as any[]),
      safe(w`SELECT COUNT(*)::int AS aircraft, SUM(p.total_detections)::bigint AS det FROM (SELECT DISTINCT ON (UPPER(icao_hex)) * FROM aircraft_profiles ORDER BY UPPER(icao_hex),total_detections DESC NULLS LAST) p WHERE EXISTS (SELECT 1 FROM faa_master m WHERE UPPER(m.mode_s_code_hex)=UPPER(p.icao_hex) AND UPPER(m.name) LIKE 'AERO EQUITIES%')` as Promise<any[]>, [] as any[]),
      safe(w`SELECT COUNT(DISTINCT UPPER(p.icao_hex))::int AS c FROM aircraft_profiles p WHERE EXISTS (SELECT 1 FROM faa_master m WHERE UPPER(m.mode_s_code_hex)=UPPER(p.icao_hex) AND UPPER(m.name) LIKE '%LLC%')` as Promise<any[]>, [] as any[]),
      n913Hex ? safe(w`SELECT detected_at, aircraft_count, county FROM convergence_events WHERE unique_icao_hexes && ARRAY[${n913Hex}, ${n913Hex.toLowerCase()}]::text[] AND unique_icao_hexes && ARRAY['AE5C77','ae5c77']::text[] ORDER BY detected_at DESC LIMIT 1` as Promise<any[]>, [] as any[]) : Promise.resolve([]),
    ]);

    const aeroRow = aero[0];
    const stmpdRow = stmpd[0];
    return {
      generatedAt: new Date().toISOString(),
      n913kc: {
        totalDetections: n913Profile[0]?.total_detections ?? null,
        minAltitude: n913Profile[0]?.min_altitude ?? null,
        below500ft: n913Low[0]?.c ?? null,
        classifiedViolations: n913Viol[0]?.c ?? null,
        convergenceEvents: n913Conv[0]?.c ?? null,
      },
      n912kc: { classifiedViolations: n912Viol[0]?.c ?? null },
      n989rr: { minAltitude: n989[0]?.min ?? null, detections: n989[0]?.c ?? null },
      totals: {
        detections: totals[0]?.c ?? null,
        uniqueAircraft: totals[0]?.craft ?? null,
        classifiedViolations: totVio[0]?.c ?? null,
        violatingAircraft: totVio[0]?.craft ?? null,
        convergenceEvents: totConv[0]?.c ?? null,
      },
      monthly: monthly.map((r: any) => ({
        month: new Date(r.mo).toISOString().slice(0, 7),
        violations: Number(r.c),
      })),
      aeroEquities: aeroRow
        ? { aircraftCount: Number(aeroRow.aircraft ?? 0), detections: Number(aeroRow.det ?? 0) }
        : null,
      shellLlcAircraft: shell[0]?.c ?? null,
      stmpd19Convergence: stmpdRow
        ? {
            detectedAt: new Date(stmpdRow.detected_at).toISOString(),
            aircraftCount: Number(stmpdRow.aircraft_count),
            county: stmpdRow.county ?? null,
          }
        : null,
    };
  },
);