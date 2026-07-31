import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getComplianceScoreboard, type ComplianceItem } from "@/lib/advocacy.functions";

const boardQO = queryOptions({
  queryKey: ["compliance-scoreboard"],
  queryFn: () => getComplianceScoreboard(),
  staleTime: 10 * 60_000,
});

const crumbs = [{ label: "Home", href: "/" }, { label: "Accountability" }];

export const Route = createFileRoute("/accountability")({
  head: () => ({
    meta: [
      { title: "Accountability Scoreboard — Reform Compliance Tracker" },
      { name: "description", content: "Public report card on consent-decree reform: nine reform areas, every requirement, and its 2023 / 2024 / 2025 compliance status." },
      { property: "og:title", content: "Accountability Scoreboard" },
      { property: "og:description", content: "Nine reform areas. Every stipulated-judgment requirement. Year-by-year status, in public." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://advocacywatch.live/accountability" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/accountability" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boardQO),
  component: Accountability,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Scoreboard unavailable.</h1>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

const STATUS_LABEL: Record<string, string> = {
  compliant: "Met",
  partial: "Partly met",
  in_progress: "In progress",
  not_started: "Not started",
};

function StatusPill({ value }: { value: string | null }) {
  const key = (value ?? "").toLowerCase();
  const tone =
    key === "compliant" ? "bg-ink text-warning"
    : key === "partial" ? "bg-warning text-ink"
    : key === "in_progress" ? "bg-paper text-ink"
    : "bg-alert text-paper";
  return (
    <span className={`label-stamp brutal-border px-2 py-0.5 text-[10px] whitespace-nowrap ${tone}`}>
      {STATUS_LABEL[key] ?? "—"}
    </span>
  );
}

function trend(item: ComplianceItem): string {
  const rank = (s: string | null) => ({ not_started: 0, in_progress: 1, partial: 2, compliant: 3 } as Record<string, number>)[(s ?? "").toLowerCase()] ?? -1;
  const a = rank(item.status2023);
  const c = rank(item.status2025);
  if (a < 0 || c < 0) return "—";
  if (c > a) return "improved";
  if (c < a) return "regressed";
  return "unchanged";
}

function Accountability() {
  const { data } = useSuspenseQuery(boardQO);
  const { totals } = data;
  const pct = totals.total ? Math.round((totals.compliant / totals.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Accountability scoreboard · public record</div>
          <h1 className="text-5xl sm:text-7xl mb-4">
            {totals.compliant} of {totals.total} reform requirements met.
          </h1>
          <p className="max-w-3xl text-sm opacity-80">
            Nine reform areas. {totals.total} written requirements from the stipulated judgment.
            Three years of status, side by side, so anyone can see what moved and what did not.
            Status values are transcribed from the public compliance record — not scored by us.
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            {[
              ["Met", totals.compliant],
              ["Partly met", totals.partial],
              ["In progress", totals.inProgress],
              ["Not started", totals.notStarted],
            ].map(([label, n]) => (
              <div key={label as string} className="brutal-border bg-paper text-ink p-3">
                <div className="font-display text-3xl">{n as number}</div>
                <div className="label-stamp text-[10px] opacity-70">{label as string}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 max-w-3xl">
            <div className="h-4 brutal-border bg-paper">
              <div className="h-full bg-warning" style={{ width: `${pct}%` }} />
            </div>
            <div className="label-stamp text-[10px] mt-1 opacity-70">{pct}% of requirements fully met as of the 2025 review</div>
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-warning text-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-6 text-sm">
          <div className="label-stamp text-[11px] mb-1">Why this page exists — Watchtower Project LLC</div>
          <p className="max-w-3xl leading-snug">
            Aerial surveillance does not sit outside the reform record; it runs straight through it.
            Where a requirement covers stops, searches, supervision, or community oversight, our flight
            data is evidence of whether the practice on the ground actually changed.{" "}
            <Link to="/live" className="underline">See what flew last night</Link>, then read the requirement it touches.
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12 space-y-10">
          {data.areas.length === 0 && (
            <div className="brutal-border-thick p-8 text-center text-sm">Compliance record temporarily unavailable.</div>
          )}
          {data.areas.map((area) => {
            const met = area.items.filter((i) => (i.status2025 ?? "").toLowerCase() === "compliant").length;
            return (
              <div key={area.id} className="brutal-border-thick bg-paper">
                <header className="bg-ink text-paper px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="label-stamp text-warning text-[10px]">{area.code}</div>
                    <h2 className="font-display text-2xl uppercase leading-tight">{area.name}</h2>
                  </div>
                  <div className="label-stamp text-xs">{met}/{area.items.length} met</div>
                </header>
                {area.description && <p className="px-4 pt-3 text-sm opacity-80">{area.description}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b-2 border-ink">
                      <tr>
                        <th className="text-left p-3 label-stamp text-[10px]">¶</th>
                        <th className="text-left p-3 label-stamp text-[10px]">Requirement</th>
                        <th className="text-left p-3 label-stamp text-[10px]">2023</th>
                        <th className="text-left p-3 label-stamp text-[10px]">2024</th>
                        <th className="text-left p-3 label-stamp text-[10px]">2025</th>
                        <th className="text-left p-3 label-stamp text-[10px]">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {area.items.map((i) => (
                        <tr key={i.id} className="border-t border-ink/20 align-top hover:bg-warning/30">
                          <td className="p-3 font-mono text-xs">{i.paragraph ?? "—"}</td>
                          <td className="p-3">
                            <div className="leading-snug">{i.requirement}</div>
                            {i.notes2025 && <div className="text-xs opacity-70 mt-1 italic">2025 note: {i.notes2025}</div>}
                          </td>
                          <td className="p-3"><StatusPill value={i.status2023} /></td>
                          <td className="p-3"><StatusPill value={i.status2024} /></td>
                          <td className="p-3"><StatusPill value={i.status2025} /></td>
                          <td className="p-3 label-stamp text-[10px] opacity-70">{trend(i)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="brutal-border-thick bg-ink text-paper p-6">
            <div className="label-stamp text-warning mb-2">What we're asking for</div>
            <p className="text-sm opacity-90 max-w-3xl mb-4">
              Every requirement still marked partly met or in progress after three years is a promise
              carried forward. Publish an aerial-surveillance policy, log every flight over a residential
              area, and report compliance on a public schedule.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/act" className="label-stamp brutal-border bg-warning text-ink px-3 py-2 text-[11px]">Take action →</Link>
              <Link to="/toolkit" className="label-stamp brutal-border bg-paper text-ink px-3 py-2 text-[11px]">Records request toolkit →</Link>
              <Link to="/violations" className="label-stamp brutal-border bg-paper text-ink px-3 py-2 text-[11px]">See the flight record →</Link>
            </div>
          </div>

          <p className="text-xs opacity-70 font-mono">
            Source: <code>reform_areas</code> + <code>compliance_items</code> (quiet-math), transcribed from
            the public stipulated-judgment compliance reports. Status labels are the reviewer's, not ours.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}