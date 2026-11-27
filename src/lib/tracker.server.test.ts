import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFlightReplay } from "./tracker.server";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function mockRows(results: unknown[][]) {
  vi.stubEnv("LOVABLE_API_KEY", "test-key");
  vi.stubEnv("NEON_API_KEY", "test-connection");
  const fetch = vi.fn();
  for (const rows of results) fetch.mockResolvedValueOnce(new Response(JSON.stringify({ rows }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("historical flight replay", () => {
  it("uses N912KC's FAA-matched code and does not merge another observed-tail profile", async () => {
    const fetch = mockRows([
      [{ n_number: "912KC", mode_s_code_hex: "AC9EFD", name: "KERN COUNTY SHERIFFS OFFICE" }],
      [{ icao_hex: "AC9AFD", total_detections: 68 }, { icao_hex: "AC9EFD", total_detections: 414340 }],
      [{ latest: "2026-11-18T22:00:00Z" }],
      [
        { captured_at: "2026-11-18T21:00:00Z", altitude_ft: 1200, speed_kts: 75, county: "Kern", latitude: 35.37, longitude: -119.01, on_ground: false, total_in_window: 2 },
        { captured_at: "2026-11-18T21:01:00Z", altitude_ft: 1100, speed_kts: 72, county: "Kern", latitude: 35.38, longitude: -119.02, on_ground: false, total_in_window: 2 },
      ],
    ]);
    const result = await loadFlightReplay({ tail: "N912KC" });
    expect(result?.icao).toBe("AC9EFD");
    expect(result?.registration).toBe("N912KC");
    expect(result?.owner).toBe("KERN COUNTY SHERIFFS OFFICE");
    expect(result?.windowStart).toBe("2026-11-17T22:00:00.000Z");
    expect(result?.windowEnd).toBe("2026-11-18T22:00:00.000Z");
    expect(result?.points).toHaveLength(2);
    expect(result?.sampled).toBe(false);
    const replayBody = JSON.parse(fetch.mock.calls[3][1].body);
    expect(replayBody.params).toContain("AC9EFD");
    expect(replayBody.params).not.toContain("AC9AFD");
    expect(replayBody.query).not.toMatch(/\$\d+\.0/);
    expect(replayBody.query).toContain("::float");
  });
});
