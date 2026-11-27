import { describe, expect, it } from "vitest";
import { bearingBetween, pointIndexAtTime, utcInputToIso, utcInputValue, type FlightReplayPoint } from "./tracker";

const point = (capturedAt: string): FlightReplayPoint => ({
  capturedAt,
  latitude: 35.3733,
  longitude: -119.0187,
  altitude: 1000,
  speed: 80,
  county: "Kern",
  onGround: false,
});

describe("tracker replay helpers", () => {
  it("points the aircraft icon north, east, and back around the compass correctly", () => {
    const origin = { latitude: 35, longitude: -119 };
    expect(bearingBetween(origin, { latitude: 36, longitude: -119 })).toBeCloseTo(0);
    expect(bearingBetween(origin, { latitude: 35, longitude: -118 })).toBeCloseTo(89.7132, 3);
    expect(bearingBetween(origin, { latitude: 35, longitude: -120 })).toBeCloseTo(270.2868, 3);
  });

  it("selects the last retained observation at or before the timeline cursor", () => {
    const points = [point("2026-11-08T20:00:00Z"), point("2026-11-08T20:01:00Z"), point("2026-11-08T20:03:00Z")];
    expect(pointIndexAtTime(points, new Date("2026-11-08T19:59:00Z").getTime())).toBe(0);
    expect(pointIndexAtTime(points, new Date("2026-11-08T20:02:00Z").getTime())).toBe(1);
    expect(pointIndexAtTime(points, new Date("2026-11-08T20:04:00Z").getTime())).toBe(2);
  });

  it("makes UTC date inputs round-trip without using the browser time zone", () => {
    const iso = "2026-11-08T21:30:00.000Z";
    expect(utcInputValue(iso)).toBe("2026-11-08T21:30");
    expect(utcInputToIso(utcInputValue(iso))).toBe(iso);
  });
});
