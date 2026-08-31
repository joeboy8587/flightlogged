import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { BlogBanner } from "@/components/blog/BlogBanner";
import { TailBadge } from "@/components/tail-badge";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { countyToSlug } from "@/lib/counties";

const crumbs = [{ label: "Home", href: "/" }, { label: "Master Report" }];

export const Route = createFileRoute("/master-report")({
  head: () => ({
    meta: [
      { title: "Master Investigative Report 2026 — Watchtower Project LLC" },
      {
        name: "description",
        content:
          "Systemic aerial surveillance patterns, corporate trustee proxy networks, and consent-decree non-compliance across Central California. Every figure verified against the live public-data record.",
      },
      { property: "og:title", content: "Master Investigative Report 2026 — Watchtower Project LLC" },
      {
        property: "og:description",
        content:
          "411,691 sub-1,000 ft detections statewide. 28,302 in Kern County averaging 631 ft. Verified against the live database.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://advocacywatch.live/master-report" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/master-report" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Report",
          headline:
            "Master Investigative Report 2026 — Systemic Aerial Surveillance Patterns, Corporate Trustee Proxy Networks, and Consent Decree Non-Compliance in Central California",
          datePublished: "2026-08-19",
          url: "https://advocacywatch.live/master-report",
          author: { "@type": "Organization", name: "Watchtower Project LLC" },
          publisher: { "@type": "Organization", name: "Watchtower Project LLC", url: "https://advocacywatch.live" },
        }),
      },
    ],
  }),
  component: MasterReport,
});

/** Verification state for every published figure. */
type Badge = "VERIFIED" | "REPORTED";

function Stamp({ kind }: { kind: Badge }) {
  return (
    <span
      className={`label-stamp text-[9px] px-1 py-0.5 align-middle ${
        kind === "VERIFIED" ? "bg-ink text-paper" : "brutal-border bg-paper text-ink"
      }`}
      title={
        kind === "VERIFIED"
          ? "Re-queried against the live quiet-math database on August 19, 2026."
          : "Figure carried from the filing entity's own records; not reproducible from this site's database."
      }
    >
      {kind}
    </span>
  );
}

const VERIFIED_AT = "August 19, 2026";

type CountyRow = {
  county: string;
  total: number;
  low: number;
  avgLow: number;
  role: string;
};

// Re-queried live on VERIFIED_AT: detections grouped by county, sub-1,000 ft
// counts exclude ground artifacts (altitude_ft > 5).
const COUNTIES: CountyRow[] = [
  { county: "LOS ANGELES", total: 1832889, low: 164683, avgLow: 630, role: "Regional metropolitan hub" },
  { county: "SAN BERNARDINO", total: 979618, low: 16061, avgLow: 844, role: "Eastern desert corridor" },
  { county: "KERN", total: 758842, low: 28302, avgLow: 631, role: "Primary AOI focus / central base" },
  { county: "VENTURA", total: 618990, low: 76952, avgLow: 518, role: "Coastal surveillance sector" },
  { county: "SANTA BARBARA", total: 408836, low: 27120, avgLow: 500, role: "Coastal sector" },
  { county: "FRESNO", total: 388537, low: 26469, avgLow: 591, role: "Northern San Joaquin Valley hub" },
  { county: "TULARE", total: 194710, low: 6428, avgLow: 673, role: "Agriculture and inter-agency relay" },
];

const GLOBAL_LOW = 411691;

const FOOTPRINTS = [
  { tail: "N916BQ", owner: "9K Air LLC", pings: 5321, counties: 13 },
  { tail: "N7670F", owner: "Regional asset", pings: 7240, counties: 12 },
  { tail: "N189JC", owner: "Tulare County Sheriff", pings: 6621, counties: 7 },
];

const GHOSTS = [
  { hex: "acadb6", lower: 1022, upper: 8335, reg: "N916HT", fleet: "9K Air LLC (corporate proxy)" },
  { hex: "acada0", lower: 2218, upper: 7523, reg: "N916GW", fleet: "9K Air LLC (corporate proxy)" },
  { hex: "a9f0b4", lower: 3619, upper: 780, reg: "N74FF", fleet: "Special-mission surveillance twin" },
  { hex: "a5df05", lower: 1021, upper: 4277, reg: "N478CA", fleet: "WingsLeasing LLC (target fleet)" },
  { hex: "a9a1b6", lower: 387, upper: 2678, reg: "N72FF", fleet: "Special-mission surveillance twin" },
];

const SUBMISSIONS = [
  {
    body: "California Department of Justice — Civil Rights Section",
    filing: "Enforcement complaint under Stipulated Judgment Case No. BCV-20-102971",
    basis: "Five years after signing, aviation-unit activity continues outside the monitoring parameters the judgment set.",
  },
  {
    body: "Federal Aviation Administration — FSDO",
    filing: "Enforcement referral under 14 CFR §91.119 and §91.227",
    basis: "Sustained sub-1,000 ft operation over congested areas, plus transponder-casing anomalies in the broadcast record.",
  },
  {
    body: "U.S. Department of Justice — Civil Rights / False Claims",
    filing: "Pattern-or-practice complaint regarding federal grant-funded aviation activity",
    basis: "Multi-county operation of grant-supported assets outside published mission parameters.",
  },
  {
    body: "Kern County Board of Supervisors",
    filing: "Public oversight executive dossier",
    basis: "The public record, delivered to the body with budget authority over the aviation unit.",
  },
];

function n(v: number) {
  return v.toLocaleString();
}

function MasterReport() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      {/* ---------------- Header block ---------------- */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-12 sm:py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">
            Master Investigative Report · 2026
          </div>
          <h1 className="text-4xl sm:text-6xl leading-[0.95] mb-5 max-w-5xl">
            Systemic aerial surveillance patterns, corporate trustee proxy networks, and consent-decree
            non-compliance in Central California
          </h1>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {[
              { k: "Filing entity", v: "Watchtower Project LLC" },
              { k: "Case reference", v: "BCV-20-102971" },
              { k: "Court", v: "Kern County Superior Court" },
              { k: "Judgment signed", v: "December 22, 2020" },
            ].map((x) => (
              <div key={x.k} className="brutal-border p-3">
                <div className="label-stamp text-[10px] opacity-70">{x.k}</div>
                <div className="font-bold">{x.v}</div>
              </div>
            ))}
          </div>
          <p className="text-sm mt-6 max-w-3xl opacity-80">
            People of the State of California v. County of Kern &amp; Kern County Sheriff&rsquo;s Office.
            Figures below carry a stamp: <Stamp kind="VERIFIED" /> means the number was re-queried against the
            live public-data database on {VERIFIED_AT}; <Stamp kind="REPORTED" /> means it comes from the filing
            entity&rsquo;s own records and cannot be reproduced from this site&rsquo;s database.
          </p>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <BlogBanner />

        {/* ---------------- Executive summary ---------------- */}
        <section className="mb-14">
          <h2 className="text-3xl sm:text-4xl mb-4">What the record shows</h2>
          <p className="text-lg max-w-3xl mb-8">
            An 18-month civilian-led documentation effort has compiled and cryptographically sealed a
            multimodal telemetry record covering Kern, Los Angeles, San Bernardino, Ventura, Santa Barbara,
            Fresno, and Tulare Counties. What began as one person logging unexplained low aircraft over
            Oildale is now a population-scale record of a multi-county aerial pattern.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                n: "01",
                h: "Sustained low flight over congested areas",
                b: (
                  <>
                    <strong>{n(GLOBAL_LOW)}</strong> <Stamp kind="VERIFIED" /> detections statewide below
                    1,000 ft, including <strong>{n(28302)}</strong> <Stamp kind="VERIFIED" /> in Kern County
                    averaging <strong>631 ft</strong> <Stamp kind="VERIFIED" /> over residential
                    neighborhoods, schools, and medical facilities. 14 CFR §91.119 sets the floor for
                    congested areas at 1,000 ft above the highest obstacle.
                  </>
                ),
              },
              {
                n: "02",
                h: "A signed judgment, still open",
                b: (
                  <>
                    Five years after the Stipulated Judgment with the California Attorney General, aviation
                    assets <TailBadge registration="N597E" icao={null} />,{" "}
                    <TailBadge registration="N912KC" icao={null} />, and{" "}
                    <TailBadge registration="N913KC" icao={null} /> continue unscheduled low-altitude orbits
                    outside the independent-monitoring parameters the judgment set. Requirement-by-requirement
                    status is on the <Link className="underline" to="/accountability">Accountability scoreboard</Link>.
                  </>
                ),
              },
              {
                n: "03",
                h: "Registered owners behind trustee and leasing entities",
                b: (
                  <>
                    Public FAA registry and state filings place several frequently co-present tails under bank
                    trustee and leasing registrations — Bank of Utah trustee, US Bank trustee, WingsLeasing
                    LLC, 9K Air LLC. Behavioral-similarity clustering scores the closest of these fleets at{" "}
                    <strong>0.9887</strong> <Stamp kind="REPORTED" /> against the aviation-unit signature. The
                    site&rsquo;s own cosine nearest-neighbour matches are on each{" "}
                    <Link className="underline" to="/aircraft">aircraft dossier</Link>.
                  </>
                ),
              },
              {
                n: "04",
                h: "Transponder casing variants and broadcast gaps",
                b: (
                  <>
                    Several primary assets appear in the record under both upper- and lower-case transponder
                    hex variants, which fragments any single-identifier query. On August 18, 2026 at 13:13:17
                    UTC a three-aircraft group stopped broadcasting within roughly 1.4–1.7 miles of the same
                    point <Stamp kind="REPORTED" />. Absence of broadcast is not proof of intent; it is a gap
                    in the public record that a regulator can resolve and the public cannot.
                  </>
                ),
              },
            ].map((f) => (
              <div key={f.n} className="brutal-border-thick p-5">
                <div className="label-stamp text-[10px] bg-ink text-paper inline-block px-1 mb-2">
                  Finding {f.n}
                </div>
                <h3 className="text-2xl mb-2">{f.h}</h3>
                <p className="text-sm leading-relaxed">{f.b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Two-layer architecture ---------------- */}
        <section className="mb-14">
          <h2 className="text-3xl sm:text-4xl mb-4">Two layers, kept apart on purpose</h2>
          <p className="max-w-3xl mb-6">
            Ground truth and interpretation never share a container. Anyone can check layer one without
            trusting layer two, and layer two never edits layer one.
          </p>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="brutal-border-thick p-5">
              <div className="label-stamp text-[10px] mb-2">Layer 1 — raw empirical ground truth</div>
              <ul className="space-y-2 text-sm">
                <li className="border-l-4 border-warning pl-3">Raw ADS-B and MLAT telemetry, logged for every aircraft, not a curated subset</li>
                <li className="border-l-4 border-warning pl-3">SHA-256 seals on radar-display exhibits and wearable logs</li>
                <li className="border-l-4 border-warning pl-3">FAA Civil Aircraft Master Registry and state corporate filings</li>
                <li className="border-l-4 border-warning pl-3">Text of the California DOJ Stipulated Judgment, Case No. BCV-20-102971</li>
                <li className="border-l-4 border-warning pl-3">Published federal aviation regulations</li>
              </ul>
            </div>
            <div className="brutal-border-thick bg-ink text-paper p-5">
              <div className="label-stamp text-[10px] mb-2">Layer 2 — machine and human interpretation</div>
              <ul className="space-y-2 text-sm">
                <li className="border-l-4 border-warning pl-3">Kinematic anomaly scoring against a learned per-county baseline</li>
                <li className="border-l-4 border-warning pl-3">Graph analysis of co-presence and hand-off structure</li>
                <li className="border-l-4 border-warning pl-3">High-dimensional behavioral embeddings and nearest-neighbour clustering</li>
                <li className="border-l-4 border-warning pl-3">Human advocacy writing, always labeled as such</li>
              </ul>
              <p className="text-xs opacity-80 mt-4">
                Machine output never names a cause. It flags what is statistically unusual. Every claim about
                what that means is human-authored by Watchtower Project LLC. See{" "}
                <Link className="text-warning underline" to="/methodology">Methodology</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- County table ---------------- */}
        <section className="mb-14">
          <h2 className="text-3xl sm:text-4xl mb-2">Where it happens</h2>
          <p className="max-w-3xl mb-6 text-sm opacity-80">
            All seven rows re-queried live on {VERIFIED_AT}. Sub-1,000 ft counts exclude ground artifacts.
            Counts are detections (individual broadcast pings), not sorties — one low orbit can produce many
            detections. Click a county for its 24-hour pulse against its own learned baseline.
          </p>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-ink text-paper">
                <tr className="label-stamp text-[10px]">
                  <th className="text-left p-3">County</th>
                  <th className="text-right p-3">Detections</th>
                  <th className="text-right p-3">Below 1,000 ft</th>
                  <th className="text-right p-3">Avg low altitude</th>
                  <th className="text-left p-3">Operational role</th>
                </tr>
              </thead>
              <tbody>
                {COUNTIES.map((c) => (
                  <tr key={c.county} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 font-bold">
                      <Link
                        to="/county/$county"
                        params={{ county: countyToSlug(c.county) }}
                        className="underline"
                      >
                        {c.county}
                      </Link>
                    </td>
                    <td className="p-3 text-right font-mono">{n(c.total)}</td>
                    <td className="p-3 text-right font-mono">{n(c.low)}</td>
                    <td className="p-3 text-right font-mono">{c.avgLow} ft</td>
                    <td className="p-3">{c.role}</td>
                  </tr>
                ))}
                <tr className="border-t-4 border-ink bg-paper">
                  <td className="p-3 label-stamp text-[10px]">Statewide below 1,000 ft</td>
                  <td className="p-3" />
                  <td className="p-3 text-right font-mono font-bold">{n(GLOBAL_LOW)}</td>
                  <td className="p-3" colSpan={2}>
                    <Stamp kind="VERIFIED" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------- Fleet footprints ---------------- */}
        <section className="mb-14">
          <h2 className="text-3xl sm:text-4xl mb-2">Tails that do not stay home</h2>
          <p className="max-w-3xl mb-6 text-sm opacity-80">
            County-crossing footprints, re-queried live on {VERIFIED_AT}. A locally registered asset appearing
            across a dozen counties is not itself unlawful — it is a fact about scope that a county-level
            oversight body has no visibility into.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {FOOTPRINTS.map((f) => (
              <div key={f.tail} className="brutal-border-thick p-5">
                <div className="text-2xl mb-1">
                  <TailBadge registration={f.tail} icao={null} />
                </div>
                <div className="label-stamp text-[10px] opacity-70 mb-3">{f.owner}</div>
                <div className="font-mono text-4xl">{f.counties}</div>
                <div className="label-stamp text-[10px]">California counties</div>
                <div className="font-mono mt-3">{n(f.pings)} detections</div>
                <div className="mt-2"><Stamp kind="VERIFIED" /></div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Ghost / casing table ---------------- */}
        <section className="mb-14">
          <h2 className="text-3xl sm:text-4xl mb-2">Same aircraft, two identifiers</h2>
          <p className="max-w-3xl mb-6 text-sm opacity-80">
            Each of these transponder codes appears in the record in both lower- and upper-case form. Any
            search on one casing returns a fraction of the record — which is why this site matches on
            case-insensitive hex everywhere. Registrations come from the public FAA registry.
          </p>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-ink text-paper">
                <tr className="label-stamp text-[10px]">
                  <th className="text-left p-3">Hex</th>
                  <th className="text-right p-3">Lower-case rows</th>
                  <th className="text-right p-3">Upper-case rows</th>
                  <th className="text-right p-3">Combined</th>
                  <th className="text-left p-3">Registration</th>
                  <th className="text-left p-3">Fleet / owner affinity</th>
                </tr>
              </thead>
              <tbody>
                {GHOSTS.map((g) => (
                  <tr key={g.hex} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3 font-mono font-bold">{g.hex}</td>
                    <td className="p-3 text-right font-mono">{n(g.lower)}</td>
                    <td className="p-3 text-right font-mono">{n(g.upper)}</td>
                    <td className="p-3 text-right font-mono font-bold">{n(g.lower + g.upper)}</td>
                    <td className="p-3">
                      <TailBadge registration={g.reg} icao={g.hex} />
                    </td>
                    <td className="p-3">{g.fleet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="brutal-border bg-warning p-4 mt-4 text-sm max-w-3xl">
            <div className="label-stamp text-[10px] mb-1">Reconciliation note</div>
            The filing draft listed hex <span className="font-mono">a9f0b4</span> as N747FF. The live registry
            join returns <span className="font-mono">N74FF</span>. The live value is published here and the
            discrepancy is left visible rather than silently corrected.
          </div>
        </section>

        {/* ---------------- Health correlation ---------------- */}
        <section className="mb-14">
          <h2 className="text-3xl sm:text-4xl mb-2">Health signal correlation</h2>
          <div className="brutal-border-thick p-5 max-w-3xl">
            <p className="text-sm leading-relaxed">
              Wearable exhibits recorded in the AOI were time-aligned to UTC and cross-referenced against
              flight tracks. In one aligned pair, an elevated physiological-stress reading coincided within a
              30-second window with an aircraft loitering at 1,500 ft overhead <Stamp kind="REPORTED" />.
            </p>
            <p className="text-sm leading-relaxed mt-3 opacity-80">
              This is a correlation in a small sample and nothing more. It does not establish causation, and
              it is presented as one recorded coincidence in the log, not as a health finding. It is included
              because withholding it would be a selection decision.
            </p>
          </div>
        </section>

        {/* ---------------- Submissions ---------------- */}
        <section className="mb-14">
          <h2 className="text-3xl sm:text-4xl mb-2">Where this record is going</h2>
          <p className="max-w-3xl mb-6 text-sm opacity-80">
            Four enforcement submission packages, each built from the same public record shown on this site.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {SUBMISSIONS.map((s, i) => (
              <div key={s.body} className="brutal-border-thick p-5">
                <div className="label-stamp text-[10px] bg-warning inline-block px-1 mb-2">
                  Package {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-xl mb-1">{s.body}</h3>
                <div className="font-bold text-sm mb-2">{s.filing}</div>
                <p className="text-sm opacity-80">{s.basis}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/toolkit/foia" className="label-stamp bg-ink text-paper px-5 py-3 brutal-shadow-warning">
              File your own records request →
            </Link>
            <Link to="/act" className="label-stamp brutal-border bg-warning px-5 py-3">
              Take action →
            </Link>
          </div>
        </section>

        {/* ---------------- Verification footer ---------------- */}
        <section className="brutal-border-thick bg-ink text-paper p-6 mb-8">
          <h2 className="text-2xl mb-3">Check it yourself</h2>
          <p className="text-sm opacity-90 max-w-3xl">
            All data referenced in this document is drawn from public sources — FAA ADS-B broadcasts, public
            corporate filings, and published regulations — and is independently verifiable by any member of
            the public. Detection counts, sub-1,000 ft counts, average low altitudes, county-crossing
            footprints, and transponder-casing row counts on this page were re-queried against the live
            public-data database on {VERIFIED_AT}. Figures stamped REPORTED come from the filing entity&rsquo;s
            own archive and are not reproducible from this site&rsquo;s database.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { to: "/live", label: "Live Feed" },
              { to: "/findings", label: "Findings" },
              { to: "/violations", label: "Violations ledger" },
              { to: "/attestation", label: "Chain of custody" },
              { to: "/methodology", label: "Methodology" },
              { to: "/reports", label: "All reports" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="label-stamp brutal-border border-paper px-3 py-2 text-[11px] hover:bg-warning hover:text-ink">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-xs opacity-70 mt-5">
            Watchtower Project LLC — civilian-led, AI-assisted airspace accountability. Editorial framing and
            legal interpretation are the work of Watchtower Project LLC and not the output of the
            non-biased machine-learning layer.
          </p>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
