import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getCitationsMap } from "@/lib/watchtower.functions";
import { fmtDate } from "@/lib/format";

const cQO = queryOptions({ queryKey: ["citations-map"], queryFn: () => getCitationsMap() });

const crumbs = [{ label: "Home", href: "/" }, { label: "Citations" }];

export const Route = createFileRoute("/citations")({
  head: () => ({
    meta: [
      { title: "Legal Citations — The Architecture of Never" },
      { name: "description", content: "Every rule flagged by Watchtower mapped to its CFR section, USC statute, and consent-decree provision. SHA-256 hashed sources." },
      { property: "og:title", content: "Legal Citations" },
      { property: "og:description", content: "Rule → CFR heading → consent decree provision. Every source hashed." },
      { property: "og:url", content: "https://flightlogged.lovable.app/citations" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/citations" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(cQO),
  component: Citations,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Citations unavailable.</h1>
        <p className="font-mono text-sm mb-6">Legal mapping temporarily unavailable. Please try again.</p>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
});

function sevClass(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("critical") || v.includes("high")) return "bg-alert text-paper";
  if (v.includes("medium") || v.includes("mod")) return "bg-warning text-ink";
  return "bg-ink text-paper";
}

function Citations() {
  const { data } = useSuspenseQuery(cQO);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-3">Citations · Rule → CFR → Decree</div>
          <h1 className="text-5xl sm:text-7xl mb-4">Every flag has a statute.</h1>
          <p className="max-w-3xl opacity-80">
            Every rule the engine triggers maps to a Code of Federal Regulations section, a U.S. Code
            statute, or a consent-decree provision. Every source row is SHA-256 hashed so anyone can
            independently reproduce the citation.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Classified detections", data.totals.classifiedDetections.toLocaleString()],
              ["CFR regulations indexed", `${data.totals.cfrRegs.toLocaleString()} · ${data.totals.cfrHashedPct}% hashed`],
              ["USC statutes indexed", `${data.totals.uscStatutes.toLocaleString()} · ${data.totals.uscHashedPct}% hashed`],
              ["Consent decree violations", data.totals.decreeViolations.toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="brutal-border p-4">
                <div className="label-stamp opacity-60 mb-1">{k}</div>
                <div className="font-display text-3xl">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <h2 className="text-3xl sm:text-4xl mb-2">Rule → CFR mapping</h2>
          <p className="text-sm opacity-70 mb-6 max-w-3xl">
            Each row shows a rule the regulatory engine has triggered, the count of detections that
            matched it, and the 14 CFR section it cites. A hash means the underlying regulation text
            in our index is byte-fingerprinted.
          </p>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-3 label-stamp">Rule</th>
                  <th className="text-right p-3 label-stamp">Detections</th>
                  <th className="text-left p-3 label-stamp">CFR</th>
                  <th className="text-left p-3 label-stamp">Heading</th>
                  <th className="text-left p-3 label-stamp">Source hash</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.rules.length === 0 && <tr><td colSpan={5} className="p-6 text-center">No classifications on record.</td></tr>}
                {data.rules.map((r) => (
                  <tr key={r.rule} className="border-t border-ink/20 hover:bg-warning/30">
                    <td className="p-3"><span className="label-stamp bg-alert text-paper px-2 py-1">{r.rule}</span></td>
                    <td className="p-3 text-right font-bold">{r.count.toLocaleString()}</td>
                    <td className="p-3 text-xs">{r.part ? `14 CFR §${r.part}${r.section ? "." + r.section : ""}` : <span className="opacity-40">—</span>}</td>
                    <td className="p-3 text-xs">{r.cfrHeading ?? <span className="opacity-40">(not in index)</span>}</td>
                    <td className="p-3 text-xs opacity-70">{r.cfrHashShort ? r.cfrHashShort + "…" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <h2 className="text-3xl sm:text-4xl mb-2">Consent decree violations</h2>
          <p className="text-sm opacity-70 mb-6 max-w-3xl">
            Provisions of active consent decrees that have been recorded as violated, with severity
            and a SHA-256 fingerprint of the underlying record.
          </p>
          <div className="space-y-3">
            {data.decrees.length === 0 && <p className="font-mono text-sm opacity-60">No decree violations on record.</p>}
            {data.decrees.map((d, i) => (
              <article key={d.provision + i} className="brutal-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="label-stamp opacity-60 mb-1">{fmtDate(d.date)}</div>
                    <h3 className="text-lg">{d.provision}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.severity && <span className={`label-stamp px-2 py-1 ${sevClass(d.severity)}`}>{d.severity}</span>}
                    {d.hashShort && <span className="label-stamp brutal-border px-2 py-1 font-mono text-xs">{d.hashShort}…</span>}
                  </div>
                </div>
                {d.description && <p className="text-sm opacity-80">{d.description}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}