import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { searchByTail, type TailSearchResult } from "@/lib/watchtower.functions";

const crumbs = [{ label: "Home", href: "/" }, { label: "Tail Search" }];

export const Route = createFileRoute("/tail-search")({
  head: () => ({
    meta: [
      { title: "Tail Number Search — The Architecture of Never" },
      { name: "description", content: "Pull every detection for any tail number (N-number or ICAO hex) and export the result set as CSV." },
      { property: "og:title", content: "Tail Number Search — Architecture of Never" },
      { property: "og:description", content: "Search any aircraft by registration or ICAO hex. Export detections to CSV." },
      { property: "og:url", content: "https://advocacywatch.live/tail-search" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/tail-search" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: TailSearch,
});

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function TailSearch() {
  const fn = useServerFn(searchByTail);
  const [q, setQ] = useState("");
  const m = useMutation<TailSearchResult | null, Error, string>({
    mutationFn: (tail) => fn({ data: { tail } }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (t) m.mutate(t);
  };

  const r = m.data;

  const exportCsv = () => {
    if (!r) return;
    const header = ["captured_at", "altitude_ft", "speed_kts", "county", "latitude", "longitude", "on_ground"];
    const rows: (string | number | null)[][] = [
      [`# tail=${r.registration} icao=${r.icao ?? ""} owner=${r.owner ?? ""} model=${r.model ?? ""} exported=${new Date().toISOString()}`],
      header,
      ...r.detections.map((d) => [d.capturedAt, d.altitude, d.speed, d.county, d.latitude, d.longitude, d.onGround ? "true" : "false"]),
    ];
    downloadCsv(`detections-${r.registration}.csv`, rows);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1100px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-2">Operator lookup · ADS-B</div>
          <h1 className="text-5xl sm:text-6xl mb-3">Tail number search</h1>
          <p className="max-w-2xl text-sm opacity-80">
            Enter an N-number (e.g. <code>N913KC</code>) or 6-character ICAO hex (e.g. <code>A1B2C3</code>).
            The machine returns the aircraft profile and up to 1,000 most recent detections, exportable to CSV.
          </p>
          <form onSubmit={onSubmit} className="mt-6 flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="N913KC or A1B2C3"
              maxLength={20}
              className="brutal-border bg-paper text-ink px-4 py-3 font-mono text-lg flex-1 min-w-[260px]"
              aria-label="Tail number or ICAO hex"
            />
            <button
              type="submit"
              disabled={m.isPending}
              className="label-stamp brutal-border bg-warning text-ink px-5 py-3 disabled:opacity-50"
            >
              {m.isPending ? "Searching…" : "Search →"}
            </button>
          </form>
        </div>
      </section>

      <section>
        <div className="max-w-[1100px] mx-auto px-4 py-10">
          {m.isError && <p className="brutal-border p-4 bg-alert text-paper">Search failed. Try again.</p>}
          {m.isSuccess && !r && (
            <p className="brutal-border p-4 bg-warning">No records for <strong>{q}</strong>. Verify the tail number or hex.</p>
          )}
          {r && (
            <>
              <div className="brutal-border-thick p-5 bg-paper mb-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="label-stamp text-alert">{r.icao ?? "—"}</div>
                    <h2 className="text-4xl">{r.registration}</h2>
                    <p className="font-mono text-sm mt-1">{r.identifiedName ?? r.owner ?? "Unidentified owner"}</p>
                    <p className="font-mono text-xs opacity-70">
                      {r.model ?? "—"} · {r.registrantCity ?? "—"}, {r.registrantState ?? "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="label-stamp brutal-border bg-ink text-paper px-4 py-2 hover:bg-warning hover:text-ink"
                  >
                    Export CSV ({r.detections.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-sm font-mono">
                  <Stat label="Total detections" value={r.total.toLocaleString()} />
                  <Stat label="Min altitude" value={r.minAlt != null ? `${r.minAlt} ft` : "—"} />
                  <Stat label="Avg altitude" value={r.avgAlt != null ? `${Math.round(r.avgAlt)} ft` : "—"} />
                  <Stat label="Night share" value={r.nightPct != null ? `${Math.round(r.nightPct * 100)}%` : "—"} />
                  <Stat label="Last seen" value={r.lastSeen ? new Date(r.lastSeen).toLocaleDateString() : "—"} />
                </div>
              </div>

              <div className="overflow-x-auto brutal-border-thick">
                <table className="w-full text-sm">
                  <caption className="sr-only">Detections for {r.registration}</caption>
                  <thead className="bg-ink text-paper">
                    <tr>
                      <th className="text-left p-3 label-stamp">Captured</th>
                      <th className="text-right p-3 label-stamp">Alt (ft)</th>
                      <th className="text-right p-3 label-stamp">Speed (kts)</th>
                      <th className="text-left p-3 label-stamp">County</th>
                      <th className="text-right p-3 label-stamp">Lat</th>
                      <th className="text-right p-3 label-stamp">Lon</th>
                      <th className="text-left p-3 label-stamp">Ground</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {r.detections.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center">No detection rows.</td></tr>
                    )}
                    {r.detections.slice(0, 200).map((d, i) => (
                      <tr key={i} className="border-t border-ink/20 hover:bg-warning/30">
                        <td className="p-2 whitespace-nowrap text-xs">{new Date(d.capturedAt).toLocaleString()}</td>
                        <td className="p-2 text-right">{d.altitude ?? "—"}</td>
                        <td className="p-2 text-right">{d.speed != null ? Math.round(d.speed) : "—"}</td>
                        <td className="p-2">{d.county ?? "—"}</td>
                        <td className="p-2 text-right">{d.latitude != null ? d.latitude.toFixed(4) : "—"}</td>
                        <td className="p-2 text-right">{d.longitude != null ? d.longitude.toFixed(4) : "—"}</td>
                        <td className="p-2">{d.onGround ? "yes" : "no"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {r.detections.length > 200 && (
                <p className="mt-2 text-xs opacity-70 font-mono">
                  Showing first 200 of {r.detections.length} rows in-table. Full set is in the CSV export.
                </p>
              )}
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="brutal-border p-2">
      <div className="label-stamp opacity-60 text-[10px]">{label}</div>
      <div className="font-display text-xl">{value}</div>
    </div>
  );
}