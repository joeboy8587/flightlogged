import { Link } from "@tanstack/react-router";
import type { Crumb } from "@/lib/breadcrumbs";

export function SiteBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b-2 border-ink bg-paper">
      <ol className="max-w-[1400px] mx-auto px-4 py-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider overflow-x-auto whitespace-nowrap">
        {items.map((c, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-2">
              {c.href && !isLast ? (
                <Link to={c.href} className="hover:bg-warning px-1 -mx-1">{c.label}</Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "bg-ink text-paper px-1" : ""}>{c.label}</span>
              )}
              {!isLast && <span aria-hidden className="opacity-40">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}