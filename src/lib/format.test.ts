import { describe, it, expect } from "vitest";
import { fmtPct, toPct, normalizeCountyName } from "./format";

describe("fmtPct", () => {
  it("treats values < 1 as shares and scales to percent", () => {
    expect(fmtPct(0.5)).toBe("50%");
    expect(fmtPct(0.25)).toBe("25%");
    expect(fmtPct(0)).toBe("0%");
  });

  it("treats value of exactly 1 as an already-scaled percent (1%), not 100%", () => {
    // This is the bug fix: previously <= 1 meant 1 was scaled to 100%.
    expect(fmtPct(1)).toBe("1%");
  });

  it("treats values > 1 as already-scaled percents", () => {
    expect(fmtPct(50)).toBe("50%");
    expect(fmtPct(100)).toBe("100%");
    expect(fmtPct(42.5)).toBe("43%");
  });

  it("clamps to [0, 100]", () => {
    expect(fmtPct(150)).toBe("100%");
    expect(fmtPct(-5)).toBe("0%");
  });

  it("respects decimals option", () => {
    expect(fmtPct(0.333, { decimals: 1 })).toBe("33.3%");
    expect(fmtPct(42.567, { decimals: 2 })).toBe("42.57%");
  });

  it("returns dash for null/undefined/NaN", () => {
    expect(fmtPct(null)).toBe("—");
    expect(fmtPct(undefined)).toBe("—");
    expect(fmtPct(NaN)).toBe("—");
  });

  it("respects custom dash", () => {
    expect(fmtPct(null, { dash: "N/A" })).toBe("N/A");
  });
});

describe("toPct", () => {
  it("scales shares < 1 to percent", () => {
    expect(toPct(0.5)).toBe(50);
    expect(toPct(0.25)).toBe(25);
  });

  it("treats value of exactly 1 as 1%, not 100%", () => {
    expect(toPct(1)).toBe(1);
  });

  it("treats values > 1 as already-scaled", () => {
    expect(toPct(50)).toBe(50);
    expect(toPct(100)).toBe(100);
  });

  it("clamps to [0, 100]", () => {
    expect(toPct(150)).toBe(100);
    expect(toPct(-5)).toBe(0);
  });

  it("returns null for null/undefined/NaN", () => {
    expect(toPct(null)).toBeNull();
    expect(toPct(undefined)).toBeNull();
    expect(toPct(NaN)).toBeNull();
  });
});

describe("normalizeCountyName", () => {
  it("normalizes various forms of Kern County", () => {
    expect(normalizeCountyName("KERN")).toBe("Kern");
    expect(normalizeCountyName("Kern County")).toBe("Kern");
    expect(normalizeCountyName("kern")).toBe("Kern");
    expect(normalizeCountyName("Kern, CA")).toBe("Kern");
  });

  it("handles null/undefined", () => {
    expect(normalizeCountyName(null)).toBe("—");
    expect(normalizeCountyName(undefined)).toBe("—");
  });

  it("title-cases multi-word names", () => {
    expect(normalizeCountyName("los angeles county")).toBe("Los Angeles");
  });
});