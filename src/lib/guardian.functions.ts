import { createServerFn } from "@tanstack/react-start";
export const getGuardianRecords = createServerFn({ method: "GET" })
  .inputValidator((input: { aircraft?: string; county?: string }) => {
    const aircraft = String(input?.aircraft ?? "").trim().toUpperCase();
    if (aircraft && !/^[A-Z0-9-]{2,20}$/.test(aircraft)) throw new Error("Enter a valid aircraft registration or hex code.");
    return { aircraft, county: String(input?.county ?? "SJV").slice(0, 40) };
  }).handler(async ({ data }) => {
    const { loadGuardianRecords } = await import("./guardian.server");
    return loadGuardianRecords(data.aircraft, data.county);
  });
export const getCurrentClassifications = createServerFn({ method: "GET" }).handler(async () => {
  const { loadClassifications } = await import("./guardian.server");
  return loadClassifications();
});
export const getCaseInventory = createServerFn({ method: "GET" }).handler(async () => {
  const { loadCaseInventory } = await import("./guardian.server");
  return loadCaseInventory();
});