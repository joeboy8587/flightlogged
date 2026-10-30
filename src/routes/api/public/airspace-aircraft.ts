import { createFileRoute } from "@tanstack/react-router";
import type { LiveAircraft, LiveAircraftResponse, FaaRegistryMatch } from "@/components/airspace/contracts";

// Read-only public proxy for the 3D Kern airspace view.
// Pulls live positions from adsb.lol and matches them to the public FAA registry.
// Never writes to the Watchtower evidence database.
const UPSTREAM_URL = "https://api.adsb.lol/v2/lat/35.29394/lon/-118.90517/dist/120";
const CACHE_TTL_MS = 8_000;
let cached: { at: number; body: LiveAircraftResponse } | null = null;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

type Raw = Record<string, any>;

function normalize(raw: Raw): LiveAircraft | null {
  if (!raw.hex || !Number.isFinite(raw.lat) || !Number.isFinite(raw.lon)) return null;
  const registration = (raw.r as string | undefined)?.trim() || null;
  return {
    hex: String(raw.hex).toLowerCase(),
    callsign: (raw.flight as string | undefined)?.trim() || registration || String(raw.hex).toUpperCase(),
    registration,
    aircraftType: (raw.t as string | undefined)?.trim() || null,
    lat: raw.lat,
    lon: raw.lon,
    altitudeFt: raw.alt_baro === "ground" ? null : num(raw.alt_baro) ?? num(raw.alt_geom),
    onGround: raw.alt_baro === "ground",
    groundSpeedKt: num(raw.gs),
    trackDeg: num(raw.track),
    verticalRateFpm: num(raw.baro_rate) ?? num(raw.geom_rate),
    seenPositionSec: num(raw.seen_pos),
    category: (raw.category as string | undefined)?.trim() || null,
    registry: null,
  };
}

async function matchRegistry(hexes: string[]) {
  const map = new Map<string, FaaRegistryMatch>();
  if (!hexes.length) return { map, ok: true };
  try {
    const { watchtower } = await import("@/lib/neon.server");
    const sql = watchtower();
    const rows = (await sql`
      SELECT UPPER(TRIM(mode_s_code_hex)) AS hex, n_number, year_mfr, name, status_code
      FROM faa_master
      WHERE UPPER(TRIM(mode_s_code_hex)) = ANY(${hexes.map((h) => h.toUpperCase())})
    `) as Array<{ hex: string; n_number: string; year_mfr: string | null; name: string | null; status_code: string | null }>;
    for (const r of rows) {
      const y = r.year_mfr ? parseInt(r.year_mfr, 10) : NaN;
      map.set(r.hex.toLowerCase(), {
        registration: `N${String(r.n_number).trim()}`,
        yearMfr: Number.isFinite(y) ? y : null,
        registrant: r.name?.trim() || null,
        statusCode: r.status_code?.trim() || null,
      });
    }
    return { map, ok: true };
  } catch (e) {
    console.error("airspace registry match failed", e);
    return { map, ok: false };
  }
}

export const Route = createFileRoute("/api/public/airspace-aircraft")({
  server: {
    handlers: {
      GET: async () => {
        const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
          return new Response(JSON.stringify({ ...cached.body, cached: true }), { headers });
        }
        try {
          const res = await fetch(UPSTREAM_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
          if (!res.ok) throw new Error(`adsb.lol returned ${res.status}`);
          const json = (await res.json()) as { ac?: Raw[] };
          const aircraft = (json.ac ?? []).map(normalize).filter((a): a is LiveAircraft => !!a);
          const { map, ok } = await matchRegistry(aircraft.map((a) => a.hex));
          for (const a of aircraft) a.registry = map.get(a.hex) ?? null;
          const body: LiveAircraftResponse = {
            source: "adsb.lol",
            radiusNm: 120,
            fetchedAt: new Date().toISOString(),
            cached: false,
            stale: false,
            aircraft,
            database: { status: ok ? "linked" : "offline", registryMatches: map.size, persistedDetections: 0, faaVintage: null },
          };
          cached = { at: Date.now(), body };
          return new Response(JSON.stringify(body), { headers });
        } catch (e) {
          if (cached) {
            return new Response(JSON.stringify({ ...cached.body, cached: true, stale: true, message: "Live feed briefly unavailable; showing last positions." }), { headers });
          }
          return new Response(JSON.stringify({ message: String(e) }), { status: 502, headers });
        }
      },
    },
  },
});
