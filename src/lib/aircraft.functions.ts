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
    return loadFleet(data.sort);
  });