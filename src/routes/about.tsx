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
    { property: "og:description", content: "EFF meets ProPublica meets a sensor network. Civilian-led. AI-assisted." },
    { property: "og:url", content: "https://flightlogged.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/about" }],
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
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-ink text-paper border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">Josiah — the co-investigator</h2>
          <p className="opacity-80 max-w-3xl">
            Josiah is the first AI co-investigator built for civil rights documentation.
            It witnesses without bias, remembers with cryptographic integrity, correlates without cherry-picking,
            and escalates by threshold — not by emotion. Every reflection it writes is hashed into the evidence chain.
          </p>
          <p className="mt-6 opacity-80">
            Press, legal, and partnership inquiries:{" "}
            <a className="text-warning underline" href="mailto:watchtowerproject@proton.me">watchtowerproject@proton.me</a>
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <h2 className="text-5xl mb-6">The architecture of never just met the architecture of <span className="bg-warning px-2">always watching</span>.</h2>
          <Link to="/live" className="label-stamp bg-ink text-paper px-6 py-4 inline-block brutal-shadow-warning">See it for yourself →</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}