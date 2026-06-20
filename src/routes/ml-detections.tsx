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
  const { card, rows } = data;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
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

      <section className="border-b-4 border-ink bg-warning text-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp mb-3">Model card · disclosed for defensibility</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="brutal-border bg-paper p-4">
              <div className="label-stamp opacity-60 mb-1">Total ML flags</div>
              <div className="font-display text-3xl">{card.total.toLocaleString()}</div>
            </div>
            <div className="brutal-border bg-paper p-4">
              <div className="label-stamp opacity-60 mb-1">Human-validated</div>
              <div className="font-display text-3xl">{pct(card.validationRate)}</div>
              <div className="text-xs font-mono opacity-70">{card.validatedTrue.toLocaleString()} of {card.total.toLocaleString()}</div>
            </div>
            <div className="brutal-border bg-paper p-4">
              <div className="label-stamp opacity-60 mb-1">Distinct models</div>
              <div className="font-display text-3xl">{card.distinctModels}</div>
              <div className="text-xs font-mono opacity-70">{card.distinctVersions} versions on record</div>
            </div>
            <div className="brutal-border bg-paper p-4">
              <div className="label-stamp opacity-60 mb-1">Top model</div>
              <div className="font-mono text-xs leading-relaxed">
                {card.topModels[0] ? (
                  <>
                    <span className="font-bold">{card.topModels[0].modelName}</span>
                    <div className="opacity-70">v{card.topModels[0].modelVersion}</div>
                    <div className="opacity-60">{card.topModels[0].count.toLocaleString()} flags</div>
                  </>
                ) : "—"}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs font-mono leading-relaxed max-w-3xl">
            <strong>Read this honestly.</strong> An unvalidated flag is a <em>candidate</em>, not a conclusion.
            Only <strong>{pct(card.validationRate)}</strong> of ML flags have been human-reviewed against
            physics rules. The remainder are isolation-forest outliers awaiting validation. All rows
            below carry their model name, version, feature set, and SHA-256 fingerprint so a third
            party can reproduce the determination.
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">Latest {rows.length}</div>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Detected</th>
                  <th className="text-left p-3 label-stamp">Aircraft</th>
                  <th className="text-left p-3 label-stamp">Identified owner (FAA registry)</th>
                  <th className="text-left p-3 label-stamp">Anomaly</th>
                  <th className="text-right p-3 label-stamp">Score</th>
                  <th className="text-left p-3 label-stamp">Confidence</th>
                  <th className="text-left p-3 label-stamp">Model</th>
                  <th className="text-left p-3 label-stamp">Features used</th>
                  <th className="text-left p-3 label-stamp">Validated</th>
                  <th className="text-left p-3 label-stamp">SHA-256</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.length === 0 && <tr><td colSpan={10} className="p-6 text-center">No ML detections on record.</td></tr>}
                {rows.map((m) => (
                  <tr key={m.id} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 whitespace-nowrap text-xs">{new Date(m.detectedAt).toLocaleString()}</td>
                    <td className="p-3 font-bold">{m.registration || m.icao24 || m.callsign || "—"}</td>
                    <td className="p-3 text-xs">
                      {m.identifiedName ? (
                        <>
                          <span className="font-bold">{m.identifiedName}</span>
                          {(m.registrantCity || m.registrantState) && (
                            <div className="opacity-60">{[m.registrantCity, m.registrantState].filter(Boolean).join(", ")}</div>
                          )}
                        </>
                      ) : <span className="opacity-40">—</span>}
                    </td>
                    <td className="p-3">{m.anomalyType || "—"}</td>
                    <td className="p-3 text-right">{m.anomalyScore != null ? m.anomalyScore.toFixed(2) : "—"}</td>
                    <td className="p-3"><span className={`label-stamp px-2 py-1 ${confClass(m.confidence)}`}>{m.confidence || "—"}</span></td>
                    <td className="p-3 text-xs">{m.modelName || "—"}{m.modelVersion ? ` · v${m.modelVersion}` : ""}</td>
                    <td className="p-3 text-xs">
                      {m.featureKeys.length === 0
                        ? <span className="opacity-40">—</span>
                        : <div className="flex flex-wrap gap-1">{m.featureKeys.map((k) => (
                            <span key={k} className="brutal-border px-1.5 py-0.5 text-[10px] bg-paper">{k}</span>
                          ))}</div>}
                    </td>
                    <td className="p-3 text-xs">
                      {m.validated
                        ? <span className="label-stamp bg-ink text-paper px-2 py-1">✓ reviewed</span>
                        : <span className="label-stamp brutal-border px-2 py-1">candidate</span>}
                    </td>
                    <td className="p-3 text-[10px] opacity-70">{m.hashShort ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>anomaly_events</code> (quiet-math). Model lineage published via <code>ml_brain_reports</code>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}