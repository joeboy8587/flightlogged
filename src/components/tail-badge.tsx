import { Link } from "@tanstack/react-router";

/**
 * TailBadge — consistent tail / ICAO presentation across every page.
 * Always prefers registration; falls back to the ICAO hex in mono.
 * Optionally wraps in a link to /tail-search so any tail in any list
 * is one click from the unified evidence view.
 */
export function TailBadge({
  registration, icao, link = true,
}: {
  registration: string | null | undefined;
  icao: string | null | undefined;
  link?: boolean;
}) {
  const label = registration?.trim() || icao?.trim() || "—";
  const tail = registration?.trim() || icao?.trim() || "";
  const node = <span className="font-mono font-bold">{label}</span>;
  if (!link || !tail) return node;
  return (
    <Link to="/tail-search" search={{ tail }} className="hover:bg-warning px-1 -mx-1">
      {node}
    </Link>
  );
}