import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [{ label: "Home", href: "/" }, { label: "How to Read Watchtower" }];

export const Route = createFileRoute("/how-to-read")({
  head: () => ({
    meta: [
      { title: "How to Read Watchtower — The Architecture of Never" },
      { name: "description", content: "A guided, section-by-section explainer of the Live Feed, Findings, Violations, Threat Index, Operators, ML detections, Rules, and Methodology. Be a forensic citizen, not a spectator." },
      { property: "og:title", content: "How to Read Watchtower" },
      { property: "og:description", content: "Turn airspace data into evidence you can read. A civilian's manual for forensic citizenship." },
      { property: "og:url", content: "https://flightlogged.lovable.app/how-to-read" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/how-to-read" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: HowToRead,
});

type Section = {
  num: string;
  to: "/live" | "/findings" | "/violations" | "/threat-index" | "/operators" | "/ml-detections" | "/rules" | "/methodology";
  title: string;
  what: string;
  why: string;
  how: { label: string; desc: string }[];
  rule?: string;
};

const SECTIONS: Section[] = [
  {
    num: "01",
    to: "/live",
    title: "Live Feed — What You're Watching",
    what: "A 5-minute delayed snapshot of every aircraft detected in the monitored airspace. Each row is a real ICAO address, timestamp, altitude, and position pulled from public ADS-B broadcast.",
    why: "You're seeing the same raw signal that air traffic controllers see. We don't curate. We don't hide the boring ones. If it's in the air and broadcasting, it's here. The 5-minute delay protects the watched and the watchers from real-time stalking; the data is identical, only the timing is shifted.",
    how: [
      { label: "White rows", desc: "Normal traffic within baseline parameters." },
      { label: "Yellow rows", desc: "Anomaly flagged — deviation from learned pattern." },
      { label: "Red rows", desc: "Correlated event — anomaly plus low altitude, repeat pattern, or operator history." },
      { label: "Masked / no callsign", desc: "Aircraft broadcasting without identification. They're not invisible — they're just wearing a hood." },
    ],
  },
  {
    num: "02",
    to: "/findings",
    title: "Findings — From Noise to Signal",
    what: "Completed anomaly investigations that cleared the Three-Factor Lock: ADS-B detection + flight-tracking screenshot + timeline + operator-cluster alignment.",
    why: "A single low-altitude flyover is noise. A pattern of low-altitude flyovers by aircraft linked to the same operator cluster, repeating in the same window, is signal. Findings are where signal gets a case number.",
    how: [
      { label: "Detection window", desc: "Exact UTC timestamps bracketing the event." },
      { label: "Aircraft fingerprint", desc: "Hex, registration, operator, aircraft type." },
      { label: "Baseline deviation", desc: "What normal looks like vs. what happened." },
      { label: "Operator cluster", desc: "Shared registrants, shell-LLC links, or coordination patterns." },
      { label: "Chain hash", desc: "SHA-256 of the raw evidence bundle — verify nothing was altered." },
    ],
    rule: "One finding does not prove harassment. Twenty findings with shared operators, altitudes, and timing patterns document a program.",
  },
  {
    num: "03",
    to: "/violations",
    title: "Violations — Where the Law Draws a Line",
    what: "Specific detections that appear to violate FAA minimum safe altitudes under 14 CFR § 91.119 or other published aviation regulations.",
    why: "We don't allege criminal intent. We document regulatory non-compliance at population scale. When an aircraft flies at 350 feet over a residential area, that's not our opinion — it's a number against a published statute.",
    how: [
      { label: "Congested area violations", desc: "Below 1,000 ft over populated zones." },
      { label: "Residential violations", desc: "Below 500 ft over structures or people." },
      { label: "Uncongested deviations", desc: "Below 500 ft except over open water or sparsely populated terrain — still logged for pattern analysis." },
      { label: "Helicopter exceptions", desc: "Noted where applicable, but pattern-reviewed." },
    ],
    rule: "A violation here is a documented altitude reading, not a court ruling. We label it 'Regulatory Deviation Logged.' The FAA investigates. We archive.",
  },
  {
    num: "04",
    to: "/threat-index",
    title: "Threat Index — The Machine's Confidence Score",
    what: "A composite score derived from anomaly frequency, operator clustering, altitude-deviation severity, shell-network linkage, and temporal concentration.",
    why: "Humans get overwhelmed by hundreds of thousands of detections. The Threat Index is the machine saying: this subset deserves human attention first.",
    how: [
      { label: "0 – 30", desc: "Baseline noise. Logged, not flagged." },
      { label: "31 – 60", desc: "Notable pattern. Operator history reviewed." },
      { label: "61 – 85", desc: "Elevated concern. Multiple factors converging." },
      { label: "86 – 100", desc: "Critical. Immediate documentation and legal-ready packaging triggered." },
    ],
    rule: "The Index is descriptive, not predictive. It tells you what already happened with unusual concentration. It does not claim to read minds or predict tomorrow's flights.",
  },
  {
    num: "05",
    to: "/operators",
    title: "Operators — Who Owns the Sky?",
    what: "FAA-registered operators of aircraft that appear in anomaly findings and violation logs. Includes shell-company networks, LLC chains, and cross-referenced ownership.",
    why: "An aircraft is metal. An operator is intent. When two operators share staging coordinates or temporal patterns, the Operators page connects those dots.",
    how: [
      { label: "Operator profile", desc: "FAA registry name, address, fleet size." },
      { label: "Linked aircraft", desc: "Every tail number under this operator in our logs." },
      { label: "Anomaly rate", desc: "Percentage of this operator's detections that triggered flags vs. baseline traffic." },
      { label: "Network signal", desc: "Shared addresses, registered agents, or co-location events with other operators." },
      { label: "Commentary", desc: "Snark analysis is clearly labeled as interpretive commentary — not legal fact." },
    ],
  },
  {
    num: "06",
    to: "/ml-detections",
    title: "ML Detections — What the Machine Sees",
    what: "Autonomous pattern detection outputs: convergence clusters, spoofing signals, staring patterns, mode-switching events, and fleet-wide coordination flags.",
    why: "A human can spot one helicopter. A machine can spot that the same helicopter, a fixed-wing from a shell company, and a refueler all loiter within 2 miles of the same GPS coordinate within a 30-minute window — 14 times in 90 days.",
    how: [
      { label: "Convergence clusters", desc: "Multiple unrelated aircraft occupying abnormal spatial/temporal proximity." },
      { label: "Spoofing signals", desc: "Ghost ICAO addresses, duplicate hex codes, impossible position jumps." },
      { label: "Staring patterns", desc: "Orbital or back-and-forth flight paths over a single coordinate." },
      { label: "Mode-switching", desc: "Aircraft changing transponder identity between tactical and civil hex codes." },
    ],
    rule: "Every ML flag is backtested against 48+ hours of baseline learning. If the machine cries wolf, we log the false positive and retrain. Error rates are published.",
  },
  {
    num: "07",
    to: "/rules",
    title: "Rules — The Constraints We Chose",
    what: "The hardcoded limits and ethical guardrails of the Watchtower system.",
    why: "We are not a surveillance operation hunting individuals. We are an accountability operation documenting institutional patterns. The Rules page proves it.",
    how: [
      { label: "No facial recognition", desc: "Ever." },
      { label: "No geofencing of individuals", desc: "Only airspace sectors." },
      { label: "No cherry-picking", desc: "All aircraft logged. Filtering is post-hoc and published." },
      { label: "No predictive targeting of people", desc: "Pattern detection applies to airspace, not persons." },
      { label: "48-hour baseline minimum", desc: "The machine must learn 'normal' before it flags 'abnormal.'" },
      { label: "Human override required", desc: "ML flags. Humans verify before public release." },
    ],
  },
  {
    num: "08",
    to: "/methodology",
    title: "Methodology — The Full Pipeline",
    what: "How a public ADS-B broadcast becomes a hashed, court-admissible record.",
    why: "Transparency is the only protection against the accusation that we cherry-picked. Every step is public, reproducible, and open-source.",
    how: [
      { label: "1. Sensors listen", desc: "Public ADS-B broadcast only." },
      { label: "2. Baseline learns", desc: "48 hours of 'what normal looks like.'" },
      { label: "3. Anomalies flag", desc: "Statistical deviation from baseline." },
      { label: "4. Correlations lock", desc: "Temporal + spatial + operator-cluster alignment." },
      { label: "5. Evidence hashes", desc: "SHA-256 + Merkle chain." },
      { label: "6. Human reviews", desc: "Commentary + legal-ready memo." },
      { label: "7. Public publishes", desc: "CC BY-SA 4.0, on the record, forever." },
    ],
  },
];

function HowToRead() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Field Manual</div>
          <h1 className="text-5xl sm:text-7xl mb-6">How to read Watchtower.</h1>
          <p className="text-lg max-w-3xl">
            This is the instruction manual for being a forensic citizen instead of a spectator. Each section of the site
            tells you what we show, why it matters, and how to read it without misreading it. Bookmark this. Hand it to
            journalists and attorneys. The math is doing the watching — you only have to learn how to look.
          </p>
        </div>
      </section>

      {/* Table of contents */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp text-warning mb-4">Sections</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SECTIONS.map((s) => (
              <a key={s.num} href={`#s${s.num}`} className="label-stamp brutal-border border-paper px-3 py-2 hover:bg-warning hover:text-ink transition-colors">
                {s.num} · {s.title.split(" — ")[0]}
              </a>
            ))}
          </div>
        </div>
      </section>

      {SECTIONS.map((s, i) => (
        <section
          key={s.num}
          id={`s${s.num}`}
          className={`border-b-4 border-ink ${i % 2 === 1 ? "bg-paper" : ""}`}
        >
          <div className="max-w-[1400px] mx-auto px-4 py-16 grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <div className="font-mono text-7xl font-bold opacity-20 leading-none mb-2">{s.num}</div>
              <h2 className="text-3xl sm:text-4xl mb-4">{s.title}</h2>
              <Link to={s.to} className="label-stamp bg-ink text-paper px-3 py-2 inline-block hover:bg-alert">
                Open {s.title.split(" — ")[0]} →
              </Link>
            </div>
            <div className="lg:col-span-8 space-y-6">
              <div>
                <div className="label-stamp bg-warning inline-block px-2 py-1 mb-2">What we show</div>
                <p>{s.what}</p>
              </div>
              <div>
                <div className="label-stamp bg-warning inline-block px-2 py-1 mb-2">Why it matters</div>
                <p>{s.why}</p>
              </div>
              <div>
                <div className="label-stamp bg-warning inline-block px-2 py-1 mb-2">How to read it</div>
                <ul className="space-y-2">
                  {s.how.map((h) => (
                    <li key={h.label} className="brutal-border p-3">
                      <span className="font-bold">{h.label}:</span> {h.desc}
                    </li>
                  ))}
                </ul>
              </div>
              {s.rule && (
                <div className="brutal-border-thick bg-alert text-paper p-4">
                  <div className="label-stamp mb-1">The rule</div>
                  <p>{s.rule}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* Safety note */}
      <section className="bg-warning border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Anonymity as architecture</div>
          <h2 className="text-3xl sm:text-4xl mb-3">No faces. No names. Just the math.</h2>
          <p className="max-w-3xl">
            The public site is system-focused, not autobiographical. There is no person to discredit — only a sensor
            network, a hash, and a chain of custody. If anyone needs a human face for press or legislative testimony,
            that happens off-site, on-protocol, with counsel present. Anonymity is not omission — it's the design.
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <h2 className="text-4xl sm:text-5xl mb-4">Now go look.</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/live" className="label-stamp bg-ink text-paper px-5 py-3">Live Feed</Link>
            <Link to="/findings" className="label-stamp bg-alert text-paper px-5 py-3">Findings</Link>
            <Link to="/legal" className="label-stamp brutal-border px-5 py-3 hover:bg-warning">Your rights</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}