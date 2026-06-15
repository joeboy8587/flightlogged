import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { ShareRow } from "@/components/share-row";
import { getForeignAircraft } from "@/lib/watchtower.functions";
import { fmtPct } from "@/lib/format";

const qo = queryOptions({ queryKey: ["foreign-aircraft"], queryFn: () => getForeignAircraft() });

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Foreign Aircraft" },
];

export const Route = createFileRoute("/foreign")({
  head: () => ({
    meta: [
      { title: "Foreign-Registered Aircraft — The Architecture of Never" },
      { name: "description", content: "Non-U.S. civil aircraft observed loitering in domestic airspace. Country, detections, altitude, night-ops share — sourced from public ADS-B." },
      { property: "og:title", content: "Foreign-Registered Aircraft Over U.S. Airspace" },
      { property: "og:description", content: "Chinese, British, Mexican, and other foreign-registered tails observed in the sensor window. Public ADS-B. Independently verifiable." },
      { property: "og:url", content: "https://advocacywatch.live/foreign" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/foreign" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Foreign-Registered Aircraft Observations",
          description: "Non-U.S. civil-registry aircraft observed in U.S. domestic airspace via public ADS-B.",
          url: "https://advocacywatch.live/foreign",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: ForeignPage,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Foreign registry view unavailable.</h1>
        <p className="font-mono text-sm mb-6">Data temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function fmt(n: number) { return n.toLocaleString(); }

function ForeignPage() {
  const { data } = useSuspenseQuery(qo);
  const [country, setCountry] = useState<string>("all");

  const rows = useMemo(
    () => (country === "all" ? data.aircraft : data.aircraft.filter((a) => a.country === country)),
    [data, country],
  );

  const topCountry = data.byCountry[0];
  const highAlt = data.aircraft.filter((a) => (a.avgAltitude ?? 0) >= 20000).length;
  const nightHeavy = data.aircraft.filter((a) => (a.nightPct ?? 0) >= 0.5).length;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Public ADS-B · Non-U.S. civil registry</div>
          <h1 className="text-5xl sm:text-7xl mb-4">Foreign aircraft. Domestic airspace.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Aircraft whose tail-number prefix does not belong to the U.S. civil registry, observed in the
            sensor window. Sovereign airspace does not routinely host foreign-registered surveillance
            without State Department coordination, NOTAMs, or published diplomatic clearance.
            Every record here is sourced from unencrypted ADS-B broadcasts that any member of the public can verify.
          </p>
        </div>
      </section>

      {/* INDICTMENT BAR */}
      <section className="border-b-4 border-ink bg-alert text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-0.5 mb-3">The count</div>
          <p className="text-xl sm:text-2xl font-medium leading-snug max-w-4xl">
            <strong className="bg-ink text-warning px-1">{fmt(data.totalAircraft)}</strong> foreign-registered aircraft observed.{" "}
            <strong className="bg-ink text-warning px-1">{fmt(data.totalDetections)}</strong> total detections.{" "}
            {topCountry && (
              <>
                Top country of origin:{" "}
                <strong className="bg-ink text-warning px-1">{topCountry.country}</strong>{" "}
                ({fmt(topCountry.detections)} detections).{" "}
              </>
            )}
            <strong className="bg-ink text-warning px-1">{fmt(highAlt)}</strong> at FL200+.{" "}
            <strong className="bg-ink text-warning px-1">{fmt(nightHeavy)}</strong> operating ≥50% at night.
          </p>
          <p className="mt-3 text-sm opacity-90">
            Where is the NOTAM? Where is the published clearance? The burden of explanation is no longer civilian.
          </p>
        </div>
      </section>

      {/* COUNTRY BREAKDOWN */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <h2 className="text-3xl mb-4">By country of registration</h2>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <caption className="sr-only">Foreign aircraft observations grouped by country of registration.</caption>
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Country</th>
                  <th className="text-left p-3 label-stamp">Code</th>
                  <th className="text-right p-3 label-stamp">Aircraft</th>
                  <th className="text-right p-3 label-stamp">Detections</th>
                  <th className="text-left p-3 label-stamp">Filter</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.byCountry.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center">No foreign aircraft in the current window.</td></tr>
                )}
                {data.byCountry.map((c) => (
                  <tr key={c.country} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 font-bold">{c.country}</td>
                    <td className="p-3">{c.code}</td>
                    <td className="p-3 text-right">{fmt(c.aircraft)}</td>
                    <td className="p-3 text-right font-bold">{fmt(c.detections)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => setCountry(c.country)}
                        className="label-stamp brutal-border px-2 py-0.5 text-xs hover:bg-warning"
                      >
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

      {/* AIRCRAFT TABLE */}
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="label-stamp text-alert mr-2">Country:</span>
            <button
              type="button"
              onClick={() => setCountry("all")}
              className={`label-stamp brutal-border px-3 py-1 text-xs ${country === "all" ? "bg-ink text-paper" : "bg-paper hover:bg-warning"}`}
            >
              All <span className="font-mono opacity-70">({data.totalAircraft})</span>
            </button>
            {data.byCountry.map((c) => (
              <button
                key={c.country}
                type="button"
                onClick={() => setCountry(c.country)}
                className={`label-stamp brutal-border px-3 py-1 text-xs ${country === c.country ? "bg-ink text-paper" : "bg-paper hover:bg-warning"}`}
              >
                {c.country} <span className="font-mono opacity-70">({c.aircraft})</span>
              </button>
            ))}
          </div>
          <div className="label-stamp text-alert mb-2">Showing {rows.length} of {data.totalAircraft} · sorted by detections</div>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <caption className="sr-only">Individual foreign-registered aircraft observations with altitudes and detection counts.</caption>
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Registration</th>
                  <th className="text-left p-3 label-stamp">Country</th>
                  <th className="text-left p-3 label-stamp">Owner / Model</th>
                  <th className="text-right p-3 label-stamp">Detections</th>
                  <th className="text-right p-3 label-stamp">Min alt (ft)</th>
                  <th className="text-right p-3 label-stamp">Avg alt (ft)</th>
                  <th className="text-right p-3 label-stamp">Night %</th>
                  <th className="text-left p-3 label-stamp">Last seen</th>
                  <th className="text-left p-3 label-stamp">Share</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center">No aircraft for this filter.</td></tr>
                )}
                {rows.map((a) => (
                  <tr key={a.registration + (a.icao ?? "")} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 font-bold">{a.registration}</td>
                    <td className="p-3">
                      <span className="label-stamp bg-alert text-paper px-2 py-0.5">{a.countryCode}</span>{" "}
                      {a.country}
                    </td>
                    <td className="p-3">{a.owner || a.model || "—"}</td>
                    <td className="p-3 text-right font-bold">{fmt(a.totalDetections)}</td>
                    <td className="p-3 text-right">{a.minAltitude != null ? fmt(a.minAltitude) : "—"}</td>
                    <td className="p-3 text-right">{a.avgAltitude != null ? fmt(Math.round(a.avgAltitude)) : "—"}</td>
                    <td className="p-3 text-right">{fmtPct(a.nightPct)}</td>
                    <td className="p-3 whitespace-nowrap text-xs">{a.lastSeen ? new Date(a.lastSeen).toLocaleDateString() : "—"}</td>
                    <td className="p-3">
                      <ShareRow
                        text={`Foreign-registered ${a.registration} (${a.country}) — ${fmt(a.totalDetections)} detections in U.S. airspace. Avg altitude ${a.avgAltitude != null ? Math.round(a.avgAltitude) + " ft" : "n/a"}. Source: The Architecture of Never — https://advocacywatch.live/foreign`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>aircraft_profiles</code> joined to public ICAO civil-registration prefixes.
            U.S. tails (N-prefix) excluded. Foreign prefixes mapped from the ICAO Annex 7 allocation table;
            unmapped non-U.S. registrations are labeled "Foreign (unmapped)".
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}