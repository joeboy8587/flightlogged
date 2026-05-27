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

      {/* Constitutional Framework */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning text-ink inline-block px-2 py-1 mb-3">Constitutional Framework</div>
          <h2 className="text-4xl sm:text-6xl mb-4">The Bill of Rights applies to the sky over your house.</h2>
          <p className="text-lg opacity-80 max-w-3xl mb-10">
            We are not flight-tracking hobbyists. We document the systematic erosion of the right to be free from
            unreasonable search and seizure — by aerial proxy.
          </p>
          <div className="grid lg:grid-cols-2 gap-6">
            {[
              {
                t: "Fourth Amendment — The Right to Be Secure",
                q: "The right of the people to be secure in their persons, houses, papers, and effects, against unreasonable searches and seizures, shall not be violated...",
                d: "Your backyard is not public airspace. Your bedroom window is not a surveillance target. Patterned low-altitude overflights that enable visual, thermal, or electronic intrusion are not 'plain view' — they are unreasonable search by aerial proxy. See Kyllo v. United States (2001) and Carpenter v. United States (2018).",
              },
              {
                t: "First Amendment — Document and Publish",
                q: "Congress shall make no law... abridging the freedom of speech, or of the press...",
                d: "Recording public ADS-B broadcasts, analyzing public FAA records, and publishing findings is protected speech and press activity. The government cannot retaliate against citizens for documenting government conduct.",
              },
              {
                t: "Fifth Amendment — Due Process",
                q: "No person shall... be deprived of life, liberty, or property, without due process of law...",
                d: "If surveillance is used to construct investigations, create pretextual stops, or build dossiers without warrant or judicial oversight, due process is violated at the collection stage. We document the collection.",
              },
              {
                t: "Sixth Amendment — Confrontation",
                q: "In all criminal prosecutions, the accused shall enjoy the right... to be confronted with the witnesses against him...",
                d: "If aircraft-collected evidence reaches a courtroom, the defense has the right to examine chain of custody, calibration records, operator identity, and mission authorization. Our SHA-256 + Merkle chain provides that forensic foundation.",
              },
              {
                t: "Fourteenth Amendment — Equal Protection",
                q: "No State shall... deny to any person within its jurisdiction the equal protection of the laws.",
                d: "If surveillance resources are disproportionately deployed against specific neighborhoods, ethnic communities, or political dissidents, equal protection is violated. Population-scale documentation reveals those disparities.",
              },
            ].map((s) => (
              <article key={s.t} className="brutal-border border-paper p-6">
                <h3 className="text-xl mb-2">{s.t}</h3>
                <blockquote className="border-l-4 border-warning pl-3 italic text-sm opacity-80 mb-3">{s.q}</blockquote>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Constitutional remedies */}
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-3xl sm:text-5xl mb-6">When rights are violated — remedies</h2>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Violation pattern</th>
                  <th className="text-left p-3 label-stamp">Constitutional basis</th>
                  <th className="text-left p-3 label-stamp">Remedy</th>
                </tr>
              </thead>
              <tbody className="font-medium">
                {[
                  ["Repeated low-altitude overflights capturing private activity", "4th Amendment", "Bivens action / § 1983 claim"],
                  ["Retaliation for documenting aircraft activity", "1st Amendment", "§ 1983 + injunctive relief"],
                  ["Warrantless aerial-surveillance evidence used in proceedings", "4th + 6th Amendment", "Suppression motion + civil claim"],
                  ["Surveillance targeting protected class or political viewpoint", "14th Amendment", "Equal protection litigation + DOJ complaint"],
                  ["Pattern of surveillance without judicial oversight", "4th + 5th Amendment", "Declaratory judgment + injunctive relief"],
                ].map(([a, b, c]) => (
                  <tr key={a} className="border-t-2 border-ink">
                    <td className="p-3">{a}</td>
                    <td className="p-3 font-mono">{b}</td>
                    <td className="p-3">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm opacity-70 mt-4 max-w-3xl">
            Not legal advice. Patterns above are documented in our Findings and Violations logs and exportable with full
            SHA-256 chain of custody. Bring the receipts to your attorney.
          </p>
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