import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PullQuote } from "@/components/pull-quote";
import { getSnapshot } from "@/lib/watchtower.functions";

const snapshotQO = queryOptions({
  queryKey: ["snapshot"],
  queryFn: () => getSnapshot(),
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
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQO),
  component: Home,
  errorComponent: ({ reset }) => (
    <div className="p-10"><h1 className="text-4xl mb-4">Signal lost.</h1><p className="mb-4">Data temporarily unavailable. Please try again.</p><button onClick={reset} className="brutal-border px-4 py-2 label-stamp bg-warning">Retry</button></div>
  ),
});

function fmt(n: number) { return n.toLocaleString(); }

function Home() {
  const { data: s } = useSuspenseQuery(snapshotQO);
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
            <h1 className="text-5xl sm:text-7xl lg:text-8xl mb-6">
              The machine watches.<br />
              <span className="bg-ink text-paper px-2">The math chooses.</span><br />
              The record stands.
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl mb-8 font-medium">
              Civilian-led, AI-assisted airspace accountability — built to the evidentiary standard a court requires
              and the public deserves. Every aircraft. Every altitude. Every hour.{" "}
              <strong>Population-scale data. Hashed chain of custody. Reproducible findings.</strong>
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
                <div key={st.label} className="flex items-baseline justify-between border-b border-paper/20 pb-3 last:border-0">
                  <span className="label-stamp opacity-70">{st.label}</span>
                  <span className={`font-mono text-2xl font-bold ${st.accent ? "text-warning" : ""}`}>{st.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
