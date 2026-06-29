import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getSnapshot } from "@/lib/watchtower.functions";

const snapshotQO = queryOptions({ queryKey: ["snapshot"], queryFn: () => getSnapshot() });

const crumbs = [{ label: "Home", href: "/" }, { label: "Methodology" }];

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
    { title: "Methodology — The Architecture of Never" },
    { name: "description", content: "How Watchtower 2.0 learns baselines, scores anomalies, and produces court-ready evidence with zero cherry-picking." },
    { property: "og:title", content: "Methodology — Architecture of Never" },
    { property: "og:description", content: "Baseline learning, statistical anomaly detection, Bradford Hill scoring, SHA-256 chain of custody." },
    { property: "og:url", content: "https://flightlogged.lovable.app/methodology" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/methodology" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQO),
  component: Methodology,
});

function Methodology() {
  const { data: s } = useSuspenseQuery(snapshotQO);
  const det = s.totalDetections.toLocaleString();
  const ac = s.uniqueAircraft.toLocaleString();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">Methodology</div>
          <h1 className="text-5xl sm:text-7xl mb-6">No opinions. Just a baseline.</h1>
          <p className="text-lg max-w-3xl">
            Every part of our pipeline is designed to defeat one accusation:
            <em> "you only track the aircraft you're already suspicious of."</em>
            We don't. The machine watches every aircraft, all the time, and the math decides what stands out.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16 grid lg:grid-cols-2 gap-0 brutal-border-thick">
          {[
            { n: "01", t: "Population-scale capture", d: `We log every ADS-B / MLAT detection in the observation zone — not a curated subset. ${det} records across ${ac} aircraft, growing.` },
            { n: "02", t: "48-hour baseline", d: "Before flagging anything, the system observes for 48 hours to learn what NORMAL looks like for that airspace at that time of day, season, and weather." },
            { n: "03", t: "Statistical anomaly detection", d: "Outliers are scored against the learned distribution. The threshold is published. We don't pick — math picks." },
            { n: "04", t: "Chain of custody", d: "Each record receives a SHA-256 hash linked into a Merkle chain. Any tampering is detectable. Evidence is reproducible by any third party." },
            { n: "05", t: "Bradford Hill scoring", d: "We apply the Bradford Hill criteria (strength, consistency, specificity, temporality, etc.) to aircraft-pattern and public-record corroboration — the same framework used in epidemiology and courtrooms. No physiological or personal-health data is included in the public record; the public site is system-focused, not autobiographical." },
            { n: "06", t: "Open source by design", d: "Every line of Watchtower 2.0 will be public. The methodology IS the code. Deploy it in your county, get the same answers." },
          ].map((s, i, arr) => (
            <div key={s.n} className={`p-8 bg-paper ${i % 2 === 0 ? "lg:border-r-4 border-ink" : ""} ${i < arr.length - 2 ? "border-b-4 border-ink" : ""} ${i === arr.length - 2 ? "lg:border-b-0 border-b-4 border-ink" : ""}`}>
              <div className="font-mono text-5xl font-bold opacity-20">{s.n}</div>
              <h2 className="text-2xl mt-2 mb-3">{s.t}</h2>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-paper border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <h2 className="text-4xl sm:text-5xl mb-6">The anti-cherry-picking proof</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              ["100%", "of detections logged — not just suspicious ones"],
              ["0%", "flagged during baseline window — by design"],
              ["48h", "minimum learning period before any flag is valid"],
            ].map(([n, d]) => (
              <div key={n} className="brutal-border-thick border-paper p-6">
                <div className="font-display text-6xl text-warning">{n}</div>
                <p className="mt-2 opacity-80">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning inline-block px-2 py-1 mb-3">County-weighted baselines</div>
          <h2 className="text-4xl sm:text-5xl mb-4">Each county gets its own normal.</h2>
          <p className="text-base max-w-3xl mb-3">
            Los Angeles airspace produces roughly ten times the traffic of Kern County. A single regional baseline lets
            LA volume drown Kern signals — a Cessna at 800 ft over Bakersfield looks unremarkable next to thousands of
            LA-basin orbits. The fix is not to suppress LA. It is to learn what normal means for each county and score
            each detection against the airspace it actually occurred in.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="brutal-border p-5 bg-paper">
              <div className="label-stamp mb-2">How it works</div>
              <ul className="text-sm font-mono space-y-2">
                <li>1. Partition the last 48h of detections by county.</li>
                <li>2. Compute median, 10th-percentile, and standard deviation of altitude per county.</li>
                <li>3. Score each detection against <em>its own county's</em> baseline.</li>
                <li>4. Aircraft crossing multiple counties get scored in each; displayed score = MAX(per-county score).</li>
                <li>5. Cross-county coordination, convergence, and shell-network detection are unchanged.</li>
              </ul>
            </div>
            <div className="brutal-border p-5 bg-paper">
              <div className="label-stamp mb-2">Why this isn't cherry-picking</div>
              <ul className="text-sm font-mono space-y-2">
                <li>· Same math for every county — nothing is hand-coded.</li>
                <li>· Per-county baselines are published live on <a href="/threat-index" className="underline">/threat-index</a>.</li>
                <li>· MAX rule prevents a quiet LA segment from hiding a loud Kern one.</li>
                <li>· Raw data remains intact — anyone can re-run the partition.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* === NEW CREDIBILITY SECTIONS === */}

      {/* 1. Data Sources */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Transparency</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Data sources</h2>
          <p className="text-sm max-w-3xl mb-4">
            All inputs are public. No private, personal, or biometric data is used.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { s: "ADS-B", d: "Public broadcast telemetry — position, altitude, speed, squawk." },
              { s: "MLAT", d: "Public multilateration triangulation where ADS-B is absent or suppressed." },
              { s: "FAA Aircraft Registry", d: "Public FAA registration records — N-number, make, model, year." },
              { s: "State corporate filings", d: "Public Secretary of State business records for ownership linkage." },
            ].map((src) => (
              <div key={src.s} className="brutal-border p-3 bg-paper">
                <div className="label-stamp mb-1">{src.s}</div>
                <div className="text-xs font-mono leading-snug">{src.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Limitations */}
      <section className="border-b-4 border-ink bg-warning text-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Scientific honesty</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Known limitations</h2>
          <p className="text-sm max-w-3xl mb-4">
            Every serious methodology includes limitations. Acknowledging uncertainty strengthens credibility, not weakness.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs font-mono">
            {[
              "ADS-B altitude is barometric, not true AGL. Terrain variation introduces ±50–100 ft uncertainty.",
              "MLAT accuracy varies with receiver density. Sparse coverage can produce positional jitter.",
              "FAA registry may contain outdated ownership info. Transfers lag filings by weeks or months.",
              "Shell-network linkage is public-record-based inference, not investigative confirmation.",
              "Weather data (NOAA) is optional context, not a scoring input. It does not drive anomaly flags.",
              "Signal loss or transponder suppression produces gaps. Absence of data is not absence of aircraft.",
            ].map((lim, i) => (
              <li key={i} className="brutal-border p-3 bg-paper">{lim}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Versioning */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Reproducibility</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Method versioning</h2>
          <p className="text-sm max-w-3xl mb-4">
            Each detection carries the method version used to score it. This ensures reproducibility even as the method evolves.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono brutal-border">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-2">Version</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["WTI_v1", "Initial weighted scoring: altitude, temporal, shell, repeat.", "Archived"],
                  ["WTI_v1_with_convergence", "Added convergence component for multi-aircraft clustering.", "Current"],
                  ["WTI_v2 (future)", "Planned: weather-adjusted baselines and sector-specific altitude floors.", "Planned"],
                ].map(([v, d, s]) => (
                  <tr key={v} className="border-t-2 border-ink">
                    <td className="p-2 font-bold">{v}</td>
                    <td className="p-2">{d}</td>
                    <td className="p-2">{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Why 48 hours */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Baseline design</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Why 48 hours?</h2>
          <p className="text-sm max-w-3xl mb-4">
            The 48-hour baseline is not arbitrary. It is statistically motivated to capture the full variation of normal airspace use.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { t: "Weekday / Weekend", d: "Captures commuter vs. recreational traffic patterns." },
              { t: "Morning / Evening", d: "Captures diurnal cycles — rush-hour corridors and quiet overnight bands." },
              { t: "Weather variation", d: "Captures how pilots adapt to wind, ceiling, and visibility changes." },
              { t: "Anti-cherry-picking", d: "Prevents selecting a 'quiet' day to make normal activity look suspicious." },
            ].map((r) => (
              <div key={r.t} className="brutal-border p-3 bg-paper">
                <div className="label-stamp mb-1">{r.t}</div>
                <div className="text-xs font-mono leading-snug">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How anomaly detection works */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Statistical rigor</div>
          <h2 className="text-3xl sm:text-4xl mb-4">How anomaly detection works</h2>
          <p className="text-sm max-w-3xl mb-4">
            Anomalies are detections above the 99th percentile of deviation from the baseline distribution for altitude, timing, or pattern.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { t: "Distribution", d: "The baseline is a learned empirical distribution, not a assumed normal curve." },
              { t: "Threshold", d: "The 99th percentile is the published, fixed threshold. No manual tuning." },
              { t: "Statistical test", d: "Deviation is measured as standardized distance from the rolling baseline mean." },
              { t: "Percentile", d: "Only events exceeding the 99th percentile enter the scoring pipeline." },
            ].map((r) => (
              <div key={r.t} className="brutal-border p-3 bg-paper">
                <div className="label-stamp mb-1">{r.t}</div>
                <div className="text-xs font-mono leading-snug">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Chain of custody diagram */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-warning text-ink inline-block px-2 py-1 mb-3">Tamper evidence</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Chain of custody</h2>
          <p className="text-sm max-w-3xl mb-6 opacity-80">
            Every record is hashed and linked. Altering one record breaks the chain — detectable by any third party.
          </p>
          <div className="overflow-x-auto">
            <pre className="brutal-border-thick border-paper bg-paper text-ink p-4 text-xs font-mono whitespace-pre leading-relaxed">
{`record001  →  hash(001)  ────────►  merkle_001
record002  →  hash(002)  ─┬────►  hash( merkle_001 + hash(002) )  →  merkle_002
record003  →  hash(003)  ─┬────►  hash( merkle_002 + hash(003) )  →  merkle_003
                          │
                          └──── Any tamper breaks the next link`}
            </pre>
          </div>
          <p className="mt-3 text-xs opacity-70 font-mono">
            SHA-256 hashing at ingestion. Merkle root published periodically. Third-party recomputation validates integrity.
          </p>
        </div>
      </section>

      {/* 7. What we do NOT log */}
      <section className="border-b-4 border-ink bg-alert text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-1 mb-3">Privacy boundary</div>
          <h2 className="text-3xl sm:text-4xl mb-4">What we do NOT log</h2>
          <p className="text-sm max-w-3xl mb-4 opacity-90">
            The system is intentionally limited to public airspace data. No private signals. No personal data. No exceptions.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm font-mono">
            {[
              "Personal data (names, addresses, phone numbers)",
              "Biometric data of any kind",
              "Phone or Wi-Fi signals",
              "Private surveillance feeds",
              "Social media or web-scraped personal content",
              "Any data not publicly broadcast or filed",
            ].map((item, i) => (
              <li key={i} className="brutal-border-thick border-paper p-2">{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs opacity-90">
            Only public ADS-B broadcasts and public FAA registry data are used. The public site is system-focused, not autobiographical.
          </p>
        </div>
      </section>

      {/* 8. Reproducibility checklist */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">Auditability</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Reproducibility checklist</h2>
          <p className="text-sm max-w-3xl mb-4">
            Every claim on this site can be independently verified. This is the full checklist a third party needs to reproduce our results.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { c: "Public data only", d: "ADS-B / MLAT / FAA registry — no proprietary inputs." },
              { c: "Open-source code", d: "Watchtower 2.0 code will be published for independent deployment." },
              { c: "Published thresholds", d: "99th percentile baseline deviation. Fixed. Documented." },
              { c: "Published weights", d: "Altitude 35%, Repeat 25%, Temporal 20%, Convergence 12%, Shell 8%." },
              { c: "Published method version", d: "Every row carries WTI version for temporal reproducibility." },
              { c: "Hash for every record", d: "SHA-256 + Merkle chain. Tamper-evident by design." },
            ].map((r) => (
              <div key={r.c} className="brutal-border p-3 bg-paper">
                <div className="label-stamp mb-1">{r.c}</div>
                <div className="text-xs font-mono leading-snug">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
