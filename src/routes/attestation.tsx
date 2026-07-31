import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getRecentScans } from "@/lib/scans.functions";
import { getChainOfCustody } from "@/lib/advocacy.functions";
import { fmtClock } from "@/lib/format";

const scansQO = queryOptions({ queryKey: ["recent-scans"], queryFn: () => getRecentScans(), refetchInterval: 60_000 });
const chainQO = queryOptions({ queryKey: ["chain-of-custody"], queryFn: () => getChainOfCustody(), staleTime: 60_000 });
const crumbs = [{ label: "Home", href: "/" }, { label: "Attestation" }];

export const Route = createFileRoute("/attestation")({
  head: () => ({
    meta: [
      { title: "Attestation — Chain of Custody" },
      { name: "description", content: "Live Merkle root and recent scan artifacts. Any tampering with Watchtower evidence breaks the chain and is detectable by any third party." },
      { property: "og:title", content: "Watchtower Attestation" },
      { property: "og:description", content: "Merkle root + scan artifacts published for independent verification." },
      { property: "og:url", content: "https://advocacywatch.live/attestation" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/attestation" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scansQO),
  component: Attestation,
});

function short(h: string | null) {
  if (!h) return "—";
  return h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h;
}

function ChainSection() {
  const { data, isLoading } = useQuery(chainQO);
  return (
    <section className="border-b-4 border-ink bg-paper">
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="label-stamp mb-2">Evidence chain · merkle_chain</div>
        <h2 className="text-3xl sm:text-4xl mb-2">
          {data ? `${data.totalBlocks.toLocaleString()} sealed blocks covering ${data.totalRows.toLocaleString()} records.` : "Reading the chain…"}
        </h2>
        <p className="text-sm opacity-70 max-w-3xl mb-4">
          Each block seals a batch of records with a hash, and carries the previous block's hash inside it.
          Change one old record and every block after it stops matching — which is what makes tampering
          visible to anyone, including people who do not trust us.
        </p>
        {data && (
          <div className="brutal-border-thick p-4 mb-4 inline-block bg-warning text-ink">
            <span className="label-stamp text-[11px]">
              {data.linked ? "Chain intact — every block links to the one before it." : "Chain link check incomplete for the sampled blocks."}
            </span>
            {data.firstAt && (
              <div className="text-xs font-mono mt-1 opacity-80">
                {fmtClock(data.firstAt)} → {fmtClock(data.lastAt)}
              </div>
            )}
          </div>
        )}
        <div className="overflow-x-auto brutal-border">
          <table className="w-full text-sm font-mono">
            <thead className="bg-ink text-paper">
              <tr>
                <th className="text-left p-2">Block</th>
                <th className="text-left p-2">Sealed</th>
                <th className="text-left p-2">Covers</th>
                <th className="text-right p-2">Records</th>
                <th className="text-left p-2">Block hash</th>
                <th className="text-left p-2">Previous</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-4 text-center opacity-60">Loading…</td></tr>}
              {!isLoading && (data?.blocks.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="p-4 text-center opacity-60">No chain blocks published yet.</td></tr>
              )}
              {(data?.blocks ?? []).map((b) => (
                <tr key={b.blockNumber} className="border-t border-ink/20">
                  <td className="p-2">#{b.blockNumber}</td>
                  <td className="p-2 whitespace-nowrap">{fmtClock(b.at)}</td>
                  <td className="p-2">{b.tableName ?? "—"}</td>
                  <td className="p-2 text-right">{b.rowCount.toLocaleString()}</td>
                  <td className="p-2 text-xs">{short(b.blockHash)}</td>
                  <td className="p-2 text-xs opacity-70">{short(b.previousHash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Attestation() {
  const { data: scans } = useSuspenseQuery(scansQO);
  const latest = scans[0] ?? null;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning text-ink inline-block px-2 py-1 mb-3">Chain of custody</div>
          <h1 className="text-5xl sm:text-7xl mb-4">Attestation.</h1>
          <p className="max-w-3xl opacity-80">
            Every scan the ML system runs is hashed and linked. This page publishes the latest Merkle root and the
            most recent scan artifacts, so any third party can reproduce the chain and verify no record has been altered.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp mb-2">Latest Merkle root</div>
          {latest ? (
            <div className="brutal-border-thick p-5 bg-warning text-ink">
              <div className="font-mono text-xs sm:text-sm break-all">{latest.merkleRoot ?? "(root not yet published for this scan)"}</div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono opacity-80">
                <span>scan_id: {short(latest.scanId)}</span>
                <span>ts: {new Date(latest.ts).toLocaleString()}</span>
                <span>method: {latest.methodVersion}</span>
              </div>
            </div>
          ) : (
            <div className="brutal-border p-5 bg-paper font-mono text-sm">
              No scan artifacts ingested yet. The ML box publishes to <code>/api/public/scans/ingest</code> —
              once the first scan arrives, its Merkle root appears here.
            </div>
          )}
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="label-stamp mb-1">Recent scans</div>
              <h2 className="text-3xl sm:text-4xl">Last 24 scan artifacts</h2>
            </div>
            <a href="/api/public/scans/latest" className="label-stamp brutal-border px-3 py-2 hover:bg-warning">
              JSON endpoint →
            </a>
          </div>
          <div className="overflow-x-auto brutal-border">
            <table className="w-full text-sm font-mono">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">Method</th>
                  <th className="text-right p-2">Detections</th>
                  <th className="text-right p-2">Candidates</th>
                  <th className="text-right p-2">Flagged</th>
                  <th className="text-left p-2">Merkle root</th>
                </tr>
              </thead>
              <tbody>
                {scans.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center opacity-60">No scans ingested yet.</td></tr>
                )}
                {scans.map((s) => (
                  <tr key={s.scanId} className="border-t border-ink/20">
                    <td className="p-2 whitespace-nowrap">{new Date(s.ts).toLocaleString()}</td>
                    <td className="p-2">{s.methodVersion}</td>
                    <td className="p-2 text-right">{s.detections.toLocaleString()}</td>
                    <td className="p-2 text-right">{s.candidates.toLocaleString()}</td>
                    <td className={`p-2 text-right ${s.flagged > 0 ? "bg-alert text-paper font-bold" : ""}`}>{s.flagged.toLocaleString()}</td>
                    <td className="p-2 text-xs break-all">{short(s.merkleRoot)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ChainSection />

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-0.5 mb-3">How to verify</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Reproduce the chain</h2>
          <ol className="text-sm font-mono space-y-2 list-decimal pl-6 max-w-3xl">
            <li>Fetch the JSON list of scans: <code>GET /api/public/scans/latest</code>.</li>
            <li>For each scan, SHA-256 its canonical payload.</li>
            <li>Fold the hashes into a Merkle tree in scan_id order.</li>
            <li>Compare the resulting root against the value published above. Any mismatch means a record has been altered or dropped.</li>
          </ol>
          <p className="mt-4 text-xs opacity-70 max-w-3xl">
            The ingest endpoint requires an HMAC signature. Only the ML system holds the shared secret,
            so no third party can inject synthetic scans — but anyone can read and reproduce every scan
            that has been ingested.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}