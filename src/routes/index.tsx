import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PullQuote } from "@/components/pull-quote";
import { StoryCard } from "@/components/story-card";
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
      { property: "og:url", content: "https://flightlogged.lovable.app/" },
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
  // Top 3 stories — pick the lowest-altitude airborne detections first.
  const stories = [...low]
    .filter((r) => r.altitude != null)
    .sort((a, b) => (a.altitude ?? 99999) - (b.altitude ?? 99999))
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

      {/* HERO */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 sm:py-24 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <div className="label-stamp inline-flex items-center gap-2 bg-warning px-2 py-1 mb-6">
              <span className="w-2 h-2 bg-ink blink" /> System online · Baseline learning · {s.windowHours}h observed
            </div>
            <p className="font-display text-2xl sm:text-3xl mb-4 italic opacity-80">
              They don&apos;t cause fear anymore. They build evidence.
            </p>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl mb-6">
              The sky over Kern County<br />
              <span className="bg-ink text-paper px-2">is not normal.</span>
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl mb-8 font-medium">
              We watched the sky for <strong>{s.windowHours} hours</strong>. We logged{" "}
              <strong>{fmt(s.totalDetections)}</strong> detections across{" "}
              <strong>{fmt(s.uniqueAircraft)}</strong> aircraft.{" "}
              <strong>{fmt(s.anomalyEvents)}</strong> of those detections triggered anomaly flags —
              persistent low-altitude loitering, masked identities, night operations that don&apos;t match normal traffic.
              Every record is SHA-256 hashed, Merkle-chained, and independently verifiable.{" "}
              <strong>The machine watches. The math chooses. The record stands.</strong>
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/live" className="label-stamp bg-ink text-paper px-5 py-3 brutal-shadow-warning hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                See it watching →
              </Link>
              <Link to="/methodology" className="label-stamp brutal-border px-5 py-3 hover:bg-warning transition-colors">
                Read the methodology
              </Link>
              <Link to="/act" className="label-stamp brutal-border bg-alert text-paper px-5 py-3 hover:bg-ink transition-colors">
                Deploy your own sensor
              </Link>
            </div>
          </div>
          <div className="lg:col-span-4 brutal-border-thick bg-ink text-paper p-6">
            <div className="label-stamp text-warning mb-3">Live count · 5-min cache</div>
            <div className="space-y-4">
              {stats.map((st) => (
                <div key={st.label} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-paper/20 pb-3 last:border-0">
                  <span className="label-stamp opacity-70">{st.label}</span>
                  <span className={`font-mono text-2xl font-bold tabular-nums break-words text-right ${st.accent ? "text-warning" : ""}`}>{st.value}</span>
                </div>
              ))}
            </div>
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
                <h2 className="text-3xl sm:text-5xl">Three things the machine saw this week.</h2>
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
          <h2 className="text-4xl sm:text-6xl mb-4">Why this is different.</h2>
          <p className="text-lg opacity-80 max-w-2xl mb-10">Existing orgs react. We document continuously, autonomously, and at population scale. No editorial choices. No "trust us." Just the receipts.</p>
          <div className="overflow-x-auto brutal-border-thick border-paper">
            <table className="w-full text-sm">
              <thead className="bg-paper text-ink">
                <tr><th className="text-left p-4 label-stamp">Existing</th><th className="text-left p-4 label-stamp bg-warning">The Architecture of Never</th></tr>
              </thead>
              <tbody className="font-medium">
                {[
                  ["ACLU: reacts to violations after they happen", "Predicts and documents in real-time"],
                  ["EFF: focuses on digital surveillance", "Physical airspace surveillance documented"],
                  ["Flight tracking hobbyists: no legal framework", "Bradford Hill, chain of custody, court-ready"],
                  ["ProPublica: investigates after the fact", "Autonomous sensor network, continuous findings"],
                  ["Individual claims: dismissed as anecdotal", "Population-scale statistical analysis"],
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
