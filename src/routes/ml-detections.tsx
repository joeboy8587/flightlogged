import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getMlAnomalies } from "@/lib/watchtower.functions";

const mlQO = queryOptions({ queryKey: ["ml-anomalies"], queryFn: () => getMlAnomalies() });

const crumbs = [
  { label: "Home", href: "/" },
  { label: "ML Detections" },
];

export const Route = createFileRoute("/ml-detections")({
  head: () => ({
    meta: [
      { title: "ML Anomaly Detections — The Architecture of Never" },
      { name: "description", content: "Machine-learning flagged airspace anomalies with model name, version, confidence and validation status." },
      { property: "og:title", content: "ML Anomaly Detections" },
      { property: "og:description", content: "Transparent ML-flagged anomalies — model name and version disclosed for every detection." },
      { property: "og:url", content: "https://flightlogged.lovable.app/ml-detections" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/ml-detections" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "ML Anomaly Detections",
          description: "ML-classified airspace anomalies with disclosed model name, version, and confidence.",
          url: "https://flightlogged.lovable.app/ml-detections",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(mlQO),
  component: MlDetections,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">ML feed unavailable.</h1>
        <p className="font-mono text-sm mb-6">ML detections temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function confClass(c: string | null) {
  const v = (c ?? "").toLowerCase();
  if (v.includes("high")) return "bg-alert text-paper";
  if (v.includes("med")) return "bg-warning text-ink";
  return "bg-ink text-paper";
}

function MlDetections() {
  const { data } = useSuspenseQuery(mlQO);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Open ML · Model name & version disclosed</div>
          <h1 className="text-5xl sm:text-7xl mb-4">What the model flagged.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Every ML detection ships with the model that produced it, the version, and a validation
            status. No black-box scores. The math is auditable.
          </p>
        </div>
      </section>
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">Latest {data.length}</div>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Detected</th>
                  <th className="text-left p-3 label-stamp">Aircraft</th>
                  <th className="text-left p-3 label-stamp">Anomaly</th>
                  <th className="text-right p-3 label-stamp">Score</th>
                  <th className="text-left p-3 label-stamp">Confidence</th>
                  <th className="text-left p-3 label-stamp">Model</th>
                  <th className="text-left p-3 label-stamp">Validated</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.length === 0 && <tr><td colSpan={7} className="p-6 text-center">No ML detections on record.</td></tr>}
                {data.map((m) => (
                  <tr key={m.id} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 whitespace-nowrap text-xs">{new Date(m.detectedAt).toLocaleString()}</td>
                    <td className="p-3 font-bold">{m.registration || m.icao24 || m.callsign || "—"}</td>
                    <td className="p-3">{m.anomalyType || "—"}</td>
                    <td className="p-3 text-right">{m.anomalyScore != null ? m.anomalyScore.toFixed(2) : "—"}</td>
                    <td className="p-3"><span className={`label-stamp px-2 py-1 ${confClass(m.confidence)}`}>{m.confidence || "—"}</span></td>
                    <td className="p-3 text-xs">{m.modelName || "—"}{m.modelVersion ? ` · v${m.modelVersion}` : ""}</td>
                    <td className="p-3 text-xs">{m.validated ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>ml_anomaly_detections</code>. Model lineage is part of the record.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}