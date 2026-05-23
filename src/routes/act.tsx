import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [{ label: "Home", href: "/" }, { label: "Take Action" }];

export const Route = createFileRoute("/act")({
  head: () => ({
    meta: [
    { title: "Take Action — The Architecture of Never" },
    { name: "description", content: "Deploy a sensor, request a referral, file a FOIA, or fund the next county." },
    { property: "og:title", content: "Take Action" },
    { property: "og:description", content: "Civilian airspace accountability — your move." },
    { property: "og:url", content: "https://flightlogged.lovable.app/act" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/act" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: Act,
});

function Card({ tag, title, body, cta }: { tag: string; title: string; body: string; cta: string }) {
  return (
    <article className="brutal-border-thick p-6 bg-paper brutal-shadow flex flex-col">
      <span className="label-stamp bg-ink text-paper px-2 py-1 self-start mb-3">{tag}</span>
      <h2 className="text-3xl mb-3">{title}</h2>
      <p className="mb-5 flex-1">{body}</p>
      <button className="label-stamp bg-warning brutal-border px-4 py-3 self-start hover:bg-alert hover:text-paper">{cta} →</button>
    </article>
  );
}

function Act() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Take Action</div>
          <h1 className="text-5xl sm:text-7xl mb-6">Watch back.</h1>
          <p className="text-lg max-w-3xl">Five things you can do in the next 15 minutes. The org runs on people who pick one and start.</p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card tag="01 · Sensor" title="Deploy in your county" body="Open-source Watchtower 2.0 + a $40 RTL-SDR receiver. Step-by-step guide. Same methodology, your airspace." cta="Get the guide" />
          <Card tag="02 · Legal" title="Request a referral" body="If you are affected by overflight surveillance, we will route a hashed evidence package to a civil rights attorney we trust." cta="Start intake" />
          <Card tag="03 · FOIA" title="File a public records request" body="Pre-drafted FOIA / state public records templates for sheriff aviation, contracted operators, and fusion centers." cta="Use a template" />
          <Card tag="04 · Press" title="Pitch a journalist" body="Reporters get bulk access to anonymized data, methodology notes, and a press contact. No NDA, no embargo." cta="Request data" />
          <Card tag="05 · Fund" title="Underwrite a county" body="$5k deploys sensors and a year of compute for one county. We publish where every dollar goes." cta="Donate" />
          <Card tag="06 · Build" title="Contribute code" body="React, Postgres, Python ML, ADS-B decoding. Issues are tagged. PRs welcome. CC BY-SA 4.0." cta="See the repo" />
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">Or reach a human.</h2>
          <p className="opacity-80 mb-4">Press, legal, and partnership inquiries: <a className="text-warning underline" href="mailto:contact@architectureofnever.org">contact@architectureofnever.org</a></p>
          <p className="opacity-60 text-sm font-mono">PGP fingerprint published on /about. All inbound correspondence is logged and hashed.</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}