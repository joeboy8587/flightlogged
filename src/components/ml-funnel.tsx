import type { FunnelStats } from "@/lib/scans.functions";

export function MlFunnel({ stats, compact = false }: { stats: FunnelStats; compact?: boolean }) {
  const steps = [
    { label: "Detections", value: stats.detections },
    { label: "Candidates", value: stats.candidates },
    { label: "Kinematic hits", value: stats.kinematicHits },
    { label: "Handoffs", value: stats.handoffs },
    { label: "Flagged", value: stats.flagged },
  ];
  const hasData = steps.some((s) => s.value > 0);
  return (
    <div className={compact ? "" : "brutal-border-thick bg-paper p-4"}>
      {!compact && (
        <div className="label-stamp mb-2 flex items-center justify-between gap-2">
          <span>Latest scan · funnel</span>
          {stats.scanTs && (
            <span className="opacity-60 font-mono text-[10px]">
              {new Date(stats.scanTs).toLocaleString()}
            </span>
          )}
        </div>
      )}
      <div className="flex items-stretch gap-1 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1 shrink-0">
            <div className={`brutal-border px-3 py-2 text-center ${i === steps.length - 1 && s.value > 0 ? "bg-alert text-paper" : "bg-paper"}`}>
              <div className="font-mono text-2xl font-bold leading-none">{s.value.toLocaleString()}</div>
              <div className="label-stamp text-[9px] mt-1">{s.label}</div>
            </div>
            {i < steps.length - 1 && <span className="font-mono opacity-40">→</span>}
          </div>
        ))}
      </div>
      {!hasData && (
        <p className="mt-2 text-xs font-mono opacity-70">
          No scan artifacts ingested yet. When the ML box POSTs to <code>/api/public/scans/ingest</code>,
          the funnel populates automatically.
        </p>
      )}
      {!compact && hasData && stats.flagged === 0 && (
        <p className="mt-2 text-xs font-mono opacity-70">
          {stats.candidates} candidate{stats.candidates === 1 ? "" : "s"} evaluated · 0 flagged. Most scans flag nothing — that is the pipeline working.
        </p>
      )}
    </div>
  );
}