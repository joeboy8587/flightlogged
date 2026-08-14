import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { getFleetDirectory } from "@/lib/aircraft.functions";
import { fmtDate } from "@/lib/format";

const crumbs = [{ label: "Home", href: "/" }, { label: "Aircraft" }];

export const Route = createFileRoute("/aircraft/")({
  head: () => ({
    meta: [
      { title: "Aircraft Dossiers — Watchtower Profiles by Tail Number" },
      { name: "description", content: "Per-aircraft dossiers built from public ADS-B and FAA records: behavior signature, flagged violations, coordination handoffs, corrections, and hashed receipts." },
      { property: "og:title", content: "Aircraft Dossiers — Watchtower" },
      { property: "og:description", content: "One dossier per aircraft: registry, behavior signature, violations, handoffs, corrections, receipts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/aircraft" }],
  }),
  component: FleetIndex,
});

const SORTS = [
  { id: "score", label: "Most unusual" },
  { id: "detections", label: "Most observed" },
  { id: "lowest", label: "Lowest flying" },
] as const;

function FleetIndex() {
  const fn = useServerFn(getFleetDirectory);
  const [sort, setSort] = useState<"score" | "detections" | "lowest">("score");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["fleet", sort],
    queryFn: () => fn({ data: { sort } }),
    staleTime: 5 * 60 * 1000,
  });
  const rows = (data ?? []).filter((r) => {
    const t = q.trim().toUpperCase();
    if (!t) return true;
    return `${r.registration ?? ""} ${r.icao} ${r.owner ?? ""} ${r.model ?? ""}`.toUpperCase().includes(t);
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1100px] mx-auto px-4 py-10">
          <div className="label-stamp text-warning mb-2">One file per aircraft</div>
          <h1 className="text-4xl sm:text-6xl mb-3">Aircraft dossiers</h1>
          <p className="max-w-2xl text-sm opacity-80">
            Every aircraft the machine has profiled gets its own file: FAA registry identity, learned behavior signature,
            flagged violations, coordination handoffs, the corrections we published against ourselves, and hashed receipts.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by tail, hex, owner, model"
              className="brutal-border bg-paper text-ink px-4 py-2 font-mono flex-1 min-w-[240px]"
              aria-label="Filter aircraft"
            />
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`label-stamp brutal-border px-3 py-2 ${sort === s.id ? "bg-warning text-ink" : "hover:bg-warning hover:text-ink"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-4 py-10">
        {isLoading && <p className="brutal-border p-6 font-mono">Loading profiled aircraft…</p>}
        {!isLoading && rows.length === 0 && <p className="brutal-border p-6 font-mono bg-warning">No aircraft match that filter.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Link
              key={r.icao}
              to="/aircraft/$id"
              params={{ id: r.registration ?? r.icao }}
              className="brutal-border p-4 hover:bg-warning/40"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="font-display text-2xl">{r.registration ?? r.icao}</div>
                {r.isMilitary && <span className="label-stamp bg-alert text-paper px-1 text-[10px]">MIL</span>}
              </div>
              <div className="font-mono text-xs opacity-70 truncate">{r.owner ?? "Unidentified registrant"}</div>
              <div className="font-mono text-xs opacity-70 truncate">{r.model ?? "—"}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
                <div><div className="opacity-60">Reports</div><div className="font-display text-lg">{r.totalDetections?.toLocaleString() ?? "—"}</div></div>
                <div><div className="opacity-60">Lowest</div><div className="font-display text-lg">{r.minAltitude ?? "—"}</div></div>
                <div><div className="opacity-60">Score</div><div className="font-display text-lg">{r.profileScore ?? "—"}</div></div>
              </div>
              <div className="mt-2 font-mono text-[10px] opacity-60">
                cluster {r.cluster ?? "—"} · last seen {fmtDate(r.lastSeen)}
                {r.tacticalRole ? ` · ${r.tacticalRole}` : ""}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}