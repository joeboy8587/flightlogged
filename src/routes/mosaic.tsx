import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import {
  getDensityTiles, getViolationTiles, getTimeOfDayHeat,
  getAnomalyPoints, getHandoffPairs, getEntityCentroids,
} from "@/lib/watchtower.functions";

const densityQO   = queryOptions({ queryKey: ["mosaic","density"],   queryFn: () => getDensityTiles({ data: {} }),    staleTime: 5 * 60_000 });
const violQO      = queryOptions({ queryKey: ["mosaic","viol"],      queryFn: () => getViolationTiles({ data: {} }),  staleTime: 5 * 60_000 });
const todQO       = queryOptions({ queryKey: ["mosaic","tod"],       queryFn: () => getTimeOfDayHeat(),               staleTime: 10 * 60_000 });
const anomPtQO    = queryOptions({ queryKey: ["mosaic","anomPts"],   queryFn: () => getAnomalyPoints(),               staleTime: 5 * 60_000 });
const handoffQO   = queryOptions({ queryKey: ["mosaic","handoff"],   queryFn: () => getHandoffPairs(),                staleTime: 10 * 60_000 });
const entityQO    = queryOptions({ queryKey: ["mosaic","entity"],    queryFn: () => getEntityCentroids(),             staleTime: 10 * 60_000 });

const crumbs = [{ label: "Home", href: "/" }, { label: "Mosaic" }];

export const Route = createFileRoute("/mosaic")({
  head: () => ({
    meta: [
      { title: "Surveillance Mosaic — Kern Airspace Layers" },
      { name: "description", content: "Six-layer evidence mosaic: density, violations, time-of-day, anomaly type, handoff pairs, entity network. Reads quiet-math (unbiased ML)." },
      { property: "og:title", content: "Surveillance Mosaic — Architecture of Never" },
      { property: "og:description", content: "Six independent surveillance layers stacked on one map." },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/mosaic" }],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(densityQO),
    context.queryClient.ensureQueryData(violQO),
    context.queryClient.ensureQueryData(todQO),
    context.queryClient.ensureQueryData(anomPtQO),
    context.queryClient.ensureQueryData(handoffQO),
    context.queryClient.ensureQueryData(entityQO),
  ]),
  component: MosaicPage,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Mosaic temporarily unavailable.</h1>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

const ANOMALY_COLORS: Record<string, string> = {
  LOW_ALTITUDE: "#dc2626", SPOOFING_SIGNAL: "#ea580c", SURVEILLANCE_MASKING: "#7c3aed",
  HOVER_PATTERN: "#ca8a04", IMPOSSIBLE_PHYSICS: "#0891b2", ALTITUDE_SPOOF: "#db2777",
  GHOST_TRACK: "#475569", UNUSUAL_ROUTE: "#16a34a", UNKNOWN: "#737373",
};
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MosaicPage() {
  const { data: density } = useSuspenseQuery(densityQO);
  const { data: violations } = useSuspenseQuery(violQO);
  const { data: tod } = useSuspenseQuery(todQO);
  const { data: anomalyPoints } = useSuspenseQuery(anomPtQO);
  const { data: handoffs } = useSuspenseQuery(handoffQO);
  const { data: entities } = useSuspenseQuery(entityQO);

  const [layers, setLayers] = useState({
    density: true, violations: true, anomalyPins: false, handoffs: false, entities: true,
  });
  const [showCalendar, setShowCalendar] = useState(true);
  const [selected, setSelected] = useState<{ kind: string; data: any } | null>(null);

  const toggle = (k: keyof typeof layers) => setLayers((s) => ({ ...s, [k]: !s[k] }));

  const todMax = useMemo(() => Math.max(1, ...tod.map((t) => t.pings)), [tod]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="label-stamp text-alert mb-2">Surveillance Mosaic</div>
          <h1 className="text-4xl sm:text-6xl mb-3">Six layers. One map. One finding.</h1>
          <p className="max-w-3xl text-sm sm:text-base">
            Every layer reads from quiet-math (the unbiased ML database). Tile size is
            ~1 km² (0.01° × 0.01°). Click any tile, pin, or arrow to open its evidence
            bundle with hash and source rows.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <div>
              <div className="h-[70vh] brutal-border bg-warning/20 flex items-center justify-center label-stamp">
                Interactive map loading — data layer active ({density.length} density tiles, {anomalyPoints.length} anomaly points, {handoffs.length} handoff pairs)
              </div>
            </div>

            <aside className="space-y-4">
              <div className="brutal-border p-3">
                <div className="label-stamp mb-2">Layers</div>
                {([
                  ["density",     "1. Density heatmap"],
                  ["violations",  "2. Violation heatmap"],
                  ["anomalyPins", "4. Anomaly type pins"],
                  ["handoffs",    "5. Handoff arrows"],
                  ["entities",    "6. Entity network pins"],
                ] as const).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                    <input type="checkbox" checked={layers[k]} onChange={() => toggle(k)} />
                    <span>{label}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 py-1 mt-2 border-t border-ink/30 pt-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={showCalendar} onChange={() => setShowCalendar((v) => !v)} />
                  <span>3. Time-of-day calendar (below)</span>
                </label>
              </div>

              <div className="brutal-border p-3">
                <div className="label-stamp mb-2">Legend</div>
                {layers.density && (
                  <div className="mb-2">
                    <div className="text-xs font-mono mb-1">Density (pings/tile)</div>
                    <div className="flex h-3">
                      <span className="flex-1" style={{ background: "#fde047" }} />
                      <span className="flex-1" style={{ background: "#ea580c" }} />
                      <span className="flex-1" style={{ background: "#7f1d1d" }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono"><span>low</span><span>high</span></div>
                  </div>
                )}
                {layers.violations && (
                  <div className="mb-2">
                    <div className="text-xs font-mono mb-1">Anomaly type</div>
                    {Object.entries(ANOMALY_COLORS).map(([k, c]) => (
                      <div key={k} className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="inline-block w-3 h-3" style={{ background: c }} />
                        {k}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="brutal-border p-3 bg-warning/30">
                <div className="label-stamp mb-2">Selected</div>
                {!selected && <p className="text-xs font-mono opacity-70">Click any element on the map.</p>}
                {selected && (
                  <div className="space-y-2 text-xs font-mono">
                    <div className="label-stamp bg-ink text-paper inline-block px-1">{selected.kind.toUpperCase()}</div>
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(selected.data, null, 2)}</pre>
                    <button
                      onClick={() => navigator.clipboard?.writeText(JSON.stringify(selected.data, null, 2))}
                      className="brutal-border px-2 py-1 bg-paper hover:bg-warning"
                    >Copy evidence bundle</button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {showCalendar && (
        <section className="border-b-4 border-ink">
          <div className="max-w-[1400px] mx-auto px-4 py-8">
            <h2 className="text-3xl mb-3">Layer 3 · When does it happen?</h2>
            <p className="text-sm mb-4">Pings per day × hour (America/Los_Angeles). Darker = busier.</p>
            <div className="overflow-x-auto">
              <table className="border-collapse text-[10px] font-mono">
                <thead>
                  <tr>
                    <th className="p-1"></th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} className="p-1 w-7 text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DOW_LABELS.map((dl, dow) => (
                    <tr key={dow}>
                      <td className="p-1 pr-2 font-bold">{dl}</td>
                      {Array.from({ length: 24 }, (_, h) => {
                        const cell = tod.find((t) => t.dow === dow && t.hour === h);
                        const v = cell?.pings ?? 0;
                        const i = v / todMax;
                        const bg = v === 0
                          ? "#f5f5f4"
                          : i > 0.66 ? "#7f1d1d" : i > 0.33 ? "#ea580c" : "#fde047";
                        const color = i > 0.5 ? "#fff" : "#0a0a0a";
                        return (
                          <td key={h} title={`${dl} ${h}:00 · ${v} pings · ${cell?.belowFloor ?? 0} below-floor · ${cell?.aircraft ?? 0} a/c`}
                              className="text-center" style={{ background: bg, color, width: 28, height: 22 }}>
                            {v > 0 ? v : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
