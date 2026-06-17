import { useQuery, queryOptions } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getConvergenceEvent } from "@/lib/watchtower.functions";

const qo = queryOptions({
  queryKey: ["convergence-event-top"],
  queryFn: () => getConvergenceEvent(),
  staleTime: 60_000,
});

export function ConvergenceEventCard() {
  const { data, isLoading } = useQuery(qo);

  if (isLoading) {
    return (
      <section className="border-b-4 border-ink bg-warning/30">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="label-stamp">Loading convergence event…</div>
        </div>
      </section>
    );
  }
  if (!data || !data.available || data.aircraftCount === 0) {
    return (
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="brutal-border-thick p-5 bg-paper">
            <div className="label-stamp bg-ink text-warning inline-block px-2 py-0.5 mb-2">Convergence event</div>
            <p className="text-sm max-w-2xl">
              No convergence cluster in the current published snapshot. Convergence events surface when
              multiple unrelated aircraft occupy abnormal spatial/temporal proximity — see{" "}
              <Link to="/threat-index" className="underline">how WTI uses convergence</Link>.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const when = data.eventTime
    ? new Date(data.eventTime).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
    : "unknown time";

  return (
    <section className="border-b-4 border-ink bg-alert text-paper">
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="flex flex-wrap items-baseline gap-3 mb-3">
          <span className="label-stamp bg-paper text-ink px-2 py-0.5">Convergence event · loudest cluster</span>
          <span className="font-mono text-xs opacity-90">{when}</span>
        </div>
        <h2 className="text-3xl sm:text-5xl mb-3 leading-tight">
          {data.aircraftCount} aircraft. One timestamp. Not a coincidence.
        </h2>
        <p className="max-w-3xl text-sm opacity-90 mb-5">
          A convergence event is the public dataset's loudest signal: multiple unrelated airframes
          flagged in the same window at unusual altitudes or paths. The Watchtower Threat Index
          weights convergence at 12% precisely because it rules out coincidence — when two or more
          tails synchronize, it stops being noise.
        </p>

        <div className="grid sm:grid-cols-4 gap-3 mb-5">
          <Stat label="Aircraft in cluster" value={String(data.aircraftCount)} />
          {data.detectionCount != null && (
            <Stat label="Detection rows" value={data.detectionCount.toLocaleString()} />
          )}
          {data.maxWti != null && (
            <Stat label="Max WTI" value={data.maxWti.toFixed(2)} />
          )}
          {data.avgWti != null && (
            <Stat label="Avg WTI" value={data.avgWti.toFixed(2)} />
          )}
          {data.county && <Stat label="Primary county" value={data.county} />}
        </div>

        {(data.tails.length > 0 || data.icaos.length > 0) && (
          <div className="brutal-border-thick border-paper p-4 bg-ink">
            <div className="label-stamp text-warning mb-2">Tails / ICAOs in the convergence</div>
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              {(data.tails.length > 0 ? data.tails : data.icaos).map((t) => (
                <Link
                  key={t}
                  to="/tail-search"
                  search={{ tail: t }}
                  className="brutal-border border-paper px-2 py-1 bg-paper text-ink hover:bg-warning"
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs opacity-80 font-mono">
          Source: <code>convergence_events</code> · selected by largest aircraft set. Each tail links to its full timeline.
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="brutal-border-thick border-paper p-3 bg-ink">
      <div className="label-stamp text-warning opacity-90 mb-1">{label}</div>
      <div className="font-mono text-2xl font-bold">{value}</div>
    </div>
  );
}