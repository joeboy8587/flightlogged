import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getSnapshot, getRecentLowAltitude, getRepeatOffenders, getIdentifiedOperators, getLocalAgencyAircraft, getKernAlerts } from "@/lib/watchtower.functions";
import { ShareRow } from "@/components/share-row";
import { fmtPct, DISPLAY_TZ } from "@/lib/format";
import { StoryCard } from "@/components/story-card";

const snapQO = queryOptions({ queryKey: ["snapshot"], queryFn: () => getSnapshot(), refetchInterval: 30000 });
const lowAltQO = queryOptions({ queryKey: ["low-alt"], queryFn: () => getRecentLowAltitude(), refetchInterval: 30000 });
const repeatQO = queryOptions({ queryKey: ["repeat"], queryFn: () => getRepeatOffenders() });
const idQO = queryOptions({ queryKey: ["identified"], queryFn: () => getIdentifiedOperators() });
const localQO = queryOptions({ queryKey: ["local-agencies"], queryFn: () => getLocalAgencyAircraft() });
const kernQO = queryOptions({ queryKey: ["kern-alerts"], queryFn: () => getKernAlerts(), refetchInterval: 60000 });

const crumbs = [{ label: "Home", href: "/" }, { label: "Live Feed" }];

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
    { title: "Live Feed — The Architecture of Never" },
    { name: "description", content: "Watchtower 2.0 live airspace feed. Every detection, every aircraft, every hour." },
    { property: "og:title", content: "Live Watchtower Feed" },
    { property: "og:description", content: "Real-time civilian airspace surveillance, math-chosen, court-ready." },
    { property: "og:url", content: "https://flightlogged.lovable.app/live" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/live" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(snapQO),
    context.queryClient.ensureQueryData(lowAltQO),
    context.queryClient.ensureQueryData(repeatQO),
    context.queryClient.ensureQueryData(idQO),
    context.queryClient.ensureQueryData(localQO),
    context.queryClient.ensureQueryData(kernQO),
  ]),
  component: Live,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Feed unreachable.</h1>
        <p className="font-mono text-sm mb-6">Live data temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function fmt(n: number | null) { return n == null ? "—" : n.toLocaleString(); }
function fmtTime(iso: string) { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: DISPLAY_TZ, timeZoneName: "short" }); }
function altClass(alt: number | null) {
  if (alt == null) return "";
  if (alt < 500) return "bg-alert text-paper";
  if (alt < 1000) return "bg-warning text-ink";
  return "";
}

function Live() {
  const { data: s } = useSuspenseQuery(snapQO);
  const { data: low } = useSuspenseQuery(lowAltQO);
  const { data: repeat } = useSuspenseQuery(repeatQO);
  const { data: identified } = useSuspenseQuery(idQO);
  const { data: local } = useSuspenseQuery(localQO);
  const { data: kern } = useSuspenseQuery(kernQO);

  const anomalyPct = s.totalDetections > 0 ? Math.round((s.anomalyEvents / s.totalDetections) * 1000) / 10 : 0;

  // County filter — multi-county, non-biased default ("all").
  const [county, setCounty] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const countyOptions = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of low) {
      const key = (r.county || "OTHER").toUpperCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    // Stable order with primary AOI counties first.
    const primary = ["KERN", "KINGS", "TULARE", "FRESNO", "SAN BERNARDINO"];
    const rest = [...seen.keys()].filter((k) => !primary.includes(k)).sort();
    return [...primary.filter((k) => seen.has(k)), ...rest].map((k) => ({
      key: k,
      label: k.charAt(0) + k.slice(1).toLowerCase(),
      count: seen.get(k) ?? 0,
    }));
  }, [low]);

  const matchesCounty = (c: string | null | undefined) => {
    if (county === "all") return true;
    return (c || "OTHER").toUpperCase() === county;
  };

  const lowFiltered = useMemo(() => low.filter((r) => matchesCounty(r.county)), [low, county]);
  // Top 5 plain-English stories — most recent low-altitude detections in the selected county.
  const stories = lowFiltered.slice(0, 5);
  const showKernAlerts = county === "all" || county === "KERN";
  const showLocalAgencies = county === "all" || county === "KERN";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      {/* KERN COUNTY ALERTS — surfaced above LA-volume noise */}
      {showKernAlerts && kern.length > 0 && (
        <section className="border-b-4 border-ink bg-alert text-paper">
          <div className="max-w-[1400px] mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <div className="label-stamp bg-paper text-ink inline-block px-2 py-0.5 mb-2">Kern County · last 24h · scored against Kern's own baseline</div>
                <h2 className="text-3xl sm:text-4xl">Kern County low-altitude alerts</h2>
              </div>
              <Link to="/threat-index" search={{ county: "kern" }} className="label-stamp brutal-border bg-paper text-ink px-3 py-2 hover:bg-warning whitespace-nowrap">
                Kern-only Threat Index →
              </Link>
            </div>
            <div className="overflow-x-auto brutal-border-thick border-paper">
              <table className="w-full text-sm">
                <thead className="bg-ink text-paper">
                  <tr>
                    <th className="text-left p-3 label-stamp">When</th>
                    <th className="text-left p-3 label-stamp">Aircraft</th>
                    <th className="text-left p-3 label-stamp">Owner</th>
                    <th className="text-right p-3 label-stamp">Altitude</th>
                    <th className="text-right p-3 label-stamp">Kern z</th>
                    <th className="text-left p-3 label-stamp">County</th>
                  </tr>
                </thead>
                <tbody className="font-mono bg-paper text-ink">
                  {kern.map((r) => (
                    <tr key={r.icao + r.capturedAt} className="border-t border-ink/20">
                      <td className="p-3 whitespace-nowrap">{fmtTime(r.capturedAt)}</td>
                      <td className="p-3"><span className="font-bold">{r.registration || r.icao}</span>{r.model && <div className="text-xs opacity-60">{r.model}</div>}</td>
                      <td className="p-3 text-xs">{r.owner || "—"}</td>
                      <td className={`p-3 text-right font-bold ${altClass(r.altitude)}`}>{fmt(r.altitude)} ft</td>
                      <td className="p-3 text-right">{r.kernZ != null ? r.kernZ.toFixed(1) : "—"}</td>
                      <td className="p-3 text-xs">{r.county || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] font-mono opacity-90">
              <strong>Kern z</strong> = standard deviations below Kern's own 48h median altitude. Higher = more anomalous for this airspace.
            </p>
          </div>
        </section>
      )}

      {/* STICKY RIGHTS STRIP — legal frame stays visible while scrolling the feed */}
      <div className="sticky top-0 z-30 bg-ink text-paper border-b-4 border-warning">
        <div className="max-w-[1400px] mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
          <span className="label-stamp bg-warning text-ink px-2 py-0.5">YOUR RIGHTS</span>
          <span><strong>4A:</strong> Patterned overflight is search by proxy.</span>
          <span className="opacity-30">·</span>
          <span><strong>1A:</strong> ADS-B is public broadcast — documenting is protected.</span>
          <span className="opacity-30">·</span>
          <a href="/legal" className="underline hover:text-warning">Constitutional framework →</a>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY BANNER — frames what a first-time visitor is seeing */}
      <section className="border-b-4 border-ink bg-warning text-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-6 grid lg:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <div className="label-stamp bg-ink text-paper inline-block px-2 py-0.5 mb-2">What you're looking at</div>
            <p className="text-sm sm:text-base font-medium leading-relaxed max-w-4xl">
              An autonomous monitoring system has tracked <strong>{fmt(s.uniqueAircraft)}</strong> unique aircraft
              over <strong>{s.windowHours}h</strong> in Kern County and surrounding airspace.{" "}
              <strong>{anomalyPct}%</strong> of detections triggered anomaly flags — persistent low-altitude loitering,
              masked identities, and night operations inconsistent with normal traffic. Shell companies, law
              enforcement helicopters, and military aircraft appear in coordinated patterns. The FAA has been
              formally notified. <strong>This is the evidence.</strong>
            </p>
          </div>
          <Link to="/methodology" className="label-stamp brutal-border bg-paper px-4 py-2 hover:bg-ink hover:text-paper whitespace-nowrap shrink-0">
            How this works →
          </Link>
        </div>
      </section>

      {/* STORY STRIP — what the machine saw, translated */}
      {stories.length > 0 && (
        <section className="border-b-4 border-ink bg-paper">
          <div className="max-w-[1400px] mx-auto px-4 py-12">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
              <div>
                <div className="label-stamp bg-alert text-paper inline-block px-2 py-0.5 mb-2">Latest events · in plain English</div>
                <h2 className="text-3xl sm:text-4xl">The five most recent things the sky did.</h2>
              </div>
              <a href="#raw-feed" className="label-stamp brutal-border bg-ink text-paper px-3 py-2 hover:bg-warning hover:text-ink">
                Jump to raw feed ↓
              </a>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stories.map((row) => (
                <StoryCard key={row.icao + row.capturedAt} row={row} />
              ))}
            </div>
            <p className="mt-3 text-xs font-mono opacity-70">
              Each card translates one row from the raw feed below. No editorializing — every claim links
              back to the hashed detection record. Verify any of them.
            </p>
          </div>
        </section>
      )}

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-alert blink" /> LIVE · Refresh every 30s</div>
          <h1 className="text-5xl sm:text-7xl mb-6">Watchtower 2.0 — Live.</h1>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 brutal-border-thick border-paper">
            {[
              ["Detections", fmt(s.totalDetections)],
              ["Unique aircraft", fmt(s.uniqueAircraft)],
              ["Observation window", `${s.windowHours}h`],
              ["Anomaly events", fmt(s.anomalyEvents), true],
            ].map(([label, val, alert], i) => (
              <div key={String(label)} className={`p-5 ${i < 3 ? "sm:border-r border-paper/30" : ""} ${alert ? "bg-warning text-ink" : ""}`}>
                <div className="label-stamp opacity-70">{label}</div>
                <div className="font-mono text-3xl font-bold mt-1">{val}</div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-0 brutal-border-thick border-paper border-t-0 -mt-[4px]">
            {[
              ["Court-ready flight detections", fmt(s.flightDetections)],
              ["Unified evidence events", fmt(s.unifiedEvents)],
            ].map(([label, val], i) => (
              <div key={String(label)} className={`p-5 ${i < 1 ? "sm:border-r border-paper/30" : ""}`}>
                <div className="label-stamp opacity-70">{label}</div>
                <div className="font-mono text-3xl font-bold mt-1">{val}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm opacity-80">
            <strong className="text-warning">0% flagged during baseline — by design.</strong> The system observes
            for 48 hours to learn what normal looks like before it identifies abnormal. After baseline, math chooses.
          </p>
        </div>
      </section>

      {/* LOW ALTITUDE */}
      <section id="raw-feed" className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="label-stamp text-alert mb-2">Below 1,500 ft · Not on ground</div>
              <h2 className="text-4xl sm:text-5xl">Recent low-altitude detections</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor="county-filter" className="label-stamp">County:</label>
              <select
                id="county-filter"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="brutal-border bg-paper px-3 py-2 font-mono text-sm cursor-pointer hover:bg-warning"
              >
                <option value="all">All counties ({low.length})</option>
                {countyOptions.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label} ({c.count})
                  </option>
                ))}
              </select>
              <Link to="/methodology" className="label-stamp brutal-border px-3 py-2 hover:bg-warning">What counts as low? →</Link>
            </div>
          </div>
          <p className="mb-4 text-xs font-mono opacity-70">
            Multi-county coverage. Filter is applied to the low-altitude table and the plain-English story strip above.
            Kern-only sections (alerts, local agencies) hide automatically when another county is selected.
          </p>

          {/* Constitutional banner */}
          <div className="brutal-border-thick bg-ink text-paper p-5 mb-6">
            <div className="label-stamp text-warning mb-2">Your rights in this airspace</div>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-bold mb-1">Fourth Amendment</div>
                <p className="opacity-80">Patterned low-altitude overflights that enable visual or electronic intrusion are not "plain view" — they are search by aerial proxy.</p>
              </div>
              <div>
                <div className="font-bold mb-1">First Amendment</div>
                <p className="opacity-80">ADS-B is unencrypted public broadcast. FAA registry is public record. Documenting and publishing is protected speech.</p>
              </div>
              <div>
                <div className="font-bold mb-1">What we log</div>
                <p className="opacity-80">Altitude deviations, patterned overflights, and operator identity — exactly as received, hashed for chain of custody.</p>
              </div>
            </div>
          </div>

          {/* Reader explainers */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 text-xs">
            <div className="brutal-border p-3 bg-paper">
              <div className="label-stamp mb-1">What counts as low?</div>
              <p>Below 1,500 ft AGL, excluding aircraft on the ground. Altitudes from ADS-B barometric pressure; ±50–100 ft from true AGL depending on terrain.</p>
            </div>
            <div className="brutal-border p-3 bg-paper">
              <div className="label-stamp mb-1">Rule column</div>
              <p><span className="font-bold">Pattern Surveillance Indicator</span> — deviation from 48-hour baseline; flags for review, no allegation. <span className="font-bold">Stalking Statute + FAR 91.119</span> — below FAA minimum safe altitude over populated area.</p>
            </div>
            <div className="brutal-border p-3 bg-paper">
              <div className="label-stamp mb-1">Unidentified / Masked</div>
              <p>Hex codes with no N-number or owner are not in the public FAA registry. Possible causes: military, blocked registration, international aircraft, transponder anomaly. Logged as received.</p>
            </div>
            <div className="brutal-border p-3 bg-paper">
              <div className="label-stamp mb-1">County: OTHER</div>
              <p>GPS coordinates outside our primary 4-county zone (Kern, Kings, Tulare, Fresno) or within transition airspace between counties.</p>
            </div>
            <div className="brutal-border p-3 bg-paper">
              <div className="label-stamp mb-1">Altitude reads "0" or negative</div>
              <p>
                <strong>0 ft with on-ground = true</strong> means the aircraft just <em>landed</em> (taxi/ramp).
                A reading <strong>below −100 ft while airborne</strong> is a transponder/barometric{" "}
                <strong>anomaly or spoof</strong> — we suppress those from this feed and surface them on{" "}
                <Link to="/ml-detections" className="underline">ML detections</Link>.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">When</th>
                  <th className="text-left p-3 label-stamp">Aircraft</th>
                  <th className="text-left p-3 label-stamp">Identified owner (FAA registry)</th>
                  <th className="text-right p-3 label-stamp">Altitude</th>
                  <th className="text-left p-3 label-stamp">Rule</th>
                  <th className="text-right p-3 label-stamp">Speed</th>
                  <th className="text-left p-3 label-stamp">County</th>
                  <th className="text-left p-3 label-stamp">Share</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {lowFiltered.length === 0 && <tr><td colSpan={8} className="p-6 text-center">No low-altitude activity in this county for the current window.</td></tr>}
                {lowFiltered.map((r) => {
                  const key = r.icao + r.capturedAt;
                  const isOpen = expanded === key;
                  return (
                  <Fragment key={key}>
                  <tr className="border-t border-ink/20 hover:bg-warning/30 cursor-pointer" onClick={() => setExpanded(isOpen ? null : key)}>
                    <td className="p-3 whitespace-nowrap">{fmtTime(r.capturedAt)}</td>
                    <td className="p-3">
                      <span className="font-bold">{r.registration || r.icao}</span>
                      {r.model && <div className="text-xs opacity-60">{r.model}</div>}
                      <div className="text-[10px] font-mono opacity-60 mt-0.5">{isOpen ? "▼ hide translation" : "▶ show translation"}</div>
                    </td>
                    <td className="p-3 text-xs">
                      {r.identifiedName ? (
                        <>
                          <span className="font-bold">{r.identifiedName}</span>
                          {(r.registrantCity || r.registrantState) && (
                            <div className="opacity-60">{[r.registrantCity, r.registrantState].filter(Boolean).join(", ")}</div>
                          )}
                          {r.isShellLikely && <div className="mt-1"><span className="label-stamp bg-alert text-paper px-1.5 py-0.5">SHELL-LIKELY</span></div>}
                        </>
                      ) : r.owner ? <span className="opacity-70">{r.owner}</span> : "—"}
                    </td>
                    <td className={`p-3 text-right font-bold ${altClass(r.altitude)}`}>{fmt(r.altitude)} ft</td>
                    <td className="p-3 text-xs">
                      {r.violationSource ? (
                        <Link to="/rules" onClick={(e) => e.stopPropagation()} className="inline-block bg-alert text-paper px-2 py-1 label-stamp hover:bg-ink">
                          {r.violationSource}
                        </Link>
                      ) : <span className="opacity-40">—</span>}
                    </td>
                    <td className="p-3 text-right">{r.speed ? Math.round(r.speed) + " kts" : "—"}</td>
                    <td className="p-3 text-xs">{r.county || "—"}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <ShareRow
                        text={`${r.identifiedName || r.owner || "Unidentified operator"} — ${r.registration || r.icao} at ${fmt(r.altitude)} ft over ${r.county || "Kern County area"} on ${fmtTime(r.capturedAt)}.${r.violationSource ? ` Flagged: ${r.violationSource}.` : ""} Source: Watchtower / The Architecture of Never — https://advocacywatch.live/live`}
                      />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-ink/20 bg-ink/5">
                      <td colSpan={8} className="p-5">
                        <div className="brutal-border bg-paper p-4">
                          <div className="label-stamp bg-ink text-paper inline-block px-2 py-0.5 mb-3">Translation · public record only · ML scoring untouched</div>
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="label-stamp opacity-60 mb-1">Who owns this aircraft</div>
                              <p>
                                <strong>{r.identifiedName || r.owner || "Unidentified"}</strong>
                                {r.registrantCity || r.registrantState ? <> — registered in {[r.registrantCity, r.registrantState].filter(Boolean).join(", ")}.</> : "."}
                                {r.registrantType && <> Registrant type: <span className="font-mono">{r.registrantType}</span>.</>}
                              </p>
                              {r.shellReason && (
                                <p className="mt-2 text-xs"><span className="label-stamp bg-alert text-paper px-1.5 py-0.5 mr-1">SHELL-LIKELY</span>{r.shellReason} No FAA Part 135 operating certificate is listed in the public registry for this entity.</p>
                              )}
                              {r.tacticalRole && (
                                <p className="mt-2 text-xs">Observed tactical role: <strong>{r.tacticalRole}</strong>.</p>
                              )}
                            </div>
                            <div>
                              <div className="label-stamp opacity-60 mb-1">What the system has logged on this tail</div>
                              <ul className="text-xs space-y-1">
                                <li><strong>{r.totalDetections != null ? r.totalDetections.toLocaleString() : "—"}</strong> total detections logged by Watchtower for this aircraft.</li>
                                {r.regViolationCount != null && r.regViolationCount > 0 && (
                                  <li><strong>{r.regViolationCount}</strong> prior registry-integrity flag{r.regViolationCount === 1 ? "" : "s"} recorded.</li>
                                )}
                                {r.coordPartners.length > 0 && (
                                  <li>
                                    Confirmed coordination partners ({r.coordPartners.length}):{" "}
                                    <span className="font-mono">{r.coordPartners.slice(0, 5).join(", ")}{r.coordPartners.length > 5 ? "…" : ""}</span>
                                  </li>
                                )}
                                {r.coordPartners.length === 0 && (
                                  <li className="opacity-60">No coordination partners on record.</li>
                                )}
                              </ul>
                            </div>
                          </div>
                          {r.violationSource && (
                            <div className="mt-4 brutal-border bg-warning/40 p-3 text-xs">
                              <strong>Legal context.</strong> This detection at <strong>{fmt(r.altitude)} ft</strong> sits below the floor cited by <strong>{r.violationSource}</strong>
                              {r.violationRule ? <> ({r.violationRule})</> : null}. The rule is reproduced verbatim on <Link to="/rules" className="underline">/rules</Link>. This is a math-flagged comparison against the published floor, not an allegation.
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <Link to="/tail-search" search={{ tail: r.registration || r.icao }} className="label-stamp brutal-border px-2 py-1 hover:bg-warning">View tail profile →</Link>
                            <Link to="/coordination" className="label-stamp brutal-border px-2 py-1 hover:bg-warning">Coordination network →</Link>
                            <Link to="/methodology" className="label-stamp brutal-border px-2 py-1 hover:bg-warning">How scoring works →</Link>
                          </div>
                          <p className="mt-3 text-[10px] font-mono opacity-60">Sources: FAA Aircraft Registry · state business filings · Watchtower detection history. The ML's z-score and anomaly flag are unmodified — this panel adds public-record context only.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            Identification cross-referenced against the public FAA Aircraft Registry ({fmt(identified.length)}+ matched operators). Rule column matches active baselines in <Link to="/rules" className="underline">/rules</Link>.
          </p>
        </div>
      </section>

      {/* IDENTIFIED OPERATORS */}
      <section className="border-b-4 border-ink bg-ink/5">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          {/* Coverage disclosure */}
          <div className="brutal-border p-4 mb-6 bg-warning/40">
            <div className="label-stamp mb-1">Sensor coverage disclosure</div>
            <p className="text-xs">
              Our ADS-B receivers cover lat 34.0–37.5 / lon −120.5 to −116.5 — roughly LA basin north
              through the Central Valley. Aircraft detected at latitudes below ~35° (e.g. LAPD Air
              Support over Los Angeles) appear in our feed but are <strong>not</strong> operating in
              Kern/Kings/Tulare/Fresno. Those rows are tagged county <code>OTHER</code>.
            </p>
          </div>

          <div className="label-stamp text-ink bg-paper inline-block px-2 py-1 mb-2 brutal-border">FAA Registry · Public record</div>
          <h2 className="text-4xl sm:text-5xl mb-2">Identified operators in this airspace</h2>
          <p className="text-sm opacity-70 mb-6 max-w-3xl">Mode-S hex matched against the FAA Aircraft Registry. All data is public-source and independently verifiable.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {identified.map((o) => (
              <div key={o.icao} className="brutal-border p-4 bg-paper">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg">{o.registration || o.icao}</span>
                  <span className="font-mono text-xl font-bold">{o.detections}</span>
                </div>
                <div className="text-xs font-bold mt-1">{o.name}</div>
                <div className="text-xs opacity-60 font-mono">{[o.city, o.state].filter(Boolean).join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCAL AGENCY AIRCRAFT (Kern County) */}
      {showLocalAgencies && local.length > 0 && (
        <section className="border-b-4 border-ink bg-alert/10">
          <div className="max-w-[1400px] mx-auto px-4 py-16">
            <div className="label-stamp text-paper bg-alert inline-block px-2 py-1 mb-2">Local government aircraft · Kern County</div>
            <h2 className="text-4xl sm:text-5xl mb-2">Aircraft operating like local government in Kern County</h2>
            <p className="text-sm opacity-70 mb-4 max-w-3xl">
              Two kinds of aircraft appear in this table: (1) tails whose <strong>FAA registry owner</strong>
              is a Kern County government agency (sheriff, fire, county), and (2) tails registered to
              Bakersfield-based private LLCs whose <strong>flight behavior matches</strong> the government
              baseline — same altitude band, same county footprint, same hour-of-day pattern.
            </p>

            {/* Defendability disclosure — shell vs. government */}
            <div className="brutal-border-thick bg-ink text-paper p-5 mb-6">
              <div className="label-stamp text-warning mb-2">Read this before you read the table</div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-bold mb-1">A shell LLC in this list is not "government"</div>
                  <p className="opacity-80">
                    Entries like <em>BFL AVIATION LLC</em>, <em>BEST EQUIPMENT LEASING LLC</em>,
                    <em> JERK ASSETS LLC</em>, or <em>KCSI AERIAL PATROL INC</em> are <strong>private
                    registrations</strong>. The FAA registry does not call them government. We list
                    them here because their <strong>telemetry behaves like</strong> the sheriff/fire baseline.
                  </p>
                </div>
                <div>
                  <div className="font-bold mb-1">Why they're surfaced</div>
                  <p className="opacity-80">
                    Patrol orbits cluster at 300–700 ft over Kern County during the same daylight
                    windows as KCSO and Kern County Fire. When a private tail flies that same signature
                    repeatedly, it is — at minimum — operating <em>like</em> a state actor. Public-function
                    test (Marsh v. Alabama) is the legal hook, not a verdict.
                  </p>
                </div>
                <div>
                  <div className="font-bold mb-1">How to tell which is which</div>
                  <p className="opacity-80">
                    The <strong>Registered owner</strong> column is the FAA registry name verbatim.
                    "KERN COUNTY SHERIFFS OFFICE" and "KERN COUNTY FIRE DEPARTMENT" are confirmed
                    government. Everything else is a private entity flying a government-shaped
                    pattern — see <Link to="/coordination" className="underline">Coordination</Link> for the per-tail score.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs font-mono opacity-70">
                Bucket assignment = registry data + observed behavior. Defense rebuttal always
                available. Coordination ≠ conspiracy.
              </p>
            </div>

            <p className="text-xs opacity-70 mb-6 max-w-3xl font-mono">
              All tails on this list — government or private — should be subject to public
              accountability under the California Public Records Act and federal FOIA when
              performing patrol functions over a populated county.
            </p>
            <div className="overflow-x-auto brutal-border-thick">
              <table className="w-full text-sm">
                <thead className="bg-ink text-paper">
                  <tr>
                    <th className="text-left p-3 label-stamp">Aircraft</th>
                    <th className="text-left p-3 label-stamp">Registered owner</th>
                    <th className="text-right p-3 label-stamp">Detections</th>
                    <th className="text-right p-3 label-stamp">Min alt</th>
                    <th className="text-right p-3 label-stamp">Avg alt</th>
                    <th className="text-left p-3 label-stamp">Counties seen</th>
                    <th className="text-left p-3 label-stamp">Last seen</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {local.map((a) => (
                    <tr key={a.icao} className="border-t border-ink/20 hover:bg-warning/30">
                      <td className="p-3"><span className="font-bold">{a.registration || a.icao}</span><div className="text-xs opacity-50">{a.icao}</div></td>
                      <td className="p-3 text-xs"><span className="font-bold">{a.agency}</span><div className="opacity-60">{[a.city, a.state].filter(Boolean).join(", ")}</div></td>
                      <td className="p-3 text-right font-bold">{fmt(a.detections)}</td>
                      <td className={`p-3 text-right ${altClass(a.minAltitude)}`}>{a.minAltitude == null ? "—" : `${fmt(a.minAltitude)} ft`}</td>
                      <td className="p-3 text-right">{a.avgAltitude == null ? "—" : `${fmt(a.avgAltitude)} ft`}</td>
                      <td className="p-3 text-xs">{a.counties || "—"}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{fmtTime(a.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* REPEAT OFFENDERS */}
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp text-ink bg-warning inline-block px-2 py-1 mb-2">≥ 20 detections</div>
          <h2 className="text-4xl sm:text-5xl mb-6">Top repeat aircraft in the airspace</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repeat.map((r) => (
              <div key={r.icao} className="brutal-border p-5 bg-paper hover:brutal-shadow transition-all">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="font-display text-xl">{r.registration || r.icao}</span>
                  <span className="font-mono text-2xl font-bold">{r.totalDetections}</span>
                </div>
                {r.identifiedName ? (
                  <div className="mb-1">
                    <div className="text-xs font-bold">{r.identifiedName}</div>
                    {(r.registrantCity || r.registrantState) && (
                      <div className="text-xs opacity-60 font-mono">{[r.registrantCity, r.registrantState].filter(Boolean).join(", ")} · FAA registry</div>
                    )}
                  </div>
                ) : r.owner ? <div className="text-xs opacity-70 mb-1">{r.owner}</div> : null}
                {r.model && <div className="text-xs opacity-50 mb-3">{r.model}</div>}
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div>
                    <div className="opacity-60 label-stamp">MIN ALT</div>
                    <div className="font-bold">{r.minAltitude == null ? "—" : `${fmt(r.minAltitude)} ft`}</div>
                  </div>
                  <div><div className="opacity-60 label-stamp">AVG ALT</div><div className="font-bold">{r.avgAltitude ? Math.round(r.avgAltitude) : "—"} ft</div></div>
                  <div><div className="opacity-60 label-stamp">NIGHT</div><div className="font-bold">{fmtPct(r.nightPct)}</div></div>
                </div>
                {r.transponderAnomaly && (
                  <div className="mt-2 text-[10px] font-mono label-stamp bg-warning text-ink inline-block px-2 py-0.5">
                    Transponder anomaly · raw min &lt; -100 ft suppressed
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}