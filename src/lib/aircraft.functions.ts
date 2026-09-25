import { createServerFn } from "@tanstack/react-start";
import type { AircraftDossier, FleetRow, DossierPeerMatch, DossierPattern } from "./aircraft.server";

export type { AircraftDossier, FleetRow, DossierPeerMatch, DossierPattern };

export const getAircraftDossier = createServerFn({ method: "GET" })
  .inputValidator((d: { tail: string }) => ({ tail: String(d?.tail ?? "").slice(0, 20) }))
  .handler(async ({ data }): Promise<AircraftDossier | null> => {
    const { loadDossier } = await import("./aircraft.server");
    return loadDossier(data.tail);
  });

export const getFleetDirectory = createServerFn({ method: "GET" })
  .inputValidator((d: { sort?: string }) => ({
    sort: (d?.sort === "detections" || d?.sort === "lowest" ? d.sort : "score") as "score" | "detections" | "lowest",
  }))
  .handler(async ({ data }): Promise<FleetRow[]> => {
    const { loadFleet } = await import("./aircraft.server");
    const rows = await loadFleet(data.sort);
    // The database contains historical casing variants. Keep the most useful
    // profile per normalized hex so counts, links, and dossiers have one identity.
    const byHex = new Map<string, FleetRow>();
    for (const row of rows) {
      const key = row.icao.trim().toUpperCase();
      const previous = byHex.get(key);
      if (!previous || (row.totalDetections ?? 0) > (previous.totalDetections ?? 0)) {
        byHex.set(key, { ...row, icao: key });
      }
    }
    return [...byHex.values()];
  });
