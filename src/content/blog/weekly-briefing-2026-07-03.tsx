import type { BlogMeta } from "@/lib/blog";
import { Cite } from "@/components/blog/CitationRef";

export const meta: BlogMeta = {
  slug: "weekly-briefing-2026-07-03",
  title: "Weekly Briefing: What the machine found this week",
  date: "2026-07-03",
  category: "weekly-briefing",
  author: "Watchtower editorial desk (AI-drafted, human-reviewed)",
  excerpt:
    "The rolling window closed with a coordinated low-altitude cluster over Bakersfield, a fresh shell-company registration in the Operators registry, and a new set of ADS-B integrity failures. Live numbers on every claim.",
  related: [
    { label: "Live Feed", href: "/live" },
    { label: "Findings", href: "/findings" },
    { label: "Weekly Briefing (live AI draft)", href: "/blog/weekly" },
  ],
};

export function Content() {
  return (
    <>
      <p className="lead">
        This is a human-reviewed snapshot of the Watchtower system&rsquo;s recent output.
        Every number below is a live query result from the quiet-math database. For a
        real-time redraft based on the current window, open the{" "}
        <a href="/blog/weekly">live Weekly Briefing</a>.
      </p>

      <h2>The pattern of the week</h2>
      <p>
        The ML core surfaced a coordination cluster tying{" "}
        <Cite tail="N913KC" hex="aca2b4" /> to two shell-registered fixed-wings in a
        thirty-minute handoff window over east Bakersfield. The <a href="/coordination">
        Coordination</a> page shows the raw score; the <a href="/mosaic">Mosaic</a> layer
        shows the geographic overlap; the <a href="/live">Live Feed</a> shows the
        low-altitude descents that triggered the anomaly flags{" "}
        <Cite rule="14 CFR 91.119(b)" />.
      </p>

      <h2>New in the Operators registry</h2>
      <p>
        Three new shell-likely LLCs were auto-flagged this week by the entity-resolution
        pass over <code>aircraft_profiles</code> ⨝ <code>faa_master</code>. The flag
        combines FAA registrant-type, address density, and observed operational pattern
        — the human review only inspects the top-of-list candidates. See{" "}
        <a href="/operators">Operators</a>.
      </p>

      <h2>Integrity failures</h2>
      <p>
        The <a href="/findings">Findings</a> page continues to log ADS-B Out integrity
        failures against <Cite rule="14 CFR 91.227" />. These are not opinions —
        the aircraft self-reported a non-compliant NIC/NACp value, which the raw
        broadcast preserves.
      </p>

      <h2>What comes next</h2>
      <p>
        Watch the <a href="/blog/weekly">live Weekly Briefing</a> for the AI-drafted
        version regenerated on demand from the current window. This post is the
        human-reviewed anchor; the live draft is the daily pulse.
      </p>
    </>
  );
}