import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [{ label: "Home", href: "/" }, { label: "Reports" }];

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — The Architecture of Never" },
      { name: "description", content: "Full accountability investigations on the Kern County Sheriff's Office. Downloadable, source-cited, court-ready." },
      { property: "og:title", content: "Reports — Architecture of Never" },
      { property: "og:description", content: "Five years. $57.8M paid. Zero admissions. Read the receipts." },
      { property: "og:url", content: "https://flightlogged.lovable.app/reports" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/reports" }],
    scripts: [
      breadcrumbScript(crumbs),
      {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": REPORTS.map((r) => ({
          "@type": "Article",
          headline: r.title,
          description: r.blurb,
          datePublished: r.date,
          url: `https://flightlogged.lovable.app/reports#${r.slug}`,
          author: { "@type": "Organization", name: "The Architecture of Never" },
          publisher: { "@type": "Organization", name: "The Architecture of Never", url: "https://flightlogged.lovable.app" },
        })),
      }),
      },
    ],
  }),
  component: Reports,
});

type Report = {
  slug: string;
  file: string;
  date: string;
  classification: string;
  pages: string;
  title: string;
  blurb: string;
  highlights: { label: string; value: string }[];
  takeaways: string[];
  accent?: "warning" | "alert" | "ink";
};

const REPORTS: Report[] = [
  {
    slug: "dismantling-the-architecture",
    file: "/reports/dismantling-the-architecture-kcso.pdf",
    date: "April 2026",
    classification: "Public Accountability Report",
    pages: "50+ pp",
    title: "Dismantling the Architecture",
    blurb:
      "A 12-dimension deep-research investigation of the Kern County Sheriff's Office. Five years into a DOJ stipulated judgment, KCSO remains non-compliant in 5 of 8 reform areas — while building out the surveillance and armored capacity the judgment never touched.",
    highlights: [
      { label: "Settlements paid (taxpayer)", value: "$57.8M+" },
      { label: "Lewis verdict (2nd largest CA OIS)", value: "$30.5M" },
      { label: "SJ reform areas still deficient", value: "5 of 8" },
      { label: "Complaints YoY (2024→2025)", value: "+32.6%" },
      { label: "ALF IX LLC altitude violations", value: "118,773" },
      { label: "Monitoring cost to date", value: "$6–7M" },
    ],
    takeaways: [
      "DOJ stipulated judgment (BCV-20-102971) extended to 2028 after sustained non-compliance.",
      "April 9, 2026 Porterville BearCat killing of David Eric Morales occurred during active federal oversight — SJ had zero armored-vehicle provisions.",
      "$12M H125 helicopter purchase during a 21–37% staffing-vacancy crisis.",
      "Pension-industrial flow: KCERA $35M → AE Industrial Partners → KCSO aviation procurement.",
      "Monitor language ('cooperative', 'diligent') masks persistent failure; 4 Community Advisory Council members resigned over dysfunction.",
    ],
    accent: "alert",
  },
  {
    slug: "kcso-comprehensive-audit",
    file: "/reports/kcso-comprehensive-audit.pdf",
    date: "April 2026 · Updated",
    classification: "Comprehensive Audit",
    pages: "50+ pp",
    title: "KCSO Comprehensive Audit",
    blurb:
      "The full evidentiary record: court filings, DOJ documents, FAA registry data, pension-fund agendas, and official monitor reports — cross-referenced into ten domains of systemic accountability evasion.",
    highlights: [
      { label: "Independent searches", value: "200+" },
      { label: "Research dimensions", value: "12" },
      { label: "Fatal shootings 2005–2015", value: "54 / 54 ruled 'justified'" },
      { label: "Federal SJ accountability probability", value: "40–50%" },
      { label: "POST decertification probability", value: "35–45%" },
    ],
    takeaways: [
      "Graham v. Connor analysis of the Porterville incident finds the use of a BearCat as a deadly weapon falls outside constitutional limits.",
      "Youngblood public statements ('kill them financially', 'all bets are off') constitute Monell policy evidence spanning two decades.",
      "10 legal accountability mechanisms mapped — none individually sufficient; combined civil/regulatory/political pressure required.",
      "Receivership probability estimated 15–20% — historically rare, but on the table for the first time.",
    ],
    accent: "warning",
  },
  {
    slug: "evidence-survey-discrepancy",
    file: "/reports/evidence-survey-discrepancy-analysis.pdf",
    date: "2026",
    classification: "Statistical Audit",
    pages: "9 pp",
    title: "Evidence: Survey Discrepancy Analysis",
    blurb:
      "The court-mandated KCSO community survey produced a '66% feel safe' headline. We audited the sample. It is not a survey of Kern County — it is a survey of a different county that does not exist.",
    highlights: [
      { label: "Hispanic/Latino under-representation", value: "−30.8 pp" },
      { label: "Bachelor's-or-higher over-representation", value: "+17.7 pp" },
      { label: "Responses via KCSO promo channels", value: "70%" },
      { label: "Aviation 'critical violation' rate", value: "83% (112/135)" },
      { label: "Survey cost estimate", value: "$280K–$490K" },
    ],
    takeaways: [
      "Survey under-represents the majority Hispanic population by 31 percentage points — DOJ required a 'reliable, comprehensive, and representative' sample.",
      "'66% feel safe' is derived from a White-majority, older, wealthier, more educated sample that does not reflect Kern County.",
      "Black respondents: 53% believe KCSO treats Black residents unfairly; 29% personally treated unfairly.",
      "Aviation reality: 106 ft minimum altitude at 0 knots over residential homes; 23-minute hover in a heart-shaped pattern over 40 homes.",
      "Monitoring Team co-authored a survey that contradicts the DOJ's own 'culture of violence' determination.",
    ],
    accent: "ink",
  },
  {
    slug: "architecture-of-never-2005-2026",
    file: "/reports/architecture-kcso-precursor.pdf",
    date: "May 15, 2026",
    classification: "Watchtower Project Report",
    pages: "5 pp",
    title: "The Architecture of Never: 2005–2026",
    blurb:
      "Twenty-one years. One through-line: zero sustained findings of excessive force, zero admissions, zero individual accountability. The original framing document for this organization.",
    highlights: [
      { label: "Years documented", value: "2005–2026" },
      { label: "People killed (2005–2015)", value: "79" },
      { label: "Fatal shootings ruled 'justified'", value: "54 of 54" },
      { label: "Lewis verdict % of KCSO annual budget", value: "8.8%" },
      { label: "April 2026 fatal incidents", value: "3 in 8 days" },
    ],
    takeaways: [
      "Internal review is designed to exonerate: same chain of command, same officers, same policies.",
      "Settlements are insured — the financial signal that should change behavior never reaches the decisionmaker.",
      "The only on-record admission, from 2006: it is 'better financially to kill them' than to paralyze them. Cost-benefit, not remorse.",
      "Two killings on Highway 58 within six days, April 2026. KCSO response to the second: silence.",
    ],
    accent: "alert",
  },
];

function accentClasses(a: Report["accent"]) {
  if (a === "alert") return "bg-alert text-paper";
  if (a === "warning") return "bg-warning text-ink";
  return "bg-ink text-paper";
}

function Reports() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-3">Reports · The Receipts</div>
          <h1 className="text-5xl sm:text-7xl mb-6">Read the file. Then read it to your supervisor.</h1>
          <p className="text-lg max-w-3xl">
            These are not op-eds. They are source-cited, footnote-indexed accountability investigations.
            Every PDF below is downloadable, redistributable, and built to survive cross-examination.
            Start with the case that matters to your work — they all link to the same architecture.
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-16 space-y-10">
          {REPORTS.map((r, idx) => (
            <article key={r.slug} className="brutal-border-thick bg-paper">
              <div className="grid lg:grid-cols-12">
                <div className={`lg:col-span-4 p-8 ${accentClasses(r.accent)} border-b-4 lg:border-b-0 lg:border-r-4 border-ink`}>
                  <div className="label-stamp opacity-80 mb-2">REPORT {String(idx + 1).padStart(2, "0")}</div>
                  <div className="font-mono text-xs mb-4 opacity-90">{r.date} · {r.classification} · {r.pages}</div>
                  <h2 className="text-3xl sm:text-4xl mb-6 leading-tight">{r.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={r.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label-stamp bg-paper text-ink brutal-border px-4 py-3 hover:bg-ink hover:text-paper transition-colors"
                    >
                      Open PDF →
                    </a>
                    <a
                      href={r.file}
                      download
                      className="label-stamp brutal-border border-paper px-4 py-3 hover:bg-paper hover:text-ink transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-8 p-8">
                  <p className="text-lg mb-6">{r.blurb}</p>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {r.highlights.map((h) => (
                      <div key={h.label} className="brutal-border p-3">
                        <div className="label-stamp opacity-60 text-[10px] mb-1">{h.label}</div>
                        <div className="font-mono text-xl font-bold">{h.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Key takeaways</div>
                  <ul className="space-y-2">
                    {r.takeaways.map((t, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="font-mono text-warning bg-ink px-1.5 py-0.5 text-xs shrink-0 self-start mt-1">{String(i + 1).padStart(2, "0")}</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ink text-paper border-t-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl mb-4">Use them.</h2>
          <p className="opacity-80 mb-6 max-w-2xl">
            Journalists, attorneys, legislators, and affected residents are free to redistribute,
            quote, and build on every report here. CC BY-SA 4.0. Cite us, link the source, and tell
            us what you find.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/act" className="label-stamp bg-warning text-ink brutal-border px-5 py-3 hover:bg-alert hover:text-paper">Take action →</Link>
            <Link to="/findings" className="label-stamp brutal-border border-paper px-5 py-3 hover:bg-paper hover:text-ink">Live findings archive</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}