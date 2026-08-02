import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getSnapshot, getRuleMappingVersion } from "@/lib/watchtower.functions";
import { getFunnelStats, getObjectivityStats, getObjectivityStatsAoi, getReviewDismissalCount } from "@/lib/scans.functions";
import { MlFunnel } from "@/components/ml-funnel";
import { ObjectivityStat } from "@/components/objectivity-stat";
import { getModelHonesty } from "@/lib/advocacy.functions";
import { PlainLanguageTLDR } from "@/components/plain-language-tldr";

const snapshotQO = queryOptions({ queryKey: ["snapshot"], queryFn: () => getSnapshot() });
const funnelQO = queryOptions({ queryKey: ["funnel-stats"], queryFn: () => getFunnelStats(), refetchInterval: 60_000 });
const objectivityQO = queryOptions({ queryKey: ["objectivity"], queryFn: () => getObjectivityStats(), refetchInterval: 300_000 });
const objectivityAoiQO = queryOptions({ queryKey: ["objectivity-aoi"], queryFn: () => getObjectivityStatsAoi(), refetchInterval: 300_000 });
const dismissalsQO = queryOptions({ queryKey: ["dismissals"], queryFn: () => getReviewDismissalCount() });
const ruleVerQO = queryOptions({ queryKey: ["rule-mapping-version"], queryFn: () => getRuleMappingVersion() });
const honestyQO = queryOptions({ queryKey: ["model-honesty"], queryFn: () => getModelHonesty(), staleTime: 300_000 });

function HonestyPanel() {
  const { data } = useQuery(honestyQO);
  if (!data) return null;
  const agreePct = data.scored7d > 0 ? Math.round((data.highAgreement / data.scored7d) * 100) : null;
  const disagreePct = data.scored7d > 0 ? Math.round((data.lowAgreement / data.scored7d) * 100) : null;
  return (
    <div className="mt-4 brutal-border-thick p-5 bg-warning text-ink">
      <div className="label-stamp text-[11px] mb-2">Honesty panel — where our own models disagree</div>
      <p className="text-sm max-w-3xl mb-3">
        We run several detectors over the same flight. When they disagree, we say so instead of
        picking the answer that suits us. Over the last 7 days the ensemble scored{" "}
        <strong>{data.scored7d.toLocaleString()}</strong> events
        {agreePct != null && <> — the models strongly agreed on <strong>{agreePct}%</strong> of them and
        clearly disagreed on <strong>{disagreePct}%</strong></>}.
      </p>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-sm">
        {[
          ["Events scored (7d)", data.scored7d.toLocaleString()],
          ["Human-reviewed", data.humanReviewed.toLocaleString()],
          ["Marked false positive", data.falsePositives.toLocaleString()],
          ["Mean disagreement", data.meanDisagreement != null ? data.meanDisagreement.toFixed(3) : "—"],
        ].map(([k, v]) => (
          <div key={k as string} className="brutal-border bg-paper p-3">
            <div className="font-display text-2xl">{v as string}</div>
            <div className="label-stamp text-[10px] opacity-70">{k as string}</div>
          </div>
        ))}
      </dl>
      {data.humanReviewed === 0 && data.scored7d > 0 && (
        <p className="text-xs mt-3 leading-snug">
          No human has validated any of these scores yet. That backlog is a real limitation of this
          record, and we publish it rather than hide it.
        </p>
      )}
    </div>
  );
}

const crumbs = [{ label: "Home", href: "/" }, { label: "Methodology" }];

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
    { title: "Methodology — The Architecture of Never" },
    { name: "description", content: "How Watchtower 2.0 learns baselines, scores anomalies, and produces court-ready evidence with zero cherry-picking." },
    { property: "og:title", content: "Methodology — Architecture of Never" },
    { property: "og:description", content: "Baseline learning, statistical anomaly detection, Bradford Hill scoring, SHA-256 chain of custody." },
    { property: "og:url", content: "https://advocacywatch.live/methodology" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/methodology" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(snapshotQO),
    context.queryClient.ensureQueryData(funnelQO),
    context.queryClient.ensureQueryData(objectivityQO),
    context.queryClient.ensureQueryData(objectivityAoiQO),
    context.queryClient.ensureQueryData(dismissalsQO),
    context.queryClient.ensureQueryData(ruleVerQO),
  ]),
  component: Methodology,
});

function Methodology() {
  const { data: s } = useSuspenseQuery(snapshotQO);
  const { data: funnel } = useSuspenseQuery(funnelQO);
  const { data: obj } = useSuspenseQuery(objectivityQO);
  const { data: objAoi } = useSuspenseQuery(objectivityAoiQO);
  const { data: dismissals } = useSuspenseQuery(dismissalsQO);
  const { data: ruleVer } = useSuspenseQuery(ruleVerQO);
  const det = s.totalDetections.toLocaleString();
  const ac = s.uniqueAircraft.toLocaleString();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Methodology</div>
          <h1 className="text-5xl sm:text-7xl mb-6">No opinions. Just a baseline.</h1>
          <p className="text-lg max-w-3xl">
            Every part of our pipeline is designed to defeat one accusation:
            <em> "you only track the aircraft you're already suspicious of."</em>
            We don't. The machine watches every aircraft, all the time, and the math decides what stands out.
          </p>

          <div className="mt-8 grid lg:grid-cols-2 gap-4">
            <ObjectivityStat stats={obj} scope="Global" />
            <ObjectivityStat stats={objAoi} scope="AOI" />
          </div>
          <div className="mt-4">
            <MlFunnel stats={funnel} />
          </div>
          <HonestyPanel />
          <p className="mt-3 text-xs font-mono opacity-70 max-w-3xl">
            <strong>Detection counting.</strong> One "detection" = one ADS-B / MLAT position report.
            A single aircraft loitering for an hour can generate thousands of detections.
            Tail pages and county tallies count detections, not sorties. Sortie / event counts appear on <a href="/threat-index" className="underline">/threat-index</a> as WTI events.
          </p>

          <div className="mt-4 brutal-border p-4 bg-paper flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="label-stamp bg-alert text-paper px-2 py-0.5">Human review overrides</div>
            <div className="font-mono text-sm">
              <strong className="text-2xl">{dismissals.month}</strong> in last 30 days
              {dismissals.total > 0 && <span className="opacity-70"> · {dismissals.total} total dismissals published</span>}
            </div>
            <div className="font-mono text-xs opacity-70 ml-auto">
              Rule mapping version: <strong>{ruleVer.version}</strong> · {ruleVer.ruleCount} rules
            </div>
          </div>
        </div>
      </section>

      <PlainLanguageTLDR dismissalsMonth={dismissals.month} />

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid lg:grid-cols-2 gap-0 brutal-border-thick">
          {[
            { n: "01", t: "Population-scale capture", d: `We log every ADS-B / MLAT detection in the observation zone — not a curated subset. ${det} records across ${ac} aircraft, growing.` },
            { n: "02", t: "Baseline learning (48 h minimum)", d: "Before any aircraft can be flagged, the system must observe at least 48 hours of its flight history in the AOI. No baseline, no flag." },
            { n: "03", t: "Statistical anomaly detection", d: "Outliers are scored against the learned distribution using robust z-scores and isolation-forest ensemble. The threshold is published and reproducible." },
            { n: "04", t: "Bradford Hill scoring", d: "Flagged events are scored against nine causal criteria. A single suspicious flight is not enough; we look for consistency, strength, and specificity across time." },
            { n: "05", t: "SHA-256 chain of custody", d: "Every scan artifact is hashed and linked to the previous one. The chain root is published on the attestation page. Any tampering breaks the chain visibly." },
            { n: "06", t: "Human review and dismissal publication", d: "When a human reviewer overrides a flag, the dismissal is published with a reason. We do not hide our mistakes." },
          ].map((s, i) => (
            <div key={s.n} className={`p-6 ${i % 2 === 0 ? "lg:border-r-4 border-ink" : ""} ${i < 4 ? "border-b-4 border-ink" : i === 4 ? "lg:border-b-0 border-b-4 border-ink" : ""}`}>
              <div className="font-mono text-5xl font-bold opacity-20">{s.n}</div>
              <h2 className="text-2xl mt-2 mb-3">{s.t}</h2>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-paper border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl sm:text-5xl mb-6">The anti-cherry-picking proof</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              ["100%", "of detections logged — not just suspicious ones"],
              ["0%", "flagged during baseline window — by design"],
              ["48h", "minimum observation before any flag is possible"],
            ].map(([big, small]) => (
              <div key={big} className="brutal-border-thick border-paper p-6">
                <div className="font-display text-6xl text-warning">{big}</div>
                <div className="text-sm mt-2 opacity-80">{small}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Limitations */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-3">Limitations</div>
          <h2 className="text-4xl sm:text-5xl mb-6">What this method cannot do</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="brutal-border p-5">
              <h3 className="text-xl mb-2">No identification of individuals</h3>
              <p className="text-sm">ADS-B broadcasts identify aircraft, not people. We cannot tell you who was on board. We can tell you where the aircraft went, how it deviated, and how that deviation compares to every other flight in the same airspace.</p>
            </div>
            <div className="brutal-border p-5">
              <h3 className="text-xl mb-2">No intent inference</h3>
              <p className="text-sm">A deviation is a deviation. The system flags statistical outliers, not motives. A medical evacuation may deviate as much as a surveillance orbit. Human reviewers distinguish context; the math does not.</p>
            </div>
            <div className="brutal-border p-5">
              <h3 className="text-xl mb-2">ADS-B dependent</h3>
              <p className="text-sm">If an aircraft disables its transponder, we lose it. This is a known limitation of all ADS-B-based surveillance. We publish gaps in coverage as part of the record.</p>
            </div>
            <div className="brutal-border p-5">
              <h3 className="text-xl mb-2">Baseline drift</h3>
              <p className="text-sm">If surveillance flights become common enough, they become the baseline. The 48-hour window prevents immediate normalization, but long-term drift is real. We address it by publishing the baseline distribution alongside every flag.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Data sources */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-1 mb-3">Data sources</div>
          <h2 className="text-4xl sm:text-5xl mb-6">Where the data comes from</h2>
          <p className="text-sm max-w-3xl mb-6 opacity-80">
            Every data source is public, free, and accessible to anyone with an internet connection.
            No private data. No paid data. No leaked data. No exceptions.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ["ADS-B Exchange", "Live ADS-B / MLAT position reports. Unfiltered — includes military and law enforcement transponders."],
              ["FAA Registry", "Aircraft registration database. Owner, type, registration status, airworthiness directives."],
              ["FlightAware (public)", "Supplementary flight plan and route data where available via public API."],
              ["OpenStreetMap", "Geographic boundaries, military installation perimeters, restricted airspace polygons."],
              ["Court records", "Public court filings and dockets. Sourced via PACER and state court portals."],
              ["News archives", "Publicly reported incidents, investigations, and oversight actions. Linked, not reproduced."],
            ].map(([name, desc]) => (
              <div key={name} className="brutal-border border-paper/40 p-4">
                <h3 className="text-lg mb-1 text-warning">{name}</h3>
                <p className="text-xs opacity-80">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Detection pipeline */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Detection pipeline</div>
          <h2 className="text-4xl sm:text-5xl mb-6">From raw signal to flagged event</h2>
          <div className="space-y-4">
            {[
              { step: "Ingest", desc: "ADS-B position reports are received in real time. Every report is stored — no filtering, no sampling." },
              { step: "Baseline", desc: "For each aircraft, the system builds a 48-hour baseline of position, altitude, speed, and heading. No flagging occurs during this window." },
              { step: "Score", desc: "After baseline, each new detection is scored against the learned distribution. Robust z-scores and isolation-forest anomaly scores are computed." },
              { step: "Flag", desc: "Detections exceeding the published threshold are flagged. The threshold is the same for every aircraft — no per-target tuning." },
              { step: "Chain", desc: "Flagged events are hashed and appended to the SHA-256 chain of custody. The chain root is published on the attestation page." },
              { step: "Review", desc: "Human reviewers can override flags. Overrides are published with a reason. Dismissals are counted and displayed on this page." },
            ].map((s, i) => (
              <div key={s.step} className="flex gap-4 items-start brutal-border p-4">
                <div className="font-mono text-3xl font-bold opacity-20 shrink-0 w-12">{i + 1}</div>
                <div>
                  <h3 className="text-lg font-bold">{s.step}</h3>
                  <p className="text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Chain of custody */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-1 mb-3">Chain of custody</div>
          <h2 className="text-4xl sm:text-5xl mb-6">SHA-256 Merkle chain</h2>
          <p className="text-sm max-w-3xl mb-6 opacity-80">
            Every scan artifact is hashed with SHA-256. Each hash links to the previous one,
            forming a chain. The root of the chain is published on the{" "}
            <a href="/attestation" className="underline text-warning">attestation page</a> and can be
            verified by anyone using the <a href="/verify" className="underline text-warning">verification tool</a>.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="brutal-border-thick border-paper p-5">
              <h3 className="text-xl mb-2 text-warning">How it works</h3>
              <ol className="text-sm space-y-2 list-decimal pl-4">
                <li>ML box posts scan results to <code className="bg-paper/10 px-1">/api/public/scans/ingest</code></li>
                <li>Server computes SHA-256 of the canonical payload</li>
                <li>Hash is stored in <code className="bg-paper/10 px-1">scan_artifacts.merkle_root</code></li>
                <li>Periodically, hashes are folded into a Merkle tree</li>
                <li>Tree root is published on <a href="/attestation" className="underline">/attestation</a></li>
                <li>Anyone can reproduce the hash from the raw data</li>
              </ol>
            </div>
            <div className="brutal-border-thick border-paper p-5">
              <h3 className="text-xl mb-2 text-warning">What it proves</h3>
              <ul className="text-sm space-y-2 list-disc pl-4">
                <li>The scan data has not been altered since ingestion</li>
                <li>The sequence of scans is preserved — no insertions or deletions</li>
                <li>The published flag counts match the raw detection data</li>
                <li>Any tampering would break the chain visibly</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Threshold publication */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Threshold</div>
          <h2 className="text-4xl sm:text-5xl mb-6">The published threshold</h2>
          <p className="text-sm max-w-3xl mb-6">
            The anomaly threshold is the same for every aircraft. It is not tuned per target, per
            county, or per mission. The threshold is published here so anyone can verify that the
            same rule applies to every flight.
          </p>
          <div className="brutal-border-thick p-6 bg-paper">
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <div className="label-stamp text-[11px] mb-1">Robust z-score</div>
                <div className="font-display text-4xl">≥ 3.5</div>
                <div className="text-xs opacity-70 mt-1">Median absolute deviation based</div>
              </div>
              <div>
                <div className="label-stamp text-[11px] mb-1">Isolation forest</div>
                <div className="font-display text-4xl">≤ 0.15</div>
                <div className="text-xs opacity-70 mt-1">Anomaly score (lower = more anomalous)</div>
              </div>
              <div>
                <div className="label-stamp text-[11px] mb-1">Minimum baseline</div>
                <div className="font-display text-4xl">48 h</div>
                <div className="text-xs opacity-70 mt-1">Before any flag is possible</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Reproducibility */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-1 mb-3">Reproducibility</div>
          <h2 className="text-4xl sm:text-5xl mb-6">Reproduce any flag</h2>
          <p className="text-sm max-w-3xl mb-6 opacity-80">
            Every flagged event can be reproduced from the raw data. Here is how:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="brutal-border-thick border-paper p-5">
              <h3 className="text-xl mb-2 text-warning">Step-by-step</h3>
              <ol className="text-sm space-y-2 list-decimal pl-4">
                <li>Download the scan data: <code className="bg-paper/10 px-1">GET /api/public/export?format=csv</code></li>
                <li>Find the scan_id of the flagged event</li>
                <li>Fetch the raw detections for that scan from the API</li>
                <li>Recompute the z-score using the published threshold (≥ 3.5)</li>
                <li>Compare your result against the published flag</li>
                <li>Verify the Merkle root using the <a href="/verify" className="underline">verification tool</a></li>
              </ol>
            </div>
            <div className="brutal-border-thick border-paper p-5">
              <h3 className="text-xl mb-2 text-warning">What you need</h3>
              <ul className="text-sm space-y-2 list-disc pl-4">
                <li>Internet access (all data is public)</li>
                <li>Python or any language with SHA-256</li>
                <li>No account, no API key, no authentication</li>
                <li>The scan_id (published on every flag page)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Reproducibility checklist */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Checklist</div>
          <h2 className="text-4xl sm:text-5xl mb-6">Reproducibility checklist</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ["Raw data available", "All scan artifacts are downloadable via /api/public/export"],
              ["Threshold published", "The exact threshold values are on this page"],
              ["Hash chain public", "Merkle root published on /attestation"],
              ["Verification tool", "Anyone can verify at /verify without an account"],
              ["Dismissal log", "Human overrides are published with reasons"],
              ["Source code", "Pipeline code is open for inspection"],
              ["Baseline window", "48-hour minimum is enforced in code"],
              ["No per-target tuning", "Same threshold for every aircraft"],
              ["Gap publication", "Coverage gaps are part of the record"],
            ].map(([title, desc]) => (
              <div key={title} className="brutal-border p-4">
                <div className="flex items-start gap-2">
                  <span className="text-warning font-bold text-lg shrink-0">✓</span>
                  <div>
                    <h3 className="text-sm font-bold">{title}</h3>
                    <p className="text-xs opacity-70 mt-1">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl sm:text-5xl mb-6">No exceptions. No special access. No hidden data.</h2>
          <p className="text-lg max-w-3xl opacity-80">
            Everything we do is grounded in public airspace data. No private signals. No personal data. No exceptions.
          </p>
          <ul className="mt-6 space-y-2 text-sm font-mono">
            <li>→ <a href="/verify" className="underline text-warning">Verify any scan yourself</a></li>
            <li>→ <a href="/attestation" className="underline text-warning">View the chain of custody attestation</a></li>
            <li>→ <a href="/api/public/export?format=csv" className="underline text-warning">Download all scan data as CSV</a></li>
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}