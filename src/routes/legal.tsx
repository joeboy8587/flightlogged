import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [{ label: "Home", href: "/" }, { label: "Legal" }];

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
    { title: "Legal Protections — The Architecture of Never" },
    { name: "description", content: "Your rights, our protections, and the legal framework that makes Watchtower evidence admissible." },
    { property: "og:title", content: "Legal Protections" },
    { property: "og:description", content: "Civil rights, FAA regulations, § 1983, FOIA, and chain of custody." },
    { property: "og:url", content: "https://flightlogged.lovable.app/legal" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/legal" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: Legal,
});

function Legal() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-3">Legal Protections</div>
          <h1 className="text-5xl sm:text-7xl mb-6">Watching is legal. Documenting is protected.</h1>
          <p className="text-lg max-w-3xl">
            ADS-B is an unencrypted public broadcast required by FAA regulation.
            Recording, analyzing, and publishing aircraft activity is constitutionally protected speech.
            Here is the framework that makes our findings hold up.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid lg:grid-cols-2 gap-8">
          {[
            { t: "First Amendment", d: "Publishing observations of public airspace activity is protected speech and protected press activity. We are journalists with sensors." },
            { t: "FAA 14 CFR § 91.119", d: "Minimum safe altitudes over congested areas, residential, and uncongested zones. We document deviations against the published baseline." },
            { t: "42 U.S.C. § 1983", d: "Civil rights remedy where state actors — including agencies operating or contracting aircraft — violate constitutional rights under color of law." },
            { t: "FOIA / State Public Records", d: "Aircraft owned or operated by public agencies are subject to disclosure. We provide templates and tracking." },
            { t: "FRE 901 / 902 — Authentication", d: "Our SHA-256 + Merkle chain satisfies authentication of digital records. Hashes are reproducible and tamper-evident." },
            { t: "Daubert / Frye Standards", d: "Statistical anomaly detection with published baselines, peer-reviewable code, and known error rates clears the standard for expert evidence." },
          ].map((s) => (
            <article key={s.t} className="brutal-border p-6 brutal-shadow">
              <h2 className="text-2xl mb-2">{s.t}</h2>
              <p>{s.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-warning border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl sm:text-5xl mb-4">If you are affected</h2>
          <p className="text-lg mb-6 max-w-2xl">We do not provide legal advice. We provide evidence — clean, hashed, and exportable — to the attorney of your choice. We can refer you to civil rights practices that take qualifying cases on contingency.</p>
          <Link to="/act" className="label-stamp bg-ink text-paper px-5 py-3 inline-block hover:bg-alert">Request a referral →</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}