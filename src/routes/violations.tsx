import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getSentinelViolations } from "@/lib/watchtower.functions";

const vQO = queryOptions({ queryKey: ["sentinel-violations"], queryFn: () => getSentinelViolations() });

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Violations" },
];

export const Route = createFileRoute("/violations")({
  head: () => ({
    meta: [
      { title: "Violations Log — The Architecture of Never" },
      { name: "description", content: "Time-stamped airspace violations with severity, location, and SHA-256 evidence hashes. Public log derived from ADS-B and FAA baselines." },
      { property: "og:title", content: "Violations Log" },
      { property: "og:description", content: "Hashed, geolocated airspace violations against published FAA baselines." },
      { property: "og:url", content: "https://flightlogged.lovable.app/violations" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/violations" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Sentinel Violations Log",
          description: "Time-stamped, hashed airspace violations against published FAA regulatory baselines.",
          url: "https://flightlogged.lovable.app/violations",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(vQO),
  component: Violations,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Log unavailable.</h1>
        <p className="font-mono text-sm mb-6">Violations data temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function sevClass(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("critical") || v.includes("high")) return "bg-alert text-paper";
  if (v.includes("medium") || v.includes("mod")) return "bg-warning text-ink";
  return "bg-ink text-paper";
}

function Violations() {
  const { data } = useSuspenseQuery(vQO);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Sentinel · Public airspace log</div>
          <h1 className="text-5xl sm:text-7xl mb-4">Every violation, hashed.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Each row is a flight that crossed a published FAA regulatory floor. Timestamp, location,
            and SHA-256 evidence hash. Nothing redacted. Nothing curated.
          </p>
        </div>
      </section>
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">Latest 100 violations</div>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Time</th>
                  <th className="text-left p-3 label-stamp">Aircraft</th>
                  <th className="text-left p-3 label-stamp">Identified owner (FAA registry)</th>
                  <th className="text-left p-3 label-stamp">Type</th>
                  <th className="text-left p-3 label-stamp">Violation</th>
                  <th className="text-left p-3 label-stamp">Severity</th>
                  <th className="text-right p-3 label-stamp">Alt (ft)</th>
                  <th className="text-left p-3 label-stamp">Lat / Lon</th>
                  <th className="text-left p-3 label-stamp">Hash</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.length === 0 && <tr><td colSpan={9} className="p-6 text-center">No violations on record.</td></tr>}
                {data.map((v) => (
                  <tr key={v.id} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 whitespace-nowrap text-xs">{new Date(v.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold">{v.registration || "—"}</td>
                    <td className="p-3 text-xs">
                      {v.identifiedName ? (
                        <>
                          <span className="font-bold">{v.identifiedName}</span>
                          {(v.registrantCity || v.registrantState) && (
                            <div className="opacity-60">{[v.registrantCity, v.registrantState].filter(Boolean).join(", ")}</div>
                          )}
                          {v.registrantType && <div className="opacity-50">{v.registrantType}</div>}
                        </>
                      ) : <span className="opacity-40">—</span>}
                    </td>
                    <td className="p-3 text-xs">{v.aircraftType || "—"}</td>
                    <td className="p-3">{v.violationType}</td>
                    <td className="p-3"><span className={`label-stamp px-2 py-1 ${sevClass(v.severity)}`}>{v.severity || "—"}</span></td>
                    <td className="p-3 text-right">{v.altitude ?? "—"}</td>
                    <td className="p-3 text-xs">{v.latitude != null && v.longitude != null ? `${v.latitude.toFixed(3)}, ${v.longitude.toFixed(3)}` : "—"}</td>
                    <td className="p-3 text-xs opacity-70">{v.hashShort ? v.hashShort + "…" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>sentinel_violations</code>. Each hash is reproducible from the underlying record.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}