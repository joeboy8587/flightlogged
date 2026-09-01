import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { TailBadge } from "@/components/tail-badge";
import { countyToSlug } from "@/lib/counties";
import { fmtDate } from "@/lib/format";
import { getFederalLayer } from "@/lib/federal.functions";

const federalQO = queryOptions({
  queryKey: ["federal-layer"],
  queryFn: () => getFederalLayer(),
  staleTime: 10 * 60_000,
});

const crumbs = [{ label: "Home", href: "/" }, { label: "Federal Fleet" }];

export const Route = createFileRoute("/federal")({
  head: () => ({
    meta: [
      { title: "Federal Fleet & Front Companies — Watchtower" },
      {
        name: "description",
        content:
          "Publicly reported federal surveillance front companies matched against the FAA registry, then joined to aircraft our own sensors actually detected over California.",
      },
      { property: "og:title", content: "Federal Fleet & Front Companies" },
      { property: "og:description", content: "Front-company registry, cross-checked against detections we recorded ourselves." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://advocacywatch.live/federal" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/federal" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: FederalPage,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">Federal layer unavailable.</h1>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

const nf = new Intl.NumberFormat("en-US");

function FederalPage() {
  const { data, isLoading } = useQuery(federalQO);
  const registry = data?.registry ?? [];
  const observed = data?.observed ?? [];

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <main className="max-w-[1400px] mx-auto px-4 pb-24">
        <header className="pt-8 pb-6 border-b-4 border-ink">
          <p className="label-stamp text-[11px] mb-2">
            <span className="brutal-border bg-warning px-2 py-0.5">PUBLIC RECORD MATCH</span>{" "}
            <span className="brutal-border bg-paper px-2 py-0.5">NO BEHAVIOR CLAIM</span>
          </p>
          <h1 className="text-4xl sm:text-6xl leading-none mb-4">Federal fleet &amp; front companies.</h1>
          <p className="max-w-3xl text-sm sm:text-base">
            Newsrooms have published the fictitious corporate names federal agencies use to register
            surveillance aircraft. We take those names, match them against the FAA Civil Aircraft
            Registry, and then join the result against detections our own receivers recorded. Presence
            in this table means one thing only: <strong>that aircraft flew through our footprint</strong>.
            It is not a claim that any specific flight targeted anyone.
          </p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="brutal-border bg-ink text-paper p-4">
              <dt className="label-stamp text-[10px] text-warning">Registered aircraft matched</dt>
              <dd className="text-4xl">{isLoading ? "…" : nf.format(data?.totalFleet ?? 0)}</dd>
            </div>
            <div className="brutal-border bg-warning p-4">
              <dt className="label-stamp text-[10px]">Detected in our footprint</dt>
              <dd className="text-4xl">{isLoading ? "…" : nf.format(data?.totalObserved ?? 0)}</dd>
            </div>
            <div className="brutal-border bg-paper p-4">
              <dt className="label-stamp text-[10px]">Named registrants tracked</dt>
              <dd className="text-4xl">{isLoading ? "…" : nf.format(registry.length)}</dd>
            </div>
          </dl>
        </header>

        <section className="mt-10">
          <h2 className="text-3xl mb-1">Registrant directory</h2>
          <p className="text-sm mb-4 max-w-3xl">
            Fleet size is the number of aircraft in the FAA registry under that exact registrant name.
            Detected is how many of those aircraft appear in our own detection profiles.
          </p>
          <div className="overflow-x-auto brutal-border bg-paper">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-ink text-paper label-stamp text-[10px]">
                <tr>
                  <th className="text-left p-2">Registrant</th>
                  <th className="text-left p-2">Attribution</th>
                  <th className="text-right p-2">Fleet size</th>
                  <th className="text-right p-2">Detected here</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={4} className="p-4 label-stamp text-[11px]">Loading registry…</td></tr>
                )}
                {registry.map((r) => (
                  <tr key={r.company} className="border-t-2 border-ink/20">
                    <td className="p-2 font-bold">{r.company}</td>
                    <td className="p-2">{r.agency}</td>
                    <td className="p-2 text-right">{nf.format(r.fleetSize)}</td>
                    <td className="p-2 text-right">
                      {r.observed > 0 ? (
                        <span className="brutal-border bg-warning px-2 py-0.5 label-stamp text-[10px]">
                          {nf.format(r.observed)}
                        </span>
                      ) : (
                        <span className="opacity-50">0</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && registry.length === 0 && (
                  <tr><td colSpan={4} className="p-4 label-stamp text-[11px]">No registrant matches available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-3xl mb-1">Aircraft we actually detected</h2>
          <p className="text-sm mb-4 max-w-3xl">
            Every row below is one tail we recorded ourselves. Lowest altitude is the minimum recorded
            for that tail across its whole profile — a single low pass, not an average behavior.
          </p>
          <div className="overflow-x-auto brutal-border bg-paper">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-ink text-paper label-stamp text-[10px]">
                <tr>
                  <th className="text-left p-2">Aircraft</th>
                  <th className="text-left p-2">Registrant</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Detections</th>
                  <th className="text-right p-2">Lowest alt.</th>
                  <th className="text-left p-2">Primary county</th>
                  <th className="text-left p-2">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="p-4 label-stamp text-[11px]">Joining registry against detections…</td></tr>
                )}
                {observed.map((o) => {
                  const slug = o.primaryCounty ? countyToSlug(o.primaryCounty) : null;
                  return (
                    <tr key={o.icao ?? o.registration} className="border-t-2 border-ink/20">
                      <td className="p-2"><TailBadge registration={o.registration} icao={o.icao} /></td>
                      <td className="p-2">
                        <span className="block font-bold">{o.company}</span>
                        <span className="label-stamp text-[10px] opacity-70">{o.agency}</span>
                      </td>
                      <td className="p-2">{o.model ?? "—"}</td>
                      <td className="p-2 text-right">{o.detections == null ? "—" : nf.format(o.detections)}</td>
                      <td className="p-2 text-right">
                        {o.minAltitude == null ? "—" : `${nf.format(o.minAltitude)} ft`}
                      </td>
                      <td className="p-2">
                        {o.primaryCounty
                          ? slug
                            ? <Link className="underline" to="/county/$county" params={{ county: slug }}>{o.primaryCounty}</Link>
                            : o.primaryCounty
                          : "—"}
                      </td>
                      <td className="p-2 whitespace-nowrap">{o.lastSeen ? fmtDate(o.lastSeen) : "—"}</td>
                    </tr>
                  );
                })}
                {!isLoading && observed.length === 0 && (
                  <tr><td colSpan={7} className="p-4 label-stamp text-[11px]">No federal-registrant aircraft in our detection profiles yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 brutal-border bg-ink text-paper p-5">
          <h2 className="text-2xl mb-2 text-warning">How to read this honestly</h2>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li>Front-company names come from published journalism, not from our machine layer. They are labelled as reported.</li>
            <li>The FAA match is an exact registrant-name match against the public registry. Common words are excluded to avoid false hits.</li>
            <li>Detection counts are raw ADS-B/MLAT pings, not sorties. A single orbit produces thousands of pings.</li>
            <li>Nothing on this page asserts a purpose, target, or unlawful act. Purpose requires records, not telemetry.</li>
          </ul>
          <p className="mt-4 text-xs opacity-80">
            All data referenced here is drawn from public sources — FAA ADS-B broadcasts, the FAA Civil
            Aircraft Registry, and published reporting — and is independently verifiable by any member
            of the public. Cross-check any tail on{" "}
            <Link className="underline text-warning" to="/aircraft">Aircraft Dossiers</Link>,{" "}
            <Link className="underline text-warning" to="/verify">Verify</Link>, or{" "}
            <Link className="underline text-warning" to="/methodology">Methodology</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
