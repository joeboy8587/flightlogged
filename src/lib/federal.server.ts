import { watchtower } from "./neon.server";

/**
 * Federal & front-company aerial surveillance layer.
 *
 * The company names below are drawn from published public-interest reporting
 * (Associated Press, 2015; BuzzFeed News, 2016-2017) that identified fictitious
 * corporate registrants used by federal agencies, plus openly-named federal
 * registrants in the FAA Civil Aircraft Registry. Nothing here is inferred by
 * the machine layer: it is a name match against the public registry, then a
 * join against our own observed detections.
 */
export const FRONT_COMPANIES: { name: string; agency: string; source: string }[] = [
  { name: "FVX RESEARCH", agency: "Reported FBI front company", source: "AP / BuzzFeed News" },
  { name: "NG RESEARCH", agency: "Reported FBI front company", source: "AP / BuzzFeed News" },
  { name: "KQM AVIATION", agency: "Reported FBI front company", source: "AP / BuzzFeed News" },
  { name: "PSL SURVEYS", agency: "Reported FBI front company", source: "AP / BuzzFeed News" },
  { name: "NBR AVIATION", agency: "Reported FBI front company", source: "AP / BuzzFeed News" },
  { name: "NBY PRODUCTIONS", agency: "Reported FBI front company", source: "AP / BuzzFeed News" },
  { name: "NBY PRODUCTIIONS", agency: "Reported FBI front company (registry typo variant)", source: "FAA registry" },
  { name: "RKT PRODUCTIONS", agency: "Reported FBI front company", source: "AP / BuzzFeed News" },
  { name: "OBSIDIAN LEASING LLC", agency: "Reported federal leasing entity", source: "Public reporting" },
  { name: "AEROCHOICE LLC", agency: "Reported federal leasing entity", source: "Public reporting" },
  { name: "DEPARTMENT OF JUSTICE", agency: "US Department of Justice", source: "FAA registry" },
  { name: "US DEPARTMENT OF JUSTICE", agency: "US Department of Justice", source: "FAA registry" },
  { name: "U S DEPARTMENT OF JUSTICE", agency: "US Department of Justice", source: "FAA registry" },
  { name: "DEPARTMENT OF HOMELAND SECURITY", agency: "US Department of Homeland Security", source: "FAA registry" },
  { name: "US DEPARTMENT OF HOMELAND SECURITY", agency: "US Department of Homeland Security", source: "FAA registry" },
  { name: "US CUSTOMS & BORDER PROTECTION", agency: "US Customs & Border Protection", source: "FAA registry" },
];

const NAMES = FRONT_COMPANIES.map((f) => f.name);
const AGENCY_BY_NAME = new Map(FRONT_COMPANIES.map((f) => [f.name, f.agency]));

export type FederalRegistryRow = {
  company: string;
  agency: string;
  fleetSize: number;
  observed: number;
};

export type FederalObservedRow = {
  registration: string | null;
  icao: string | null;
  company: string;
  agency: string;
  model: string | null;
  detections: number | null;
  minAltitude: number | null;
  avgAltitude: number | null;
  primaryCounty: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
};

export type FederalLayer = {
  registry: FederalRegistryRow[];
  observed: FederalObservedRow[];
  totalFleet: number;
  totalObserved: number;
  generatedAt: string;
};

const num = (v: unknown): number | null => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const str = (v: unknown): string | null => (v == null ? null : String(v));

const CACHE: { at: number; value: FederalLayer | null } = { at: 0, value: null };
const TTL = 10 * 60 * 1000;

export async function loadFederalLayer(): Promise<FederalLayer> {
  if (CACHE.value && Date.now() - CACHE.at < TTL) return CACHE.value;
  const w = watchtower();

  const [fleet, seen] = await Promise.all([
    w`SELECT UPPER(name) AS name, COUNT(*)::int AS fleet
        FROM faa_master WHERE UPPER(name) = ANY(${NAMES})
       GROUP BY 1` as Promise<any[]>,
    w`SELECT UPPER(m.name) AS name, m.registration, m.mode_s_code_hex,
             p.aircraft_model, p.total_detections, p.min_altitude, p.avg_altitude,
             p.primary_county, p.first_seen, p.last_seen
        FROM faa_master m
        JOIN aircraft_profiles p ON UPPER(p.icao_hex) = UPPER(m.mode_s_code_hex)
       WHERE UPPER(m.name) = ANY(${NAMES})
       ORDER BY p.total_detections DESC NULLS LAST
       LIMIT 120` as Promise<any[]>,
  ]);

  // Collapse repeat profile rows for the same tail.
  const byTail = new Map<string, FederalObservedRow>();
  for (const r of seen) {
    const key = String(r.mode_s_code_hex ?? r.registration ?? "").toUpperCase();
    if (!key) continue;
    const company = String(r.name ?? "");
    const row: FederalObservedRow = {
      registration: str(r.registration),
      icao: key,
      company,
      agency: AGENCY_BY_NAME.get(company) ?? "Federal registrant",
      model: str(r.aircraft_model),
      detections: num(r.total_detections),
      minAltitude: num(r.min_altitude),
      avgAltitude: num(r.avg_altitude),
      primaryCounty: str(r.primary_county),
      firstSeen: str(r.first_seen),
      lastSeen: str(r.last_seen),
    };
    const prev = byTail.get(key);
    if (!prev) byTail.set(key, row);
    else {
      byTail.set(key, {
        ...prev,
        detections: (prev.detections ?? 0) + (row.detections ?? 0),
        minAltitude:
          prev.minAltitude == null ? row.minAltitude
          : row.minAltitude == null ? prev.minAltitude
          : Math.min(prev.minAltitude, row.minAltitude),
        firstSeen: !prev.firstSeen || (row.firstSeen && row.firstSeen < prev.firstSeen) ? row.firstSeen : prev.firstSeen,
        lastSeen: !prev.lastSeen || (row.lastSeen && row.lastSeen > prev.lastSeen) ? row.lastSeen : prev.lastSeen,
      });
    }
  }

  const observed = Array.from(byTail.values()).sort((a, b) => (b.detections ?? 0) - (a.detections ?? 0));
  const observedByCompany = new Map<string, number>();
  for (const o of observed) observedByCompany.set(o.company, (observedByCompany.get(o.company) ?? 0) + 1);

  const fleetByName = new Map(fleet.map((r) => [String(r.name), Number(r.fleet)]));
  const registry: FederalRegistryRow[] = FRONT_COMPANIES.filter((f) => fleetByName.has(f.name))
    .map((f) => ({
      company: f.name,
      agency: f.agency,
      fleetSize: fleetByName.get(f.name) ?? 0,
      observed: observedByCompany.get(f.name) ?? 0,
    }))
    .sort((a, b) => b.observed - a.observed || b.fleetSize - a.fleetSize);

  const value: FederalLayer = {
    registry,
    observed,
    totalFleet: registry.reduce((s, r) => s + r.fleetSize, 0),
    totalObserved: observed.length,
    generatedAt: new Date().toISOString(),
  };
  CACHE.at = Date.now();
  CACHE.value = value;
  return value;
}
