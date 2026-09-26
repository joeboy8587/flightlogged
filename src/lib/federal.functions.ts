import { createServerFn } from "@tanstack/react-start";
import type { FederalLayer, FederalRegistryRow, FederalObservedRow, FederalCandidateRow } from "./federal.server";

export type { FederalLayer, FederalRegistryRow, FederalObservedRow, FederalCandidateRow };

export const getFederalLayer = createServerFn({ method: "GET" }).handler(async (): Promise<FederalLayer> => {
  const { loadFederalLayer } = await import("./federal.server");
  return loadFederalLayer();
});
