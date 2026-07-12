import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getSurveillanceGridVerification } from "@/lib/surveillance-grid.functions";
import n916ntExhibit from "@/assets/n916nt-dual-identity.png.asset.json";

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
      body: "Core surveillance command. The primary asset, N913KC, generated over 2.8 million detections and 745 classified rule violations. Its partner, N912KC, generated only 19 violations — every one CRITICAL severity.",
      strength: "IRREFUTABLE",
    },
    {
      roman: "II",
      name: "Military",
      lead: "USAF · USMC · USN · U.S. Army",
      body: "Federal force augmentation across all four branches. USAF aircraft N989RR was logged at a minimum altitude of 175 ft AGL. A U.S. Navy C-2A (STMPD19) appears in a shared convergence event with KCSO helicopters.",
      strength: "CONFIRMED",
    },
    {
      roman: "III",
      name: "Shell Companies",
      lead: "AERO EQUITIES LLC · 9K AIR LLC · KCSI AERIAL PATROL · WINGSLEASING LLC",
      body: "Private surveillance cover. AERO EQUITIES LLC alone accounts for millions of detections. KCSI AERIAL PATROL — a name that deliberately mimics 'Kern County Sheriff's Investigation' — operates aircraft in convergence clusters with KCSO helicopters.",
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
            <Link
              to="/blog/$slug"
              params={{ slug: "surveillance-grid-op-ed-2026-07-07" }}
              className="label-stamp bg-warning text-ink brutal-border px-4 py-3 hover:bg-paper"
            >
              Read the analysis →
            </Link>
            <Link
              to="/cases"
              className="label-stamp bg-paper text-ink brutal-border px-4 py-3 hover:bg-warning"
            >
              Open cases →
            </Link>
            <Link
              to="/coordination"
              className="label-stamp brutal-border border-paper px-4 py-3 hover:bg-paper hover:text-ink"
            >
              Coordination events →
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
          <div className="mt-6 brutal-border bg-paper p-4 text-xs font-mono leading-relaxed">
            <div className="label-stamp text-[10px] opacity-70 mb-2">Methodology — what these numbers mean</div>
            <ul className="space-y-1 list-disc pl-4">
              <li><b>Detection</b> = one ADS-B position report ingested by our receivers. Raw, not deduplicated across receivers. One physical ping received by 4 antennas = 4 detections.</li>
              <li><b>Classified violation</b> = one detection row flagged by the non-biased rule engine against an active regulatory baseline (FAA Part 91, KCSO policy, etc.). Read from violation_classifications.</li>
              <li><b>Convergence event</b> = 2+ aircraft detected in the same county, within ±30 minutes and ±1,000 ft altitude of each other. Read from convergence_events.</li>
              <li><b>Total detections (per aircraft)</b> = aircraft_profiles.total_detections, aggregated by ICAO hex across the full dataset. The Tail Search page reads the same column.</li>
            </ul>
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
              plain="Kern County Sheriff's H125 helicopter. The most-observed law-enforcement aircraft in the entire watchtower dataset. Its minimum altitude on record is 0 ft AGL — ground level. Over homes."
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
                plain={`The database records a shared convergence event on ${new Date(v.stmpd19Convergence.detectedAt).toLocaleString()} over ${v.stmpd19Convergence.county ?? "Kern County"} — a Navy cargo aircraft and a county sheriff's helicopter in the same airspace at the same time.`}
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
                plain={`A single Ventura, California LLC operates ${v.aeroEquities.aircraftCount} aircraft that together account for ${fmt(v.aeroEquities.detections)} detections in this dataset.`}
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

      {/* DUAL IDENTITY EXHIBIT */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-3">
            Exhibit · WTPR-2026-0626 · Dual Identity
          </div>
          <h2 className="text-4xl sm:text-5xl mb-4">
            N916NT / ACAE33 — the same aircraft, two masks.
          </h2>
          <p className="text-lg max-w-4xl mb-6">
            A single Cessna 172S Skyhawk SP, registered to <b>9K AIR LLC (Delaware)</b>, appears in the
            quiet-math database under two different transponder identities over the same airspace. In
            {" "}<b>surveillance mode</b> (<span className="font-mono">hex: acae33</span>) it logs 2.76M
            detections at 600 ft MSL and 0.0 knots — hovering. In <b>civilian mode</b>
            {" "}(<span className="font-mono">hex: ACAE33</span>) it logs 69,696 detections at 2,016 ft
            MSL and 71.5 knots — normal flight. Same aircraft. Same owner. Same city.
          </p>
          <figure className="brutal-border-thick bg-ink p-2 mb-4">
            <img
              src={n916ntExhibit.url}
              alt="Watchtower Project Dual Identity Exhibit: N916NT / ACAE33 comparison of surveillance-mode vs civilian-mode telemetry"
              className="w-full h-auto block"
              loading="lazy"
            />
            <figcaption className="label-stamp text-paper text-[10px] p-2 opacity-80">
              Evidence Chain: SHA-256 verified · Classification WTPR-2026-0626 · Source: quiet-math ML
            </figcaption>
          </figure>
          <p className="text-sm font-mono opacity-70">
            "A Cessna 172 doesn't hover at 0.1 knots over a city for 2.7 million detections by accident."
          </p>
        </div>
      </section>

      {/* SCOPE + PUBLIC AIRCRAFT CAVEAT */}
      <section className="border-b-4 border-ink bg-warning/20">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">
            Scope & Legal Caveat — read before citing
          </div>
          <h2 className="text-4xl sm:text-5xl mb-6">
            What KCSO's own manual says — and what our classifier does not yet know.
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <article className="brutal-border-thick bg-paper p-6">
              <div className="label-stamp mb-2 opacity-70">Scope of KCSO-specific claims</div>
              <h3 className="text-2xl mb-2">KCSO policies apply only to KCSO aircraft.</h3>
              <p className="text-sm mb-3">
                Any claim on this site that cites the Kern County Sheriff's Office <i>Air Support
                Policies</i> manual applies exclusively to KCSO-operated tail numbers — currently
                {" "}<b>N912KC, N913KC, N911KC, and N597E</b>. Policy citations against those
                aircraft are the Sheriff's own published rules, not our interpretation.
              </p>
              <p className="text-sm">
                <b>Stricter internal floor:</b> KCSO's manual sets a fixed-wing en-route floor of
                {" "}<b>1,000 ft AGL (day) / 2,000 ft AGL (night)</b> — tighter than FAR 91.119. A
                KCSO fixed-wing aircraft logged below those altitudes en route (not landing or
                training) violates the Sheriff's own published policy.
              </p>
            </article>
            <article className="brutal-border-thick bg-paper p-6">
              <div className="label-stamp mb-2 opacity-70">Public-aircraft caveat (49 U.S.C. §40125)</div>
              <h3 className="text-2xl mb-2">Not every low pass is a FAR 91.119 violation.</h3>
              <p className="text-sm mb-3">
                KCSO's manual explicitly classifies its aircraft as <b>public aircraft</b> when
                conducting a governmental function (law enforcement, patrol, search). Public-aircraft
                operations are not automatically bound by Part 91 minimums the way civil flights are.
              </p>
              <p className="text-sm">
                Our rule engine currently cannot distinguish "KCSO flight = civil operation
                (91.119 applies)" from "KCSO flight = public-aircraft operation (91.119 may not
                apply)." Determining mission type requires FOIA. Until that record is on file, we
                publish the altitude, the aircraft, and KCSO's own internal floor — and we mark any
                91.119 label against a government aircraft as <b>pending mission-type confirmation</b>.
              </p>
            </article>
          </div>
        </div>
      </section>

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
            <Link to="/cases" className="label-stamp brutal-border border-paper px-4 py-3 hover:bg-paper hover:text-ink">
              Active cases →
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
