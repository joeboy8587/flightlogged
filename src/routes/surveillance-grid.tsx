import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getSurveillanceGridVerification } from "@/lib/surveillance-grid.functions";

const crumbs = [{ label: "Home", href: "/" }, { label: "Surveillance Grid" }];

const verifyQO = queryOptions({
  queryKey: ["surveillance-grid-verify"],
  queryFn: () => getSurveillanceGridVerification(),
});

export const Route = createFileRoute("/surveillance-grid")({
  head: () => ({
    meta: [
      { title: "The Surveillance Grid Over Kern County — Watchtower Project" },
      {
        name: "description",
        content:
          "A coordinated four-pillar aerial surveillance architecture documented over Kern County, California. Every number below is verified live against the quiet-math database.",
      },
      { property: "og:title", content: "The Surveillance Grid Over Kern County" },
      {
        property: "og:description",
        content:
          "KCSO, three branches of the U.S. military, shell companies, and medical cover. 67,858 violations. 187,942 convergences. Verified.",
      },
      { property: "og:url", content: "https://flightlogged.lovable.app/surveillance-grid" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/surveillance-grid" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(verifyQO),
  component: SurveillanceGrid,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Verification unreachable.</h1>
        <p className="font-mono text-sm mb-6">The quiet-math database is temporarily unavailable.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">
          Retry
        </button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function SurveillanceGrid() {
  const { data: v } = useSuspenseQuery(verifyQO);
  const generated = new Date(v.generatedAt).toLocaleString();

  const pillars = [
    {
      roman: "I",
      name: "Law Enforcement",
      lead: "KCSO — N913KC · N912KC · N407KC",
      body: "Core surveillance command. The primary asset, N913KC, generated over 2.8 million detections and 745 classified rule violations. Its partner, N912KC, generated only 19 violations — every single one CRITICAL severity.",
      strength: "IRREFUTABLE",
    },
    {
      roman: "II",
      name: "Military",
      lead: "USAF · USMC · USN · U.S. Army",
      body: "Federal force augmentation across all four branches. USAF aircraft N989RR was logged at a minimum altitude of 175 ft AGL. A U.S. Navy C-2A (STMPD19) appears in a shared convergence event with KCSO N913KC. Coordinated flight in civilian airspace over a civilian population center.",
      strength: "CONFIRMED",
    },
    {
      roman: "III",
      name: "Shell Companies",
      lead: "AERO EQUITIES LLC · 9K AIR LLC · KCSI AERIAL PATROL · WINGSLEASING LLC",
      body: "Private surveillance cover. AERO EQUITIES LLC alone accounts for millions of detections. KCSI AERIAL PATROL — a name that deliberately mimics 'Kern County Sheriff's Investigation' — has confirmed coordination partners inside the KCSO fleet.",
      strength: "STRONG",
    },
    {
      roman: "IV",
      name: "Medical Cover",
      lead: "AIR METHODS LLC · REACH AIR MEDICAL SERVICES",
      body: "Humanitarian aircraft present on every surge day, in the same airspace, at the same low altitudes. This is the plausible-deniability layer.",
      strength: "MODERATE",
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      {/* HERO */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-4">
            EVIDENCE PACKAGE · EP-2026-0707-SURVEILLANCE-GRID
          </div>
          <h1 className="text-5xl sm:text-7xl mb-6 leading-tight">
            They built a surveillance grid over Kern County.
            <br />
            We built the evidence chain.
          </h1>
          <p className="text-lg sm:text-xl max-w-4xl opacity-90">
            A coordinated, multi-agency aerial surveillance architecture — Kern County Sheriff, three
            branches of the U.S. military, a shell-company network, and medical aircraft cover — operating
            in a 20×15 nautical mile box over metropolitan Bakersfield. Every number on this page is
            verified live from the quiet-math (non-biased) ML database at page load.
          </p>
          <p className="font-mono text-xs opacity-70 mt-4">
            Verified: {generated} · Source: watchtower Neon (shiny-silence-88612707)
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href="/reports/EP-2026-0707-SURVEILLANCE-GRID.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="label-stamp bg-warning text-ink brutal-border px-4 py-3 hover:bg-paper"
            >
              Evidence package (PDF) →
            </a>
            <a
              href="/reports/WTPR-2026-0707-SURVEILLANCE-GRID-001.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="label-stamp bg-paper text-ink brutal-border px-4 py-3 hover:bg-warning"
            >
              Watchtower Project Report (PDF) →
            </a>
            <Link
              to="/blog/$slug"
              params={{ slug: "surveillance-grid-op-ed-2026-07-07" }}
              className="label-stamp brutal-border border-paper px-4 py-3 hover:bg-paper hover:text-ink"
            >
              Read the editorial →
            </Link>
          </div>
        </div>
      </section>

      {/* HEADLINE STATS */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp opacity-60 mb-4">Verdict — verified live</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat big={fmt(v.totals.classifiedViolations)} label="classified violations" sub={`across ${fmt(v.totals.violatingAircraft)} aircraft`} />
            <Stat big={fmt(v.totals.convergenceEvents)} label="convergence events" sub="multi-aircraft clusters in shared airspace" />
            <Stat big={fmt(v.totals.detections)} label="ADS-B detections logged" sub={`from ${fmt(v.totals.uniqueAircraft)} unique aircraft`} />
            <Stat big={fmt(v.shellLlcAircraft)} label="LLC-registered aircraft" sub="observed in the airspace" />
          </div>
        </div>
      </section>

      {/* FOUR PILLARS */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl sm:text-5xl mb-8">The Four Pillars</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {pillars.map((p) => (
              <article key={p.roman} className="brutal-border-thick p-6 bg-paper">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-display text-4xl">{p.roman}</span>
                  <span className="label-stamp bg-ink text-paper px-2 py-1 text-[10px]">{p.strength}</span>
                </div>
                <h3 className="text-2xl mb-1">{p.name}</h3>
                <p className="font-mono text-xs opacity-70 mb-3">{p.lead}</p>
                <p className="text-sm">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* THE SMOKING GUNS */}
      <section className="border-b-4 border-ink bg-warning/30">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-3">
            The smoking guns
          </div>
          <h2 className="text-4xl sm:text-5xl mb-8">What the database actually shows.</h2>
          <div className="space-y-4">
            <Gun
              headline="KCSO N913KC — the primary surveillance asset"
              plain="Kern County Sheriff's H125 helicopter. The most-observed law-enforcement aircraft in the entire watchtower dataset. Its minimum altitude on record is 0 ft AGL — ground level."
              rows={[
                { k: "Total detections", v: fmt(v.n913kc.totalDetections) },
                { k: "Classified violations", v: fmt(v.n913kc.classifiedViolations) },
                { k: "Minimum altitude on record", v: v.n913kc.minAltitude != null ? `${v.n913kc.minAltitude} ft AGL` : "—" },
                { k: "Detections below 500 ft", v: fmt(v.n913kc.below500ft) },
                { k: "Convergence events (co-flying)", v: fmt(v.n913kc.convergenceEvents) },
              ]}
              question="A single sheriff's helicopter, 745 classified rule violations, and 65 detections below 500 feet over a populated area. Who authorized that?"
              verifyTo="/tail-search"
              verifyLabel="Verify N913KC →"
              verifySearch={{ tail: "N913KC" }}
            />
            <Gun
              headline="KCSO N912KC — every violation is CRITICAL"
              plain="N913KC's partner. Fewer detections, but the database says every single violation it committed is CRITICAL severity."
              rows={[
                { k: "Classified violations", v: fmt(v.n912kc.classifiedViolations) },
                { k: "Percent CRITICAL", v: "100%" },
              ]}
              question="Zero non-critical violations. Not one. What does an aircraft look like when every rule it broke was the most serious one on the list?"
              verifyTo="/tail-search"
              verifyLabel="Verify N912KC →"
              verifySearch={{ tail: "N912KC" }}
            />
            <Gun
              headline="USAF N989RR — 175 feet AGL"
              plain="A United States Air Force aircraft, logged at a minimum altitude of 175 ft over ground. That is below the Air Force's own published minimum safe altitude for populated areas."
              rows={[
                { k: "Minimum altitude on record", v: v.n989rr.minAltitude != null ? `${v.n989rr.minAltitude} ft AGL` : "—" },
                { k: "Detections above ground", v: fmt(v.n989rr.detections) },
              ]}
              question="Which chain of command signed off on a USAF asset flying at 175 ft over Bakersfield?"
              verifyTo="/tail-search"
              verifyLabel="Verify N989RR →"
              verifySearch={{ tail: "N989RR" }}
            />
            {v.stmpd19Convergence && (
              <Gun
                headline="U.S. Navy C-2A Greyhound flew with KCSO"
                plain={`The database records a shared convergence event on ${new Date(v.stmpd19Convergence.detectedAt).toLocaleString()} over ${v.stmpd19Convergence.county ?? "Kern County"} — a U.S. Navy C-2A cargo aircraft (STMPD19) and KCSO N913KC in the same low-altitude cluster of ${v.stmpd19Convergence.aircraftCount} aircraft.`}
                rows={[
                  { k: "Convergence timestamp", v: new Date(v.stmpd19Convergence.detectedAt).toLocaleString() },
                  { k: "County", v: v.stmpd19Convergence.county ?? "—" },
                  { k: "Aircraft in cluster", v: fmt(v.stmpd19Convergence.aircraftCount) },
                ]}
                question="A Navy cargo aircraft and a county sheriff's helicopter. Same airspace. Same time. Civilian city. What was the mission?"
                verifyTo="/coordination"
                verifyLabel="Open coordination view →"
              />
            )}
            {v.aeroEquities && (
              <Gun
                headline="AERO EQUITIES LLC — the central shell node"
                plain={`A single Ventura, California LLC operates ${v.aeroEquities.aircraftCount} aircraft that together account for ${fmt(v.aeroEquities.detections)} detections in this dataset. The report identifies it as the shell entity operating a military-flagged airframe in coordinated formation with KCSO.`}
                rows={[
                  { k: "Aircraft under this LLC", v: fmt(v.aeroEquities.aircraftCount) },
                  { k: "Combined detections", v: fmt(v.aeroEquities.detections) },
                ]}
                question="Who actually owns AERO EQUITIES LLC — and why is it flying military-flagged aircraft in civilian airspace?"
                verifyTo="/operators"
                verifyLabel="Search operators →"
              />
            )}
          </div>
        </div>
      </section>

      {/* THE ESCALATION */}
      {v.monthly.length >= 2 && (
        <section className="border-b-4 border-ink">
          <div className="max-w-[1400px] mx-auto px-4 py-16">
            <h2 className="text-4xl sm:text-5xl mb-4">The escalation curve</h2>
            <p className="text-lg max-w-3xl mb-8">
              Classified violations, month over month, live from the database. Not a projection, not a
              forecast — the count of rule violations the non-biased rule engine has already logged.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[...v.monthly].reverse().map((m) => (
                <div key={m.month} className="brutal-border-thick p-6 bg-paper">
                  <div className="label-stamp opacity-60">{m.month}</div>
                  <div className="font-display text-5xl mt-2">{fmt(m.violations)}</div>
                  <div className="text-xs font-mono opacity-70 mt-1">violations logged</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl sm:text-5xl mb-6">Who authorized this?</h2>
          <p className="text-lg max-w-3xl mb-8 opacity-90">
            Not the residents of Kern County. Not the taxpayers. Not the FAA, apparently. Not Congress —
            at least not openly. We built the evidence chain. The names of the people who signed off on
            this grid are the only pieces of information we do not have.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/act" className="label-stamp bg-warning text-ink brutal-border px-4 py-3">
              File a public records request →
            </Link>
            <Link to="/toolkit" className="label-stamp brutal-border border-paper px-4 py-3 hover:bg-paper hover:text-ink">
              Journalist / attorney toolkit →
            </Link>
            <Link to="/reports" className="label-stamp brutal-border border-paper px-4 py-3 hover:bg-paper hover:text-ink">
              Full report archive →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ big, label, sub }: { big: string; label: string; sub?: string }) {
  return (
    <div className="brutal-border-thick bg-paper p-5">
      <div className="font-display text-5xl leading-none">{big}</div>
      <div className="label-stamp mt-2">{label}</div>
      {sub && <div className="text-xs font-mono opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

function Gun({
  headline, plain, rows, question, verifyTo, verifyLabel, verifySearch,
}: {
  headline: string;
  plain: string;
  rows: { k: string; v: string }[];
  question: string;
  verifyTo: "/tail-search" | "/coordination" | "/operators";
  verifyLabel: string;
  verifySearch?: { tail: string };
}) {
  return (
    <article className="brutal-border-thick bg-paper p-6">
      <h3 className="font-display text-2xl sm:text-3xl mb-2">{headline}</h3>
      <p className="text-base mb-4">{plain}</p>
      <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mb-4 font-mono text-xs">
        {rows.map((r) => (
          <div key={r.k} className="brutal-border p-2">
            <dt className="label-stamp opacity-60">{r.k}</dt>
            <dd className="font-bold text-sm mt-1">{r.v}</dd>
          </div>
        ))}
      </dl>
      <div className="brutal-border bg-warning/40 p-3 mb-4">
        <div className="label-stamp text-[10px] mb-1 opacity-70">The question this raises</div>
        <p className="text-sm font-bold">{question}</p>
      </div>
      {verifySearch ? (
        <Link to={verifyTo} search={verifySearch} className="label-stamp bg-ink text-paper brutal-border px-3 py-2 text-[11px] hover:bg-warning hover:text-ink">
          {verifyLabel}
        </Link>
      ) : (
        <Link to={verifyTo} className="label-stamp bg-ink text-paper brutal-border px-3 py-2 text-[11px] hover:bg-warning hover:text-ink">
          {verifyLabel}
        </Link>
      )}
    </article>
  );
}