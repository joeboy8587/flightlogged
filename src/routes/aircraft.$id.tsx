import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { getAircraftDossier, type AircraftDossier } from "@/lib/aircraft.functions";
import { featureLabel, ruleLabel, ruleStatute, DOSSIER_SECTIONS } from "@/lib/aircraft";
import { fmtClock, fmtDate, fmtPct } from "@/lib/format";
import { normalizeSeverity } from "@/lib/counties";

export const Route = createFileRoute("/aircraft/$id")({
  head: ({ params }) => {
    const tail = String(params.id).toUpperCase();
    return {
      meta: [
        { title: `${tail} — Aircraft Dossier | Watchtower` },
        { name: "description", content: `Full public-record dossier for aircraft ${tail}: FAA registry, behavior signature, flagged violations, coordination handoffs, corrections, and hashed receipts.` },
        { property: "og:title", content: `${tail} — Aircraft Dossier` },
        { property: "og:description", content: `Behavior signature, violations, handoffs and hashed receipts for ${tail}, from public ADS-B and FAA records.` },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://advocacywatch.live/aircraft/${tail}` }],
    };
  },
  component: AircraftDossierPage,
});

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadDossierCsv(d: AircraftDossier) {
  const rows: (string | number | null)[][] = [
    [`# Watchtower aircraft dossier — ${d.identity.registration} (${d.identity.icao})`],
    [`# exported=${new Date().toISOString()} owner=${d.identity.owner ?? ""} model=${d.identity.model ?? ""}`],
    [],
    ["SECTION", "FIELD", "VALUE", "EXTRA", "HASH"],
    ...Object.entries(d.identity).map(([k, v]) => ["identity", k, Array.isArray(v) ? v.join("; ") : String(v ?? ""), "", ""]),
    ...d.violationGroups.map((g) => ["violation_summary", g.rule, g.count, g.minAlt ?? "", ""]),
    ...d.violations.map((v) => ["violation", v.rule, v.capturedAt ?? "", v.altitude ?? "", v.sha256 ?? ""]),
    ...d.sentinel.map((v) => ["sentinel_violation", v.rule, v.capturedAt ?? "", v.altitude ?? "", v.sha256 ?? ""]),
    ...d.anomalies.map((a) => ["anomaly", a.type, a.detectedAt ?? "", a.score ?? "", a.sha256 ?? ""]),
    ...d.handoffs.map((h) => ["handoff_partner", h.partner, h.partnerOwner ?? "", h.partnerIcao ?? "", ""]),
    ...d.corridors.map((c) => ["corridor", c.zone, c.role ?? "", c.detections ?? "", ""]),
    ...d.receipts.map((r) => ["receipt", r.wtpr, r.legalStatus ?? "", r.anomalyType ?? "", r.sha256 ?? ""]),
    ...(d.signature?.features ?? []).map((f) => ["signature_feature", f.key, f.value, "", ""]),
  ];
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `dossier-${d.identity.registration ?? d.identity.icao}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AircraftDossierPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getAircraftDossier);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["aircraft-dossier", id],
    queryFn: () => fn({ data: { tail: id } }),
    staleTime: 5 * 60 * 1000,
  });

  const tail = String(id).toUpperCase();
  const crumbs = [{ label: "Home", href: "/" }, { label: "Aircraft", href: "/aircraft" }, { label: tail }];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1100px] mx-auto px-4 py-10">
          <div className="label-stamp text-warning mb-2">Aircraft dossier · public record</div>
          <h1 className="text-4xl sm:text-6xl break-words">{data?.identity.registration ?? tail}</h1>
          <p className="font-mono text-sm opacity-80 mt-2">
            {data ? (
              <>
                {data.identity.icao} · {data.identity.owner ?? "Unidentified registrant"}
                {data.identity.model ? ` · ${data.identity.model}` : ""}
              </>
            ) : isLoading ? "Assembling dossier…" : "—"}
          </p>
          {data && (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.identity.isMilitary && <Chip tone="alert">Military registration</Chip>}
              {data.identity.kcsoFlag && <Chip tone="alert">KCSO-operated</Chip>}
              {data.identity.medicalFlag && <Chip>Medical / air ambulance</Chip>}
              {data.identity.tacticalRole && <Chip>{data.identity.tacticalRole}</Chip>}
              {data.identity.mlClassification && <Chip>MACHINE: {data.identity.mlClassification}</Chip>}
              {data.spoofing && <Chip tone="alert">Identity-masking source</Chip>}
            </div>
          )}
          {data && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadDossierCsv(data)} className="label-stamp brutal-border bg-warning text-ink px-4 py-2">
                Export dossier CSV
              </button>
              <Link to="/tail-search" search={{ tail: data.identity.registration ?? tail }} className="label-stamp brutal-border px-4 py-2 hover:bg-warning hover:text-ink">
                Every detection →
              </Link>
            </div>
          )}
          <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono opacity-80">
            {DOSSIER_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="underline hover:text-warning">{s.label}</a>
            ))}
          </nav>
        </div>
      </section>

      <div className="max-w-[1100px] mx-auto px-4 py-10 space-y-12">
        {isLoading && <p className="brutal-border p-6 font-mono">Reading the machine's records for {tail}…</p>}
        {isError && <p className="brutal-border p-6 bg-alert text-paper font-mono">Dossier query failed. Reload to retry.</p>}
        {!isLoading && !isError && !data && (
          <p className="brutal-border p-6 bg-warning font-mono">
            No public record for <strong>{tail}</strong>. Try the N-number (N913KC) or the 6-character ICAO hex.
          </p>
        )}

        {data && (
          <>
            {/* IDENTITY */}
            <Section id="identity" kicker="FAA master registry + machine profile" title="Identity & registry">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Total detections" value={data.identity.totalDetections?.toLocaleString() ?? "—"} />
                <Stat label="Lowest altitude" value={data.identity.minAltitude != null ? `${data.identity.minAltitude} ft` : "—"} />
                <Stat label="Average altitude" value={data.identity.avgAltitude != null ? `${Math.round(data.identity.avgAltitude)} ft` : "—"} />
                <Stat label="Average speed" value={data.identity.avgSpeed != null ? `${Math.round(data.identity.avgSpeed)} kts` : "—"} />
                <Stat label="Night share" value={fmtPct(data.identity.nightPct)} />
                <Stat label="Weekend share" value={fmtPct(data.identity.weekendPct)} />
                <Stat label="Primary county" value={data.identity.primaryCounty ?? "—"} />
                <Stat label="Operating spread" value={data.identity.spreadKm != null ? `${data.identity.spreadKm.toFixed(1)} km` : "—"} />
              </div>
              <dl className="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-2 font-mono text-sm">
                <Row k="Registered owner" v={data.identity.owner} />
                <Row k="Resolved operator" v={data.identity.operatorResolved} />
                <Row k="Registrant type" v={data.identity.registrantType} />
                <Row k="Registrant location" v={[data.identity.city, data.identity.state].filter(Boolean).join(", ") || null} />
                <Row k="Registry county code" v={data.identity.county} />
                <Row k="Serial number" v={data.identity.serial} />
                <Row k="Engine code" v={data.identity.engine} />
                <Row k="Year manufactured" v={data.identity.manufacturerYear?.toString() ?? null} />
                <Row k="Certificate issued" v={data.identity.certIssue ? fmtDate(data.identity.certIssue) : null} />
                <Row k="Registration expires" v={data.identity.expiration ? fmtDate(data.identity.expiration) : null} />
                <Row k="First seen" v={data.identity.firstSeen ? fmtClock(data.identity.firstSeen) : null} />
                <Row k="Last seen" v={data.identity.lastSeen ? fmtClock(data.identity.lastSeen) : null} />
                <Row k="Observed callsigns" v={data.identity.callsigns.join(", ") || null} />
                <Row k="Profile hash" v={data.identity.sha256} mono />
              </dl>
            </Section>

            {/* SIGNATURE */}
            <Section id="signature" kicker="Deep profiler · unsupervised" title="Behavior signature">
              {!data.signature ? (
                <p className="font-mono text-sm">The deep profiler has not built a signature for this aircraft yet.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <Stat label="Profile score" value={data.signature.profileScore != null ? `${data.signature.profileScore}` : "—"} />
                    <Stat label="Behavior cluster" value={data.signature.cluster != null ? `#${data.signature.cluster}` : "—"} />
                    <Stat label="Drift" value={data.signature.driftScore != null ? data.signature.driftScore.toFixed(2) : "—"} />
                    <Stat label="Stability" value={data.signature.stabilityScore != null ? `${data.signature.stabilityScore}` : "—"} />
                    <Stat label="Embedding" value={data.signature.embeddingDims ? `${data.signature.embeddingDims}-dim` : "—"} />
                  </div>
                  <p className="mt-2 text-xs font-mono opacity-70">
                    Model {data.signature.modelVersion ?? "—"} · window {fmtDate(data.signature.windowStart)} → {fmtDate(data.signature.windowEnd)} · updated {fmtClock(data.signature.updatedAt)}
                  </p>
                  {data.signature.explanation && (
                    <div className="brutal-border p-4 mt-4 bg-paper">
                      <div className="label-stamp text-alert mb-1">Machine explanation</div>
                      <p className="text-sm">{data.signature.explanation}</p>
                    </div>
                  )}
                  {data.signature.topDimensions.length > 0 && (
                    <div className="mt-5">
                      <div className="label-stamp mb-2">What makes this aircraft unusual</div>
                      <div className="space-y-1">
                        {data.signature.topDimensions.map((t) => (
                          <Bar key={t.key} label={featureLabel(t.key)} value={t.value} max={Math.max(...data.signature!.topDimensions.map((x) => x.value), 1)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {data.signature.features.length > 0 && (
                    <details className="mt-5 brutal-border p-4">
                      <summary className="label-stamp cursor-pointer">Full feature vector ({data.signature.features.length} measures)</summary>
                      <dl className="mt-3 grid sm:grid-cols-2 gap-x-8 gap-y-1 font-mono text-xs">
                        {data.signature.features.map((f) => (
                          <Row key={f.key} k={featureLabel(f.key)} v={Number.isInteger(f.value) ? String(f.value) : f.value.toFixed(3)} />
                        ))}
                      </dl>
                    </details>
                  )}
                </>
              )}
            </Section>

            {/* PATTERNS */}
            <Section id="patterns" kicker="Anomaly typing + masking sources" title="Patterns & anomalies">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="label-stamp mb-2">Flagged anomaly types</div>
                  {data.anomalyGroups.length === 0 && <p className="font-mono text-sm">No anomaly events on record.</p>}
                  <ul className="space-y-1 font-mono text-sm">
                    {data.anomalyGroups.map((g) => (
                      <li key={g.type} className="brutal-border px-3 py-2 flex justify-between gap-3">
                        <span>{g.type.replace(/_/g, " ").toLowerCase()}</span>
                        <span className="whitespace-nowrap">{g.count.toLocaleString()} · max {g.maxScore != null ? g.maxScore.toFixed(0) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="label-stamp mb-2">Machine reasons on the profile</div>
                  {data.identity.anomalyReasons.length === 0 && <p className="font-mono text-sm">None recorded.</p>}
                  <ul className="space-y-1 font-mono text-sm">
                    {data.identity.anomalyReasons.map((r, i) => (
                      <li key={i} className="brutal-border px-3 py-2">{r}</li>
                    ))}
                  </ul>
                  {data.spoofing && (
                    <div className="brutal-border p-3 mt-3 bg-warning/40 font-mono text-xs">
                      <div className="label-stamp text-alert mb-1">Masking / spoofing source</div>
                      {data.spoofing.sourceType ?? "unspecified"} · {data.spoofing.detectionCount?.toLocaleString() ?? "—"} reports ·
                      broadcast every {data.spoofing.broadcastInterval ?? "—"}s ·
                      {data.spoofing.coincides ? " coincides with operations" : " no operational overlap recorded"}
                    </div>
                  )}
                </div>
              </div>
              {data.anomalies.length > 0 && (
                <div className="overflow-x-auto brutal-border-thick mt-5">
                  <table className="w-full text-sm">
                    <thead className="bg-ink text-paper">
                      <tr>
                        <th className="text-left p-2 label-stamp">Detected</th>
                        <th className="text-left p-2 label-stamp">Type</th>
                        <th className="text-right p-2 label-stamp">Score</th>
                        <th className="text-right p-2 label-stamp">Alt</th>
                        <th className="text-left p-2 label-stamp">County</th>
                        <th className="text-left p-2 label-stamp">Reviewed</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {data.anomalies.map((a, i) => (
                        <tr key={i} className="border-t border-ink/20">
                          <td className="p-2 whitespace-nowrap text-xs">{fmtClock(a.detectedAt)}</td>
                          <td className="p-2 text-xs">{a.type.replace(/_/g, " ").toLowerCase()}</td>
                          <td className="p-2 text-right">{a.score != null ? a.score.toFixed(0) : "—"}</td>
                          <td className="p-2 text-right">{a.altitude ?? "—"}</td>
                          <td className="p-2">{a.county ?? "—"}</td>
                          <td className="p-2">{a.reviewed ? "human" : "machine"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* VIOLATIONS */}
            <Section id="violations" kicker="Rule engine · cited regulations" title="Violations">
              {data.violationGroups.length === 0 && data.sentinel.length === 0 && (
                <p className="font-mono text-sm">No rule citations recorded against this aircraft.</p>
              )}
              {data.violationGroups.length > 0 && (
                <div className="space-y-2">
                  {data.violationGroups.map((g) => (
                    <div key={g.rule} className="brutal-border p-3">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <div className="font-display text-xl">{ruleLabel(g.rule)}</div>
                          <div className="font-mono text-xs opacity-70">
                            {g.rule} · {g.statute ?? ruleStatute(g.rule)} · lowest {g.minAlt ?? "—"} ft · last {fmtDate(g.lastSeen)}
                          </div>
                        </div>
                        <div className="font-display text-3xl">{g.count.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {data.sentinel.length > 0 && (
                <div className="mt-6">
                  <div className="label-stamp mb-2">Sentinel violations (severity-rated, hashed)</div>
                  <div className="overflow-x-auto brutal-border-thick">
                    <table className="w-full text-sm">
                      <thead className="bg-ink text-paper">
                        <tr>
                          <th className="text-left p-2 label-stamp">When</th>
                          <th className="text-left p-2 label-stamp">Type</th>
                          <th className="text-right p-2 label-stamp">Alt</th>
                          <th className="text-left p-2 label-stamp">County</th>
                          <th className="text-left p-2 label-stamp">Severity</th>
                          <th className="text-left p-2 label-stamp">Hash</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {data.sentinel.map((v, i) => (
                          <tr key={i} className="border-t border-ink/20">
                            <td className="p-2 whitespace-nowrap text-xs">{fmtClock(v.capturedAt)}</td>
                            <td className="p-2 text-xs">{ruleLabel(v.rule)}</td>
                            <td className="p-2 text-right">{v.altitude ?? "—"}</td>
                            <td className="p-2">{v.county ?? "—"}</td>
                            <td className="p-2">{normalizeSeverity(v.severity)}</td>
                            <td className="p-2 text-[10px] break-all">{v.sha256?.slice(0, 16) ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Section>

            {/* HANDOFFS */}
            <Section id="handoffs" kicker="Coordination · corridor role" title="Handoffs & coordination">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <div className="label-stamp mb-2">Confirmed coordination partners ({data.handoffs.length})</div>
                  {data.handoffs.length === 0 && <p className="font-mono text-sm">No confirmed partners.</p>}
                  <div className="flex flex-wrap gap-2">
                    {data.handoffs.map((h, i) => (
                      <Link key={`${h.partner}-${i}`} to="/aircraft/$id" params={{ id: h.partner }} className="brutal-border px-2 py-1 font-mono text-xs hover:bg-warning">
                        {h.partner}
                        {h.partnerOwner && <span className="opacity-60"> · {h.partnerOwner.slice(0, 22)}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="label-stamp mb-2">Corridor presence</div>
                  {data.corridors.length === 0 && <p className="font-mono text-sm">Not seen inside a mapped corridor zone.</p>}
                  <ul className="space-y-1 font-mono text-sm">
                    {data.corridors.map((c, i) => (
                      <li key={i} className="brutal-border px-3 py-2">
                        <strong>{c.zone}</strong> · {c.role ?? "role unknown"} · {c.pattern ?? "pattern unknown"}
                        <div className="text-xs opacity-70">{c.detections?.toLocaleString() ?? "—"} reports · lowest {c.minAltitude ?? "—"} ft · last {fmtDate(c.lastSeen)}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {data.peers.length > 0 && (
                <div className="mt-6">
                  <div className="label-stamp mb-2">Aircraft that behave like this one (same cluster)</div>
                  <div className="flex flex-wrap gap-2">
                    {data.peers.map((p, i) => (
                      <Link key={`${p.icao}-${i}`} to="/aircraft/$id" params={{ id: p.registration ?? p.icao }} className="brutal-border px-2 py-1 font-mono text-xs hover:bg-warning">
                        {p.registration ?? p.icao}
                        {p.profileScore != null && <span className="opacity-60"> · {p.profileScore}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* CORRECTIONS */}
            <Section id="corrections" kicker="Ensemble scoring + human review" title="Corrections & error rate">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Stat label="Scored detections" value={data.corrections.scored.toLocaleString()} />
                <Stat label="Human-validated" value={data.corrections.validated.toLocaleString()} />
                <Stat label="Marked false positive" value={data.corrections.falsePositives.toLocaleString()} />
                <Stat label="Avg ensemble score" value={data.corrections.avgEnsemble != null ? data.corrections.avgEnsemble.toFixed(2) : "—"} />
                <Stat label="Model disagreement" value={data.corrections.avgDisagreement != null ? data.corrections.avgDisagreement.toFixed(3) : "—"} />
              </div>
              {data.corrections.models.length > 0 && (
                <div className="mt-5">
                  <div className="label-stamp mb-2">Average score per independent model</div>
                  <div className="space-y-1">
                    {data.corrections.models.map((m) => (
                      <Bar key={m.key} label={m.key} value={m.value} max={Math.max(...data.corrections.models.map((x) => x.value), 1)} />
                    ))}
                  </div>
                </div>
              )}
              {data.corrections.reasons.length > 0 && (
                <ul className="mt-4 space-y-1 font-mono text-sm">
                  {data.corrections.reasons.map((r) => (
                    <li key={r.reason} className="brutal-border px-3 py-2">Withdrawn: {r.reason} ({r.count})</li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs font-mono opacity-70">
                Integrity failure rate on the profile: {fmtPct(data.identity.integrityFailureRate)} · classification confidence {fmtPct(data.identity.classificationConfidence)}.
                We publish our own error rate on purpose.
              </p>
            </Section>

            {/* RECEIPTS */}
            <Section id="receipts" kicker="Chain of custody" title="Receipts">
              {data.receipts.length === 0 ? (
                <p className="font-mono text-sm">No registry receipts issued for this aircraft yet.</p>
              ) : (
                <div className="overflow-x-auto brutal-border-thick">
                  <table className="w-full text-sm">
                    <thead className="bg-ink text-paper">
                      <tr>
                        <th className="text-left p-2 label-stamp">WTPR</th>
                        <th className="text-left p-2 label-stamp">Type</th>
                        <th className="text-left p-2 label-stamp">Status</th>
                        <th className="text-left p-2 label-stamp">Court-ready</th>
                        <th className="text-left p-2 label-stamp">Hash</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {data.receipts.map((r) => (
                        <tr key={r.wtpr} className="border-t border-ink/20">
                          <td className="p-2 text-xs break-all">{r.wtpr}</td>
                          <td className="p-2 text-xs">{r.anomalyType?.replace(/_/g, " ").toLowerCase() ?? "—"}</td>
                          <td className="p-2 text-xs">{r.legalStatus ?? "—"}</td>
                          <td className="p-2 text-xs">{r.courtReady ? "yes" : "pending"}</td>
                          <td className="p-2 text-[10px] break-all">{r.sha256?.slice(0, 16) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 text-xs font-mono opacity-70">
                All data on this page is drawn from public sources — FAA ADS-B broadcasts, public corporate and registry filings, and published
                regulations — and is independently verifiable by any member of the public. Dossier assembled {fmtClock(data.generatedAt)}.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/verify" className="label-stamp brutal-border px-4 py-2 hover:bg-warning">Verify a claim →</Link>
                <Link to="/toolkit" className="label-stamp brutal-border px-4 py-2 hover:bg-warning">File a FOIA →</Link>
                <Link to="/act" className="label-stamp brutal-border bg-warning px-4 py-2">Take action →</Link>
              </div>
            </Section>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="label-stamp text-alert mb-1">{kicker}</div>
      <h2 className="text-3xl sm:text-4xl mb-4 border-b-4 border-ink pb-2">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="brutal-border p-2">
      <div className="label-stamp opacity-60 text-[10px]">{label}</div>
      <div className="font-display text-xl break-words">{value}</div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink/15 py-1">
      <dt className="opacity-60">{k}</dt>
      <dd className={`text-right ${mono ? "text-[10px] break-all" : ""}`}>{v ?? "—"}</dd>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(2, Math.min(100, (Math.abs(value) / (max || 1)) * 100));
  return (
    <div>
      <div className="flex justify-between font-mono text-xs">
        <span>{label}</span>
        <span>{Number.isInteger(value) ? value : value.toFixed(3)}</span>
      </div>
      <div className="h-2 bg-ink/10">
        <div className="h-2 bg-alert" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "alert" }) {
  return (
    <span className={`label-stamp brutal-border px-2 py-1 text-[10px] ${tone === "alert" ? "bg-alert text-paper" : "bg-paper text-ink"}`}>
      {children}
    </span>
  );
}