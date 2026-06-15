import { Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDeadMansCurveStats } from "@/lib/watchtower.functions";

export const dmcQO = queryOptions({
  queryKey: ["dead-mans-curve"],
  queryFn: () => getDeadMansCurveStats(),
});

/**
 * Dead Man's Curve exposure tiles.
 * Counts detections at or below 500 ft AGL (airborne) — the helicopter
 * height/velocity hazard envelope. Cites FAA AC 90-87C.
 */
export function DeadMansCurveTiles() {
  const { data } = useSuspenseQuery(dmcQO);
  return (
    <section className="border-b-4 border-ink bg-paper">
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="label-stamp bg-alert text-paper inline-block px-2 py-1 mb-2">
          Dead Man&apos;s Curve · public-safety exposure
        </div>
        <h2 className="text-3xl sm:text-4xl mb-2">Detections inside the height-velocity hazard envelope</h2>
        <p className="max-w-3xl text-sm opacity-80 mb-6">
          Every row below is a flight detected at or under 500&nbsp;ft while airborne — the altitude
          band where a helicopter has no time to autorotate to a survivable landing if the engine
          fails. Reference:{" "}
          <a
            href="https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1031633"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            FAA AC 90-87C
          </a>{" "}
          (Helicopter Height-Velocity Diagram). Altitude here is reported barometric; negative and
          zero-altitude transponder anomalies are excluded.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Tile label="Detections ≤ 500 ft" value={data.totalDetections.toLocaleString()} accent />
          <Tile label="Unique aircraft" value={data.uniqueAircraft.toLocaleString()} />
          <Tile label="≤ 500 ft AND < 60 kts" value={data.underBelowSlowCount.toLocaleString()} accent />
          <Tile
            label="Window"
            value={
              data.firstSeen && data.lastSeen
                ? `${new Date(data.firstSeen).toLocaleDateString()} → ${new Date(data.lastSeen).toLocaleDateString()}`
                : "—"
            }
          />
        </div>
        {data.top.length > 0 && (
          <div className="mt-6 brutal-border p-4">
            <div className="label-stamp mb-3 text-alert">Top aircraft inside the envelope</div>
            <ol className="grid sm:grid-cols-2 gap-2 font-mono text-sm">
              {data.top.map((t, i) => (
                <li key={t.icao} className="flex justify-between gap-2 border-b border-ink/10 py-1">
                  <span>
                    <span className="opacity-50">{(i + 1).toString().padStart(2, "0")}.</span>{" "}
                    <Link
                      to="/tail-search"
                      search={{ tail: t.registration || t.icao }}
                      className="font-bold underline hover:bg-warning"
                    >
                      {t.registration || t.icao}
                    </Link>
                    {t.minAltitude != null && (
                      <span className="opacity-60"> · min {t.minAltitude} ft</span>
                    )}
                  </span>
                  <span className="font-bold">{t.count.toLocaleString()}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs opacity-70">
              Click a tail number to pull every detection and export CSV.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`brutal-border p-3 ${accent ? "bg-alert text-paper" : "bg-paper"}`}>
      <div className="label-stamp opacity-80 text-[10px]">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}