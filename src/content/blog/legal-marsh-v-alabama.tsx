import type { BlogMeta } from "@/lib/blog";
import { Cite } from "@/components/blog/CitationRef";

export const meta: BlogMeta = {
  slug: "legal-marsh-v-alabama-shell-surveillance",
  title: "Marsh v. Alabama and the shell-company surveillance fleet",
  date: "2026-07-02",
  category: "legal",
  author: "Watchtower legal desk",
  excerpt:
    "When a private entity performs a public function, the Constitution follows the function. Here is what a 1946 company-town case has to do with an LLC operating a Cessna over your neighborhood in 2026.",
  related: [
    { label: "Operators (shell registry)", href: "/operators" },
    { label: "Rules & statutes", href: "/rules" },
    { label: "Legal protections", href: "/legal" },
  ],
};

export function Content() {
  return (
    <>
      <p className="lead">
        In <em>Marsh v. Alabama</em>, 326 U.S. 501 (1946), the Supreme Court held that a
        privately-owned company town could not use its property rights to suppress First
        Amendment activity, because it had assumed the traditional functions of a
        municipality. The doctrine is narrow, but the animating principle is not:{" "}
        <strong>when a private entity performs a public function, the Constitution
        follows the function.</strong>
      </p>

      <h2>Why the doctrine matters to airspace</h2>
      <p>
        Persistent aerial surveillance of an identified population is a{" "}
        <em>governmental</em> function. When a law-enforcement agency contracts, leases,
        or operationally coordinates with a private LLC to perform that surveillance,
        the LLC is not a passive observer — it is standing in for the state. Multiple
        federal circuits have applied a similar &ldquo;public-function&rdquo; or
        &ldquo;joint-action&rdquo; test under 42 U.S.C. § 1983 to find state action
        where a private actor was so entangled with a governmental purpose that the two
        became indistinguishable.
      </p>

      <h2>What our data shows</h2>
      <p>
        The <a href="/operators">Operators registry</a> currently flags dozens of
        shell-structured LLCs (single-purpose entities, address-only registrations,
        officer overlap) operating aircraft in coordinated patterns with agency-tagged
        tails. See, for example, the coordination score between{" "}
        <Cite tail="N913KC" hex="aca2b4" /> (KCSO) and one of the flagged shells on our{" "}
        <a href="/coordination">Coordination</a> page — a score computed by the ML core
        from spatial-temporal handoffs, not by human intuition.
      </p>

      <h2>The legal question</h2>
      <p>
        We do not, in this post, allege that any specific LLC is a state actor. We
        raise the question the record puts before any court:{" "}
        <em>where an LLC exists solely to fly a surveillance profile that is
        operationally indistinguishable from an agency&rsquo;s own aircraft, is the
        LLC&rsquo;s conduct still purely private?</em> The answer, under Marsh and its
        progeny, is not obviously yes.
      </p>

      <h2>Statutes in play</h2>
      <ul>
        <li>
          <Cite rule="42 USC 1983" /> &mdash; deprivation of rights under color of law.
        </li>
        <li>
          <Cite rule="14 CFR 91.119" /> &mdash; minimum safe altitudes.
        </li>
        <li>
          <Cite rule="14 CFR 91.227" /> &mdash; ADS-B Out equipment and integrity
          requirements.
        </li>
      </ul>

      <p>
        The machine documents the pattern. The doctrine names it. The public gets to
        decide what to do about it.
      </p>
    </>
  );
}