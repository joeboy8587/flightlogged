import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { Mascot } from "@/components/mascot";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [{ label: "Home", href: "/" }, { label: "Toolkit" }];

export const Route = createFileRoute("/toolkit/")({
  head: () => ({
    meta: [
      { title: "Watchtower Toolkit — Public Airspace Accountability" },
      { name: "description", content: "Free public tools: FOIA/CPRA builder, incident reporting, FAA complaints, aircraft lookup, evidence preservation. No account, no tracking." },
      { property: "og:title", content: "Watchtower Toolkit" },
      { property: "og:description", content: "You have the same right to document your airspace that we do." },
      { property: "og:url", content: "https://flightlogged.lovable.app/toolkit" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/toolkit" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: ToolkitIndex,
});

type Tool = {
  tag: string;
  title: string;
  body: string;
  cta: string;
  href?: string;
  status: "live" | "coming";
};

const TOOLS: Tool[] = [
  {
    tag: "01 · Records",
    title: "FOIA / CPRA Builder",
    body: "Fill out a guided form. Get a formatted, legally-cited public records request ready to send to the FAA, FBI, or any sheriff/PD. Statutory citations and fee-waiver language included.",
    cta: "Open builder →",
    href: "/toolkit/foia",
    status: "live",
  },
  {
    tag: "02 · Report",
    title: "Incident Log Builder",
    body: "Document a single overflight: date, time, altitude estimate, tail number (if visible), location. Output is a SHA-256 sealed incident report you can hand to a journalist or attorney.",
    cta: "Coming next",
    status: "coming",
  },
  {
    tag: "03 · FAA",
    title: "FAA Safety Complaint Wizard",
    body: "Documented FAR violation? File a safety report (Form 8740-5 / Hotline) with the exact regulation, altitude, and operator pre-filled from your incident log.",
    cta: "Coming next",
    status: "coming",
  },
  {
    tag: "04 · Lookup",
    title: "Aircraft Entity Lookup",
    body: "Type a tail number. Get the registered owner from the FAA public registry, related aircraft under the same owner, and whether the operator appears in our shell-company index.",
    cta: "Coming next",
    status: "coming",
  },
  {
    tag: "05 · Preserve",
    title: "Evidence Preservation",
    body: "Drop a photo, video, or document. Get a SHA-256 hash + UTC timestamp computed in your browser — your file never leaves your device. Print or email the receipt.",
    cta: "Coming next",
    status: "coming",
  },
  {
    tag: "06 · Learn",
    title: "Skywatch Guide",
    body: "How to identify aircraft type, estimate altitude, read a tail number at distance, understand FAA minimums, and know when to escalate. Plain language. No jargon.",
    cta: "Coming next",
    status: "coming",
  },
];

function ToolkitIndex() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <div className="label-stamp text-warning mb-4">Public Toolkit · Free · No account</div>
            <h1 className="text-5xl sm:text-7xl mb-6">Watchtower Toolkit.</h1>
            <p className="text-lg max-w-3xl opacity-90 mb-3">
            You have the same right to document your airspace that we do. These tools give the
            public the shortcut to what took thirteen months and 472,000 detections to build.
            </p>
            <p className="text-sm max-w-3xl opacity-70">
            No account required. No data sold. No surveillance of the people documenting surveillance.
            Everything runs in your browser unless you explicitly choose to send it.
            </p>
          </div>
          <Mascot size="xl" className="hidden md:block justify-self-end" />
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((t) => (
            <article key={t.tag} className="brutal-border-thick p-6 bg-paper brutal-shadow flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="label-stamp bg-ink text-paper px-2 py-1">{t.tag}</span>
                <span className={`label-stamp px-2 py-1 ${t.status === "live" ? "bg-warning text-ink" : "border-2 border-ink/30 text-ink/50"}`}>
                  {t.status === "live" ? "LIVE" : "SOON"}
                </span>
              </div>
              <h2 className="text-2xl mb-3">{t.title}</h2>
              <p className="text-sm mb-5 flex-1 opacity-80">{t.body}</p>
              {t.status === "live" && t.href ? (
                <Link to={t.href} className="label-stamp bg-warning brutal-border px-4 py-3 self-start hover:bg-alert hover:text-paper transition-colors">
                  {t.cta}
                </Link>
              ) : (
                <span className="label-stamp border-2 border-ink/20 text-ink/40 px-4 py-3 self-start cursor-not-allowed">
                  {t.cta}
                </span>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12 text-sm font-mono opacity-70">
          Built on the same evidence chain as the public Watchtower dataset. All outputs reference
          public statutes and public registry data. No PII is collected, transmitted, or stored by
          these tools.
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}