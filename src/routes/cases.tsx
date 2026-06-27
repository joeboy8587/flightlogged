import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getPublishedCases, type PublishedCase } from "@/lib/watchtower.functions";
import { ShareRow } from "@/components/share-row";
import { TailBadge } from "@/components/tail-badge";
import { fmtDate, normalizeCountyName } from "@/lib/format";

const casesQO = queryOptions({
  queryKey: ["published-cases"],
  queryFn: () => getPublishedCases(),
  staleTime: 5 * 60_000,
  gcTime: 10 * 60_000,
});

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Cases" },
];

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Case Dossiers — The Architecture of Never" },
      { name: "description", content: "Every published civilian airspace case opened by the machine: WTI tier, Bradford-Hill factors, subject aircraft, and public summary. Drawn from quiet-math Neon." },
      { property: "og:title", content: "Case Dossiers" },
      { property: "og:description", content: "Published civilian airspace cases with WTI tier and Bradford-Hill evidence factors." },
      { property: "og:url", content: "https://flightlogged.lovable.app/cases" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/cases" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Published Case Dossiers",
          description: "Civilian airspace case dossiers opened and scored by the machine.",
          url: "https://flightlogged.lovable.app/cases",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(casesQO),
  component: Cases,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Cases unavailable.</h1>
        <p className="font-mono text-sm mb-6">Case dossier data temporarily unavailable.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function bhCount(c: PublishedCase) {
  return [c.bhStrength, c.bhConsistency, c.bhSpecificity, c.bhTemporality, c.bhCorroboration].filter(Boolean).length;
}

function TierChip({ tier }: { tier: number | null }) {
  if (tier == null) return <span className="label-stamp px-2 py-0.5 bg-paper brutal-border">UNRANKED</span>;
  const tone = tier >= 3 ? "bg-alert text-paper" : tier === 2 ? "bg-warning text-ink" : "bg-ink text-paper";
  return <span className={`label-stamp px-2 py-0.5 ${tone}`}>TIER {tier}</span>;
}

function Cases() {
  const { data } = useSuspenseQuery(casesQO);
  const [filter, setFilter] = useState<"all" | "t3" | "sufficient" | "kern">("all");

  const rows = useMemo(() => {
    switch (filter) {
      case "t3": return data.filter((c) => (c.wtiTier ?? 0) >= 3);
      case "sufficient": return data.filter((c) => c.evidenceSufficient);
      case "kern": return data.filter((c) => /kern/i.test(c.primaryCounty ?? ""));
      default: return data;
    }
  }, [data, filter]);

  const counts = {
    total: data.length,
    t3: data.filter((c) => (c.wtiTier ?? 0) >= 3).length,
    sufficient: data.filter((c) => c.evidenceSufficient).length,
    kern: data.filter((c) => /kern/i.test(c.primaryCounty ?? "")).length,
  };

  const chips: { id: typeof filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.total },
    { id: "t3", label: "Tier 3+", count: counts.t3 },
    { id: "sufficient", label: "Evidence sufficient", count: counts.sufficient },
    { id: "kern", label: "Kern County", count: counts.kern },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Published dossiers · WTI tiered · Bradford-Hill scored</div>
          <h1 className="text-5xl sm:text-7xl mb-4">
            {counts.total} Published Cases. {counts.t3} Tier 3+. {counts.sufficient} Court-Ready.
          </h1>
          <p className="max-w-3xl text-sm opacity-80">
            Every case here was opened, scored, and published by the machine from raw quiet-math data —
            WTI scoring, Bradford-Hill epidemiological criteria, and an auto-generated public summary.
            No human picked which cases were promoted. The record stands as found.
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="label-stamp text-alert mr-2">Filter:</span>
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={`label-stamp brutal-border px-3 py-1 text-xs transition-colors ${filter === c.id ? "bg-ink text-paper" : "bg-paper hover:bg-warning"}`}
              >
                {c.label} <span className="font-mono opacity-70">({c.count})</span>
              </button>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="brutal-border-thick p-8 text-center">
              <p className="text-sm">No published cases match this filter.</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((c) => (
              <article key={c.id} className="brutal-border-thick bg-paper p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <TierChip tier={c.wtiTier} />
                  {c.evidenceSufficient && <span className="label-stamp bg-ink text-warning px-2 py-0.5">EVIDENCE SUFFICIENT</span>}
                  {c.severity && <span className="label-stamp brutal-border px-2 py-0.5 text-[10px]">{c.severity.toUpperCase()}</span>}
                  {c.publishTier && <span className="label-stamp brutal-border px-2 py-0.5 text-[10px]">{c.publishTier.toUpperCase()}</span>}
                </div>
                <header>
                  <div className="text-[10px] label-stamp opacity-70">CASE {c.caseId}</div>
                  <h3 className="font-display text-xl leading-tight mt-1">
                    {c.anomalyType ?? c.caseType ?? "Unclassified case"} — <TailBadge registration={c.subjectReg} icao={c.subjectIcao} />
                  </h3>
                  <p className="text-xs font-mono opacity-70 mt-1">
                    {c.subjectOwner ?? "Unidentified operator"} · {normalizeCountyName(c.primaryCounty)} · {c.totalEvents.toLocaleString()} events
                  </p>
                </header>
                {c.publicSummary && (
                  <p className="text-sm leading-snug">{c.publicSummary}</p>
                )}
                <dl className="grid grid-cols-5 gap-1 text-[10px] font-mono">
                  {[
                    ["STR", c.bhStrength], ["CON", c.bhConsistency], ["SPC", c.bhSpecificity],
                    ["TMP", c.bhTemporality], ["COR", c.bhCorroboration],
                  ].map(([k, on]) => (
                    <div key={k as string} className={`text-center px-1 py-1 brutal-border ${on ? "bg-ink text-warning" : "bg-paper opacity-50"}`}>
                      <div className="font-bold">{k}</div>
                    </div>
                  ))}
                </dl>
                <div className="text-[10px] font-mono opacity-70 flex items-center justify-between gap-2">
                  <span>BH score {bhCount(c)}/5 · WTI {c.wtiScore?.toFixed(1) ?? "—"} · Published {fmtDate(c.publishedAt)}</span>
                  {c.hashShort && <code className="opacity-60">{c.hashShort}</code>}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-ink/10">
                  {c.reportUrl ? (
                    <a href={c.reportUrl} target="_blank" rel="noopener noreferrer" className="label-stamp brutal-border bg-ink text-paper px-3 py-1.5 text-[11px] hover:bg-warning hover:text-ink">
                      Read full report →
                    </a>
                  ) : <span className="text-[10px] opacity-50">Report PDF pending</span>}
                  <ShareRow
                    text={`Case ${c.caseId} — ${c.anomalyType ?? c.caseType ?? "civilian airspace case"} on ${c.subjectReg ?? c.subjectIcao ?? "unidentified tail"}. WTI tier ${c.wtiTier ?? "?"} · Bradford-Hill ${bhCount(c)}/5. Source: The Architecture of Never — https://advocacywatch.live/cases`}
                  />
                </div>
              </article>
            ))}
          </div>

          <p className="mt-6 text-xs opacity-70 font-mono">
            Source: <code>cases</code> (quiet-math). Only rows where <code>is_published = true</code> appear here.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}