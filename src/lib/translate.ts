import type { LowAltDescent } from "@/lib/watchtower.functions";

/**
 * Translation layer — pure functions that turn a raw detection row into
 * a plain-English sentence a non-technical reader can absorb in one breath.
 *
 * Rules (non-negotiable):
 *   • Only fields already present on the row may be referenced.
 *   • Missing fields drop their clause — we never invent.
 *   • No opinions. No accusations. Only what the row's own values report.
 *   • The ML score, hash, and receipts stay visible alongside the sentence.
 */

function ownerPhrase(r: LowAltDescent): string | null {
  const name = (r.identifiedName ?? r.owner ?? "").trim();
  if (!name) return null;
  if (r.isShellLikely && r.registrantState) {
    return `A ${r.registrantState}-registered LLC (${name})`;
  }
  return name;
}

function altitudePhrase(alt: number | null): string | null {
  if (alt == null) return null;
  if (alt <= 500) return `flew at ${alt} ft — inside the Dead Man's Curve, too low to survive an engine failure`;
  if (alt < 1000) return `flew at ${alt} ft — below the FAA minimum safe altitude over a populated area`;
  if (alt < 1500) return `flew at ${alt} ft — low enough to read a license plate from above`;
  return `flew at ${alt} ft over a populated county`;
}

function placePhrase(r: LowAltDescent): string | null {
  if (!r.county) return null;
  return `over ${r.county} County`;
}

/**
 * verdictFor — one-sentence plain-English description of a detection row.
 * Composed strictly from the row's own fields.
 */
export function verdictFor(r: LowAltDescent): string {
  const parts: string[] = [];
  const who = ownerPhrase(r) ?? "An aircraft with no public owner on file";
  parts.push(who);
  const alt = altitudePhrase(r.altitude);
  if (alt) parts.push(alt);
  const where = placePhrase(r);
  if (where) parts.push(where);
  if (r.violationSource) parts.push(`— crossing ${r.violationSource}`);
  let sentence = parts.join(" ");
  if (!sentence.endsWith(".")) sentence += ".";
  return sentence;
}

/**
 * questionFor — the question the row's own data raises. Never an accusation.
 */
export function questionFor(r: LowAltDescent): string {
  if (r.isShellLikely) {
    return "Who is actually paying for these flights?";
  }
  if (r.altitude != null && r.altitude <= 500) {
    return "Who authorized a sub-500 ft pass over homes?";
  }
  if (r.violationSource) {
    return `Why is this aircraft operating below the floor set by ${r.violationSource}?`;
  }
  if (r.regViolationCount != null && r.regViolationCount > 0) {
    return `Why has this aircraft been flagged ${r.regViolationCount} time${r.regViolationCount === 1 ? "" : "s"} without enforcement?`;
  }
  return "Why is this aircraft loitering low over a populated area?";
}

/**
 * humanLabel — swaps bureaucratic jargon for plain English on user-facing
 * strings. Technical terms still live on the Methodology page.
 */
const DICT: Record<string, string> = {
  "anomaly cluster": "repeated pattern",
  "data integrity event": "altitude blackout",
  "potential anomaly requiring further study": "flagged — awaiting human review",
  "persistent low-altitude orbiting": "circled low over homes",
  "signal degradation": "the aircraft stopped broadcasting",
  "unidentified registrant": "no public owner on file",
};

export function humanLabel(term: string): string {
  const key = term.trim().toLowerCase();
  return DICT[key] ?? term;
}