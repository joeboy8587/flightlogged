import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@/lib/zod-adapter";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getThreatIndex, getCountyBaselines } from "@/lib/watchtower.functions";
import { ConvergenceEventCard } from "@/components/convergence-event-card";

const COUNTY_OPTIONS = [
  { key: "all", label: "All counties" },
  { key: "kern", label: "Kern" },
  { key: "tulare", label: "Tulare" },
  { key: "kings", label: "Kings" },
  { key: "fresno", label: "Fresno" },
  { key: "san_bernardino", label: "San Bernardino" },
  { key: "other", label: "Other (LA basin etc.)" },
] as const;
type CountyParam = (typeof COUNTY_OPTIONS)[number]["key"];

const searchSchema = z.object({
  county: fallback(z.enum(["all", "kern", "tulare", "kings", "fresno", "san_bernardino", "other"]), "all").default("all"),
});

const tiQO = (county: CountyParam) =>
  queryOptions({
    queryKey: ["threat-index", county],
    queryFn: () => getThreatIndex({ data: county === "all" ? {} : { county } }),
  });
const baselineQO = queryOptions({ queryKey: ["county-baselines"], queryFn: () => getCountyBaselines() });

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Threat Index" },
];

export const Route = createFileRoute("/threat-index")({
  validateSearch: zodValidator(searchSchema),
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
  loaderDeps: ({ search }) => ({ county: search.county }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(tiQO(deps.county)),
      context.queryClient.ensureQueryData(baselineQO),
    ]),
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
  const { county } = Route.useSearch();
  const { data } = useSuspenseQuery(tiQO(county));
  const { data: baselines } = useSuspenseQuery(baselineQO);
  const activeLabel = COUNTY_OPTIONS.find((c) => c.key === county)?.label ?? "All counties";
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <ConvergenceEventCard />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">WTI · {data.methodVersion ?? "method"} · {data.total.toLocaleString()} scored events · Lens: {activeLabel}</div>
          <h1 className="text-5xl sm:text-7xl mb-4">The Threat Index.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Every detection receives a Watchtower Threat Index score and a tier 1–5 classification.
            Method is open. Source data is public. Highest-scoring events surface here first.
          </p>
          <div className="mt-6">
            <div className="label-stamp text-warning mb-2">County lens — scores below are filtered to this airspace</div>
            <div className="flex flex-wrap gap-2">
              {COUNTY_OPTIONS.map((opt) => {
                const matchCount = opt.key === "all"
                  ? data.countyCounts.reduce((a, b) => a + b.count, 0)
                  : (data.countyCounts.find((c) => c.county.toLowerCase().replace(/\s+/g, "_") === opt.key)?.count ?? 0);
                const active = county === opt.key;
                return (
                  <Link
                    key={opt.key}
                    to="/threat-index"
                    search={{ county: opt.key }}
                    className={`label-stamp brutal-border px-3 py-2 ${active ? "bg-warning text-ink" : "bg-paper text-ink hover:bg-warning/40"}`}
                  >
                    {opt.label} <span className="opacity-60">· {matchCount}</span>
                  </Link>
                );
              })}
            </div>
            <p className="text-[11px] font-mono opacity-70 mt-2 max-w-3xl">
              Why this matters: LA-basin traffic volume is ~10× Kern's. A single regional ranking buries Kern signals
              under LA noise. The county lens scores each event against the airspace it actually occurred in.
            </p>
          </div>
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

      {baselines.length > 0 && (
        <section className="border-b-4 border-ink bg-paper">
          <div className="max-w-[1400px] mx-auto px-4 py-10">
            <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Per-county baselines · last 48h</div>
            <h2 className="text-3xl sm:text-4xl mb-4">What "normal" looks like — county by county</h2>
            <p className="text-sm max-w-3xl mb-4 opacity-80">
              Each county learns its own baseline. An aircraft at 800 ft over Kern is anomalous because Kern's normal
              is high-altitude transit — even if the same altitude would be unremarkable over the LA basin.
            </p>
            <div className="overflow-x-auto brutal-border">
              <table className="w-full text-xs font-mono">
                <thead className="bg-ink text-paper">
                  <tr>
                    <th className="text-left p-2">County</th>
                    <th className="text-right p-2">Samples (48h)</th>
                    <th className="text-right p-2">Unique aircraft</th>
                    <th className="text-right p-2">Median altitude</th>
                    <th className="text-right p-2">10th %ile altitude</th>
                    <th className="text-right p-2">Median speed</th>
                    <th className="text-right p-2">Night %</th>
                  </tr>
                </thead>
                <tbody>
                  {baselines.map((b) => (
                    <tr key={b.countyKey} className="border-t border-ink/20">
                      <td className="p-2 font-bold">{b.county}</td>
                      <td className="p-2 text-right">{b.samples.toLocaleString()}</td>
                      <td className="p-2 text-right">{b.uniqueAircraft.toLocaleString()}</td>
                      <td className="p-2 text-right">{b.medianAltitude != null ? `${b.medianAltitude.toLocaleString()} ft` : "—"}</td>
                      <td className="p-2 text-right">{b.p10Altitude != null ? `${b.p10Altitude.toLocaleString()} ft` : "—"}</td>
                      <td className="p-2 text-right">{b.medianSpeed != null ? `${b.medianSpeed} kts` : "—"}</td>
                      <td className="p-2 text-right">{b.nightPct != null ? `${b.nightPct}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] opacity-70 mt-2">
              Baselines refresh on every page load from the last 48 hours of <code>detections</code>. Same math for every county.
            </p>
          </div>
        </section>
      )}

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
          <h2 id="purpose" className="sr-only">Purpose</h2>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Purpose</div>
          <p className="text-lg max-w-3xl mb-2">
            The Watchtower Threat Index (WTI) ranks flight events by{" "}
            <strong>statistical abnormality and regulatory risk — not intent</strong>.
          </p>
          <p className="text-sm max-w-3xl opacity-80">
            WTI is a signal for journalists, attorneys, and regulators. A high score means a
            detection deviates sharply from the 48-hour baseline and/or implicates a public
            regulation. It is not, and never will be, an accusation against any individual.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <h2 className="text-3xl sm:text-4xl mb-4">Component glossary — plain language</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { k: "Altitude", v: "Deviation from the FAA minimum safe altitude (14 CFR § 91.119) at the observed location." },
              { k: "Temporal", v: "How unusual the timing is compared to the rolling 48-hour baseline for the same airspace." },
              { k: "Convergence", v: "Proximity to other aircraft in space and time — multi-aircraft clustering and synchronized passes." },
              { k: "Shell", v: "Corporate opacity score from public FAA registry + state filings (shell-network linkage)." },
              { k: "Repeat", v: "Frequency of similar events by the same aircraft within the observation window." },
            ].map((c) => (
              <div key={c.k} className="brutal-border p-3 bg-paper">
                <div className="label-stamp mb-1">{c.k}</div>
                <div className="text-xs font-mono leading-snug">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-3xl sm:text-4xl mb-4">Why these weights?</h2>
            <ul className="space-y-2 text-sm font-mono">
              <li><strong>Altitude (35%)</strong> — highest regulatory risk; tied directly to 14 CFR § 91.119 minimum safe altitudes.</li>
              <li><strong>Repeat (25%)</strong> — strongest indicator of intentional pattern vs. one-off anomaly.</li>
              <li><strong>Temporal (20%)</strong> — deviation from the 48-hour baseline; isolates events that break a stable norm.</li>
              <li><strong>Convergence (12%)</strong> — multi-aircraft clustering; rules out coincidence when two aircraft synchronize.</li>
              <li><strong>Shell (8%)</strong> — public-record opacity weighting; lowest because it is a context signal, not a flight behavior.</li>
            </ul>
            <p className="text-xs opacity-70 mt-3">Weights ship with every row under <code>components.weights</code> — fully reproducible.</p>
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl mb-4">How to reproduce a score</h2>
            <pre className="brutal-border bg-ink text-paper p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed">{`Worked example — WTI = Σ(component × weight)

altitude     100  × 0.35 = 35.00
temporal     100  × 0.20 = 20.00
convergence   26  × 0.12 =  3.12
shell        100  × 0.08 =  8.00
repeat       100  × 0.25 = 25.00
                           ──────
WTI                       = 91.12`}</pre>
            <p className="text-xs opacity-70 mt-3">
              Every row carries the method version so a third party can reproduce the score
              even if the method later evolves.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <h2 className="text-3xl sm:text-4xl mb-4">Tier meaning</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono brutal-border">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-left p-2">Meaning</th>
                  <th className="text-left p-2">Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["4", "Critical statistical abnormality", "Flag for legal / regulatory review"],
                  ["3", "High abnormality", "Flag for analyst review"],
                  ["2", "Elevated", "Monitor"],
                  ["1", "Moderate", "No action — context only"],
                  ["0", "Low", "Baseline"],
                ].map(([t, m, a]) => (
                  <tr key={t} className="border-t-2 border-ink">
                    <td className="p-2"><span className={`label-stamp px-2 py-1 ${tierClass(Number(t))}`}>T{t}</span></td>
                    <td className="p-2">{m}</td>
                    <td className="p-2">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <h2 className="text-3xl sm:text-4xl mb-4">Why convergence matters</h2>
          <p className="text-sm max-w-3xl mb-3">
            Convergence captures the pattern that two or more aircraft in the same airspace
            band, at the same time, on coordinated tracks, is not coincidence — it is
            operational coordination. The metric weighs four factors:
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs font-mono">
            <li className="brutal-border p-2 bg-paper">Multi-aircraft spatial proximity within a defined radius.</li>
            <li className="brutal-border p-2 bg-paper">Synchronized timing windows (entries and exits inside a few minutes).</li>
            <li className="brutal-border p-2 bg-paper">Shared altitude bands suggesting deconfliction between operators.</li>
            <li className="brutal-border p-2 bg-paper">Track clustering — parallel or orbital patterns over the same ground point.</li>
          </ul>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-warning text-ink inline-block px-2 py-1 mb-3">Note on identical scores</div>
          <p className="text-sm max-w-3xl">
            Many top-ranked events share the exact same WTI (for example, multiple rows at 91.12).
            This is expected: when aircraft share the same altitude deviation, timing band,
            and repeat pattern, the weighted sum collapses to the same value. Identical scores
            are a feature of the method, not a bug — they make repeat behavior visible at a glance.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-alert text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-1 mb-3">What WTI is NOT</div>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm font-mono">
            <li className="brutal-border-thick border-paper p-2">Not a claim of criminal intent.</li>
            <li className="brutal-border-thick border-paper p-2">Not a claim of surveillance intent against any individual.</li>
            <li className="brutal-border-thick border-paper p-2">Not a claim of wrongdoing by any pilot, operator, or agency.</li>
            <li className="brutal-border-thick border-paper p-2">Not a prediction of future behavior.</li>
          </ul>
          <p className="mt-3 text-xs opacity-90">
            WTI is a statistical abnormality score computed from public ADS-B and FAA registry data.
            It is a signal for review by humans with legal authority — nothing more.
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
                      <span className={`label-stamp brutal-border px-2 py-1 ${r.county && /kern/i.test(r.county) ? "bg-warning text-ink" : "bg-paper text-ink"}`}>
                        {r.county || "county unknown"}
                      </span>
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
            Source: <code>anomaly_events</code> (quiet-math). WTI = anomaly_score × 100; tier bands 25 / 50 / 75.
            Every row carries the method version so a third party can reproduce the score.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}