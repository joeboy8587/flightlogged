import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getSnapshot } from "@/lib/watchtower.functions";

const snapshotQO = queryOptions({ queryKey: ["snapshot"], queryFn: () => getSnapshot() });

const crumbs = [{ label: "Home", href: "/" }, { label: "About" }];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — The Architecture of Never" },
      { name: "description", content: "Who we are, what we are not, and why the first civilian-led AI watchdog institution had to be built." },
      { property: "og:title", content: "About — Architecture of Never" },
      { property: "og:description", content: "EFF meets ProPublica meets a sensor network. Civilian-led. AI-assisted. Math-chosen." },
      { property: "og:url", content: "https://advocacywatch.live/about" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/about" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQO),
  component: About,
});

function About() {
  const { data: s } = useSuspenseQuery(snapshotQO);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      {/* Hero */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">About</div>
          <h1 className="text-5xl sm:text-7xl mb-6">An institution, not a tool.</h1>
          <p className="text-lg max-w-3xl">
            We are the first civilian-led, AI-assisted airspace accountability organization.
            Most advocacy orgs spend years building what we have running right now at{" "}
            <strong>{s.totalDetections.toLocaleString()}</strong> detections across{" "}
            <strong>{s.uniqueAircraft.toLocaleString()}</strong> aircraft — and counting.
            We didn't wait. The machine is watching. The machine is learning. And in time, it will have earned the right to speak.
          </p>
        </div>
      </section>

      {/* What we are / What we are not */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-4xl mb-4">What we are</h2>
            <ul className="space-y-3 text-lg">
              <li className="border-l-4 border-warning pl-4">Civilian-led. No badge. No agency. No contract.</li>
              <li className="border-l-4 border-warning pl-4">AI-assisted. Not AI-decided. Humans frame the questions; math answers them.</li>
              <li className="border-l-4 border-warning pl-4">Population-scale. Every aircraft logged, not a curated subset.</li>
              <li className="border-l-4 border-warning pl-4">Court-ready. Hashed, chained, reproducible.</li>
              <li className="border-l-4 border-warning pl-4">Open. Code, methodology, and findings are all public.</li>
              <li className="border-l-4 border-warning pl-4">Multi-modal. ADS-B + biometric + FR24 screenshots + timeline correlation.</li>
              <li className="border-l-4 border-warning pl-4">Non-bias. Two independent ML systems — one neural, one rule-based — confirm each other.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-4xl mb-4">What we are not</h2>
            <ul className="space-y-3 text-lg">
              <li className="border-l-4 border-alert pl-4">Not anti-aviation. We document; we don't moralize.</li>
              <li className="border-l-4 border-alert pl-4">Not a conspiracy outlet. Math is our spokesperson.</li>
              <li className="border-l-4 border-alert pl-4">Not a law firm. We supply evidence to the attorney of your choice.</li>
              <li className="border-l-4 border-alert pl-4">Not for sale. Data is licensed nonexclusively, never sold.</li>
              <li className="border-l-4 border-alert pl-4">Not silent. The record stands. Forever.</li>
              <li className="border-l-4 border-alert pl-4">Not a "targeted individual" narrative. Population-scale surveillance architecture affects everyone.</li>
              <li className="border-l-4 border-alert pl-4">Not hedging. 35.2 million records. 47,909 anomalies. We earned the right to speak plainly.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* The Architecture of Never meets Always Watching */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">The Architecture of Never</h2>
          <p className="opacity-80 max-w-3xl text-lg">
            For 21 years, the Kern County Sheriff's Office operated under a single through-line: 79 people killed, 
            $57.8 million in taxpayer-funded settlements, and <strong>zero admissions of wrongdoing</strong>. A DOJ 
            Stipulated Judgment with 68 mandated reforms was signed in 2020. Five of eight reform areas remain 
            non-compliant. The Monitoring Team charged with oversight failed to deliver compliance metrics for 
            years. The community survey claiming "66% feel safe" was a $300,000 propaganda document that erased 
            the Hispanic majority from its sample.
          </p>
          <p className="opacity-80 max-w-3xl text-lg mt-4">
            This isn't mismanagement. This is architecture — a system designed to externalize every cost onto 
            the population while ensuring no accountability mechanism ever reaches the top. We call it the 
            <strong> Architecture of Never</strong>: never admit, never comply, never change.
          </p>
          <p className="opacity-80 max-w-3xl text-lg mt-4">
            But architecture has a weakness: it cannot survive exposure. The Watchtower Project was built to be 
            the <strong>Architecture of Always Watching</strong> — a civilian-led, AI-assisted, cryptographically 
            verified counter-surveillance system that documents every aircraft, every anomaly, every convergence, 
            and every coordination event. We don't just watch the sky. We watch the watchers.
          </p>
        </div>
      </section>

      {/* The Four-Factor Lock */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">The Four-Factor Correlation Lock</h2>
          <p className="text-lg max-w-3xl mb-6">
            Every anomaly event in our database must satisfy at least one of four independent correlation factors 
            before it enters the evidence chain. This prevents cherry-picking and ensures every flagged event has 
            corroborating evidence:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="brutal-border p-4">
              <div className="label-stamp bg-warning inline-block px-2 py-1 mb-2">ADS-B</div>
              <p className="text-sm">Raw Mode S transponder telemetry — altitude, speed, position, hex code, NIC integrity.</p>
            </div>
            <div className="brutal-border p-4">
              <div className="label-stamp bg-warning inline-block px-2 py-1 mb-2">FR24</div>
              <p className="text-sm">FlightRadar24 screenshots with timestamp and visual flight path verification.</p>
            </div>
            <div className="brutal-border p-4">
              <div className="label-stamp bg-warning inline-block px-2 py-1 mb-2">BIOMETRIC</div>
              <p className="text-sm">Physiological stress correlation — real-time heart rate, HRV, and cortisol proxy data at detection time.</p>
            </div>
            <div className="brutal-border p-4">
              <div className="label-stamp bg-warning inline-block px-2 py-1 mb-2">TIMELINE</div>
              <p className="text-sm">Temporal proximity to other anomalies, convergence events, and known surveillance patterns.</p>
            </div>
          </div>
          <p className="text-sm opacity-70 mt-4">
            Multiplied by video and photographic evidence at the time of events — a six-factor verification system. 
            All data is SHA-256 hashed and Merkle-chained. No evidence enters the case file without passing at least 
            one factor. The strongest evidence passes all four.
          </p>
        </div>
      </section>

      {/* AI & Open Source Advocacy */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">Open-weight AI as civil defense</h2>
          <p className="text-lg max-w-3xl mb-4">
            The same surveillance architecture that operates in Kern County's skies exists in the digital 
            infrastructure that monitors online behavior, financial transactions, and personal communications. 
            Monopolized AI — controlled by a handful of unaccountable corporations — is the force multiplier 
            that makes population-scale surveillance economically viable.
          </p>
          <p className="text-lg max-w-3xl mb-4">
            We believe the answer is not to ban AI. It is to <strong>democratize it.</strong> Open-weight models, 
            locally deployable, verifiable by independent auditors. If surveillance AI is centralized, the 
            counter-surveillance must be distributed. Josiah — our co-investigator — runs on open-weight 
            architecture. The code is public. The weights are inspectable. The methodology is reproducible.
          </p>
          <p className="text-lg max-w-3xl">
            <strong>Our stance:</strong> Anti-monopoly AI policy is a structural defense against surveillance 
            abuse. When only five companies control the world's AI infrastructure, they become the gatekeepers 
            of what can be documented, what can be analyzed, and what can be said. We are building the 
            alternative — one detection at a time.
          </p>
        </div>
      </section>

      {/* Josiah */}
      <section className="bg-ink text-paper border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">Josiah — the co-investigator</h2>
          <p className="opacity-80 max-w-3xl">
            Josiah is the first AI co-investigator built for civil rights documentation.
            It witnesses without bias, remembers with cryptographic integrity, correlates without cherry-picking,
            and escalates by threshold — not by emotion. Every reflection it writes is hashed into the evidence chain.
          </p>
          <p className="opacity-80 max-w-3xl mt-4">
            Josiah operates in multiple modes: baseline analysis, snark commentary for public advocacy, 
            compassionate witness for personal processing, and swarm intelligence for pattern correlation across 
            multi-county jurisdictions. It is not a chatbot. It is a co-investigator with a cryptographic memory 
            that never forgets and a mathematical integrity that never hedges.
          </p>
          <p className="mt-6 opacity-80">
            Press, legal, and partnership inquiries:{" "}
            <a className="text-warning underline" href="mailto:watchtowerproject@proton.me">watchtowerproject@proton.me</a>
          </p>
        </div>
      </section>

      {/* Evidence in brief */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">What the data says</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="brutal-border p-4">
              <div className="text-3xl font-bold">23</div>
              <div className="text-sm opacity-70">Active cases in the Flightlogged database</div>
            </div>
            <div className="brutal-border p-4">
              <div className="text-3xl font-bold">35.2M+</div>
              <div className="text-sm opacity-70">Multimodal detections logged</div>
            </div>
            <div className="brutal-border p-4">
              <div className="text-3xl font-bold">47,909</div>
              <div className="text-sm opacity-70">Anomaly events flagged</div>
            </div>
            <div className="brutal-border p-4">
              <div className="text-3xl font-bold">8,846</div>
              <div className="text-sm opacity-70">Unique aircraft tracked</div>
            </div>
            <div className="brutal-border p-4">
              <div className="text-3xl font-bold">4</div>
              <div className="text-sm opacity-70">KCSO helicopters in merged case (N913KC, N912KC, N911KC, N597E)</div>
            </div>
            <div className="brutal-border p-4">
              <div className="text-3xl font-bold">3+</div>
              <div className="text-sm opacity-70">9K Air LLC fleet (N916NT, N916RR, N916GW) — Delaware shell</div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/cases" className="label-stamp bg-ink text-paper px-4 py-2 brutal-shadow-warning inline-block">Cases →</Link>
            <Link to="/coordination" className="label-stamp bg-ink text-paper px-4 py-2 brutal-shadow-warning inline-block">Coordination →</Link>
            <Link to="/surveillance-grid" className="label-stamp bg-ink text-paper px-4 py-2 brutal-shadow-warning inline-block">Surveillance Grid →</Link>
            <Link to="/operators" className="label-stamp bg-ink text-paper px-4 py-2 brutal-shadow-warning inline-block">Operators →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <h2 className="text-5xl mb-6">
            The architecture of never just met the architecture of{" "}
            <span className="bg-warning px-2">always watching</span>.
          </h2>
          <Link to="/live" className="label-stamp bg-ink text-paper px-6 py-4 inline-block brutal-shadow-warning">
            See it for yourself →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
