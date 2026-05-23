import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getCanonicalOperators } from "@/lib/watchtower.functions";

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
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Public FAA registry · Entity-resolved</div>
          <h1 className="text-5xl sm:text-7xl mb-4">Who's flying.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Operators resolved from the FAA Master Registry, joined to observed detections and known
            shell-company filings. Sourced entirely from public records any member of the public can verify.
          </p>
        </div>
      </section>
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">Top operators by occurrence · {data.length}</div>
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
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.map((o) => (
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
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold">{o.occurrences.toLocaleString()}</td>
                    <td className="p-3 text-right">{o.confidence != null ? o.confidence.toFixed(2) : "—"}</td>
                    <td className="p-3 whitespace-nowrap text-xs">{o.lastSeen ? new Date(o.lastSeen).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>canonical_operator_profiles</code>. Flags derive from public records (FAA, SoS filings).
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}