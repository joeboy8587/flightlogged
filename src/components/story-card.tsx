import { Link } from "@tanstack/react-router";
import type { LowAltDescent } from "@/lib/watchtower.functions";
import { fmtClock } from "@/lib/format";
import { verdictFor, questionFor } from "@/lib/translate";

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

/**
 * Rotorcraft check from the FAA registry model string. Gates helicopter-only
 * language (Dead Man's Curve / autorotation) so it never attaches to
 * fixed-wing aircraft. Unknown model => treated as fixed-wing (conservative:
 * the claim simply is not made).
 */
function isRotorcraft(model: string | null | undefined): boolean {
  const m = (model ?? "").toUpperCase();
  if (!m) return false;
  return /HELICOPTER|ROTORCRAFT|ROTO(RCRAFT|RWAY|R)|GYRO/.test(m) || /\b(R22|R44|R66|AS350|AS355|EC130|EC135|EC145|H125|H130|H135|H145|A109|A119|BELL ?(206|212|214|407|429|445|505)|BO ?105|MD ?(500|520|530|600|900)|S-?76|S-?92|UH-?\d|AH-?\d|OH-?\d|TH-?\d|CH-?\d|V-?22|AW109|AW119|AW139|BK ?117)\b/.test(m);
}

function ownerLabel(r: LowAltDescent): string {
  return r.identifiedName ?? r.owner ?? "Unidentified operator";
}

function altStory(alt: number | null, model: string | null): string {
  if (alt == null) return "Altitude unreported.";
  if (alt <= 500 && isRotorcraft(model)) {
    return `At ${alt} ft, this helicopter was inside the Dead Man's Curve — too low to autorotate to a survivable landing if the engine failed.`;
  }
  if (alt <= 500) return `At ${alt} ft, this aircraft was below the FAA minimum safe altitude over a populated area.`;
  if (alt < 1000) return `At ${alt} ft, this aircraft was below the FAA minimum safe altitude over a populated area.`;
  if (alt < 1500) return `At ${alt} ft, this aircraft was inside the Watchtower low-altitude review band.`;
  return `At ${alt} ft, this aircraft was inside the public-safety review band — flagged for pattern review.`;
}

function autoHeadline(r: LowAltDescent): string {
  const who = ownerLabel(r);
  const when = fmtClock(r.capturedAt);
  if (r.altitude != null && r.altitude <= 500) {
    return isRotorcraft(r.model)
      ? `${when} — ${who} flew so low they couldn't survive a crash.`
      : `${when} — ${who} flew below the FAA minimum safe altitude over a populated area.`;
  }
  if (r.violationSource) return `${when} — ${who} crossed an FAA altitude floor.`;
  return `${when} — ${who} loitered low over a populated area.`;
}

export function StoryCard({ row, headline }: StoryCardProps) {
  const tail = row.registration ?? row.icao;
  const where = row.county ?? "the observation zone";
  const verdict = verdictFor(row);
  const question = questionFor(row);
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
      <p className="font-display text-xl sm:text-2xl leading-snug mb-3">
        {headline ?? verdict}
      </p>
      <div className="brutal-border bg-warning/40 p-3 mb-3">
        <div className="label-stamp text-[10px] mb-1 opacity-70">The question this raises</div>
        <p className="text-sm font-bold">{question}</p>
      </div>
      <p className="text-xs opacity-70 mb-3 italic">
        Machine logged: {autoHeadline(row)} — {altStory(row.altitude, row.model)}
      </p>
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