import { Link } from "@tanstack/react-router";
import type { LowAltDescent } from "@/lib/watchtower.functions";

/**
 * StoryCard — turns a raw low-altitude detection row into a human-readable
 * "this happened, here's why it matters, here's the receipt" card.
 * Used on the homepage and Live Feed to translate the data without editorializing.
 */
export type StoryCardProps = {
  row: LowAltDescent;
  /** Optional override headline ("They Flew So Low They Couldn't Survive a Crash"). */
  headline?: string;
};

function fmtClock(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function ownerLabel(r: LowAltDescent): string {
  return r.identifiedName ?? r.owner ?? "Unidentified operator";
}

function altStory(alt: number | null): string {
  if (alt == null) return "Altitude unreported.";
  if (alt <= 500) return `At ${alt} ft, this aircraft was inside the Dead Man's Curve — too low to autorotate to a survivable landing if the engine failed.`;
  if (alt < 1000) return `At ${alt} ft, this aircraft was below the FAA minimum safe altitude over a populated area.`;
  if (alt < 1500) return `At ${alt} ft, an aircraft can see your backyard. At this altitude, observers can read license plates.`;
  return `At ${alt} ft, this aircraft was inside the public-safety review band — flagged for pattern review.`;
}

function autoHeadline(r: LowAltDescent): string {
  const who = ownerLabel(r);
  const when = fmtClock(r.capturedAt);
  if (r.altitude != null && r.altitude <= 500) return `${when} — ${who} flew so low they couldn't survive a crash.`;
  if (r.violationSource) return `${when} — ${who} crossed an FAA altitude floor.`;
  return `${when} — ${who} loitered low over a populated area.`;
}

export function StoryCard({ row, headline }: StoryCardProps) {
  const tail = row.registration ?? row.icao;
  const where = row.county ?? "the observation zone";
  return (
    <article className="brutal-border-thick bg-paper text-ink p-5">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="label-stamp bg-alert text-paper px-2 py-0.5 text-[10px]">EVIDENCE · STRIPPED · HASHED</span>
        {row.violationSource && (
          <span className="label-stamp bg-ink text-warning px-2 py-0.5 text-[10px]">
            {row.violationSource}
          </span>
        )}
      </div>
      <h3 className="font-display text-xl sm:text-2xl leading-snug mb-3">
        {headline ?? autoHeadline(row)}
      </h3>
      <p className="text-sm font-medium mb-3">{altStory(row.altitude)}</p>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-xs font-mono mb-4">
        <div>
          <dt className="label-stamp opacity-60">TAIL</dt>
          <dd className="font-bold">{tail}</dd>
        </div>
        <div>
          <dt className="label-stamp opacity-60">ALTITUDE</dt>
          <dd className="font-bold">{row.altitude != null ? `${row.altitude.toLocaleString()} ft` : "—"}</dd>
        </div>
        <div>
          <dt className="label-stamp opacity-60">COUNTY</dt>
          <dd className="font-bold">{where}</dd>
        </div>
        <div>
          <dt className="label-stamp opacity-60">WHEN</dt>
          <dd className="font-bold">{fmtClock(row.capturedAt)}</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-ink/10">
        <span className="text-[11px] opacity-70 font-mono">
          Source: public ADS-B broadcast {row.identifiedName ? "+ FAA Aircraft Registry" : ""}.
        </span>
        <Link
          to="/tail-search"
          search={{ tail }}
          className="label-stamp brutal-border bg-ink text-paper px-3 py-1.5 text-[11px] hover:bg-warning hover:text-ink whitespace-nowrap"
        >
          Verify this →
        </Link>
      </div>
    </article>
  );
}