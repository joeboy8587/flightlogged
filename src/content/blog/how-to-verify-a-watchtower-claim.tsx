import type { BlogMeta } from "@/lib/blog";
import { Cite } from "@/components/blog/CitationRef";

export const meta: BlogMeta = {
  slug: "how-to-verify-a-watchtower-claim",
  title: "How to verify a Watchtower claim",
  date: "2026-07-03",
  category: "community",
  author: "Watchtower community desk",
  excerpt:
    "Every number on this site maps to a public record you can pull yourself. Here is the field guide — page by page, column by column — for auditing our work.",
  related: [
    { label: "Methodology", href: "/methodology" },
    { label: "Live Feed", href: "/live" },
    { label: "Citations map", href: "/citations" },
  ],
};

export function Content() {
  return (
    <>
      <p className="lead">
        The Architecture of Never is built on a simple contract:{" "}
        <strong>if the machine can see it, so can you.</strong> No proprietary feeds. No
        undisclosed sources. Every detection is a public ADS-B broadcast; every owner
        name is a public FAA registry row; every citation is a public statute.
      </p>

      <h2>1. Start with a specific claim</h2>
      <p>
        Pick any number, tail, or event on the site. Example: on the{" "}
        <a href="/operators">Operators</a> page you see a shell-company flag on{" "}
        <Cite tail="N81KS" hex="a0e6c5" label="N81KS" />. Copy that tail number.
      </p>

      <h2>2. Confirm the FAA registry entry</h2>
      <p>
        Paste the tail into the{" "}
        <a href="https://registry.faa.gov/aircraftinquiry/" target="_blank" rel="noreferrer">
          FAA Aircraft Inquiry
        </a>
        . The registered owner, address, and aircraft type should match what we display.
        We store this snapshot in the quiet-math database table{" "}
        <code>faa_master</code>.
      </p>

      <h2>3. Verify the detection trail</h2>
      <p>
        Open <a href="/tail-search">Tail Search</a> and paste the same tail. You will see
        every ADS-B position we logged for that aircraft, with UTC-stamped altitudes,
        speeds, and county. Cross-reference two or three lines against a public tracker
        such as ADSBExchange or a community feeder network.
      </p>

      <h2>4. Trace the rule to a statute</h2>
      <p>
        Anywhere we cite a rule (for example{" "}
        <Cite rule="14 CFR 91.119(b)" label="14 CFR § 91.119(b)" />
        ) the text is one click from{" "}
        <a href="https://www.ecfr.gov" target="_blank" rel="noreferrer">
          eCFR.gov
        </a>
        . KCSO-specific rules (prefix <code>KCSO_</code>) are only applied to the four
        KCSO tails N912KC, N913KC, N597E, and N911KC — every other aircraft is measured
        against FAA CFR/USC only.
      </p>

      <h2>5. Independent replication</h2>
      <p>
        Our <a href="/methodology">Methodology</a> page publishes the SHA-256 hash of
        every detection bundle and the Merkle root of each day&rsquo;s data. If our
        display of a row ever disagrees with your independent pull of the same public
        broadcast, that is a bug on our side, not on the record&rsquo;s. Email us and we
        will publish the correction.
      </p>

      <h2>The point</h2>
      <p>
        You should not have to trust us. You should be able to <em>audit</em> us. Every
        page on this site is designed so a reasonably determined member of the public,
        with a browser and an hour, can rebuild the claim from raw public data.
      </p>
    </>
  );
}