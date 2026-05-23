import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getThreatIndex } from "@/lib/watchtower.functions";

const tiQO = queryOptions({ queryKey: ["threat-index"], queryFn: () => getThreatIndex() });

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Threat Index" },
];

export const Route = createFileRoute("/threat-index")({
  head: () => ({
    meta: [
      { title: "Threat Index — The Architecture of Never" },
      { name: "description", content: "The Watchtower Threat Index (WTI): tier breakdown and highest-scoring detections, computed from public airspace data." },
      { property: "og:title", content: "Threat Index" },
      { property: "og:description", content: "Watchtower Threat Index tier distribution and top scoring events." },
      { property: "og:url", content: "https://flightlogged.lovable.app/threat-index" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/threat-index" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Watchtower Threat Index (WTI)",
          description: "Per-detection threat scores and tier classifications across all observed airspace events.",
          url: "https://flightlogged.lovable.app/threat-index",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tiQO),
  component: ThreatIndex,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Index unavailable.</h1>
        <p className="font-mono text-sm mb-6">Threat index temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function tierClass(t: number | null) {
  if (t == null) return "bg-ink text-paper";
  if (t >= 4) return "bg-alert text-paper";
  if (t === 3) return "bg-warning text-ink";
  return "bg-ink text-paper";
}

function ThreatIndex() {
  const { data } = useSuspenseQuery(tiQO);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">WTI · {data.methodVersion ?? "method"} · {data.total.toLocaleString()} scored events</div>
          <h1 className="text-5xl sm:text-7xl mb-4">The Threat Index.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Every detection receives a Watchtower Threat Index score and a tier 1–5 classification.
            Method is open. Source data is public. Highest-scoring events surface here first.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <h2 className="text-4xl sm:text-5xl mb-6">Distribution by tier</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.buckets.map((b, i) => (
              <div key={i} className={`brutal-border p-4 ${tierClass(b.tier)}`}>
                <div className="label-stamp opacity-80 mb-1">Tier {b.tier ?? "—"}</div>
                <div className="font-display text-3xl mb-1">{b.count.toLocaleString()}</div>
                <div className="text-xs font-mono opacity-80">{b.level || "unclassified"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <h2 className="text-4xl sm:text-5xl mb-6">Top 25 by WTI score</h2>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Detection</th>
                  <th className="text-right p-3 label-stamp">WTI</th>
                  <th className="text-left p-3 label-stamp">Tier</th>
                  <th className="text-left p-3 label-stamp">Level</th>
                  <th className="text-left p-3 label-stamp">Computed</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.top.map((r) => (
                  <tr key={r.detectionId} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 text-xs">{r.detectionId}</td>
                    <td className="p-3 text-right font-bold">{r.wti.toFixed(2)}</td>
                    <td className="p-3"><span className={`label-stamp px-2 py-1 ${tierClass(r.tier)}`}>T{r.tier ?? "—"}</span></td>
                    <td className="p-3">{r.level || "—"}</td>
                    <td className="p-3 whitespace-nowrap text-xs">{r.computedAt ? new Date(r.computedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>threat_tiers</code>. Method version is published with every score.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}