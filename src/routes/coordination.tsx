import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getBehavioralCoordination, type CoordinationRow } from "@/lib/watchtower.functions";
import { CoordinationGraph } from "@/components/coordination-graph";

// Known shell-network families (owner-string match → display label).
// Pure presentation grouping — does NOT change classification logic.
const SHELL_NETWORKS: { label: string; rx: RegExp }[] = [
  { label: "Christiansen Aviation", rx: /christiansen\s+aviation/i },
  { label: "MH Aviation",           rx: /\bmh\s+aviation\b/i },
  { label: "BFL Aviation",          rx: /\bbfl\s+aviation\b/i },
  { label: "Aero Equities",         rx: /aero\s+equities/i },
  { label: "ALF IX",                rx: /\balf\s*ix\b/i },
  { label: "9K Air",                rx: /\b9k\s+air\b/i },
  { label: "Bank of Utah Trustee",  rx: /bank\s+of\s+utah/i },
  { label: "Wells Fargo Trustee",   rx: /wells\s+fargo/i },
];
function shellNetwork(owner: string | null | undefined): string | null {
  if (!owner) return null;
  for (const n of SHELL_NETWORKS) if (n.rx.test(owner)) return n.label;
  return null;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function rowsToCsv(rows: CoordinationRow[]): string {
  const headers = [
    "tail","icao","registry_owner","shell_network","operational_role","classification_basis",
    "coordination_score","altitude_match","county_overlap","hour_overlap","low_orbit",
    "median_altitude_ft","min_altitude_ft","night_pct","darkness_flag","detections",
    "kern_priority","last_seen","legal_theory",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.registration ?? "", r.icao, r.registryOwner ?? "", shellNetwork(r.registryOwner) ?? "",
      r.operationalRole, r.classificationBasis, r.coordinationScore, r.altitudeMatch,
      r.countyOverlap, r.hourOverlap, r.lowOrbit, r.medianAltitude ?? "", r.minAltitude ?? "",
      r.nightPct ?? "", r.darknessFlag, r.detections, r.kernPriority, r.lastSeen, r.legalTheory,
    ].map(esc).join(","));
  }
  return lines.join("\n");
}

const coordQO = queryOptions({
  queryKey: ["behavioral-coordination"],
  queryFn: () => getBehavioralCoordination(),
});

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Coordination" },
];

export const Route = createFileRoute("/coordination")({
  head: () => ({
    meta: [
      { title: "Behavioral Coordination — The Architecture of Never" },
      {
        name: "description",
        content:
          "Operational-role classification of every aircraft: Direct State Patrol, Contractor State Function, Enterprise Auxiliary. Behavior-first, registry-second.",
      },
      { property: "og:title", content: "Behavioral Coordination" },
      {
        property: "og:description",
        content:
          "The sky doesn't read the FAA registry. It records where the metal goes. Operational-role analysis with § 1983 and RICO theory mapping.",
      },
      { property: "og:url", content: "https://flightlogged.lovable.app/coordination" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/coordination" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Behavioral Coordination Index",
          description:
            "Aircraft classified by operational role based on observed telemetry coordination with the government state-actor baseline.",
          url: "https://flightlogged.lovable.app/coordination",
          creator: { "@type": "Organization", name: "The Architecture of Never" },
          isAccessibleForFree: true,
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coordQO),
  component: Coordination,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Index unavailable.</h1>
        <p className="font-mono text-sm mb-6">Coordination data temporarily unavailable.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">
          Retry
        </button>
      </div>
    </div>
  ),
});

function roleClass(role: CoordinationRow["operationalRole"]) {
  switch (role) {
    case "Direct State Patrol":
      return "bg-alert text-paper";
    case "Contractor State Function":
      return "bg-warning text-ink";
    case "Enterprise Auxiliary":
      return "bg-ink text-paper";
    default:
      return "bg-paper text-ink brutal-border";
  }
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`label-stamp px-2 py-0.5 ${on ? "bg-ink text-paper" : "bg-paper text-ink/40 brutal-border"}`}
    >
      {label}
    </span>
  );
}

function Coordination() {
  const { data } = useSuspenseQuery(coordQO);
  const { baseline, rows, countByRole } = data;
  const kernCount = rows.filter((r) => r.kernPriority).length;
  const [minScore, setMinScore] = useState<number>(0);
  const [groupShells, setGroupShells] = useState<boolean>(false);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  const shellNetCount = useMemo(
    () => new Set(rows.map((r) => shellNetwork(r.registryOwner)).filter(Boolean)).size,
    [rows],
  );

  // Group rows by shell network for display when toggle is on
  const tableRows = useMemo(() => {
    if (!groupShells) return rows.map((r) => ({ kind: "row" as const, row: r }));
    type Out = { kind: "row"; row: CoordinationRow } | { kind: "group"; label: string; count: number };
    const out: Out[] = [];
    const buckets = new Map<string, CoordinationRow[]>();
    const ungrouped: CoordinationRow[] = [];
    for (const r of rows) {
      const n = shellNetwork(r.registryOwner);
      if (n) (buckets.get(n) ?? buckets.set(n, []).get(n)!).push(r);
      else ungrouped.push(r);
    }
    const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => b[1].length - a[1].length);
    for (const [label, list] of sortedBuckets) {
      out.push({ kind: "group", label, count: list.length });
      for (const r of list) out.push({ kind: "row", row: r });
    }
    if (ungrouped.length) {
      out.push({ kind: "group", label: "Unaffiliated / not in known network", count: ungrouped.length });
      for (const r of ungrouped) out.push({ kind: "row", row: r });
    }
    return out;
  }, [rows, groupShells]);

  async function downloadCsv() {
    setCsvStatus("hashing…");
    const csv = rowsToCsv(rows);
    const hash = await sha256Hex(csv);
    const stamped =
      `# The Architecture of Never — Behavioral Coordination Index\n` +
      `# Exported: ${new Date().toISOString()}\n` +
      `# Rows: ${rows.length}\n` +
      `# SHA-256 (of CSV body below): ${hash}\n` +
      `# Source: https://advocacywatch.live/coordination\n` +
      csv + "\n";
    const blob = new Blob([stamped], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coordination-network-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setCsvStatus(`sha256: ${hash.slice(0, 12)}…`);
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Operational-role classifier · behavior-first</div>
          <h1 className="text-5xl sm:text-7xl mb-4">The sky doesn't read the registry.</h1>
          <p className="max-w-3xl text-sm opacity-80 mb-6">
            Three buckets. The registry says one thing — the telemetry says another. We classify by
            what the metal actually does: altitude band, county footprint, hour-of-day clustering.
            Coordination with the state-actor baseline = constitutional and statutory exposure.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 brutal-border-thick border-paper">
            {[
              ["Direct State", countByRole["Direct State Patrol"], "bg-alert text-paper"],
              ["Contractor State", countByRole["Contractor State Function"], "bg-warning text-ink"],
              ["Enterprise Auxiliary", countByRole["Enterprise Auxiliary"], "bg-paper text-ink"],
              ["Independent (≥2 signals)", countByRole["Independent"], "bg-ink text-paper"],
            ].map(([l, v, cls], i) => (
              <div
                key={String(l)}
                className={`p-5 ${i < 3 ? "sm:border-r border-paper/30" : ""} ${cls as string}`}
              >
                <div className="label-stamp opacity-70">{l as string}</div>
                <div className="font-mono text-4xl font-bold mt-1">{v as number}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 label-stamp text-warning">
            {kernCount} aircraft prioritized · Kern County hub
          </div>
        </div>
      </section>

      {/* How the buckets are assigned — defendability disclaimer */}
      <section className="border-b-4 border-ink bg-warning/30">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp text-alert mb-2">Read this before you read the table</div>
          <p className="text-xl sm:text-2xl font-bold leading-snug mb-6 max-w-4xl">
            <span className="bg-ink text-warning px-1">{rows.length}</span> aircraft classified.{" "}
            <span className="bg-alert text-paper px-1">{countByRole["Direct State Patrol"]}</span>{" "}
            are direct government.{" "}
            <span className="bg-warning text-ink px-1 brutal-border">{countByRole["Contractor State Function"]}</span>{" "}
            are private entities flying government patrol patterns.{" "}
            <span className="bg-ink text-paper px-1">{countByRole["Enterprise Auxiliary"]}</span>{" "}
            are shell / auxiliary entities coordinated with the state-actor cluster.{" "}
            {shellNetCount > 0 && (
              <>
                <span className="opacity-90">Grouped, those contractors and shells trace back to roughly{" "}
                <span className="bg-ink text-warning px-1">{shellNetCount}</span> known LLC families.</span>
              </>
            )}
          </p>
          <h2 className="text-2xl sm:text-3xl mb-4">How an aircraft lands in a bucket.</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="brutal-border p-4 bg-paper">
              <div className="label-stamp mb-2">Registry alone is not enough</div>
              <p>
                A tail registered to <em>"9K AIR LLC"</em> can still fly KCSO patrol orbits.
                A tail registered to a sheriff's department can fly a charity transport.
                The FAA registry tells you who paid for the metal — not what the metal is doing.
              </p>
            </div>
            <div className="brutal-border p-4 bg-paper">
              <div className="label-stamp mb-2">Behavior is the second axis</div>
              <p>
                We compute a 0–4 coordination score against the state-actor baseline:
                altitude band match, county-footprint overlap ≥ 50%, hour-of-day Jaccard ≥ 0.4,
                median orbit below 1,500 ft. Three+ signals = the metal is acting like a patrol.
              </p>
            </div>
            <div className="brutal-border p-4 bg-paper">
              <div className="label-stamp mb-2">Why you'll see "surprises"</div>
              <p>
                A non-government LLC can appear in <strong>Contractor State Function</strong> when
                behavior matches. A KCSO-flown tail registered to a shell can appear in
                <strong> Enterprise Auxiliary</strong>. That's not a bug — it's the registry
                fiction vs. the telemetry truth. Every row shows its <em>Basis</em> chip.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs font-mono opacity-80 max-w-3xl">
            <strong>Defendability:</strong> bucket assignment is computed from public ADS-B and
            the FAA Aircraft Registry. It is a prosecutor's theory, not a verdict. Every signal
            is reproducible from the raw data. Defense rebuttal is always available.
          </p>
        </div>
      </section>

      {/* Legal framework */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">Legal framework</div>
          <h2 className="text-3xl sm:text-4xl mb-6">Three buckets, three theories.</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="brutal-border p-5">
              <div className="label-stamp bg-alert text-paper inline-block px-2 py-0.5 mb-3">
                Direct State Patrol
              </div>
              <p className="text-sm mb-3">
                <strong>Registry says:</strong> government agency.<br />
                <strong>Telemetry confirms:</strong> government orbit, altitude, timing.
              </p>
              <p className="text-xs opacity-80 font-mono">
                <a href="https://www.law.cornell.edu/uscode/text/42/1983" target="_blank" rel="noopener noreferrer" className="underline">42 U.S.C. § 1983</a>{" "}
                slam dunk. State actor by ownership. No public-function analysis required.
              </p>
            </div>
            <div className="brutal-border p-5 bg-warning/40">
              <div className="label-stamp bg-warning text-ink inline-block px-2 py-0.5 mb-3 brutal-border">
                Contractor State Function
              </div>
              <p className="text-sm mb-3">
                <strong>Registry says:</strong> private aviation LLC.<br />
                <strong>Telemetry proves:</strong> identical orbit, altitude, timing to direct state actor.
              </p>
              <p className="text-xs opacity-80 font-mono">
                <a href="https://www.law.cornell.edu/uscode/text/42/1983" target="_blank" rel="noopener noreferrer" className="underline">§ 1983</a>{" "}
                via public-function test (
                <a href="https://supreme.justia.com/cases/federal/us/326/501/" target="_blank" rel="noopener noreferrer" className="underline">Marsh v. Alabama, 326 U.S. 501 (1946)</a>
                ). A private entity performing a traditional government function — aerial law enforcement patrol — is a state actor.
              </p>
            </div>
            <div className="brutal-border p-5 bg-ink text-paper">
              <div className="label-stamp bg-paper text-ink inline-block px-2 py-0.5 mb-3">
                Enterprise Auxiliary
              </div>
              <p className="text-sm mb-3">
                <strong>Registry says:</strong> shell LLC / holding entity.<br />
                <strong>Telemetry proves:</strong> coordinated with state-actor cluster.
              </p>
              <p className="text-xs opacity-80 font-mono">
                RICO predicate signal.{" "}
                <a href="https://www.law.cornell.edu/uscode/text/18/1962" target="_blank" rel="noopener noreferrer" className="underline text-paper">18 U.S.C. § 1962(c)</a>
                {" "}— "association in fact" per{" "}
                <a href="https://www.law.cornell.edu/uscode/text/18/1961" target="_blank" rel="noopener noreferrer" className="underline text-paper">§ 1961(4)</a>.
                Pattern of coordinated conduct = enterprise.
              </p>
            </div>
          </div>
          <p className="mt-6 text-xs font-mono opacity-70 max-w-3xl">
            Classification is computed from public telemetry — not legal conclusion. Bucket assignment
            is the prosecutor's theory, not the verdict. Defense always available.
          </p>
        </div>
      </section>

      {/* Baseline */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">State-actor baseline</div>
          <h2 className="text-3xl sm:text-4xl mb-2">What "government behavior" looks like.</h2>
          <p className="text-sm opacity-70 max-w-3xl mb-6">
            Computed from {baseline.aircraft.length} aircraft whose FAA registry owner is a
            government entity (sheriff, police, fire, county, federal). Every other aircraft is
            scored against this signature.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="brutal-border p-4">
              <div className="label-stamp mb-2">Median altitude band</div>
              <div className="font-mono text-2xl font-bold">
                {baseline.medianBand
                  ? `${baseline.medianBand.lo.toLocaleString()} – ${baseline.medianBand.hi.toLocaleString()} ft`
                  : "—"}
              </div>
              <p className="text-xs opacity-60 mt-2">±200 ft buffer applied. Match = altitude signal.</p>
            </div>
            <div className="brutal-border p-4">
              <div className="label-stamp mb-2">Counties patrolled</div>
              <div className="font-mono text-xs leading-relaxed">
                {baseline.counties.length > 0 ? baseline.counties.join(" · ") : "—"}
              </div>
              <p className="text-xs opacity-60 mt-2">Overlap ≥ 50% of candidate's counties = signal.</p>
            </div>
            <div className="brutal-border p-4">
              <div className="label-stamp mb-2">Hour-of-day windows</div>
              <div className="font-mono text-xs leading-relaxed">
                {baseline.hours.length > 0
                  ? baseline.hours.map((h) => String(h).padStart(2, "0")).join(" · ")
                  : "—"}
              </div>
              <p className="text-xs opacity-60 mt-2">Jaccard overlap ≥ 0.4 = temporal signal.</p>
            </div>
          </div>
          {baseline.aircraft.length > 0 && (
            <div className="mt-6">
              <div className="label-stamp mb-2">Reference aircraft</div>
              <div className="flex flex-wrap gap-2 font-mono text-xs">
                {baseline.aircraft.slice(0, 20).map((a) => (
                  <span key={a.icao} className="brutal-border px-2 py-1 bg-alert/10">
                    <strong>{a.registration || a.icao}</strong>
                    {a.owner && <span className="opacity-60"> · {a.owner}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* NETWORK GRAPH */}
      <section className="border-b-4 border-ink bg-ink/5">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">Visual proof · Coordination network</div>
          <h2 className="text-3xl sm:text-4xl mb-2">The picture the registry doesn't show you.</h2>
          <p className="text-sm opacity-70 max-w-3xl mb-6">
            Every dot is an aircraft. Distance to center is how closely its telemetry matches the
            state-actor baseline (closer = tighter coordination). Color is the operational-role
            bucket. Size is total detections in the current window. Hover any node for the tail's
            registry owner and signals.
          </p>
          <CoordinationGraph rows={rows} />
        </div>
      </section>

      {/* The table */}
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-alert mb-2">
            Operators classified by behavior · {rows.length} aircraft · Kern-priority sort active
          </div>
          <h2 className="text-3xl sm:text-4xl mb-6">Tail-by-tail.</h2>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Tail</th>
                  <th className="text-left p-3 label-stamp">Registry owner</th>
                  <th className="text-left p-3 label-stamp">Operational role</th>
                  <th className="text-left p-3 label-stamp">Basis</th>
                  <th className="text-left p-3 label-stamp">Coordination signals</th>
                  <th className="text-right p-3 label-stamp">Score</th>
                  <th className="text-right p-3 label-stamp">Median alt</th>
                  <th className="text-right p-3 label-stamp">Detections</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center">
                      No coordinating aircraft on record yet.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.icao}
                    className={`border-t border-ink/20 hover:bg-warning/30 align-top ${r.kernPriority ? "bg-alert/5" : ""}`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-base flex items-center gap-2">
                        {r.registration || r.icao}
                        {r.kernPriority && (
                          <span className="label-stamp bg-alert text-paper px-1.5 py-0.5 text-[9px]">
                            KERN
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-50">{r.icao}</div>
                    </td>
                    <td className="p-3 text-xs max-w-xs">
                      <div className="font-bold">{r.registryOwner || "—"}</div>
                      {(r.city || r.state) && (
                        <div className="opacity-60">{[r.city, r.state].filter(Boolean).join(", ")}</div>
                      )}
                      {r.registrantType && <div className="opacity-50">{r.registrantType}</div>}
                    </td>
                    <td className="p-3">
                      <span className={`label-stamp inline-block px-2 py-1 ${roleClass(r.operationalRole)}`}>
                        {r.operationalRole}
                      </span>
                      <p className="text-[10px] opacity-70 mt-2 max-w-[240px] leading-snug font-sans">
                        {r.legalTheory}
                      </p>
                    </td>
                    <td className="p-3 text-[10px] align-top">
                      <span
                        className={`label-stamp inline-block px-2 py-1 ${
                          r.classificationBasis === "Registry + Behavior"
                            ? "bg-alert text-paper"
                            : r.classificationBasis === "Registry"
                              ? "bg-ink text-paper"
                              : "bg-warning text-ink"
                        }`}
                      >
                        {r.classificationBasis}
                      </span>
                      {r.classificationBasis === "Behavior" && (
                        <p className="mt-1 opacity-70 font-sans leading-snug max-w-[160px]">
                          Registry doesn't say state actor; telemetry does.
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1 text-[10px]">
                        <Pill on={r.altitudeMatch} label="ALT MATCH" />
                        <Pill on={r.countyOverlap >= 0.5} label={`COUNTY ${Math.round(r.countyOverlap * 100)}%`} />
                        <Pill on={r.hourOverlap >= 0.4} label={`HOUR ${Math.round(r.hourOverlap * 100)}%`} />
                        <Pill on={r.lowOrbit} label="LOW ORBIT" />
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-bold text-2xl">{r.coordinationScore}</div>
                      <div className="text-[10px] opacity-50">/ 4</div>
                    </td>
                    <td className="p-3 text-right">
                      {r.medianAltitude != null ? `${Math.round(r.medianAltitude).toLocaleString()} ft` : "—"}
                      {r.minAltitude != null && (
                        <div className="text-[10px] opacity-50">min {Math.round(r.minAltitude)} ft</div>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold">{r.detections.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs opacity-70 font-mono max-w-3xl">
            Score = sum of four binary signals: altitude band match, county overlap ≥ 50%, hour-of-day
            Jaccard ≥ 0.4, median orbit below 1,500 ft. Kern-priority sort lifts aircraft seen in
            Kern County or registered to Kern/Bakersfield/KCSO/KCSI entities to the top of each
            bucket — it is a sort weight, not a filter. Computed from{" "}
            <Link to="/methodology" className="underline">public ADS-B and FAA registry data</Link>.
            Coordination ≠ conspiracy. Coordination = the precondition for one.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/operators" className="brutal-border px-4 py-2 label-stamp hover:bg-warning">
              Operators directory →
            </Link>
            <Link to="/legal" className="brutal-border px-4 py-2 label-stamp hover:bg-warning">
              § 1983 + RICO framework →
            </Link>
            <Link to="/violations" className="brutal-border px-4 py-2 label-stamp hover:bg-warning">
              Violations log →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}