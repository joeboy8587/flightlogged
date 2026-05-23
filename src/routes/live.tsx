import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSnapshot, getRecentLowAltitude, getRepeatOffenders, getIdentifiedOperators } from "@/lib/watchtower.functions";

const snapQO = queryOptions({ queryKey: ["snapshot"], queryFn: () => getSnapshot(), refetchInterval: 30000 });
const lowAltQO = queryOptions({ queryKey: ["low-alt"], queryFn: () => getRecentLowAltitude(), refetchInterval: 30000 });
const repeatQO = queryOptions({ queryKey: ["repeat"], queryFn: () => getRepeatOffenders() });
const idQO = queryOptions({ queryKey: ["identified"], queryFn: () => getIdentifiedOperators() });

export const Route = createFileRoute("/live")({
  head: () => ({ meta: [
    { title: "Live Feed — The Architecture of Never" },
    { name: "description", content: "Watchtower 2.0 live airspace feed. Every detection, every aircraft, every hour." },
    { property: "og:title", content: "Live Watchtower Feed" },
    { property: "og:description", content: "Real-time civilian airspace surveillance, math-chosen, court-ready." },
    { property: "og:url", content: "https://flightlogged.lovable.app/live" },
  ]}),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(snapQO),
    context.queryClient.ensureQueryData(lowAltQO),
    context.queryClient.ensureQueryData(repeatQO),
    context.queryClient.ensureQueryData(idQO),
  ]),
  component: Live,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Feed unreachable.</h1>
        <p className="font-mono text-sm mb-6">Live data temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function fmt(n: number | null) { return n == null ? "—" : n.toLocaleString(); }
function fmtTime(iso: string) { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function altClass(alt: number | null) {
  if (alt == null) return "";
  if (alt < 500) return "bg-alert text-paper";
  if (alt < 1000) return "bg-warning text-ink";
  return "";
}

function Live() {
  const { data: s } = useSuspenseQuery(snapQO);
  const { data: low } = useSuspenseQuery(lowAltQO);
  const { data: repeat } = useSuspenseQuery(repeatQO);
  const { data: identified } = useSuspenseQuery(idQO);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-alert blink" /> LIVE · Refresh every 30s</div>
          <h1 className="text-5xl sm:text-7xl mb-6">Watchtower 2.0 — Live.</h1>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 brutal-border-thick border-paper">
            {[
              ["Detections", fmt(s.totalDetections)],
              ["Unique aircraft", fmt(s.uniqueAircraft)],
              ["Observation window", `${s.windowHours}h`],
              ["Anomaly events", fmt(s.anomalyEvents), true],
            ].map(([label, val, alert], i) => (
              <div key={String(label)} className={`p-5 ${i < 3 ? "sm:border-r border-paper/30" : ""} ${alert ? "bg-warning text-ink" : ""}`}>
                <div className="label-stamp opacity-70">{label}</div>
                <div className="font-mono text-3xl font-bold mt-1">{val}</div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-0 brutal-border-thick border-paper border-t-0 -mt-[4px]">
            {[
              ["Court-ready flight detections", fmt(s.flightDetections)],
              ["Biometric events recorded", fmt(s.biometricEvents)],
              ["Surveillance-correlated", fmt(s.correlatedEvents), true],
            ].map(([label, val, alert], i) => (
              <div key={String(label)} className={`p-5 ${i < 2 ? "sm:border-r border-paper/30" : ""} ${alert ? "bg-alert text-paper" : ""}`}>
                <div className="label-stamp opacity-70">{label}</div>
                <div className="font-mono text-3xl font-bold mt-1">{val}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm opacity-80">
            <strong className="text-warning">0% flagged during baseline — by design.</strong> The system observes
            for 48 hours to learn what normal looks like before it identifies abnormal. After baseline, math chooses.
          </p>
        </div>
      </section>

      {/* LOW ALTITUDE */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="label-stamp text-alert mb-2">Below 1,500 ft · Not on ground</div>
              <h2 className="text-4xl sm:text-5xl">Recent low-altitude detections</h2>
            </div>
            <Link to="/methodology" className="label-stamp brutal-border px-3 py-2 hover:bg-warning">What counts as low? →</Link>
          </div>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">When</th>
                  <th className="text-left p-3 label-stamp">Aircraft</th>
                  <th className="text-left p-3 label-stamp">Identified owner (FAA registry)</th>
                  <th className="text-right p-3 label-stamp">Altitude</th>
                  <th className="text-left p-3 label-stamp">Rule</th>
                  <th className="text-right p-3 label-stamp">Speed</th>
                  <th className="text-left p-3 label-stamp">County</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {low.length === 0 && <tr><td colSpan={7} className="p-6 text-center">No low-altitude activity in the current window.</td></tr>}
                {low.map((r) => (
                  <tr key={r.icao + r.capturedAt} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 whitespace-nowrap">{fmtTime(r.capturedAt)}</td>
                    <td className="p-3"><span className="font-bold">{r.registration || r.icao}</span>{r.model && <div className="text-xs opacity-60">{r.model}</div>}</td>
                    <td className="p-3 text-xs">
                      {r.identifiedName ? (
                        <>
                          <span className="font-bold">{r.identifiedName}</span>
                          {(r.registrantCity || r.registrantState) && (
                            <div className="opacity-60">{[r.registrantCity, r.registrantState].filter(Boolean).join(", ")}</div>
                          )}
                        </>
                      ) : r.owner ? <span className="opacity-70">{r.owner}</span> : "—"}
                    </td>
                    <td className={`p-3 text-right font-bold ${altClass(r.altitude)}`}>{fmt(r.altitude)} ft</td>
                    <td className="p-3 text-xs">
                      {r.violationSource ? (
                        <Link to="/rules" className="inline-block bg-alert text-paper px-2 py-1 label-stamp hover:bg-ink">
                          {r.violationSource}
                        </Link>
                      ) : <span className="opacity-40">—</span>}
                    </td>
                    <td className="p-3 text-right">{r.speed ? Math.round(r.speed) + " kts" : "—"}</td>
                    <td className="p-3 text-xs">{r.county || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Identification cross-referenced against the public FAA Aircraft Registry ({fmt(identified.length)}+ matched operators). Rule column matches active baselines in <Link to="/rules" className="underline">/rules</Link>.
          </p>
        </div>
      </section>

      {/* IDENTIFIED OPERATORS */}
      <section className="border-b-4 border-ink bg-ink/5">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp text-ink bg-paper inline-block px-2 py-1 mb-2 brutal-border">FAA Registry · Public record</div>
          <h2 className="text-4xl sm:text-5xl mb-2">Identified operators in this airspace</h2>
          <p className="text-sm opacity-70 mb-6 max-w-3xl">Mode-S hex matched against the FAA Aircraft Registry. All data is public-source and independently verifiable.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {identified.map((o) => (
              <div key={o.icao} className="brutal-border p-4 bg-paper">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg">{o.registration || o.icao}</span>
                  <span className="font-mono text-xl font-bold">{o.detections}</span>
                </div>
                <div className="text-xs font-bold mt-1">{o.name}</div>
                <div className="text-xs opacity-60 font-mono">{[o.city, o.state].filter(Boolean).join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REPEAT OFFENDERS */}
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp text-ink bg-warning inline-block px-2 py-1 mb-2">≥ 20 detections</div>
          <h2 className="text-4xl sm:text-5xl mb-6">Top repeat aircraft in the airspace</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repeat.map((r) => (
              <div key={r.icao} className="brutal-border p-5 bg-paper hover:brutal-shadow transition-all">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="font-display text-xl">{r.registration || r.icao}</span>
                  <span className="font-mono text-2xl font-bold">{r.totalDetections}</span>
                </div>
                {r.owner && <div className="text-xs opacity-70 mb-1">{r.owner}</div>}
                {r.model && <div className="text-xs opacity-50 mb-3">{r.model}</div>}
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div><div className="opacity-60 label-stamp">MIN ALT</div><div className="font-bold">{fmt(r.minAltitude)} ft</div></div>
                  <div><div className="opacity-60 label-stamp">AVG ALT</div><div className="font-bold">{r.avgAltitude ? Math.round(r.avgAltitude) : "—"} ft</div></div>
                  <div><div className="opacity-60 label-stamp">NIGHT</div><div className="font-bold">{r.nightPct != null ? Math.round(r.nightPct) + "%" : "—"}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}