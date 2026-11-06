import { describe, expect, it } from "vitest";
import { isKcsoAircraft, KCSO_TAILS, KCSO_HEX_TO_TAIL } from "./kcso";
describe("KCSO aircraft policy scope", () => {
  it("includes N97E and its FAA registry hex", () => {
    expect(KCSO_TAILS).toContain("N97E");
    expect(isKcsoAircraft(" n97e ")).toBe(true);
    expect(KCSO_HEX_TO_TAIL.AD81B0).toBe("N97E");
    expect(isKcsoAircraft(null, "ad81b0")).toBe(true);
  });
  it("does not extend KCSO policies to unrelated aircraft", () => {
    expect(isKcsoAircraft("N71FF", "A00001")).toBe(false);
  });
});