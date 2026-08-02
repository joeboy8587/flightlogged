import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";
import { getRecentScans } from "@/lib/scans.functions";
import { getChainOfCustody } from "@/lib/advocacy.functions";
import { fmtClock } from "@/lib/format";

const scansQO = queryOptions({
  queryKey: ["recent-scans-verify"],
  queryFn: () => getRecentScans(),
  refetchInterval: 60_000,
});
const chainQO = queryOptions({
  queryKey: ["chain-verify"],
  queryFn: () => getChainOfCustody(),
  staleTime: 60_000,
});

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Verify" },
];

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify — Independent Verification Tool" },
      {
        name: "description",
        content:
          "Paste a scan ID or Merkle root to independently verify Watchtower evidence. Reproduce the chain of custody yourself.",
      },
      { property: "og:title", content: "Verify — Watchtower Project" },
      {
        property: "og:description",
        content: "Independent verification tool for Watchtower chain of custody evidence.",
      },
      { property: "og:url", content: "https://advocacywatch.live/verify" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/verify" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(scansQO),
      context.queryClient.ensureQueryData(chainQO),
    ]),
  component: VerifyTool,
});

function shortHash(h: string | null) {
  if (!h) return "—";
  return h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h;
}

function VerifyTool() {
  const { data: scans } = useSuspenseQuery(scansQO);
  const { data: chain } = useSuspenseQuery(chainQO);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<
    | { status: "idle" }
    | { status: "found"; type: "scan" | "block"; data: Record<string, unknown> }
    | { status: "not_found" }
    | { status: "checking" }
  >({ status: "idle" });

  function handleVerify() {
    const q = input.trim().toLowerCase();
    if (!q) return;
    setResult({ status: "checking" });

    // Check scan artifacts first
    const scanMatch = scans.find(
      (s) => s.scanId.toLowerCase() === q || (s.merkleRoot ?? "").toLowerCase() === q,
    );

    if (scanMatch) {
      setResult({
        status: "found",
        type: "scan",
        data: {
          scan_id: scanMatch.scanId,
          timestamp: fmtClock(scanMatch.ts),
          method: scanMatch.methodVersion,
          detections: scanMatch.detections,
          candidates: scanMatch.candidates,
          flagged: scanMatch.flagged,
          kinematic_hits: scanMatch.kinematicHits,
          handoffs: scanMatch.handoffs,
          subject_absent: scanMatch.subjectAbsent,
          merkle_root: scanMatch.merkleRoot ?? "(not published for this scan)",
        },
      });
      return;
    }

    // Check chain blocks
    const blockMatch = chain.blocks.find(
      (b) =>
        (b.blockHash ?? "").toLowerCase() === q ||
        (b.merkleRoot ?? "").toLowerCase() === q ||
        String(b.blockNumber) === q,
    );

    if (blockMatch) {
      // Verify chain linkage for this block
      const prevBlock = chain.blocks.find((b) => b.blockNumber === blockMatch.blockNumber - 1);
      const linked = !blockMatch.previousHash || !prevBlock || blockMatch.previousHash === prevBlock.blockHash;

      setResult({
        status: "found",
        type: "block",
        data: {
          block_number: blockMatch.blockNumber,
          timestamp: blockMatch.at ? fmtClock(blockMatch.at) : "—",
          table: blockMatch.tableName ?? "—",
          row_count: blockMatch.rowCount,
          block_hash: blockMatch.blockHash ?? "—",
          previous_hash: blockMatch.previousHash ?? "—",
          merkle_root: blockMatch.merkleRoot ?? "—",
          algorithm: blockMatch.algorithm ?? "—",
          chain_intact: linked ? "YES — previous hash matches" : "BROKEN — hash mismatch detected",
        },
      });
      return;
    }

    setResult({ status: "not_found" });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="label-stamp bg-warning text-ink inline-block px-2 py-1 mb-3">
            Independent verification
          </div>
          <h1 className="text-5xl sm:text-7xl mb-4">Verify the chain.</h1>
          <p className="max-w-3xl text-lg opacity-80">
            Paste a scan ID, block hash, or Merkle root below. The tool checks it against the live
            chain of custody and shows you exactly what was recorded, when, and whether the chain
            is intact. No account needed. No special access. Anyone can do this.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="max-w-2xl">
            <label
              htmlFor="verify-input"
              className="label-stamp mb-2 block"
            >
              Scan ID, block hash, or Merkle root
            </label>
            <div className="flex gap-2">
              <input
                id="verify-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="flex-1 rounded-none border-2 border-ink bg-paper px-4 py-3 font-mono text-sm outline-none focus:border-warning"
              />
              <button
                onClick={handleVerify}
                className="label-stamp bg-warning text-ink border-2 border-ink px-6 py-3 hover:bg-ink hover:text-paper transition-colors"
              >
                Verify
              </button>
            </div>
            <p className="mt-2 text-xs opacity-60 font-mono">
              Try copying a scan_id from the table below, or a block hash from the chain.
            </p>
          </div>

          {/* Results */}
          {result.status === "checking" && (
            <div className="mt-8 p-4 border-2 border-ink bg-paper font-mono text-sm">
              Checking…
            </div>
          )}

          {result.status === "not_found" && (
            <div className="mt-8 p-4 border-2 border-alert bg-alert/10 text-ink font-mono text-sm">
              No match found. This ID is not in the current chain of custody. If you received this ID
              from a Watchtower report, it may be from an older batch that has rotated out of the
              recent window. Contact us and we can look it up in the full archive.
            </div>
          )}

          {result.status === "found" && (
            <div className="mt-8">
              <div
                className={`label-stamp inline-block px-2 py-1 mb-3 ${
                  result.type === "scan"
                    ? "bg-warning text-ink"
                    : "bg-ink text-paper"
                }`}
              >
                {result.type === "scan" ? "Scan artifact found" : "Chain block found"}
              </div>
              <div className="overflow-x-auto brutal-border">
                <table className="w-full text-sm font-mono">
                  <tbody>
                    {Object.entries(result.data).map(([k, v]) => {
                      const isChainIntact = k === "chain_intact";
                      const isBroken = isChainIntact && String(v).startsWith("BROKEN");
                      return (
                        <tr key={k} className="border-t border-ink/20">
                          <td className="p-2 text-right opacity-60 align-top w-1/3">{k}</td>
                          <td
                            className={`p-2 break-all ${isChainIntact ? (isBroken ? "bg-alert text-paper font-bold" : "font-bold") : ""}`}
                          >
                            {String(v)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {result.type === "scan" && (
                <p className="mt-3 text-xs opacity-70 max-w-3xl">
                  To fully reproduce: fetch the JSON from{" "}
                  <code className="bg-ink/5 px-1">/api/public/scans/latest</code>, find this scan_id,
                  then SHA-256 its canonical payload and compare against the merkle_root shown above.
                  See the <a href="/attestation" className="underline">attestation page</a> for the
                  full walkthrough.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Recent scans reference table */}
      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp mb-2">Reference — last 24 scan artifacts</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Recent scans to try</h2>
          <p className="text-sm opacity-70 max-w-3xl mb-4">
            Copy any scan_id from this table and paste it into the verification box above.
          </p>
          <div className="overflow-x-auto brutal-border">
            <table className="w-full text-sm font-mono">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">scan_id</th>
                  <th className="text-right p-2">Detections</th>
                  <th className="text-right p-2">Flagged</th>
                  <th className="text-left p-2">Merkle root</th>
                </tr>
              </thead>
              <tbody>
                {scans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center opacity-60">
                      No scans ingested yet.
                    </td>
                  </tr>
                )}
                {scans.map((s) => (
                  <tr
                    key={s.scanId}
                    className="border-t border-ink/20 cursor-pointer hover:bg-warning/10"
                    onClick={() => setInput(s.scanId)}
                  >
                    <td className="p-2 whitespace-nowrap">{fmtClock(s.ts)}</td>
                    <td className="p-2">{s.scanId}</td>
                    <td className="p-2 text-right">{s.detections.toLocaleString()}</td>
                    <td className={`p-2 text-right ${s.flagged > 0 ? "bg-alert text-paper font-bold" : ""}`}>
                      {s.flagged.toLocaleString()}
                    </td>
                    <td className="p-2 text-xs break-all">{shortHash(s.merkleRoot)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Chain reference */}
      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp bg-paper text-ink inline-block px-2 py-1 mb-2">
            Chain of custody
          </div>
          <h2 className="text-3xl sm:text-4xl mb-4">Merkle chain blocks</h2>
          <p className="text-sm opacity-70 max-w-3xl mb-4">
            Copy any block hash or Merkle root and paste it into the verification box.
          </p>
          <div className="overflow-x-auto brutal-border-thick">
            <table className="w-full text-sm font-mono">
              <thead className="bg-paper text-ink">
                <tr>
                  <th className="text-left p-2">Block</th>
                  <th className="text-left p-2">Sealed</th>
                  <th className="text-left p-2">Table</th>
                  <th className="text-right p-2">Rows</th>
                  <th className="text-left p-2">Block hash</th>
                  <th className="text-left p-2">Previous</th>
                </tr>
              </thead>
              <tbody>
                {chain.blocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center opacity-60">
                      No chain blocks published yet.
                    </td>
                  </tr>
                )}
                {chain.blocks.map((b) => (
                  <tr
                    key={b.blockNumber}
                    className="border-t border-paper/20 cursor-pointer hover:bg-paper/10"
                    onClick={() => setInput(b.blockHash ?? "")}
                  >
                    <td className="p-2">#{b.blockNumber}</td>
                    <td className="p-2 whitespace-nowrap">{b.at ? fmtClock(b.at) : "—"}</td>
                    <td className="p-2">{b.tableName ?? "—"}</td>
                    <td className="p-2 text-right">{b.rowCount.toLocaleString()}</td>
                    <td className="p-2 text-xs break-all">{shortHash(b.blockHash)}</td>
                    <td className="p-2 text-xs break-all opacity-70">{shortHash(b.previousHash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {chain.linked && (
            <div className="mt-4 brutal-border-thick p-4 bg-warning text-ink inline-block">
              <span className="label-stamp text-[11px]">
                Chain intact — every block links to the one before it.
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="border-b-4 border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp bg-ink text-paper inline-block px-2 py-1 mb-3">How to verify</div>
          <h2 className="text-3xl sm:text-4xl mb-4">Reproduce the chain yourself</h2>
          <ol className="text-sm font-mono space-y-2 list-decimal pl-6 max-w-3xl">
            <li>
              Fetch the JSON list of scans:{" "}
              <code className="bg-ink/5 px-1">GET /api/public/scans/latest</code>.
            </li>
            <li>Find the scan_id you want to verify in the response.</li>
            <li>
              SHA-256 the canonical payload of that scan (the raw JSON the ML box posted to{" "}
              <code className="bg-ink/5 px-1">/api/public/scans/ingest</code>).
            </li>
            <li>
              Compare the resulting hash against the <code className="bg-ink/5 px-1">merkle_root</code>{" "}
              field shown above. Any mismatch means the record was altered or dropped.
            </li>
            <li>
              For the full chain: fold hashes into a Merkle tree in scan_id order and compare the
              root against the value published on the{" "}
              <a href="/attestation" className="underline">attestation page</a>.
            </li>
          </ol>
          <p className="mt-4 text-xs opacity-70 max-w-3xl">
            The ingest endpoint requires an HMAC signature. Only the ML system holds the shared
            secret, so no third party can inject synthetic scans, but anyone can read and reproduce
            every scan that has been ingested.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}