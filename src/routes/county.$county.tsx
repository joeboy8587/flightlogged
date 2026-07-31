import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getCountyPulse, slugToCounty, COUNTY_SLUGS, type CountyPulse } from "@/lib/advocacy.functions";
import { fmtClock, normalizeCountyName } from "@/lib/format";

const pulseQO = (slug: string) =>
  queryOptions({
    queryKey: ["county-pulse", slug],
    queryFn: () => getCountyPulse({ data: { county: slugToCounty(slug) } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/county/$county")({
  head: ({ params }) => {
    const name = normalizeCountyName(slugToCounty(params.county));
    const url = `https://advocacywatch.live/county/${params.county}`;
    return {
      meta: [
        { title: `${name} County Airspace Watch — What Flew Over You` },
        { name: "description", content: `Last 24 hours of aircraft activity over ${name} County: how many flew, how low, and how that compares to the machine-learned normal for this county.` },
        { property: "og:title", content: `${name} County Airspace Watch` },
        { property: "og:description", content: `What flew over ${name} County in the last 24 hours, measured against its own learned baseline.` },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [breadcrumbScript([{ label: "Home", href: "/" }, { label: `${name} County` }])],
    };
  },
  loader: ({ context, params }) => {
    if (!/^[a-z-]{2,40}$/.test(params.county)) throw notFound();
    return context.queryClient.ensureQueryData(pulseQO(params.county));
  },
  component: County,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">County data unavailable.</h1>
        <button onClick={reset} className="brutal-border px-5 py-3 label-stamp bg-warning">Retry</button>
      </div></div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-paper"><SiteHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-20">
        <h1 className="text-5xl mb-4">No such county page.</h1>
        <Link to="/live" className="label-stamp brutal-border bg-warning px-4 py-2">Back to the live feed →</Link>
      </div></div>
  ),
});

function rate(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

function Bars({ hours }: { hours: CountyPulse["hours"] }) {
  const max = Math.max(1, ...hours.map((h) => h.detections));
  return (
    <div className="flex items-end gap-1 h-32 brutal-border bg-paper p-2">
      {hours.length === 0 && <span className="text-xs opacity-60 self-center mx-auto">No hourly records in the last 24 hours.</span>}
      {hours.map((h) => (
        <div key={h.hourStart} className="flex-1 flex flex-col justify-end h-full" title={`${fmtClock(h.hourStart)} — ${h.detections} detections, ${h.below500} below 500 ft`}>
          <div className="w-full bg-alert" style={{ height: `${(h.below500 / max) * 100}%` }} />
          <div className="w-full bg-ink" style={{ height: `${((h.detections - h.below500) / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

function County() {
  const { county: slug } = Route.useParams();
  const { data } = useSuspenseQuery(pulseQO(slug));
  const name = normalizeCountyName(data.county);
  const observed500 = rate(data.last24.below500, data.last24.detections);
  const base500 = data.baseline.below500Rate;
  const ratio = base500 && base500 > 0 ? observed500 / base500 : null;
  const crumbs = [{ label: "Home", href: "/" }, { label: "Live Feed", href: "/live" }, { label: `${name} County` }];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-4">Your county · last 24 hours</div>
          <h1 className="text-5xl sm:text-7xl mb-4">
            {data.last24.detections.toLocaleString()} aircraft records over {name} County.
          </h1>
          <p className="max-w-3xl text-sm opacity-80">
            {data.last24.uniqueAircraft.toLocaleString()} distinct aircraft. {data.last24.below1000.toLocaleString()} records
            below 1,000 feet, {data.last24.below500.toLocaleString()} below 500 feet
            {data.last24.hovers > 0 ? `, ${data.last24.hovers.toLocaleString()} hovering` : ""}.
            {ratio != null && (
              ratio >= 1.25
                ? ` That is ${ratio.toFixed(1)}× the low-altitude rate this county normally sees.`
                : ratio <= 0.75
                ? ` That is below the low-altitude rate this county normally sees.`
                : ` That is close to the normal low-altitude rate for this county.`
            )}
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="label-stamp text-alert mb-2">Hour by hour — last 24 hours</div>
            <Bars hours={data.hours} />
            <div className="flex gap-4 mt-2 text-[10px] label-stamp opacity-70">
              <span><span className="inline-block w-3 h-3 bg-ink align-middle mr-1" />all records</span>
              <span><span className="inline-block w-3 h-3 bg-alert align-middle mr-1" />below 500 ft</span>
            </div>
          </div>
          <div className="brutal-border-thick p-4">
            <div className="label-stamp text-[11px] mb-2">What normal looks like here</div>
            {data.baseline.hoursLearned > 0 ? (
              <dl className="text-sm font-mono space-y-2">
                <div className="flex justify-between"><dt className="opacity-70">Median altitude</dt><dd className="font-bold">{data.baseline.medianAlt != null ? `${Math.round(data.baseline.medianAlt).toLocaleString()} ft` : "—"}</dd></div>
                <div className="flex justify-between"><dt className="opacity-70">Normal below-500ft rate</dt><dd className="font-bold">{base500 != null ? `${(base500 * 100).toFixed(1)}%` : "—"}</dd></div>
                <div className="flex justify-between"><dt className="opacity-70">Observed today</dt><dd className="font-bold">{(observed500 * 100).toFixed(1)}%</dd></div>
                <div className="flex justify-between"><dt className="opacity-70">Baseline hours learned</dt><dd className="font-bold">{data.baseline.hoursLearned.toLocaleString()}</dd></div>
              </dl>
            ) : (
              <p className="text-sm opacity-70">The machine has not finished learning a baseline for this county yet.</p>
            )}
            <p className="text-[11px] opacity-70 mt-3 leading-snug">
              Baseline is learned by the model from this county's own history — not compared against
              any other county, and not set by a person.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp text-alert mb-2">Most recent flagged events in {name} County · {data.violationCount.toLocaleString()} on record</div>
          {data.worst.length === 0 ? (
            <p className="text-sm opacity-70">No flagged events recorded for this county.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.worst.map((v) => (
                <article key={v.id} className="brutal-border bg-paper p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="label-stamp bg-alert text-paper px-2 py-0.5 text-[10px]">{v.severity}</span>
                    <span className="label-stamp bg-ink text-warning px-2 py-0.5 text-[10px]">MACHINE</span>
                  </div>
                  <p className="font-display text-lg leading-snug">
                    {v.registration ?? "An unidentified aircraft"} was flagged over {name} County
                    {v.altitude != null ? ` at ${Math.round(v.altitude).toLocaleString()} ft` : ""} on {fmtClock(v.at)}.
                  </p>
                  <p className="text-xs opacity-70 mt-2 font-mono">{v.violationType}</p>
                  {v.description && <p className="text-xs mt-1 leading-snug">{v.description}</p>}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t-2 border-ink/10 text-[10px] font-mono">
                    <span className="opacity-60">{v.hashShort ? `${v.hashShort}…` : "no hash"}</span>
                    {v.registration && (
                      <Link to="/tail-search" search={{ tail: v.registration }} className="label-stamp brutal-border bg-ink text-paper px-2 py-1 hover:bg-warning hover:text-ink">
                        Verify this →
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-b-4 border-ink bg-warning">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp text-[11px] mb-2">What you can do about it</div>
          <h2 className="font-display text-3xl uppercase mb-3">You live under this airspace. You get a say in it.</h2>
          <div className="flex flex-wrap gap-2">
            <Link to="/act" className="label-stamp brutal-border bg-ink text-paper px-4 py-2 text-[11px]">Report what you saw →</Link>
            <Link to="/toolkit" className="label-stamp brutal-border bg-paper text-ink px-4 py-2 text-[11px]">File a records request →</Link>
            <Link to="/accountability" className="label-stamp brutal-border bg-paper text-ink px-4 py-2 text-[11px]">Reform scoreboard →</Link>
            <Link to="/methodology" className="label-stamp brutal-border bg-paper text-ink px-4 py-2 text-[11px]">How we know this →</Link>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="label-stamp text-[11px] mb-2">Other monitored counties</div>
          <div className="flex flex-wrap gap-2">
            {COUNTY_SLUGS.filter((s) => s !== slug).map((s) => (
              <Link key={s} to="/county/$county" params={{ county: s }} className="label-stamp brutal-border bg-paper px-3 py-1.5 text-[11px] hover:bg-warning">
                {normalizeCountyName(slugToCounty(s))}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs opacity-70 font-mono">
            Source: <code>hourly_stats</code>, <code>county_baselines</code>, <code>sentinel_violations</code> (quiet-math).
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}