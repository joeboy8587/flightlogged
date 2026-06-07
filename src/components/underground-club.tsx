// Static, public-record callout — six aircraft that logged ADS-B
// positions below ground level while moving. Names + tail numbers
// are pulled from the FAA registry (public).

type Row = { tail: string; owner: string; note?: string };

const ROWS: Row[] = [
  { tail: "N7670F", owner: "AKAYA LLC" },
  { tail: "N4593X", owner: "CLUBS 2 LLC" },
  { tail: "N46826", owner: "JPO AVIATION LLC" },
  { tail: "N875DM", owner: "KILO ALFA 200 LLC" },
  { tail: "N80616", owner: "AERO EQUITIES LLC" },
  { tail: "N916NT", owner: "9K AIR LLC" },
];

export function UndergroundClub() {
  return (
    <section className="border-b-4 border-ink bg-alert text-paper">
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="label-stamp bg-paper text-alert px-2 py-1 inline-block mb-3">
          ADS-B Integrity Failures · Public Notice
        </div>
        <h2 className="text-4xl sm:text-5xl mb-3">The Underground Club.</h2>
        <p className="max-w-3xl mb-4">
          Six aircraft logged ADS-B altitudes <span className="font-bold">below ground level</span>{" "}
          while in motion. Negative altitudes from a moving aircraft are not a sensor glitch —
          they are consistent with deliberate transponder manipulation. The FAA has a statutory
          duty to investigate.
        </p>
        <p className="max-w-3xl mb-6 text-sm opacity-90">
          Cited authority: <span className="font-mono">14 CFR § 91.227</span> (ADS-B Out performance
          requirements — broadcast position integrity), <span className="font-mono">14 CFR § 91.13</span>{" "}
          (careless / reckless operation), and <span className="font-mono">18 U.S.C. § 1001</span>{" "}
          (false statements to a federal agency, when the broadcast feeds FAA surveillance).
        </p>

        <div className="brutal-border-thick bg-paper text-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-paper">
              <tr>
                <th className="text-left p-3 label-stamp">Registration</th>
                <th className="text-left p-3 label-stamp">Registered owner (FAA)</th>
                <th className="text-left p-3 label-stamp">Anomaly</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {ROWS.map((r) => (
                <tr key={r.tail} className="border-t border-ink/20">
                  <td className="p-3 font-bold">{r.tail}</td>
                  <td className="p-3">{r.owner}</td>
                  <td className="p-3 text-xs">Logged altitude &lt; -100 ft while moving</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs opacity-80 font-mono">
          Source: FAA public registry + civilian ADS-B receivers. Each record is SHA-256 fingerprinted
          in our evidence chain and independently reproducible from public broadcasts.
        </p>
      </div>
    </section>
  );
}