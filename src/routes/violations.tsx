import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { Button } from "@/components/ui/button";
import { downloadRecords } from "@/components/guardian-records";
import { getCurrentClassifications } from "@/lib/guardian.functions";
import { fmtClock } from "@/lib/format";
export const Route = createFileRoute("/violations")({
  head: () => ({ meta: [
    { title: "Regulatory Classifications — Guardian Watchtower" },
    { name: "description", content: "Latest machine regulatory classifications with recorded altitude sources, rule versions and full evidence fingerprints." },
    { property: "og:title", content: "Guardian Watchtower Regulatory Classifications" },
    { property: "og:description", content: "Recorded rule classifications and evidence fingerprints from public aircraft observations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Violations,
});
function Violations() {
  const fn = useServerFn(getCurrentClassifications);
  const q = useQuery({ queryKey: ["current-regulatory-classifications"], queryFn: () => fn(), staleTime: 60_000, retry: false });
  const rows = q.data?.rows ?? [];
  return <div className="min-h-screen bg-paper text-ink"><SiteHeader /><SiteBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Violations" }]} />
    <section className="bg-ink text-paper border-b-4 border-ink"><div className="max-w-[1400px] mx-auto px-4 py-12"><div className="label-stamp text-warning">Machine-generated · active regulatory record</div><h1 className="text-4xl sm:text-6xl mt-3">Regulatory classifications</h1><p className="mt-4 max-w-3xl text-sm">Recorded rule-engine findings, not court determinations. Altitude source, rule version and confidence remain attached to each record. KCSO policies are restricted to KCSO aircraft.</p></div></section>
    <section className="max-w-[1400px] mx-auto px-4 py-10"><div className="flex flex-wrap justify-between items-center gap-3 mb-4"><div><h2 className="text-3xl">Latest 100 classifications</h2><p className="font-mono text-xs mt-1">All monitored counties · newest observations first · source: violation_classifications</p>{rows[0] && <p className="font-mono text-xs mt-1">Newest record: {fmtClock(rows[0].at)}. This is the record date, not a freshness guarantee.</p>}</div><div className="flex gap-2"><Button variant="outline" size="icon" title="Refresh classifications" aria-label="Refresh classifications" disabled={q.isFetching} onClick={() => q.refetch()}><RefreshCw /></Button><Button variant="outline" disabled={!rows.length} onClick={() => downloadRecords(rows, "watchtower-regulatory-classifications")}><Download />Export {rows.length} records</Button></div></div>
    {q.isPending && <p role="status">Reading current classifications…</p>}{(q.isError || q.data?.error) && <p role="alert" className="brutal-border p-4 text-alert">{q.data?.error ?? "Classifications could not be retrieved. Refresh to check again."}</p>}
    {q.data && !q.data.error && !rows.length && <p>No classifications returned.</p>}
    {rows.length > 0 && <div className="overflow-x-auto brutal-border-thick"><table className="w-full text-sm"><thead className="bg-ink text-paper"><tr>{["Observed", "Aircraft / owner", "Recorded rule", "Altitude", "Model context", "Evidence"].map(k => <th key={k} className="text-left p-3 label-stamp">{k}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t border-ink/20"><td className="p-3 text-xs whitespace-nowrap font-mono">{fmtClock(r.at)}</td><td className="p-3"><Link to="/aircraft/$id" params={{ id: r.aircraft ?? r.icao }} className="font-bold underline">{r.aircraft ?? r.icao}</Link><div className="text-xs mt-1 max-w-[28ch]">{r.owner ?? "Owner not returned in this record"}</div></td><td className="p-3 text-xs"><strong>{r.rule}</strong><div className="mt-1">{r.statute ?? "Citation not recorded"}</div></td><td className="p-3 font-mono text-xs whitespace-nowrap">Reported: {r.altitude ?? "—"} ft<br />AGL: {r.agl?.toFixed(0) ?? "—"} ft<br />{r.altitudeSource ?? "Source not recorded"}</td><td className="p-3 text-xs">Score {r.severityScore ?? "—"}<br />Confidence {r.confidence ?? "not recorded"}<br />{r.mode ?? "Mode not recorded"}<br />Version {r.version ?? "not recorded"}</td><td className="p-3 text-xs"><details><summary className="cursor-pointer underline">SHA-256</summary><code className="block break-all max-w-[24ch] mt-2">{r.hash ?? "Not recorded"}</code></details></td></tr>)}</tbody></table></div>}
    <p className="text-xs font-mono mt-4 opacity-70">Each row is a classification, not a unique flight. Export contains the displayed sample and full stored fingerprints; fingerprints are not independently reverified by this page.</p></section><SiteFooter /></div>;
}
