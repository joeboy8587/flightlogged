import type { FunnelStats } from "@/lib/scans.functions";
import { fmtClock } from "@/lib/format";

export function MlFunnel({ stats, compact = false }: { stats: FunnelStats; compact?: boolean }) {
  const steps = [
    { label: "Detections", value: stats.detections },
    { label: "Candidates", value: stats.candidates },
    { label: "Kinematic hits", value: stats.kinematicHits },
    { label: "Handoffs", value: stats.handoffs },
    { label: "Flagged", value: stats.flagged },
  ];
  const hasVerifiedArtifact = stats.status === "verified";
  return (
    <div className={compact ? "" : "brutal-border-thick bg-paper p-4"}>
      {!compact && (
        <div className="label-stamp mb-2 flex items-center justify-between gap-2">
          <span>Latest scan · funnel</span>
          {stats.scanTs && (
            <span className="opacity-60 font-mono text-[10px]" suppressHydrationWarning>
              {fmtClock(stats.scanTs)}
            </span>
          )}
        </div>
      )}
      {hasVerifiedArtifact ? <div className="flex items-stretch gap-1 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1 shrink-0">
            <div className={`brutal-border px-3 py-2 text-center ${i === steps.length - 1 && s.value > 0 ? "bg-alert text-paper" : "bg-paper"}`}>
              <div className="font-mono text-2xl font-bold leading-none">{s.value.toLocaleString()}</div>
              <div className="label-stamp text-[9px] mt-1">{s.label}</div>
            </div>
            {i < steps.length - 1 && <span className="font-mono opacity-40">→</span>}
          </div>
        ))}
      </div> : (
        <div className="brutal-border bg-warning/40 p-3">
          <div className="label-stamp text-alert">{stats.status === "invalid" ? "DATA INTEGRITY WARNING" : "SCAN-STAGE ARTIFACT NOT RECEIVED"}</div>
          <p className="mt-1 text-xs font-mono">
            {stats.status === "invalid"
              ? "The latest artifact failed the required descending-stage check, so its funnel is withheld."
              : `${stats.observed24h.toLocaleString()} detections were independently observed in the last 24 hours. Candidate, kinematic, handoff, and flagged stages are not published without a signed scan artifact.`}
          </p>
        </div>
      )}
      {!compact && hasVerifiedArtifact && stats.flagged === 0 && (
        <p className="mt-2 text-xs font-mono opacity-70">
          {stats.candidates} candidate{stats.candidates === 1 ? "" : "s"} evaluated · 0 flagged. Most scans flag nothing — that is the pipeline working.
        </p>
      )}
    </div>
  );
}