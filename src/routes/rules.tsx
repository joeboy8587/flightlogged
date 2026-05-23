import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getRegulatoryBaselines, getRegulations, getAirspaceSummary } from "@/lib/watchtower.functions";

const baselinesQO = queryOptions({ queryKey: ["baselines"], queryFn: () => getRegulatoryBaselines() });
const regsQO = queryOptions({ queryKey: ["regs"], queryFn: () => getRegulations() });
const airspaceQO = queryOptions({ queryKey: ["airspace"], queryFn: () => getAirspaceSummary() });

export const Route = createFileRoute("/rules")({
  head: () => ({ meta: [
    { title: "Rules & Airspace — The Architecture of Never" },
    { name: "description", content: "The active regulatory baselines, 14 CFR citations, and FAA airspace geofence applied to every detection." },
    { property: "og:title", content: "Rules & Airspace" },
    { property: "og:description", content: "The rules the machine measures against — pulled live from our Neon-backed FAA baseline." },
  ]}),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(baselinesQO),
    context.queryClient.ensureQueryData(regsQO),
    context.queryClient.ensureQueryData(airspaceQO),
  ]),
  component: Rules,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Rules unreachable.</h1>
        <p className="font-mono text-sm mb-6">{error.message}</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function Rules() {
  const { data: baselines } = useSuspenseQuery(baselinesQO);
  const { data: regs } = useSuspenseQuery(regsQO);
  const { data: airspace } = useSuspenseQuery(airspaceQO);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Public regulations · Active baselines · Geofence</div>
          <h1 className="text-5xl sm:text-7xl mb-4">The rules the machine measures against.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Every detection in the feed is compared against these public rules. Nothing is invented. Citations link
            to the same Code of Federal Regulations any pilot, attorney, or member of the public can read.
          </p>
        </div>
      </section>

      {/* BASELINES */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp text-alert mb-2">Active baselines · {baselines.length}</div>
          <h2 className="text-4xl sm:text-5xl mb-6">What triggers a "Rule" tag in the live feed</h2>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Rule</th>
                  <th className="text-left p-3 label-stamp">Source</th>
                  <th className="text-right p-3 label-stamp">Floor</th>
                  <th className="text-left p-3 label-stamp">Applies</th>
                  <th className="text-right p-3 label-stamp">Score</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {baselines.map((b) => (
                  <tr key={b.ruleName} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 font-bold">{b.ruleName}</td>
                    <td className="p-3"><span className="bg-ink text-paper px-2 py-1 label-stamp">{b.ruleSource}</span></td>
                    <td className="p-3 text-right font-bold">{b.minAltitudeFt} ft</td>
                    <td className="p-3 text-xs">
                      {[
                        b.appliesCongested && "congested",
                        b.appliesResidential && "residential",
                        b.appliesNight && "night",
                      ].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="p-3 text-right font-bold">{b.violationScore.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>regulatory_baselines</code> in Neon. Edit the rule, the feed re-tags accordingly.
          </p>
        </div>
      </section>

      {/* AIRSPACE GEOFENCE */}
      <section className="border-b-4 border-ink bg-ink/5">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp text-ink bg-warning inline-block px-2 py-1 mb-2">Geofence · FAA airspace</div>
          <h2 className="text-4xl sm:text-5xl mb-6">Airspace classes we geofence against</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {airspace.map((z) => (
              <div key={`${z.airspaceType}-${z.classLabel}`} className="brutal-border p-4 bg-paper">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="font-display text-xl">{z.airspaceType} {z.classLabel}</span>
                  <span className="font-mono text-2xl font-bold">{z.count}</span>
                </div>
                <div className="text-xs font-mono opacity-70">
                  {z.examples.slice(0, 3).map((e) => <div key={e}>· {e}</div>)}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs opacity-70 font-mono">
            Source: <code>faa_airspace</code> (PostGIS polygons). Used to attribute each detection to its current airspace class.
          </p>
        </div>
      </section>

      {/* CFR LIBRARY */}
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp text-ink bg-paper brutal-border inline-block px-2 py-1 mb-2">14 CFR · Parts 91 & 107</div>
          <h2 className="text-4xl sm:text-5xl mb-6">The regulations themselves</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {regs.map((r) => (
              <div key={String(r.id)} className="brutal-border p-4 bg-paper hover:bg-warning/20">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="label-stamp bg-ink text-paper px-2 py-1">Part {r.part}</span>
                  <span className="font-mono text-sm font-bold">§ {r.section}</span>
                </div>
                <div className="text-sm">{r.heading}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs opacity-70 font-mono">
            Source: <code>faa_regulations</code>. All citations independently verifiable at ecfr.gov.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link to="/live" className="label-stamp bg-warning brutal-border px-4 py-3 hover:bg-alert hover:text-paper">See the rules applied live →</Link>
            <Link to="/methodology" className="label-stamp brutal-border px-4 py-3 hover:bg-warning">How baselines are computed →</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
