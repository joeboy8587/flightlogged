import { describe, it, expect, vi, afterEach } from "vitest";
import { parameterizedStatement, watchtower } from "./neon.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Linked Neon query compatibility", () => {
  it("keeps tail input and arrays out of SQL text", () => {
    const input = "N913KC' OR true--";
    expect(parameterizedStatement(["SELECT * FROM detections WHERE registration = ", " AND county = ANY(", ") LIMIT 1000"], [input, ["Kern"]]))
      .toEqual({ query: "SELECT * FROM detections WHERE registration = $1 AND county = ANY($2) LIMIT 1000", params: [input, ["Kern"]] });
  });
  it("returns real rows through the linked gateway without the retired URL", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-workspace-key");
    vi.stubEnv("NEON_API_KEY", "test-connection-key");
    vi.stubEnv("NEON_WATCHTOWER_URL", "");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ rows: [{ registration: "N913KC", total: "2803402" }] }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    expect(await watchtower()`SELECT registration FROM detections WHERE registration = ${"N913KC"} LIMIT 1`)
      .toEqual([{ registration: "N913KC", total: "2803402" }]);
    expect(request.mock.calls[0][0]).toBe("https://connector-gateway.lovable.dev/neon/sql");
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ query: "SELECT registration FROM detections WHERE registration = $1 LIMIT 1", params: ["N913KC"] });
  });
});