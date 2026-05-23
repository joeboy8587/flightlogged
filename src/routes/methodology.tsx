import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [{ label: "Home", href: "/" }, { label: "Methodology" }];

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
    { title: "Methodology — The Architecture of Never" },
    { name: "description", content: "How Watchtower 2.0 learns baselines, scores anomalies, and produces court-ready evidence with zero cherry-picking." },
    { property: "og:title", content: "Methodology — Architecture of Never" },
    { property: "og:description", content: "Baseline learning, statistical anomaly detection, Bradford Hill scoring, SHA-256 chain of custody." },
    { property: "og:url", content: "https://flightlogged.lovable.app/methodology" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/methodology" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: Methodology,
});

function Methodology() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Methodology</div>
          <h1 className="text-5xl sm:text-7xl mb-6">No opinions. Just a baseline.</h1>
          <p className="text-lg max-w-3xl">
            Every part of our pipeline is designed to defeat one accusation:
            <em> "you only track the aircraft you're already suspicious of."</em>
            We don't. The machine watches every aircraft, all the time, and the math decides what stands out.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid lg:grid-cols-2 gap-0 brutal-border-thick">
          {[
            { n: "01", t: "Population-scale capture", d: "We log every ADS-B / MLAT detection in the observation zone — not a curated subset. 137,000+ records, 3,995 aircraft, growing." },
            { n: "02", t: "48-hour baseline", d: "Before flagging anything, the system observes for 48 hours to learn what NORMAL looks like for that airspace at that time of day, season, and weather." },
            { n: "03", t: "Statistical anomaly detection", d: "Outliers are scored against the learned distribution. The threshold is published. We don't pick — math picks." },
            { n: "04", t: "Chain of custody", d: "Each record receives a SHA-256 hash linked into a Merkle chain. Any tampering is detectable. Evidence is reproducible by any third party." },
            { n: "05", t: "Bradford Hill scoring", d: "Where we correlate aircraft activity with biometric or witness data, we apply the Bradford Hill criteria (strength, consistency, specificity, temporality, etc.) — the same framework used in epidemiology and courtrooms." },
            { n: "06", t: "Open source by design", d: "Every line of Watchtower 2.0 will be public. The methodology IS the code. Deploy it in your county, get the same answers." },
          ].map((s, i, arr) => (
            <div key={s.n} className={`p-8 bg-paper ${i % 2 === 0 ? "lg:border-r-4 border-ink" : ""} ${i < arr.length - 2 ? "border-b-4 border-ink" : ""} ${i === arr.length - 2 ? "lg:border-b-0 border-b-4 border-ink" : ""}`}>
              <div className="font-mono text-5xl font-bold opacity-20">{s.n}</div>
              <h2 className="text-2xl mt-2 mb-3">{s.t}</h2>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-paper border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl sm:text-5xl mb-6">The anti-cherry-picking proof</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              ["100%", "of detections logged — not just suspicious ones"],
              ["0%", "flagged during baseline window — by design"],
              ["48h", "minimum learning period before any flag is valid"],
            ].map(([n, d]) => (
              <div key={n} className="brutal-border-thick border-paper p-6">
                <div className="font-display text-6xl text-warning">{n}</div>
                <p className="mt-2 opacity-80">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}