import { describe, expect, it } from "vitest";
import { selectTailProfile, lookupRegistryIdentity, uniqueAircraftProfiles } from "./tail-identity";

const profiles = [
  { icao_hex: "AC9AFD", total_detections: 61, registered_owner: null },
  { icao_hex: "AC9EF5", total_detections: 63, registered_owner: null },
  { icao_hex: "AC9EFD", total_detections: 414340, registered_owner: "KERN COUNTY SHERIFFS OFFICE" },
  { icao_hex: "AD9EFD", total_detections: 17, registered_owner: null },
];
describe("Tail Search registry identity", () => {
  it("does not choose one of multiple unrelated hexes when a tail lacks an FAA match", () => {
    expect(selectTailProfile(profiles, null, "N912KC")).toBeUndefined();
  });
  it("does not transfer a sheriff owner through a conflicting observed tail", () => {
    const owner = "KERN COUNTY SHERIFFS OFFICE";
    const map = new Map([["REG:912KC", owner], ["HEX:AC9EFD", owner]]);
    expect(lookupRegistryIdentity(map, "N912KC", "AC9AFD")).toBeNull();
    expect(lookupRegistryIdentity(map, "N912KC", "ac9efd")).toBe(owner);
    expect(lookupRegistryIdentity(map, "N912KC", null)).toBe(owner);
  });
  it("keeps different hexes separate and selects rather than sums casing variants", () => {
    const rows = uniqueAircraftProfiles([...profiles, { icao_hex: "ac9efd", total_detections: 68, registered_owner: null }]);
    expect(rows).toHaveLength(4);
    expect(rows.find(p => p.icao_hex === "AC9EFD")?.total_detections).toBe(414340);
  });
  it("resolves N912KC to its FAA-matched sheriff profile regardless of row order", () => {
    const profile = selectTailProfile(profiles, "AC9EFD", "N912KC");
    expect(profile?.icao_hex).toBe("AC9EFD");
    expect(profile?.registered_owner).toBe("KERN COUNTY SHERIFFS OFFICE");
    expect(profile?.total_detections).toBe(414340);
    expect(selectTailProfile([...profiles].reverse(), "ac9efd", "N912KC")).toEqual(profile);
  });
  it("does not substitute an observed-tail alias when the FAA profile is missing", () => {
    expect(selectTailProfile(profiles.filter(p => p.icao_hex !== "AC9EFD"), "AC9EFD", "N912KC")).toBeUndefined();
  });
  it("keeps an explicit hex search separate from the FAA registration", () => {
    expect(selectTailProfile(profiles, "AC9EFD", "AC9AFD")?.total_detections).toBe(61);
  });
  it("does not sum case-variant maintained profile counts", () => {
    expect(selectTailProfile([...profiles, { icao_hex: "ac9efd", total_detections: 68, registered_owner: null }], "AC9EFD", "N912KC")?.total_detections).toBe(414340);
  });
});