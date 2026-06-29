// Live public-record callout — every aircraft that logged ADS-B positions
// below ground level while in motion, pulled live from the quiet-math Neon
// detections table. Nothing here is hard-coded.
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getAdsbIntegrityFailures } from "@/lib/watchtower.functions";

const qo = queryOptions({
  queryKey: ["adsb-integrity-failures"],
  queryFn: () => getAdsbIntegrityFailures(),
  staleTime: 5 * 60_000,
});

export function UndergroundClub() {
  const { data, isLoading } = useQuery(qo);
  const rows = data ?? [];
  return (
    <section className="border-b-4 border-ink bg-alert text-paper">
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="label-stamp bg-paper text-alert px-2 py-1 inline-block mb-3">
          ADS-B Integrity Failures · Public Notice
        </div>
        <h2 className="text-4xl sm:text-5xl mb-3">The Underground Club.</h2>
        <p className="max-w-3xl mb-4">
          {isLoading
            ? "Loading aircraft that logged altitudes below ground level while in motion…"
            : rows.length === 0
              ? "No aircraft currently flagged with sub-surface broadcasts. This list updates from live detections."
              : `${rows.length.toLocaleString()} aircraft logged ADS-B altitudes `}
          {!isLoading && rows.length > 0 && (
            <>
              <span className="font-bold">below ground level</span> while in motion. Negative
              altitudes from a moving aircraft are not a sensor glitch — they are consistent with
              deliberate transponder manipulation. The FAA has a statutory duty to investigate.
            </>
          )}
        </p>
        <p className="max-w-3xl mb-6 text-sm opacity-90">
          Cited authority: <span className="font-mono">14 CFR § 91.227</span> (ADS-B Out performance
          requirements — broadcast position integrity), <span className="font-mono">14 CFR § 91.13</span>{" "}
          (careless / reckless operation), and <span className="font-mono">18 U.S.C. § 1001</span>{" "}
          (false statements to a federal agency, when the broadcast feeds FAA surveillance).
        </p>

        {rows.length > 0 && (
        <div className="brutal-border-thick bg-paper text-ink overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink text-paper">
              <tr>
                <th className="text-left p-3 label-stamp">Registration</th>
                <th className="text-left p-3 label-stamp">Registered owner (FAA)</th>
                <th className="text-left p-3 label-stamp">Min altitude</th>
                <th className="text-left p-3 label-stamp">Detections</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {rows.map((r) => {
                const tail = r.registration ?? r.icao;
                return (
                <tr key={r.icao} className="border-t border-ink/20">
                  <td className="p-3 font-bold">
                    <Link to="/tail-search" search={{ tail }} className="underline hover:bg-warning">
                      {tail}
                    </Link>
                  </td>
                  <td className="p-3">{r.owner ?? "—"}</td>
                  <td className="p-3 text-xs">{r.minAltitude != null ? `${r.minAltitude} ft` : "—"}</td>
                  <td className="p-3 text-xs">{r.detections.toLocaleString()}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        <p className="mt-4 text-xs opacity-80 font-mono">
          Source: live <code>detections</code> table (quiet-math) joined to FAA public registry. SHA-256 fingerprinted
          in our evidence chain and independently reproducible from public broadcasts.
        </p>
      </div>
    </section>
  );
}