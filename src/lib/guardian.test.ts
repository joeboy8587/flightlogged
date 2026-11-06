import { describe, it, expect } from "vitest";
import { finiteNumber, normalizedHex, csvText } from "./guardian";
describe("Guardian public data values", () => {
  it("preserves recorded numeric confidence without invented scores", () => {
    expect(finiteNumber("0.92")).toBe(0.92);
    expect(finiteNumber(null)).toBeNull();
    expect(finiteNumber("unknown")).toBeNull();
  });
  it("uses a single aircraft identity across hex casing", () => { expect(normalizedHex(" ad81b0 ")).toBe("AD81B0"); });
  it("retains full evidence hashes in export and neutralizes formulas", () => {
    const hash = "a".repeat(64);
    const csv = csvText([{ hash, note: "=1+1" }]);
    expect(csv).toContain(hash);
    expect(csv).toContain("'=" );
  });
});