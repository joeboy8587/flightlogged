import { Link } from "@tanstack/react-router";

type Props = {
  tail?: string;
  hex?: string;
  rule?: string;
  uuid?: string;
  label?: string;
};

/**
 * Inline citation: every interpretive claim ties back to a verifiable public-record fact.
 * Renders as a small monospace tag that links to the relevant ML-core evidence page.
 */
export function Cite({ tail, hex, rule, uuid, label }: Props) {
  const parts: string[] = [];
  if (tail) parts.push(tail.toUpperCase());
  if (hex) parts.push(`hex:${hex.toLowerCase()}`);
  if (rule) parts.push(rule);
  if (uuid) parts.push(`det:${uuid.slice(0, 8)}`);
  const text = label ?? parts.join(" · ");
  const href = tail
    ? { to: "/tail-search" as const, search: { tail } }
    : rule
    ? { to: "/citations" as const }
    : { to: "/live" as const };
  return (
    <Link
      {...href}
      className="inline-block align-baseline text-[11px] font-mono bg-ink text-paper px-1.5 py-0.5 mx-0.5 hover:bg-warning hover:text-ink"
    >
      [{text}]
    </Link>
  );
}