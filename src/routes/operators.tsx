import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getCanonicalOperators } from "@/lib/watchtower.functions";
import { ShareRow } from "@/components/share-row";

const opsQO = queryOptions({ queryKey: ["canonical-operators"], queryFn: () => getCanonicalOperators() });

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Operators" },
];

export const Route = createFileRoute("/operators")({
  head: () => ({
    meta: [
      { title: "Operators Directory — The Architecture of Never" },
      { name: "description", content: "Resolved aircraft operators observed in the airspace. Shell-company links, agency flags, and total detections — derived from public FAA registry data." },
      { property: "og:title", content: "Operators Directory" },
      { property: "og:description", content: "Resolved aircraft operators with shell-company linkage and detection counts." },
      { property: "og:url", content: "https://flightlogged.lovable.app/operators" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/operators" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Canonical Operators Directory",
          description: "Resolved aircraft operators with shell-company links and agency flags.",
          url: "https://flightlogged.lovable.app/operators",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opsQO),
  component: Operators,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Directory unavailable.</h1>
        <p className="font-mono text-sm mb-6">Operators data temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function Flag({ on, label, tone }: { on: boolean; label: string; tone: "alert" | "warning" | "ink" }) {
  if (!on) return null;
  const cls = tone === "alert" ? "bg-alert text-paper" : tone === "warning" ? "bg-warning text-ink" : "bg-ink text-paper";
  return <span className={`label-stamp px-2 py-0.5 ${cls}`}>{label}</span>;
}

function Operators() {
  const { data } = useSuspenseQuery(opsQO);
  const [filter, setFilter] = useState<"all" | "shell" | "agency" | "military" | "medical">("all");

  const isShell = (o: typeof data[number]) => {
    const name = (o.faaName || o.operatorResolved || "").toUpperCase();
    return o.shellLinks > 0 || /\bLLC\b|\bL L C\b|\bINC\b|\bLP\b|\bLLP\b|\bTRUST\b|\bHOLDINGS?\b/.test(name);
  };

  const counts = useMemo(() => {
    const total = data.length;
    const shell = data.filter(isShell).length;
    const agency = data.filter((o) => o.kcso).length;
    const military = data.filter((o) => o.military).length;
    const medical = data.filter((o) => o.medical).length;
    const totalDetections = data.reduce((acc, o) => acc + (o.occurrences || 0), 0);
    return { total, shell, agency, military, medical, totalDetections };
  }, [data]);

  const rows = useMemo(() => {
    switch (filter) {
      case "shell": return data.filter(isShell);
      case "agency": return data.filter((o) => o.kcso);
      case "military": return data.filter((o) => o.military);
      case "medical": return data.filter((o) => o.medical);
      default: return data;
    }
  }, [data, filter]);

  const chips: { id: typeof filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.total },
    { id: "shell", label: "Shell / LLC", count: counts.shell },
    { id: "agency", label: "Law enforcement", count: counts.agency },
    { id: "military", label: "Military", count: counts.military },
    { id: "medical", label: "Medical cover", count: counts.medical },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Public FAA registry · Entity-resolved</div>
          <h1 className="text-5xl sm:text-7xl mb-4">
            {counts.totalDetections.toLocaleString()} Detections. {counts.shell} Shell Companies. {counts.agency} Law Enforcement. {counts.military} Military.
          </h1>
          <p className="max-w-3xl text-sm opacity-80">
            The machine resolved <strong>{counts.total}</strong> operators from the public FAA registry,
            joined them to <strong>{counts.totalDetections.toLocaleString()}</strong> observed detections, and
            auto-flagged shell companies, law enforcement, military, and medical cover. The public record
            named them. We just display it. No human picked this list.
          </p>
        </div>
      </section>

      {/* INDICTMENT SUMMARY */}
      <section className="border-b-4 border-ink bg-alert text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-0.5 mb-3">Of the top {counts.total} operators</div>
          <p className="text-xl sm:text-2xl font-medium leading-snug max-w-4xl">
            <strong className="bg-ink text-warning px-1">{counts.shell}</strong> are shell companies or anonymous LLCs.{" "}
            <strong className="bg-ink text-warning px-1">{counts.agency}</strong> are law-enforcement-flagged tails.{" "}
            <strong className="bg-ink text-warning px-1">{counts.military}</strong> register as military.{" "}
            <strong className="bg-ink text-warning px-1">{counts.medical}</strong> fly under medical cover.
            Together they account for{" "}
            <strong className="bg-ink text-warning px-1">{counts.totalDetections.toLocaleString()}</strong> detections in this window.
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
          <div className="label-stamp text-alert mb-2">Showing {rows.length} of {data.length} · sorted by detections</div>
          <p className="text-xs font-mono opacity-70 mb-3 max-w-3xl">
            <strong>Confidence</strong> = likelihood this operator is conducting covert surveillance,
            scored from registry opacity (shell/LLC), flight behavior (altitude, NIC suppression, hover
            patterns), and coordination with other tails. Calculated by the machine, refreshed live from
            <code> aircraft_profiles</code>.
          </p>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Registration</th>
                  <th className="text-left p-3 label-stamp">Operator / Owner</th>
                  <th className="text-left p-3 label-stamp">Model</th>
                  <th className="text-left p-3 label-stamp">Flags</th>
                  <th className="text-right p-3 label-stamp">Detections</th>
                  <th className="text-right p-3 label-stamp">Confidence</th>
                  <th className="text-left p-3 label-stamp">Last seen</th>
                  <th className="text-left p-3 label-stamp">Share</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center">No operators match this filter.</td></tr>
                )}
                {rows.map((o) => (
                  <tr key={o.registration} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 font-bold">{o.registration}</td>
                    <td className="p-3">{o.operatorResolved || o.faaName || "—"}</td>
                    <td className="p-3">{o.aircraftModel || "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Flag on={o.kcso} label="KCSO" tone="alert" />
                        <Flag on={o.military} label="MIL" tone="ink" />
                        <Flag on={o.medical} label="MED" tone="warning" />
                        <Flag on={o.xpServices} label="XP" tone="ink" />
                        {o.shellLinks > 0 && <span className="label-stamp px-2 py-0.5 bg-alert text-paper">SHELL {o.shellLinks}</span>}
                        {isShell(o) && o.shellLinks === 0 && <span className="label-stamp px-2 py-0.5 bg-ink text-paper">LLC</span>}
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold">{o.occurrences.toLocaleString()}</td>
                    <td className="p-3 text-right">{o.confidence != null ? o.confidence.toFixed(2) : "—"}</td>
                    <td className="p-3 whitespace-nowrap text-xs">{o.lastSeen ? new Date(o.lastSeen).toLocaleDateString() : "—"}</td>
                    <td className="p-3">
                      <ShareRow
                        text={`${o.operatorResolved || o.faaName || o.registration} (${o.registration}) — ${o.occurrences.toLocaleString()} detections in the current window.${o.kcso ? " Flagged: law enforcement." : ""}${o.military ? " Flagged: military." : ""}${isShell(o) ? " Registered as anonymous LLC / shell." : ""} Source: Watchtower / The Architecture of Never — https://advocacywatch.live/operators`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>aircraft_profiles</code> ⨝ <code>faa_master</code> (quiet-math). Flags derive from public records (FAA registry).
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}