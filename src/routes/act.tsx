import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { PullQuote } from "@/components/pull-quote";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [{ label: "Home", href: "/" }, { label: "Take Action" }];
const CONTACT = "watchtowerproject@proton.me";

export const Route = createFileRoute("/act")({
  head: () => ({
    meta: [
      { title: "Take Action — The Architecture of Never" },
      { name: "description", content: "Deploy a sensor, request a referral, file a FOIA, brief a journalist, or fund the next county. Contact watchtowerproject@proton.me." },
      { property: "og:title", content: "Take Action" },
      { property: "og:description", content: "Civilian airspace accountability — your move." },
      { property: "og:url", content: "https://flightlogged.lovable.app/act" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/act" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: Act,
});

type Card = {
  tag: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  internal?: boolean;
};

const CARDS: Card[] = [
  {
    tag: "01 · Sensor",
    title: "Deploy in your county",
    body: "Open-source Watchtower 2.0 plus a $40 RTL-SDR receiver. Same methodology, your airspace. Email for the deployment guide and a sensor ID.",
    cta: "Request deployment guide",
    href: `mailto:${CONTACT}?subject=Sensor%20Deployment%20Guide%20Request&body=County%20%2F%20region%3A%20%0AContact%20name%3A%20%0APreferred%20setup%20(home%20%2F%20rooftop%20%2F%20other)%3A%20`,
  },
  {
    tag: "02 · Legal",
    title: "Request a referral",
    body: "If you are affected by overflight surveillance, we route a hashed evidence package to a civil rights attorney in our network. You stay anonymous to us until you choose otherwise.",
    cta: "Start intake",
    href: `mailto:${CONTACT}?subject=Legal%20Referral%20Intake&body=Approximate%20address%20%2F%20cross%20streets%3A%20%0ADate%20range%20of%20overflights%3A%20%0AWhat%20you%20observed%3A%20%0APreferred%20contact%20method%3A%20`,
  },
  {
    tag: "03 · FOIA",
    title: "File a public records request",
    body: "Pre-drafted FOIA and California Public Records Act templates for sheriff aviation, contracted operators, and fusion centers. We send the latest version.",
    cta: "Request templates",
    href: `mailto:${CONTACT}?subject=FOIA%20%2F%20CPRA%20Templates&body=Agency%20you%20plan%20to%20request%20from%3A%20%0AState%3A%20%0AAny%20specific%20records%20in%20mind%3F%20`,
  },
  {
    tag: "04 · Press",
    title: "Pitch a journalist",
    body: "Reporters get bulk access to anonymized data, methodology notes, and a press contact. No NDA, no embargo, no editorial strings.",
    cta: "Request data + briefing",
    href: `mailto:${CONTACT}?subject=Press%20%2F%20Data%20Access&body=Outlet%3A%20%0ABeat%3A%20%0AStory%20angle%3A%20%0ADeadline%3A%20`,
  },
  {
    tag: "05 · Fund",
    title: "Underwrite a county",
    body: "$5,000 deploys sensors and a year of compute for one county. We publish where every dollar goes. Email for the funding memo.",
    cta: "Get funding memo",
    href: `mailto:${CONTACT}?subject=Funding%20Memo%20Request&body=Organization%20%2F%20individual%3A%20%0ATarget%20county%20or%20region%3A%20%0AGiving%20vehicle%20(personal%20%2F%20DAF%20%2F%20foundation)%3A%20`,
  },
  {
    tag: "06 · Build",
    title: "Contribute code",
    body: "React, Postgres, Python ML, ADS-B decoding. Issues are tagged. PRs welcome. CC BY-SA 4.0. Email to be added to the contributor list.",
    cta: "Join the build",
    href: `mailto:${CONTACT}?subject=Contributor%20Onboarding&body=GitHub%20handle%3A%20%0AAreas%20you%20want%20to%20work%20on%3A%20`,
  },
];

function Act() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Take Action</div>
          <h1 className="text-5xl sm:text-7xl mb-6">Watch back.</h1>
          <p className="text-lg max-w-3xl">
            Six things you can do in the next fifteen minutes. Pick one and start.
            Every button below opens a pre-filled email to{" "}
            <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> — the only inbox we run.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((c) => (
            <article key={c.tag} className="brutal-border-thick p-6 bg-paper brutal-shadow flex flex-col">
              <span className="label-stamp bg-ink text-paper px-2 py-1 self-start mb-3">{c.tag}</span>
              <h2 className="text-3xl mb-3">{c.title}</h2>
              <p className="mb-5 flex-1">{c.body}</p>
              <a
                href={c.href}
                className="label-stamp bg-warning brutal-border px-4 py-3 self-start hover:bg-alert hover:text-paper transition-colors"
              >
                {c.cta} →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <PullQuote seed="act-page" variant="alert" />
          <div className="flex flex-wrap gap-3">
            <Link to="/reports" className="label-stamp bg-ink text-paper px-5 py-3 hover:bg-alert">Read the source dossier →</Link>
            <Link to="/methodology" className="label-stamp brutal-border px-5 py-3 hover:bg-warning">How we built it</Link>
          </div>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">Or reach a human.</h2>
          <p className="opacity-80 mb-4">
            Press, legal, and partnership inquiries:{" "}
            <a className="text-warning underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
          <p className="opacity-60 text-sm font-mono">
            All inbound correspondence is logged and hashed. PGP fingerprint available on request.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
