import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getAnomalies, getCorrelations } from "@/lib/watchtower.functions";

const anomQO = queryOptions({ queryKey: ["anomalies"], queryFn: () => getAnomalies() });
const corrQO = queryOptions({ queryKey: ["correlations"], queryFn: () => getCorrelations() });

const crumbs = [{ label: "Home", href: "/" }, { label: "Findings" }];

export const Route = createFileRoute("/findings")({
  head: () => ({
    meta: [
      { title: "Findings Archive — The Architecture of Never" },
      { name: "description", content: "Documented anomaly events and biometric-surveillance correlations. Each finding is hashed, timestamped, and chained." },
      { property: "og:title", content: "Findings — Architecture of Never" },
      { property: "og:description", content: "Math-chosen anomaly events with chain of custody." },
      { property: "og:url", content: "https://flightlogged.lovable.app/findings" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/findings" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Findings Archive — The Architecture of Never",
        description: "Documented anomaly events and surveillance-correlated biometric events. Each finding is statistically flagged after a 48-hour baseline, SHA-256 hashed, timestamped, and chained.",
        url: "https://flightlogged.lovable.app/findings",
        isPartOf: { "@type": "WebSite", name: "The Architecture of Never", url: "https://flightlogged.lovable.app" },
        about: { "@type": "Thing", name: "Civilian airspace accountability findings" },
      }),
      },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(anomQO),
    context.queryClient.ensureQueryData(corrQO),
  ]),
  component: Findings,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Archive unreachable.</h1>
        <p className="font-mono text-sm mb-6">Findings temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function sevColor(score: number | null) {
  if (score == null) return "";
  if (score >= 0.8) return "bg-alert text-paper";
  if (score >= 0.5) return "bg-warning text-ink";
  return "bg-ink text-paper";
}

function Findings() {
  const { data: anom } = useSuspenseQuery(anomQO);
  const { data: corr } = useSuspenseQuery(corrQO);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp text-alert mb-2">Findings Archive</div>
          <h1 className="text-5xl sm:text-7xl mb-6">Math chose these. Not us.</h1>
          <p className="max-w-3xl text-lg">
            Each entry was flagged by the statistical model after the baseline period.
            Each row is cryptographically hashed, timestamped, and chained.
            We didn't pick them. The deviation from normal did.
          </p>
          <div className="mt-6">
            <Link to="/reports" className="label-stamp bg-ink text-paper px-4 py-3 brutal-shadow-warning hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all inline-block">
              Read the full reports (4 PDFs) →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl sm:text-5xl mb-6">Anomaly events</h2>
          <div className="space-y-3">
            {anom.length === 0 && <p className="font-mono text-sm opacity-60">No anomalies — baseline still learning.</p>}
            {anom.map((a) => (
              <article key={a.id} className="brutal-border p-5 bg-paper">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="label-stamp opacity-60 mb-1">{new Date(a.detectedAt).toLocaleString()}</div>
                    <h3 className="text-2xl">{a.anomalyType} · {a.registration || a.icao}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.anomalyScore != null && <span className={`label-stamp px-2 py-1 ${sevColor(a.anomalyScore)}`}>SCORE {a.anomalyScore.toFixed(2)}</span>}
                    {a.altitude != null && <span className="label-stamp brutal-border px-2 py-1 font-mono">{a.altitude} ft</span>}
                    {a.county && <span className="label-stamp brutal-border px-2 py-1">{a.county}</span>}
                  </div>
                </div>
                {a.reasoning && <p className="text-sm">{a.reasoning}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-2">Bradford Hill scored · Court evidence DB</div>
          <h2 className="text-4xl sm:text-5xl mb-6">Surveillance-correlated biometric events</h2>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Timestamp</th>
                  <th className="text-left p-3 label-stamp">Aircraft</th>
                  <th className="text-right p-3 label-stamp">Heart Rate</th>
                  <th className="text-right p-3 label-stamp">Stress</th>
                  <th className="text-right p-3 label-stamp">Bradford Hill</th>
                  <th className="text-left p-3 label-stamp">Evidence Hash</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {corr.length === 0 && <tr><td colSpan={6} className="p-6 text-center">No correlated events.</td></tr>}
                {corr.map((c) => (
                  <tr key={c.id} className="border-t border-ink/20">
                    <td className="p-3 whitespace-nowrap">{new Date(c.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold">{c.registration || "—"}</td>
                    <td className="p-3 text-right">{c.heartRate ?? "—"}</td>
                    <td className="p-3 text-right">{c.stress != null ? c.stress.toFixed(1) : "—"}</td>
                    <td className="p-3 text-right">{c.bradfordHill != null ? <span className="label-stamp bg-warning text-ink px-2 py-1">{c.bradfordHill}/9</span> : "—"}</td>
                    <td className="p-3 text-xs opacity-70 truncate max-w-[180px]">{c.evidenceHash ? c.evidenceHash.slice(0, 16) + "…" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-4">See also · Public datasets</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link to="/violations" className="brutal-border p-4 bg-paper hover:bg-warning/40">
              <div className="font-display text-2xl mb-1">Violations Log</div>
              <p className="text-xs font-mono opacity-70">Hashed airspace violations w/ severity & coordinates.</p>
            </Link>
            <Link to="/threat-index" className="brutal-border p-4 bg-paper hover:bg-warning/40">
              <div className="font-display text-2xl mb-1">Threat Index</div>
              <p className="text-xs font-mono opacity-70">WTI tier breakdown + top scoring events.</p>
            </Link>
            <Link to="/operators" className="brutal-border p-4 bg-paper hover:bg-warning/40">
              <div className="font-display text-2xl mb-1">Operators</div>
              <p className="text-xs font-mono opacity-70">Resolved operators with shell-company links.</p>
            </Link>
            <Link to="/ml-detections" className="brutal-border p-4 bg-paper hover:bg-warning/40">
              <div className="font-display text-2xl mb-1">ML Detections</div>
              <p className="text-xs font-mono opacity-70">Model-flagged anomalies w/ disclosed lineage.</p>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}