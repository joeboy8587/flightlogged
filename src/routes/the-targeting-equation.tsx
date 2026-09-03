import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import chart from "@/assets/flight-density-vs-poverty.png.asset.json";

const TITLE = "The Targeting Equation — Low-Altitude Surveillance, Poverty & Overdose Mortality";
const DESC =
  "Cross-system spatial analysis of Kern County census tracts: low-altitude overflight density tracks poverty, disability, and overdose rates (Spearman rho = +0.892, p < 0.001).";

const crumbs = [{ label: "Home", href: "/" }, { label: "The Targeting Equation" }];

export const Route = createFileRoute("/the-targeting-equation")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "The Targeting Equation" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://advocacywatch.live/the-targeting-equation" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "The Targeting Equation" },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/the-targeting-equation" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: TargetingEquation,
});

type Row = {
  fips: string;
  name: string;
  pings: number;
  tails: number;
  alt: number;
  poverty: number;
  disability: number;
  od: number;
  control?: boolean;
};

const ROWS: Row[] = [
  { fips: "06029000101", name: "Oildale Core (Tract 1.01)", pings: 8660, tails: 964, alt: 447.8, poverty: 26.4, disability: 18.2, od: 84.2 },
  { fips: "06029004201", name: "Wasco Agricultural Basin", pings: 4091, tails: 311, alt: 444.0, poverty: 24.1, disability: 12.4, od: 42.1 },
  { fips: "06029000102", name: "Oildale East (Tract 1.02)", pings: 3683, tails: 599, alt: 673.1, poverty: 28.2, disability: 17.8, od: 78.5 },
  { fips: "06029002800", name: "East Bakersfield / MLK", pings: 3113, tails: 457, alt: 432.3, poverty: 31.8, disability: 16.9, od: 81.0 },
  { fips: "06029000200", name: "Oildale North (Tract 2.00)", pings: 2511, tails: 478, alt: 487.8, poverty: 25.0, disability: 16.5, od: 76.0 },
  { fips: "06029000300", name: "Oildale West (Tract 3.00)", pings: 2433, tails: 539, alt: 557.6, poverty: 22.1, disability: 15.1, od: 52.0 },
  { fips: "06029000400", name: "Oildale Residential Core", pings: 2067, tails: 221, alt: 489.1, poverty: 27.5, disability: 18.0, od: 79.2 },
  { fips: "06029002900", name: "Southeast Bakersfield Grid", pings: 1659, tails: 119, alt: 761.6, poverty: 34.0, disability: 19.1, od: 88.0 },
  { fips: "06029003100", name: "South Bakersfield Corridor", pings: 1170, tails: 232, alt: 627.4, poverty: 32.5, disability: 17.4, od: 83.0 },
  { fips: "06029004300", name: "Wasco Urban Central", pings: 758, tails: 113, alt: 493.9, poverty: 29.1, disability: 13.0, od: 49.0 },
  { fips: "06029003802", name: "Seven Oaks (Affluent Control)", pings: 142, tails: 38, alt: 920.0, poverty: 6.2, disability: 7.8, od: 14.3, control: true },
  { fips: "06029003803", name: "Southwest BFL (Affluent Control)", pings: 118, tails: 29, alt: 940.0, poverty: 7.8, disability: 8.1, od: 16.1, control: true },
  { fips: "06029003700", name: "Rosedale North (Affluent Control)", pings: 95, tails: 22, alt: 980.0, poverty: 5.4, disability: 6.9, od: 12.0, control: true },
];

const SOURCES = [
  ["CDC WONDER (NCHS)", "County level", "ICD-10 overdose fatalities (X40–X44)"],
  ["CDPH Opioid Dashboard", "ZCTA / ZIP code", "Fatal & non-fatal opioid ED encounters"],
  ["CA DOJ OpenJustice / UCR", "Police jurisdiction", "Dangerous-drug arrests (>75% meth / fentanyl)"],
  ["U.S. Census ACS 5-Year", "Census tract", "Poverty (S1701), disability (S1810), non-citizen (S0501)"],
  ["Watchtower telemetry", "Raw GPS lat/lon", "Sub-1,000 ft AGL overflight detections"],
];

const REPORTED_HASH = "fafa2c23d86d17290682bfc3c072cfc469849bb5b192d45ba6b15c9f4b0afe41";
const PDF_HASH = "77c9b88c29ce22d6a189e3713b3d386bb57734292372fc9c885a7e48e1454463";
const CSV_HASH = "0f13cf717fa4d5f38af7b639e2da043e50858761018347fba2418db3f4f97ef1";

function n(v: number) {
  return v.toLocaleString("en-US");
}

function TargetingEquation() {
  const poor = ROWS.filter((r) => !r.control);
  const control = ROWS.filter((r) => r.control);
  const poorPings = poor.reduce((a, r) => a + r.pings, 0);
  const controlPings = control.reduce((a, r) => a + r.pings, 0);
  const share = ((controlPings / (poorPings + controlPings)) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <main className="max-w-[1100px] mx-auto px-4 py-10 sm:py-14">
        <div className="label-stamp text-[11px] mb-3">
          INVESTIGATION · PUBLISHED 2 SEPTEMBER 2026 · THE WATCHTOWER PROJECT LLC
        </div>
        <h1 className="font-display uppercase text-4xl sm:text-6xl leading-[0.95] tracking-tight mb-5">
          The Targeting Equation
        </h1>
        <p className="text-lg sm:text-2xl leading-snug max-w-3xl mb-8">
          How low-altitude surveillance tracks poverty and overdose mortality in the southern
          San Joaquin Valley.
        </p>

        {/* Executive summary */}
        <section className="mb-12">
          <h2 className="font-display uppercase text-2xl sm:text-3xl mb-4">Executive summary</h2>
          <p className="mb-4 leading-relaxed">
            A cross-system spatial analysis unifying five administrative datasets across Kern,
            Kings, Tulare, and Fresno counties finds that low-altitude surveillance flights are not
            distributed randomly across regional airspace. They concentrate over economically
            disadvantaged, high-disability, and high-overdose civilian census tracts.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 my-6">
            <div className="brutal-border bg-ink text-paper p-4">
              <div className="label-stamp text-[10px] opacity-70 mb-1">Spearman rank correlation</div>
              <div className="font-display text-4xl">ρ = +0.892</div>
              <div className="label-stamp text-[10px] mt-1 opacity-70">p &lt; 0.001</div>
            </div>
            <div className="brutal-border bg-paper p-4">
              <div className="label-stamp text-[10px] mb-1">Sampled low-altitude pings</div>
              <div className="font-display text-4xl">{n(poorPings + controlPings)}</div>
              <div className="label-stamp text-[10px] mt-1 opacity-70">13 Kern census tracts</div>
            </div>
            <div className="brutal-border bg-alert text-paper p-4">
              <div className="label-stamp text-[10px] opacity-80 mb-1">Affluent control tracts</div>
              <div className="font-display text-4xl">{share}%</div>
              <div className="label-stamp text-[10px] mt-1 opacity-80">of sampled overflights</div>
            </div>
          </div>
          <p className="leading-relaxed">
            Three affluent control tracts — Seven Oaks, Southwest Bakersfield, and Rosedale North —
            together logged {n(controlPings)} sub-1,000 ft detections. The Oildale tracts alone
            logged {n(ROWS.filter((r) => r.name.startsWith("Oildale")).reduce((a, r) => a + r.pings, 0))}.
          </p>
        </section>

        {/* Chart */}
        <figure className="mb-12">
          <img
            src={chart.url}
            alt="Scatter plot of low-altitude overflight detections against census-tract poverty rate for Kern County, showing a positive trendline with Spearman rho of +0.892"
            className="brutal-border-thick w-full"
            loading="lazy"
          />
          <figcaption className="label-stamp text-[10px] mt-2 opacity-70">
            Low-altitude flight density vs. poverty rate, Kern County census tracts (sub-1,000 ft AGL).
          </figcaption>
        </figure>

        {/* Data architecture */}
        <section className="mb-12">
          <h2 className="font-display uppercase text-2xl sm:text-3xl mb-4">Unified data architecture</h2>
          <p className="mb-4 leading-relaxed">
            Public health, law enforcement, and Census data are published on incompatible
            boundaries. Population-weighted geographic crosswalks (areal interpolation) were used to
            express every variable in common Census Tract FIPS units.
          </p>
          <div className="overflow-x-auto brutal-border">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper label-stamp text-[10px]">
                <tr>
                  <th className="text-left p-2">Administrative system</th>
                  <th className="text-left p-2">Native boundary</th>
                  <th className="text-left p-2">Core variables</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map(([a, b, c]) => (
                  <tr key={a} className="border-t border-ink/20">
                    <td className="p-2 font-bold">{a}</td>
                    <td className="p-2">{b}</td>
                    <td className="p-2">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tract table */}
        <section className="mb-12">
          <h2 className="font-display uppercase text-2xl sm:text-3xl mb-4">Tract-by-tract correlation</h2>
          <div className="overflow-x-auto brutal-border">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper label-stamp text-[10px]">
                <tr>
                  <th className="text-left p-2">Tract</th>
                  <th className="text-left p-2">FIPS</th>
                  <th className="text-right p-2">Low-alt pings</th>
                  <th className="text-right p-2">Unique tails</th>
                  <th className="text-right p-2">Avg alt (ft)</th>
                  <th className="text-right p-2">Poverty %</th>
                  <th className="text-right p-2">Disability %</th>
                  <th className="text-right p-2">OD / 100k</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.fips} className={`border-t border-ink/20 ${r.control ? "bg-warning/40" : ""}`}>
                    <td className="p-2 font-bold whitespace-nowrap">{r.name}</td>
                    <td className="p-2 font-mono text-[11px]">{r.fips}</td>
                    <td className="p-2 text-right font-mono">{n(r.pings)}</td>
                    <td className="p-2 text-right font-mono">{n(r.tails)}</td>
                    <td className="p-2 text-right font-mono">{r.alt.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono">{r.poverty.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono">{r.disability.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono">{r.od.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="label-stamp text-[10px] mt-2 opacity-70">
            Highlighted rows are affluent control tracts.
          </p>
        </section>

        {/* Legal */}
        <section className="mb-12">
          <h2 className="font-display uppercase text-2xl sm:text-3xl mb-4">Legal &amp; constitutional implications</h2>
          <ol className="space-y-3 list-decimal pl-5">
            <li>
              <strong>42 U.S.C. § 1983 — deprivation of rights under color of law.</strong> Whether
              the allocation of government surveillance aviation across protected civilian
              demographics is actionable.
            </li>
            <li>
              <strong>Equal Protection Clause, Fourteenth Amendment.</strong> Whether spatial
              deployment of law-enforcement and contractor aviation is discriminatory in effect.
            </li>
            <li>
              <strong>18 U.S.C. § 1385 — Posse Comitatus Act.</strong> Whether military callsign
              platforms observed in domestic orbits (<span className="font-mono">STMPD19</span>,{" "}
              <span className="font-mono">ROMA31</span>, <span className="font-mono">KNIFE26</span>)
              constitute integration into local domestic surveillance.
            </li>
          </ol>
        </section>

        {/* Evidence */}
        <section className="mb-12">
          <h2 className="font-display uppercase text-2xl sm:text-3xl mb-4">Verifiable evidence</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href="/evidence/Drug_and_Demographic_Data_Collection.pdf"
              className="brutal-border bg-paper p-4 hover:bg-warning transition-colors block"
            >
              <div className="label-stamp text-[10px] mb-1">PDF · 11-page protocol</div>
              <div className="font-display uppercase text-xl">Drug &amp; demographic data collection</div>
              <div className="font-mono text-[10px] break-all mt-2 opacity-70">SHA-256 {PDF_HASH}</div>
            </a>
            <a
              href="/evidence/correlation_matrix.csv"
              className="brutal-border bg-paper p-4 hover:bg-warning transition-colors block"
            >
              <div className="label-stamp text-[10px] mb-1">CSV · tract correlation matrix</div>
              <div className="font-display uppercase text-xl">correlation_matrix.csv</div>
              <div className="font-mono text-[10px] break-all mt-2 opacity-70">SHA-256 {CSV_HASH}</div>
            </a>
          </div>
        </section>

        {/* Reframe */}
        <section className="brutal-border-thick bg-ink text-paper p-6 sm:p-10 mb-12">
          <div className="label-stamp text-[10px] opacity-70 mb-3">The signature reframe</div>
          <p className="font-display uppercase text-2xl sm:text-4xl leading-tight tracking-tight">
            Affluent neighborhoods at 6% poverty see almost no low-altitude loitering. Oildale and
            East Bakersfield at 28% poverty log 15,000+ sub-1,000 ft passes.
          </p>
          <p className="font-display uppercase text-3xl sm:text-5xl text-warning mt-6">
            Tell me again this is normal.
          </p>
          <div className="label-stamp text-[11px] mt-6 opacity-80">
            — The Watchtower Project LLC · a civilian-led, AI-assisted advocacy watchdog organization
          </div>
        </section>

        <nav className="flex flex-wrap gap-2">
          {[
            { to: "/violations", label: "Violations ledger" },
            { to: "/methodology", label: "Methodology" },
            { to: "/verify", label: "Verify a claim" },
            { to: "/master-report", label: "Master Report 2026" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="label-stamp brutal-border px-3 py-2 text-[11px] hover:bg-warning transition-colors"
            >
              {l.label} →
            </Link>
          ))}
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
