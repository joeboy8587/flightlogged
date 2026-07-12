import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PullQuote } from "@/components/pull-quote";
import { StoryCard } from "@/components/story-card";
import { Mascot } from "@/components/mascot";
import { getSnapshot, getRecentLowAltitude } from "@/lib/watchtower.functions";

const snapshotQO = queryOptions({
  queryKey: ["snapshot"],
  queryFn: () => getSnapshot(),
});
const lowAltQO = queryOptions({
  queryKey: ["low-alt"],
  queryFn: () => getRecentLowAltitude(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Architecture of Never — Civilian Airspace Watchdog" },
      { name: "description", content: "The first civilian-led, AI-assisted airspace accountability organization. Population-scale. Anti-bias. Court-ready." },
      { property: "og:title", content: "The Architecture of Never — Civilian Airspace Watchdog" },
      { property: "og:description", content: "The machine watches. The math chooses. The record stands." },
      { property: "og:url", content: "https://advocacywatch.live/" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(snapshotQO),
    context.queryClient.ensureQueryData(lowAltQO),
  ]),
  component: Home,
  errorComponent: ({ reset }) => (
    <div className="p-10"><h1 className="text-4xl mb-4">Signal lost.</h1><p className="mb-4">Data temporarily unavailable. Please try again.</p><button onClick={reset} className="brutal-border px-4 py-2 label-stamp bg-warning">Retry</button></div>
  ),
});

function fmt(n: number) { return n.toLocaleString(); }

function Home() {
  const { data: s } = useSuspenseQuery(snapshotQO);
  const { data: low } = useSuspenseQuery(lowAltQO);
  // Top 3 stories — lowest-altitude airborne detections, de-duplicated by aircraft.
  // Filter out likely ground/parked artifacts (altitude 0 with no forward speed)
  // so we don't publish a landed helicopter as a "sub-500 ft pass over homes".
  const seenIcao = new Set<string>();
  const stories = [...low]
    .filter((r) => r.altitude != null)
    .filter((r) => {
      const alt = r.altitude ?? 0;
      const spd = r.speed ?? null;
      // Suppress obvious ground positions: 0 ft AND (no speed reported OR < 10 kt).
      if (alt <= 5 && (spd == null || spd < 10)) return false;
      return true;
    })
    .sort((a, b) => (a.altitude ?? 99999) - (b.altitude ?? 99999))
    .filter((r) => {
      if (seenIcao.has(r.icao)) return false;
      seenIcao.add(r.icao);
      return true;
    })
    .slice(0, 3);
  const stats = [
    { label: "Detections logged", value: fmt(s.totalDetections), accent: false },
    { label: "Unique aircraft", value: fmt(s.uniqueAircraft), accent: false },
    { label: "Anomaly events", value: fmt(s.anomalyEvents), accent: true },
    { label: "Court-ready detections", value: fmt(s.flightDetections), accent: true },
  ];
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      {/* MANIFESTO — the witness speaks */}
      <section className="bg-ink text-paper border-b-4 border-warning">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="label-stamp bg-warning text-ink px-2 py-1">Public data. Machine-chosen. Human-advocated. Verify everything.</span>
          <span className="opacity-90">
            Machine-generated evidence from public ADS-B broadcasts is presented alongside
            editorial analysis by <strong>Watchtower Project LLC</strong>. The data is
            independently verifiable. The analysis is our organization&apos;s protected advocacy position.
          </span>
        </div>
      </section>

      {/* WATCHTOWER ALERT — persistent hero */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12 sm:py-16 grid lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-8 min-w-0">
            <div className="label-stamp inline-flex items-center gap-2 bg-alert text-paper px-2 py-1 mb-5">
              <span className="w-2 h-2 bg-warning blink" /> Watchtower Alert · Standing notice · Updated live
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-5 leading-[1.05] break-words">
              FAA Project <span className="font-mono bg-ink text-paper px-2">T-WP17-FY26-0397</span>: agency
              acknowledged Oildale violations —{" "}
              <span className="bg-warning text-ink px-2">now silent while the conduct continues.</span>
            </h1>
            <p className="text-lg sm:text-xl mb-4 font-medium max-w-3xl">
              We reported systematic low-altitude flights over residential Oildale to the Federal Aviation
              Administration. The agency assigned a project number and named an investigator. For six months
              there has been no public movement — while our sensor network logged{" "}
              <strong>{fmt(s.totalDetections)}</strong> new detections across{" "}
              <strong>{fmt(s.uniqueAircraft)}</strong> aircraft and{" "}
              <strong>{fmt(s.anomalyEvents)}</strong> classified violations of the 14 CFR § 91.119 floor.
            </p>
            <p className="text-base sm:text-lg mb-8 max-w-3xl opacity-90">
              This page is the public notice. Every claim below links to a SHA-256 hashed, Merkle-chained
              record independently verifiable from public ADS-B broadcasts and the public FAA registry.
              Silence after this point is a choice — and it is on the record.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/surveillance-grid" className="label-stamp bg-ink text-paper px-5 py-3 brutal-shadow-warning hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                Read the full case →
              </Link>
              <Link to="/reports" className="label-stamp brutal-border bg-warning px-5 py-3 hover:bg-alert hover:text-paper transition-colors">
                Download evidence packet
              </Link>
              <Link to="/act" className="label-stamp brutal-border bg-alert text-paper px-5 py-3 hover:bg-ink transition-colors">
                Join the alert list
              </Link>
            </div>
          </div>
          <aside className="lg:col-span-4 min-w-0 brutal-border-thick bg-ink text-paper p-6">
            <div className="label-stamp text-warning mb-3">Accountability timeline</div>
            <ol className="space-y-3 text-sm font-medium">
              <li className="flex gap-3"><span className="font-mono text-warning shrink-0">01</span><span>Complaint filed with FAA citing 14 CFR § 91.119 &amp; § 91.13 violations over Oildale.</span></li>
              <li className="flex gap-3"><span className="font-mono text-warning shrink-0">02</span><span>FAA acknowledged. Project <span className="font-mono">T-WP17-FY26-0397</span> assigned; investigator named.</span></li>
              <li className="flex gap-3"><span className="font-mono text-warning shrink-0">03</span><span>Six months of silence. No status update. No disposition. No enforcement announced.</span></li>
              <li className="flex gap-3"><span className="font-mono text-warning shrink-0">04</span><span>Post-acknowledgment incidents continue — logged, hashed, published on this site.</span></li>
              <li className="flex gap-3"><span className="font-mono text-warning shrink-0">05</span><span>10-business-day status request re-issued to the assigned FAA inspector and the Fresno FSDO.</span></li>
            </ol>
            <div className="mt-5 pt-4 border-t border-paper/20">
              <div className="label-stamp text-warning mb-2 text-[10px]">Live count · 5-min cache</div>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((st) => (
                  <div key={st.label} className="min-w-0">
                    <div className="label-stamp opacity-60 text-[9px] truncate">{st.label}</div>
                    <div className={`font-mono text-lg font-bold tabular-nums truncate ${st.accent ? "text-warning" : ""}`}>{st.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Architecture of Never — moved below the fold */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12 sm:py-16 grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 min-w-0">
            <div className="label-stamp inline-flex items-center gap-2 bg-warning px-2 py-1 mb-4">
              <span className="w-2 h-2 bg-ink blink" /> System online · Baseline learning · {s.windowHours}h observed
            </div>
            <div className="flex items-start gap-4 mb-4">
              <Mascot size="lg" className="hidden sm:block shrink-0 -mt-2" />
              <p className="font-display text-xl sm:text-2xl italic opacity-80">
                They don&apos;t cause fear anymore. They build evidence.
              </p>
            </div>
            <h2 className="text-3xl sm:text-5xl mb-4 break-words">
              The sky over Kern County <span className="bg-ink text-paper px-2">is not normal.</span>
            </h2>
            <p className="text-base sm:text-lg max-w-2xl font-medium">
              We watched the sky for <strong>{s.windowHours} hours</strong>. Persistent low-altitude
              loitering, masked identities, night operations that don&apos;t match normal traffic. Every record
              SHA-256 hashed, Merkle-chained, independently verifiable.{" "}
              <strong>The machine watches. The math chooses. The record stands.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* THE BLIND MACHINE — anti-bias hero */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16 sm:py-20 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <div className="label-stamp bg-warning text-ink inline-block px-2 py-1 mb-4">The Blind Machine</div>
            <h2 className="text-4xl sm:text-6xl mb-6 leading-tight">
              The machine doesn&apos;t know who it&apos;s watching.<br />
              <span className="text-warning">That&apos;s the point.</span>
            </h2>
            <p className="text-lg mb-4 opacity-90">
              For the first 48 hours after a sensor comes online, Watchtower flags{" "}
              <strong className="text-warning">zero aircraft</strong>. It is learning what normal looks like.
              No allow-list. No watch-list. No human judgment about who counts as suspicious.
            </p>
            <p className="text-lg mb-4 opacity-90">
              After baseline, the math chooses. A sheriff&apos;s helicopter loitering at 400 ft and a private
              LLC loitering at 400 ft trigger the same flag. The system has no opinion about either of them.
              It only knows that 400 ft is below the FAA floor and that loitering for 90 minutes is not transit.
            </p>
            <p className="text-lg opacity-90">
              That&apos;s why the record survives cross-examination.{" "}
              <strong className="text-warning">Math chose it. Not a human.</strong>
            </p>
          </div>
          <aside className="lg:col-span-5 brutal-border-thick border-paper bg-paper text-ink p-6 self-start">
            <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-3">What counts as low?</div>
            <ul className="space-y-3 text-sm font-medium">
              <li><strong className="font-mono">1,500 ft</strong> — a helicopter can see your backyard.</li>
              <li><strong className="font-mono">1,000 ft</strong> — it can read your license plate.</li>
              <li><strong className="font-mono">500 ft</strong> — it can see through your windows.</li>
              <li><strong className="font-mono">Below 500 ft</strong> — it&apos;s inside the Dead Man&apos;s Curve. If the engine fails, there is not enough altitude for the rotor to autorotate.</li>
            </ul>
            <p className="mt-4 text-xs opacity-70 font-mono">
              Source: FAA AC 90-87C (Helicopter Height-Velocity Diagram), 14 CFR § 91.119 (minimum safe altitudes).
            </p>
          </aside>
        </div>
      </section>

      {/* RECENT STORIES — top 3 cards translated from the raw feed */}
      {stories.length > 0 && (
        <section className="border-b-4 border-ink bg-paper">
          <div className="max-w-[1400px] mx-auto px-4 py-16">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
              <div>
                <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-2">Recent events · in plain English</div>
                <h2 className="text-3xl sm:text-5xl">Three things the machine caught while you slept.</h2>
                <p className="mt-2 text-sm opacity-70 max-w-2xl">
                  Below: a plain-English sentence built from each detection's own fields, the question that
                  data raises, and a link to the hashed record. We describe what the machine logged.
                  You draw the conclusion.
                </p>
              </div>
              <Link to="/live" className="label-stamp brutal-border bg-ink text-paper px-4 py-2 hover:bg-warning hover:text-ink">
                See the full live feed →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {stories.map((row) => (
                <StoryCard key={row.icao + row.capturedAt} row={row} />
              ))}
            </div>
            <p className="mt-4 text-xs font-mono opacity-70 max-w-3xl">
              Each card is a verbatim translation of one detection row. Every claim links back to the raw,
              hashed record. You don&apos;t have to take our word for it — check the math.
            </p>
          </div>
        </section>
      )}

      {/* TICKER */}
      <div className="bg-warning text-ink border-b-4 border-ink overflow-hidden">
        <div className="ticker whitespace-nowrap py-3 label-stamp text-sm flex">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0">
              {["0% flagged during baseline — by design", "Population-scale, not selection bias", "SHA-256 + Merkle chain on every record", "Bradford Hill causation framework", "Open source · CC BY-SA 4.0", "EFF meets ProPublica meets a sensor network", "Math chose it. Not a human."].map((t) => (
                <span key={t} className="px-8 inline-flex items-center gap-3">★ {t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* THREE PILLARS */}
      {/* FAA DEMAND BANNER */}
      <section className="border-b-4 border-ink bg-alert text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <div className="label-stamp bg-paper text-ink inline-block px-2 py-1 mb-4">
                Public petition · Addressed to the Federal Aviation Administration
              </div>
              <h2 className="text-4xl sm:text-6xl mb-5 leading-tight">
                The violations are public.<br />The record is hashed.<br />
                <span className="bg-ink text-warning px-2">FAA — enforce the rules we pay you to enforce.</span>
              </h2>
              <p className="text-lg max-w-3xl mb-4 font-medium">
                {fmt(s.flightDetections)} court-ready flight detections. {fmt(s.anomalyEvents)} statistical
                anomalies. Every record SHA-256 fingerprinted and Merkle-chained against tampering. Every
                altitude, every registration, every owner pulled from public ADS-B broadcasts and the public
                FAA Aircraft Registry — independently verifiable by any member of the public, including the
                regulator whose statutory job it is to look.
              </p>
              <p className="text-lg max-w-3xl mb-6 font-medium">
                14 CFR § 91.119 (minimum safe altitudes). 14 CFR § 91.13 (careless or reckless operation).
                14 CFR § 91.227 (ADS-B Out integrity). These are not novel theories. They are the FAA's
                own regulations, broken on a population scale, in plain view, over a populated county,
                while the agency that taxpayers fund to enforce them has not acted.
              </p>
              <p className="text-base max-w-3xl mb-8 opacity-95">
                This site is the notice. The dataset is the exhibit. Silence after this point is a
                choice — and it is on the record.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/citations" className="label-stamp bg-ink text-paper px-5 py-3 hover:bg-warning hover:text-ink transition-colors">
                  See the citations →
                </Link>
                <Link to="/violations" className="label-stamp bg-paper text-ink px-5 py-3 hover:bg-warning transition-colors">
                  Browse the violations
                </Link>
                <Link to="/reports" className="label-stamp brutal-border border-paper px-5 py-3 hover:bg-ink transition-colors">
                  Read the reports
                </Link>
              </div>
            </div>
            <aside className="lg:col-span-4 brutal-border-thick border-paper bg-ink p-6">
              <div className="label-stamp text-warning mb-3">What we are demanding</div>
              <p className="text-xs opacity-90 mb-3 leading-snug">
                The following demands are the advocacy position of <strong>Watchtower Project LLC</strong>,
                a civilian-led airspace accountability organization. The supporting data is drawn from
                public ADS-B broadcasts and the public FAA Aircraft Registry.
              </p>
              <ol className="space-y-3 text-sm font-medium list-decimal pl-5">
                <li>Open an enforcement docket on the repeat-offender aircraft surfaced in <Link to="/live" className="underline">/live</Link>.</li>
                <li>Audit 14 CFR § 91.227 (ADS-B Out) integrity for tails with suppressed or anomalous altitude.</li>
                <li>Publish disposition for each violation referred — not "no further action" by silence.</li>
                <li>Recognize civilian ADS-B + hashed chain of custody as admissible regulatory evidence.</li>
              </ol>
              <div className="mt-5 pt-4 border-t border-paper/20 text-xs font-mono opacity-80">
                All data referenced here is drawn from public ADS-B broadcasts and the public FAA registry,
                independently verifiable.
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-3 gap-0 brutal-border-thick">
            {[
              { num: "01", title: "WATCH", desc: "An autonomous sensor network learns what NORMAL looks like for 48 hours before it identifies ABNORMAL. One person can't watch 4,000 aircraft. A system can.", tag: "Watchtower 2.0" },
              { num: "02", title: "DOCUMENT", desc: "Every detection is SHA-256 hashed, timestamped, and Merkle-chained. 100% chain-of-custody coverage. Court-ready by construction.", tag: "Neon · SHA-256 · Merkle" },
              { num: "03", title: "ADVOCATE", desc: "Public reporting. Legislative support. Legal referral networks. FOIA-as-a-service. The data becomes leverage.", tag: "Architecture of Never" },
            ].map((p, i) => (
              <div key={p.num} className={`p-8 ${i < 2 ? "lg:border-r-4 border-b-4 lg:border-b-0 border-ink" : ""} bg-paper`}>
                <div className="font-mono text-6xl font-bold opacity-20 mb-2">{p.num}</div>
                <h2 className="text-4xl mb-3">{p.title}</h2>
                <p className="mb-4">{p.desc}</p>
                <span className="label-stamp bg-ink text-paper px-2 py-1">{p.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFFERENCE TABLE */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-20">
          <h2 className="text-4xl sm:text-6xl mb-4">How we complement existing accountability work.</h2>
          <p className="text-lg opacity-80 max-w-3xl mb-4">
            Civil liberties orgs, investigative newsrooms, and flight-tracking communities
            already do essential work. Watchtower Project LLC adds a specific missing layer:
            continuous, autonomous, population-scale sensor evidence with chain of custody —
            designed to hand off cleanly to those existing efforts.
          </p>
          <p className="label-stamp bg-warning text-ink inline-block px-2 py-1 mb-10">Where our approach fits alongside existing work:</p>
          <div className="overflow-x-auto brutal-border-thick border-paper">
            <table className="w-full text-sm">
              <thead className="bg-paper text-ink">
                <tr><th className="text-left p-4 label-stamp">Existing accountability work</th><th className="text-left p-4 label-stamp bg-warning">What Watchtower adds on top</th></tr>
              </thead>
              <tbody className="font-medium">
                {[
                  ["Civil liberties litigation (ACLU): responds to documented harms", "Continuous machine-logged evidence, ready to hand to counsel"],
                  ["Digital-surveillance advocacy (EFF): focus on data and devices", "Physical airspace surveillance, sensor-verified"],
                  ["Flight-tracking hobbyist communities: excellent raw data, no legal framework", "Bradford Hill causation framework + Merkle chain of custody"],
                  ["Investigative journalism (ProPublica, etc.): deep post-hoc investigations", "Real-time findings, sourced and hashed for reporters to verify"],
                  ["Individual complaints: often dismissed as anecdotal", "Population-scale statistical baselines the individual case can be measured against"],
                ].map(([a, b]) => (
                  <tr key={a} className="border-t border-paper/20"><td className="p-4 opacity-70">{a}</td><td className="p-4 text-warning">{b}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* YOUR RIGHTS IN THE AIRSPACE */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-20">
          <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-3">Your Rights in the Airspace</div>
          <h2 className="text-4xl sm:text-6xl mb-4">The Bill of Rights doesn't stop at the roofline.</h2>
          <p className="text-lg max-w-3xl mb-10">
            Watchtower exists because constitutional protections do not enforce themselves. Here's what's at stake every
            time an aircraft loiters over your home — and what this site is built to defend.
          </p>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Right</th>
                  <th className="text-left p-3 label-stamp">What Watchtower protects</th>
                </tr>
              </thead>
              <tbody className="font-medium">
                {[
                  ["4th Amendment", "Security in your home against unreasonable aerial search."],
                  ["1st Amendment", "Your right to document, analyze, and publish public airspace activity."],
                  ["5th Amendment", "Due process when surveillance is used as evidence."],
                  ["6th Amendment", "Confrontation of aerial evidence through verifiable chain of custody."],
                  ["14th Amendment", "Equal protection against discriminatory surveillance deployment."],
                ].map(([r, w]) => (
                  <tr key={r} className="border-t-2 border-ink">
                    <td className="p-3 font-mono whitespace-nowrap">{r}</td>
                    <td className="p-3">{w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/legal" className="label-stamp bg-ink text-paper px-5 py-3 hover:bg-alert">Read the Constitutional Framework →</Link>
            <Link to="/how-to-read" className="label-stamp brutal-border px-5 py-3 hover:bg-warning">How to read Watchtower</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-24 text-center">
          <PullQuote seed="home-cta" variant="default" className="mx-auto" />
          <h2 className="text-5xl sm:text-7xl mb-6">Watch back.</h2>
          <p className="text-xl max-w-2xl mx-auto mb-10">
            Journalists, attorneys, legislators, and affected residents: the data is open, the methodology is public,
            and the chain of custody is built to survive cross-examination.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/findings" className="label-stamp bg-ink text-paper px-6 py-4 brutal-shadow-alert">See the findings</Link>
            <Link to="/reports" className="label-stamp bg-alert text-paper px-6 py-4 brutal-shadow-warning">Read the reports</Link>
            <Link to="/legal" className="label-stamp brutal-border px-6 py-4 hover:bg-warning">Know your protections</Link>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            <Link to="/military" className="brutal-border p-4 hover:bg-warning/40">
              <div className="label-stamp text-alert mb-1">Branch · Posse Comitatus</div>
              <div className="font-display text-2xl mb-1">Military aircraft</div>
              <p className="text-xs font-mono opacity-70">U.S. military hex range (AE0000–AFFFFF) tracked by branch, altitude, and night ops.</p>
            </Link>
            <Link to="/foreign" className="brutal-border p-4 hover:bg-warning/40">
              <div className="label-stamp text-alert mb-1">Country of registry</div>
              <div className="font-display text-2xl mb-1">Foreign aircraft</div>
              <p className="text-xs font-mono opacity-70">Non-U.S. civil registrations operating in domestic airspace.</p>
            </Link>
            <Link to="/coordination" className="brutal-border p-4 hover:bg-warning/40">
              <div className="label-stamp text-alert mb-1">Hub-and-spoke</div>
              <div className="font-display text-2xl mb-1">Coordination graph</div>
              <p className="text-xs font-mono opacity-70">Shell networks coordinating state-actor patrol patterns.</p>
            </Link>
            <Link to="/tail-search" className="brutal-border p-4 hover:bg-warning/40">
              <div className="label-stamp text-alert mb-1">Operator lookup</div>
              <div className="font-display text-2xl mb-1">Tail number search</div>
              <p className="text-xs font-mono opacity-70">Pull every detection for a tail number. Export forensic CSV.</p>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
