import { createFileRoute } from "@tanstack/react-router";
import { watchtower } from "@/lib/neon.server";

// Public data export endpoint.
// Returns all scan artifacts as JSON (default) or CSV.
// CORS-enabled so journalists, researchers, and civic tech tools can pull data directly.
//
// Usage:
//   GET /api/public/export              → JSON array of all scan artifacts
//   GET /api/public/export?format=csv   → CSV download
//   GET /api/public/export?limit=100    → Limit rows (default 1000, max 10000)

type ScanRow = {
  scan_id: string;
  ts: string;
  method_version: string;
  candidates: number;
  flagged: number;
  kinematic_hits: number;
  handoffs: number;
  detections: number;
  subject_absent: boolean;
  merkle_root: string | null;
};

function toCSV(rows: ScanRow[]): string {
  const headers = [
    "scan_id",
    "ts",
    "method_version",
    "candidates",
    "flagged",
    "kinematic_hits",
    "handoffs",
    "detections",
    "subject_absent",
    "merkle_root",
  ];
  const escape = (v: string | number | boolean | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.scan_id,
        r.ts,
        r.method_version,
        r.candidates,
        r.flagged,
        r.kinematic_hits,
        r.handoffs,
        r.detections,
        r.subject_absent,
        r.merkle_root,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export const Route = createFileRoute("/api/public/export/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const format = url.searchParams.get("format") ?? "json";
        const limitParam = parseInt(url.searchParams.get("limit") ?? "1000", 10);
        const limit = Math.min(Math.max(limitParam, 1), 10000);

        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, max-age=60",
        };

        try {
          const w = watchtower();
          const rows = (await w`
            SELECT scan_id, ts, method_version, candidates, flagged,
                   kinematic_hits, handoffs, detections, subject_absent,
                   merkle_root
            FROM scan_artifacts
            ORDER BY ts DESC
            LIMIT ${limit}
          `) as any[];

          const data: ScanRow[] = rows.map((r) => ({
            scan_id: r.scan_id,
            ts: new Date(r.ts).toISOString(),
            method_version: r.method_version ?? "unknown",
            candidates: Number(r.candidates ?? 0),
            flagged: Number(r.flagged ?? 0),
            kinematic_hits: Number(r.kinematic_hits ?? 0),
            handoffs: Number(r.handoffs ?? 0),
            detections: Number(r.detections ?? 0),
            subject_absent: Boolean(r.subject_absent),
            merkle_root: r.merkle_root ?? null,
          }));

          if (format === "csv") {
            return new Response(toCSV(data), {
              headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="watchtower-scans-${new Date().toISOString().slice(0, 10)}.csv"`,
                ...corsHeaders,
              },
            });
          }

          return new Response(
            JSON.stringify(
              {
                exported_at: new Date().toISOString(),
                count: data.length,
                source: "advocacywatch.live",
                license: "Public domain — all data sourced from public ADS-B broadcasts and FAA registry",
                scans: data,
              },
              null,
              2,
            ),
            {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                ...corsHeaders,
              },
            },
          );
        } catch (err) {
          console.error("Export endpoint failed:", err);
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Failed to fetch scan artifacts. The database may not be configured.",
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                ...corsHeaders,
              },
            },
          );
        }
      },
    },
  },
});