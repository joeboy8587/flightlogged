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
          <div className="mt-6 grid sm:grid-cols-3 gap-3 max-w-3xl">
            <div className="brutal-border-thick border-paper p-3">
              <div className="label-stamp opacity-60 mb-1">Method</div>
              <div className="font-mono text-sm">{data.methodVersion ?? "—"}</div>
            </div>
            <div className="brutal-border-thick border-paper p-3">
              <div className="label-stamp opacity-60 mb-1">Scored events</div>
              <div className="font-display text-2xl">{data.total.toLocaleString()}</div>
            </div>
            <div className="brutal-border-thick border-paper p-3">
              <div className="label-stamp opacity-60 mb-1">Cryptographically hashed</div>
              <div className="font-display text-2xl">100%</div>
              <div className="text-[10px] font-mono opacity-70">All {data.total.toLocaleString()} records · SHA-256 + Merkle chain</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-warning text-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="label-stamp mb-2">How a WTI score is built</div>
          <p className="text-sm max-w-3xl">
            Each score is a weighted sum of five public-data components: altitude (vs. CFR floor),
            temporal pattern (vs. 48-hour baseline), convergence (multi-aircraft proximity),
            shell-network linkage (public corporate filings), and repeat frequency. The weights
            below ship with every row — no hidden parameters.
          </p>
          {data.top[0]?.components?.weights && (
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
              {([
                ["altitude", data.top[0].components.weights.altitude],
                ["temporal", data.top[0].components.weights.temporal],
                ["convergence", data.top[0].components.weights.convergence],
                ["shell", data.top[0].components.weights.shell],
                ["repeat", data.top[0].components.weights.repeat],
              ] as const).map(([k, w]) => (
                <span key={k} className="brutal-border bg-paper px-2 py-1">
                  {k} <strong>×{w != null ? (w * 100).toFixed(0) + "%" : "—"}</strong>
                </span>
              ))}
            </div>
          )}
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
          <h2 className="text-4xl sm:text-5xl mb-6">Top 25 by WTI score — with score breakdown</h2>
          <div className="space-y-3">
            {data.top.map((r) => {
              const c = r.components;
              const bars: { k: string; v: number | null }[] = c
                ? [
                    { k: "altitude", v: c.altitude },
                    { k: "temporal", v: c.temporal },
                    { k: "convergence", v: c.convergence },
                    { k: "shell", v: c.shellNetwork },
                    { k: "repeat", v: c.repeatFrequency },
                  ]
                : [];
              return (
                <article key={r.detectionId} className="brutal-border p-4 bg-paper">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="font-mono text-xs">
                      <div className="opacity-60">{r.computedAt ? new Date(r.computedAt).toLocaleString() : "—"}</div>
                      <div className="opacity-70 truncate max-w-[280px]">det: {r.detectionId}</div>
                      {r.hashShort && <div className="opacity-50">sha256: {r.hashShort}…</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`label-stamp px-2 py-1 ${tierClass(r.tier)}`}>T{r.tier ?? "—"} · {r.level || "—"}</span>
                      <span className="label-stamp bg-ink text-paper px-2 py-1">WTI {r.wti.toFixed(2)}</span>
                    </div>
                  </div>
                  {c ? (
                    <div className="grid sm:grid-cols-5 gap-2">
                      {bars.map((b) => (
                        <div key={b.k} className="brutal-border bg-paper p-2">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="label-stamp text-[10px]">{b.k}</span>
                            <span className="font-mono text-xs font-bold">{b.v != null ? b.v : "—"}</span>
                          </div>
                          <div className="h-2 bg-ink/10">
                            <div className="h-full bg-alert" style={{ width: `${Math.min(100, Math.max(0, Number(b.v ?? 0)))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-mono text-xs opacity-60">Component breakdown unavailable for this row.</p>
                  )}
                </article>
              );
            })}
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>threat_tiers</code>. Component values are 0–100; final WTI = Σ(component × weight).
            Every row carries the method version so a third party can reproduce the score.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}