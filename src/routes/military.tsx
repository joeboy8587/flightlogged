import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getMilitaryAircraft } from "@/lib/watchtower.functions";
import { fmtPct } from "@/lib/format";

const qo = queryOptions({ queryKey: ["military-aircraft"], queryFn: () => getMilitaryAircraft() });
const crumbs = [{ label: "Home", href: "/" }, { label: "Military" }];

export const Route = createFileRoute("/military")({
  head: () => ({
    meta: [
      { title: "Military Aircraft — The Architecture of Never" },
      { name: "description", content: "U.S. military and DoD-flagged aircraft observed in the sensor window — by branch, altitude, county, and detection count." },
      { property: "og:title", content: "Military Aircraft Over Domestic Airspace" },
      { property: "og:description", content: "Posse Comitatus, FAA waivers, and the question of why military airframes operate over civilian counties." },
      { property: "og:url", content: "https://advocacywatch.live/military" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/military" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Military Aircraft Observations",
          description: "U.S. military-registered aircraft observed in domestic airspace, classified by branch.",
          url: "https://advocacywatch.live/military",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: MilitaryPage,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Military view unavailable.</h1>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function fmt(n: number) { return n.toLocaleString(); }

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

function MilitaryPage() {
  const { data } = useSuspenseQuery(qo);
  const [branch, setBranch] = useState<string>("all");

  const rows = useMemo(
    () => (branch === "all" ? data.aircraft : data.aircraft.filter((a) => a.branch === branch)),
    [data, branch],
  );

  const exportCsv = () => {
    const header = ["registration", "icao", "branch", "owner", "model", "total_detections", "min_altitude_ft", "avg_altitude_ft", "night_pct", "counties", "first_seen", "last_seen"];
    downloadCsv(
      `military-${branch === "all" ? "all" : branch.replace(/\W+/g, "_")}.csv`,
      [
        [`# advocacywatch.live military export · branch=${branch} · exported=${new Date().toISOString()}`],
        header,
        ...rows.map((a) => [
          a.registration, a.icao, a.branch, a.owner, a.model,
          a.totalDetections, a.minAltitude, a.avgAltitude != null ? Math.round(a.avgAltitude) : null,
          a.nightPct != null ? a.nightPct.toFixed(3) : null,
          (a.countiesSeen ?? []).join("|"),
          a.firstSeen, a.lastSeen,
        ]),
      ],
    );
  };

  const lowAlt = data.aircraft.filter((a) => (a.avgAltitude ?? 99999) < 5000).length;
  const nightHeavy = data.aircraft.filter((a) => (a.nightPct ?? 0) >= 0.5).length;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Public ADS-B · Military registry match</div>
          <h1 className="text-5xl sm:text-7xl mb-4">Military aircraft. Civilian counties.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Aircraft whose ICAO 24-bit address falls in the U.S. military range (AE0000–AFFFFF) or whose
            FAA registry owner resolves to a service branch. The Posse Comitatus Act (18 U.S.C. § 1385) and
            10 U.S.C. § 275 restrict direct military participation in domestic law enforcement. Every record
            here is a question the public is entitled to ask.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-alert text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-0.5 mb-3">The count</div>
          <p className="text-xl sm:text-2xl font-medium leading-snug max-w-4xl">
            <strong className="bg-ink text-warning px-1">{fmt(data.totalAircraft)}</strong> military-flagged airframes observed.{" "}
            <strong className="bg-ink text-warning px-1">{fmt(data.totalDetections)}</strong> detections.{" "}
            <strong className="bg-ink text-warning px-1">{fmt(lowAlt)}</strong> averaging under 5,000 ft.{" "}
            <strong className="bg-ink text-warning px-1">{fmt(nightHeavy)}</strong> operating ≥50% at night.
          </p>
          <p className="mt-3 text-sm opacity-90">
            Where is the FAA waiver? Where is the joint-operations memorandum? Document, then ask.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <h2 className="text-3xl mb-4">By branch</h2>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <caption className="sr-only">Military aircraft observations grouped by branch.</caption>
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Branch</th>
                  <th className="text-right p-3 label-stamp">Aircraft</th>
                  <th className="text-right p-3 label-stamp">Detections</th>
                  <th className="text-left p-3 label-stamp">Filter</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.byBranch.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center">No military aircraft in the current window.</td></tr>
                )}
                {data.byBranch.map((b) => (
                  <tr key={b.branch} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 font-bold">{b.branch}</td>
                    <td className="p-3 text-right">{fmt(b.aircraft)}</td>
                    <td className="p-3 text-right font-bold">{fmt(b.detections)}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => setBranch(b.branch)} className="label-stamp brutal-border px-2 py-0.5 text-xs hover:bg-warning">
                        Show tails →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="label-stamp text-alert mr-2">Branch:</span>
            <button type="button" onClick={() => setBranch("all")} className={`label-stamp brutal-border px-3 py-1 text-xs ${branch === "all" ? "bg-ink text-paper" : "bg-paper hover:bg-warning"}`}>
              All <span className="font-mono opacity-70">({data.totalAircraft})</span>
            </button>
            {data.byBranch.map((b) => (
              <button key={b.branch} type="button" onClick={() => setBranch(b.branch)} className={`label-stamp brutal-border px-3 py-1 text-xs ${branch === b.branch ? "bg-ink text-paper" : "bg-paper hover:bg-warning"}`}>
                {b.branch} <span className="font-mono opacity-70">({b.aircraft})</span>
              </button>
            ))}
            <div className="ml-auto">
              <button type="button" onClick={exportCsv} className="label-stamp brutal-border bg-ink text-paper px-4 py-1 text-xs hover:bg-warning hover:text-ink">
                Export CSV ({rows.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <caption className="sr-only">Individual military aircraft observations.</caption>
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Registration</th>
                  <th className="text-left p-3 label-stamp">ICAO</th>
                  <th className="text-left p-3 label-stamp">Branch</th>
                  <th className="text-left p-3 label-stamp">Owner / Model</th>
                  <th className="text-right p-3 label-stamp">Detections</th>
                  <th className="text-right p-3 label-stamp">Min alt</th>
                  <th className="text-right p-3 label-stamp">Avg alt</th>
                  <th className="text-right p-3 label-stamp">Night %</th>
                  <th className="text-left p-3 label-stamp">Counties</th>
                  <th className="text-left p-3 label-stamp">Last seen</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.length === 0 && (
                  <tr><td colSpan={10} className="p-6 text-center">No aircraft for this filter.</td></tr>
                )}
                {rows.map((a) => (
                  <tr key={a.icao + (a.registration ?? "")} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 font-bold">{a.registration ?? "—"}</td>
                    <td className="p-3">{a.icao}</td>
                    <td className="p-3"><span className="label-stamp bg-alert text-paper px-2 py-0.5">{a.branch}</span></td>
                    <td className="p-3">{a.owner ?? a.model ?? "—"}</td>
                    <td className="p-3 text-right font-bold">{fmt(a.totalDetections)}</td>
                    <td className="p-3 text-right">{a.minAltitude != null ? fmt(a.minAltitude) : "—"}</td>
                    <td className="p-3 text-right">{a.avgAltitude != null ? fmt(Math.round(a.avgAltitude)) : "—"}</td>
                    <td className="p-3 text-right">{fmtPct(a.nightPct)}</td>
                    <td className="p-3 text-xs">{(a.countiesSeen ?? []).slice(0, 3).join(", ") || "—"}</td>
                    <td className="p-3 whitespace-nowrap text-xs">{a.lastSeen ? new Date(a.lastSeen).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>aircraft_profiles</code> filtered to ICAO AE-range or FAA owner-name match against branch keywords.
            Counties from joined <code>detections</code> rows.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}