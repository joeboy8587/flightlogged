/**
 * FlagChips — single source of truth for operator/tail flag rendering.
 * Extracted from operators.tsx so Tail Search, Foreign, and Military
 * render the same chip palette and color tones.
 */

export type FlagSet = {
  kcso?: boolean;
  military?: boolean;
  medical?: boolean;
  xpServices?: boolean;
  shellLinks?: number;
  /** Treat the registered name as an opaque LLC even with zero confirmed shell links. */
  llcLike?: boolean;
  /** Optional tactical role string from aircraft_profiles.tactical_role. */
  tacticalRole?: string | null;
};

function Chip({ label, tone }: { label: string; tone: "alert" | "warning" | "ink" | "paper" }) {
  const cls =
    tone === "alert" ? "bg-alert text-paper"
    : tone === "warning" ? "bg-warning text-ink"
    : tone === "paper" ? "bg-paper text-ink brutal-border"
    : "bg-ink text-paper";
  return <span className={`label-stamp px-2 py-0.5 ${cls}`}>{label}</span>;
}

export function FlagChips(f: FlagSet) {
  const shell = f.shellLinks ?? 0;
  return (
    <div className="flex flex-wrap gap-1">
      {f.kcso && <Chip label="KCSO" tone="alert" />}
      {f.military && <Chip label="MIL" tone="ink" />}
      {f.medical && <Chip label="MED" tone="warning" />}
      {f.xpServices && <Chip label="XP" tone="ink" />}
      {shell > 0 && <Chip label={`SHELL ${shell}`} tone="alert" />}
      {shell === 0 && f.llcLike && <Chip label="LLC" tone="ink" />}
      {f.tacticalRole && <Chip label={f.tacticalRole.toUpperCase()} tone="paper" />}
    </div>
  );
}