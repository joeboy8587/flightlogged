import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveAircraftIdentity, enrichProfileIdentities } from "./aircraft-identity.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function mockRows(rows: unknown[][]) {
  vi.stubEnv("LOVABLE_API_KEY", "test-key");
  vi.stubEnv("NEON_API_KEY", "test-connection");
  const fetch = vi.fn();
  for (const result of rows) fetch.mockResolvedValueOnce(new Response(JSON.stringify({ rows: result }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
describe("Shared FAA-first aircraft resolution", () => {
  it("binds N912KC's registry code before selecting its maintained profile", async () => {
    const fetch = mockRows([
      [{ n_number: "912KC", mode_s_code_hex: "AC9EFD", name: "KERN COUNTY SHERIFFS OFFICE" }],
      [{ icao_hex: "AC9AFD", total_detections: 68 }, { icao_hex: "AC9EFD", total_detections: 414340 }],
    ]);
    const result = await resolveAircraftIdentity("n912kc");
    expect(result.icao).toBe("AC9EFD");
    expect(result.registration).toBe("N912KC");
    expect(result.profile?.total_detections).toBe(414340);
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.params).toContain("AC9EFD");
    expect(body.params).toContain("ac9efd");
  });
  it("resolves the FAA owner even without a machine profile", async () => {
    mockRows([[{ n_number: "912KC", mode_s_code_hex: "AC9EFD", name: "KERN COUNTY SHERIFFS OFFICE" }], []]);
    const result = await resolveAircraftIdentity("N912KC");
    expect(result.registry?.name).toBe("KERN COUNTY SHERIFFS OFFICE");
    expect(result.profile).toBeUndefined();
  });
  it("does not apply N912KC's owner to another hex sharing its observed tail", async () => {
    mockRows([[{ n_number: "912KC", mode_s_code_hex: "AC9EFD", name: "KERN COUNTY SHERIFFS OFFICE" }]]);
    const rows = await enrichProfileIdentities([
      { icao_hex: "ac9efd", observed_registration: null, registered_owner: null },
      { icao_hex: "AC9AFD", observed_registration: "N912KC", registered_owner: null },
    ]);
    expect(rows[0]?.registered_owner).toBe("KERN COUNTY SHERIFFS OFFICE");
    expect(rows[0]?.observed_registration).toBe("N912KC");
    expect(rows[1]?.registered_owner).toBeNull();
  });
});