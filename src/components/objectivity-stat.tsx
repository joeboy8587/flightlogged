import type { ObjectivityStats } from "@/lib/scans.functions";

export function ObjectivityStat({ stats, scope = "Global" }: { stats: ObjectivityStats; scope?: "Global" | "AOI" }) {
  const months = stats.observationHours > 0
    ? Math.max(1, Math.round((stats.observationHours / 24 / 30) * 10) / 10)
    : 0;
  const scopeLabel = scope === "AOI"
    ? "AOI · Kern · Kings · Tulare · Fresno · San Bernardino"
    : "Global · every county the sensors see";
  return (
    <div className="brutal-border-thick bg-paper p-6">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="label-stamp bg-ink text-paper inline-block px-2 py-0.5">Population-scale objectivity</div>
        <div className={`label-stamp brutal-border inline-block px-2 py-0.5 ${scope === "AOI" ? "bg-warning text-ink" : "bg-paper text-ink"}`}>{scope}</div>
      </div>
      <div className="text-[10px] font-mono opacity-70 mb-2">{scopeLabel}</div>
      <p className="text-base leading-relaxed">
        <strong className="font-mono text-2xl">{stats.uniqueAircraft.toLocaleString()}</strong> aircraft observed
        {months > 0 && <> over <strong>{months} month{months === 1 ? "" : "s"}</strong></>}.{" "}
        <strong className="font-mono text-2xl">{stats.everFlagged.toLocaleString()} ({stats.everFlaggedPct}%)</strong>{" "}
        have crossed the 99th-percentile threshold at least once.{" "}
        <strong className="font-mono text-2xl">{stats.neverFlagged.toLocaleString()} ({stats.neverFlaggedPct}%)</strong>{" "}
        never triggered.
      </p>
      <p className="mt-3 text-sm font-mono opacity-80">
        This is what a fixed statistical threshold looks like against a large population — not a curated watchlist.
        The threshold is published. The math chooses.
      </p>
    </div>
  );
}