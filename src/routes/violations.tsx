import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getSentinelViolations, getNeonViolations } from "@/lib/watchtower.functions";
import { UndergroundClub } from "@/components/underground-club";
import { DeadMansCurveTiles, dmcQO } from "@/components/dead-mans-curve";
import { fmtClock, fmtDate } from "@/lib/format";
import { getSentinelLedger, type LedgerRow } from "@/lib/advocacy.functions";
import { countyToSlug } from "@/lib/counties";

const vQO = queryOptions({ queryKey: ["sentinel-violations"], queryFn: () => getSentinelViolations() });
const nQO = queryOptions({ queryKey: ["neon-violations"], queryFn: () => getNeonViolations() });
const ledgerQO = queryOptions({ queryKey: ["sentinel-ledger"], queryFn: () => getSentinelLedger(), staleTime: 60_000 });

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Violations" },
];

export const Route = createFileRoute("/violations")({
  head: () => ({
    meta: [
      { title: "Violations Log — The Architecture of Never" },
      { name: "description", content: "Time-stamped airspace violations with severity, location, and SHA-256 evidence hashes. Public log derived from ADS-B and FAA baselines." },
      { property: "og:title", content: "Violations Log" },
      { property: "og:description", content: "Hashed, geolocated airspace violations against published FAA baselines." },
      { property: "og:url", content: "https://advocacywatch.live/violations" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/violations" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Sentinel Violations Log",
          description: "Time-stamped, hashed airspace violations against published FAA regulatory baselines.",
          url: "https://advocacywatch.live/violations",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(vQO),
    context.queryClient.ensureQueryData(nQO),
    context.queryClient.ensureQueryData(dmcQO),
  ]),
  component: Violations,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Log unavailable.</h1>
        <p className="font-mono text-sm mb-6">Violations data temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function sevClass(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("critical") || v.includes("high")) return "bg-alert text-paper";
  if (v.includes("medium") || v.includes("mod")) return "bg-warning text-ink";
  return "bg-ink text-paper";
}

const SEVERITIES = ["ALL", "CRITICAL", "HIGH", "MODERATE", "LOW"] as const;

function toCsv(rows: LedgerRow[]): string {
  const head = ["id", "timestamp", "registration", "aircraft_type", "altitude_ft", "county", "violation_type", "severity", "description", "evidence_hash"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [r.id, r.at, r.registration, r.aircraftType, r.altitude, r.county, r.violationType, r.severity, r.description, r.hashShort].map(esc).join(","),
  );
  return [head.join(","), ...body].join("\n");
}

function LedgerSection() {
  const { data, isLoading } = useQuery(ledgerQO);
  const [sev, setSev] = useState<string>("ALL");
  const [county, setCounty] = useState<string>("ALL");
  const rows = (data?.rows ?? []).filter(
    (r) => (sev === "ALL" || r.severity === sev) && (county === "ALL" || (r.county ?? "").toUpperCase() === county),
  );

  function download() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `watchtower-violations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="border-b-4 border-ink bg-paper">
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="label-stamp mb-1">Typed ledger · sentinel_violations</div>
            <h2 className="text-3xl sm:text-4xl">
              {data ? `${data.total.toLocaleString()} classified violations on record.` : "Loading the ledger…"}
            </h2>
            <p className="text-sm opacity-70 mt-1 max-w-3xl">
              Filter by how serious the machine rated it, or by county, then take the file with you.
              The CSV is the same data a reporter or attorney would need to check our work.
            </p>
          </div>
          <button
            onClick={download}
            disabled={rows.length === 0}
            className="label-stamp brutal-border bg-warning text-ink px-4 py-2 text-[11px] disabled:opacity-40"
          >
            Download {rows.length.toLocaleString()} rows (CSV) →
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSev(s)}
              className={`label-stamp brutal-border px-3 py-1.5 text-[10px] ${sev === s ? "bg-ink text-paper" : "bg-paper hover:bg-warning"}`}
            >
              {s}
            </button>
          ))}
          {(data?.byCounty ?? []).slice(0, 8).map((c) => (
            <button
              key={c.county}
              onClick={() => setCounty(county === c.county ? "ALL" : c.county)}
              className={`label-stamp brutal-border px-3 py-1.5 text-[10px] ${county === c.county ? "bg-ink text-paper" : "bg-paper hover:bg-warning"}`}
            >
              {c.county} · {c.count.toLocaleString()}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto brutal-border">
          <table className="w-full text-sm">
            <thead className="bg-ink text-paper">
              <tr>
                <th className="text-left p-2 label-stamp text-[10px]">When</th>
                <th className="text-left p-2 label-stamp text-[10px]">Aircraft</th>
                <th className="text-right p-2 label-stamp text-[10px]">Altitude</th>
                <th className="text-left p-2 label-stamp text-[10px]">County</th>
                <th className="text-left p-2 label-stamp text-[10px]">What was flagged</th>
                <th className="text-left p-2 label-stamp text-[10px]">Severity</th>
                <th className="text-left p-2 label-stamp text-[10px]">Hash</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {isLoading && <tr><td colSpan={7} className="p-4 text-center opacity-60">Loading…</td></tr>}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center opacity-60">No rows match this filter.</td></tr>
              )}
              {rows.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-t border-ink/20 hover:bg-warning/30">
                  <td className="p-2 whitespace-nowrap">{fmtClock(r.at)}</td>
                  <td className="p-2 font-bold">{r.registration ?? "—"}</td>
                  <td className="p-2 text-right">{r.altitude != null ? `${Math.round(r.altitude).toLocaleString()} ft` : "—"}</td>
                  <td className="p-2">
                    {r.county ? (
                      <Link to="/county/$county" params={{ county: countyToSlug(r.county) }} className="underline hover:bg-warning">
                        {r.county}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="p-2 max-w-[28ch] truncate" title={r.description ?? undefined}>{r.violationType ?? "—"}</td>
                  <td className="p-2"><span className={`label-stamp px-2 py-0.5 text-[10px] ${sevClass(r.severity)}`}>{r.severity}</span></td>
                  <td className="p-2 text-xs opacity-70">{r.hashShort ? `${r.hashShort}…` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs opacity-70 mt-3 font-mono">
          Showing up to 200 rows in the table; the CSV contains every row currently matching your filter.
          Severity is assigned by the model, not by us.
        </p>
      </div>
    </section>
  );
}

function Violations() {
  const { data } = useSuspenseQuery(vQO);
  const { data: neon } = useSuspenseQuery(nQO);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Sentinel · Public airspace log</div>
          <h1 className="text-5xl sm:text-7xl mb-4">Every violation, hashed.</h1>
          <p className="max-w-3xl text-sm opacity-80">
            Each row is a flight that crossed a published FAA regulatory floor. Timestamp, location,
            and SHA-256 evidence hash. Nothing redacted. Nothing curated.
          </p>
        </div>
      </section>

      <UndergroundClub />

      <DeadMansCurveTiles />

      <LedgerSection />

      {/* Neon-side fresh violations summary */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">Live regulatory classifications · {neon.totalRows.toLocaleString()} records</div>
          <h2 className="text-3xl sm:text-4xl mb-2">Fresh violations from regulatory engine</h2>
          <p className="text-sm opacity-70 mb-6 max-w-3xl">
            Source: <code>violation_classifications</code> table. Each row is a flight matched against an
            active FAA baseline. Window: {fmtDate(neon.firstSeen)} → {fmtDate(neon.lastSeen)}.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="brutal-border p-4">
              <div className="label-stamp mb-3 text-alert">Rules triggered</div>
              <ul className="space-y-2 font-mono text-sm">
                {neon.ruleCounts.map((r) => (
                  <li key={r.rule} className="flex justify-between border-b border-ink/10 pb-1">
                    <span>{r.rule}</span><span className="font-bold">{r.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="brutal-border p-4">
              <div className="label-stamp mb-3 text-alert">Top operators by violations</div>
              <ol className="space-y-1 font-mono text-xs">
                {neon.topOperators.map((o, i) => (
                  <li key={o.ownerName + i} className="flex justify-between gap-2 border-b border-ink/10 py-1">
                    <span><span className="opacity-50">{(i + 1).toString().padStart(2, "0")}.</span> <span className="font-bold">{o.ownerName}</span>{(o.ownerCity || o.ownerState) && <span className="opacity-60"> · {[o.ownerCity, o.ownerState].filter(Boolean).join(", ")}</span>}</span>
                    <span className="font-bold">{o.count}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">When</th>
                  <th className="text-left p-3 label-stamp">Aircraft</th>
                  <th className="text-left p-3 label-stamp">Owner</th>
                  <th className="text-left p-3 label-stamp">Rule</th>
                  <th className="text-right p-3 label-stamp">Alt (ft)</th>
                  <th className="text-left p-3 label-stamp">Position</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {neon.rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center">No classified violations on record.</td></tr>}
                {neon.rows.map((r, i) => (
                  <tr key={(r.detectionId ?? r.icao) + r.capturedAt + i} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 whitespace-nowrap text-xs">{fmtClock(r.capturedAt)}</td>
                    <td className="p-3"><span className="font-bold">{r.registration || r.icao}</span></td>
                    <td className="p-3 text-xs">{r.ownerName ? <><span className="font-bold">{r.ownerName}</span>{(r.ownerCity || r.ownerState) && <div className="opacity-60">{[r.ownerCity, r.ownerState].filter(Boolean).join(", ")}</div>}</> : <span className="opacity-40">—</span>}</td>
                    <td className="p-3 text-xs"><span className="label-stamp bg-alert text-paper px-2 py-1">{r.rule}</span></td>
                    <td className="p-3 text-right font-bold">{r.altitude ?? "—"}</td>
                    <td className="p-3 text-xs">{r.latitude != null && r.longitude != null ? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">Latest 100 violations</div>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Time</th>
                  <th className="text-left p-3 label-stamp">Aircraft</th>
                  <th className="text-left p-3 label-stamp">Identified owner (FAA registry)</th>
                  <th className="text-left p-3 label-stamp">Type</th>
                  <th className="text-left p-3 label-stamp">Violation</th>
                  <th className="text-left p-3 label-stamp">Severity</th>
                  <th className="text-right p-3 label-stamp">Alt (ft)</th>
                  <th className="text-left p-3 label-stamp">Lat / Lon</th>
                  <th className="text-left p-3 label-stamp">Hash</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.length === 0 && <tr><td colSpan={9} className="p-6 text-center">No violations on record.</td></tr>}
                {data.map((v) => (
                  <tr key={v.id} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 whitespace-nowrap text-xs">{fmtClock(v.timestamp)}</td>
                    <td className="p-3 font-bold">{v.registration || "—"}</td>
                    <td className="p-3 text-xs">
                      {v.identifiedName ? (
                        <>
                          <span className="font-bold">{v.identifiedName}</span>
                          {(v.registrantCity || v.registrantState) && (
                            <div className="opacity-60">{[v.registrantCity, v.registrantState].filter(Boolean).join(", ")}</div>
                          )}
                          {v.registrantType && <div className="opacity-50">{v.registrantType}</div>}
                        </>
                      ) : <span className="opacity-40">—</span>}
                    </td>
                    <td className="p-3 text-xs">{v.aircraftType || "—"}</td>
                    <td className="p-3">{v.violationType}</td>
                    <td className="p-3"><span className={`label-stamp px-2 py-1 ${sevClass(v.severity)}`}>{v.severity || "—"}</span></td>
                    <td className="p-3 text-right">{v.altitude ?? "—"}</td>
                    <td className="p-3 text-xs">{v.latitude != null && v.longitude != null ? `${v.latitude.toFixed(3)}, ${v.longitude.toFixed(3)}` : "—"}</td>
                    <td className="p-3 text-xs opacity-70">{v.hashShort ? v.hashShort + "…" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Source: <code>violation_classifications</code> (quiet-math). Each hash is reproducible from the underlying record.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}