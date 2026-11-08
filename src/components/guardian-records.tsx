import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, RefreshCw } from "lucide-react";
import { getGuardianRecords } from "@/lib/guardian.functions";
import { csvText } from "@/lib/guardian";
import { fmtClock } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function downloadRecords(rows: Record<string, unknown>[], name: string) {
  const url = URL.createObjectURL(new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
}
export function GuardianRecordsPanel({ aircraft, county = "SJV" }: { aircraft?: string; county?: string }) {
  const fn = useServerFn(getGuardianRecords);
  const query = useQuery({ queryKey: ["guardian-records", aircraft ?? "", county], queryFn: () => fn({ data: { aircraft, county } }), staleTime: 60_000, retry: false });
  const data = query.data;
  return <section id="machine-assessments" className="scroll-mt-24">
    <div className="flex justify-between items-start gap-3 mb-3">
      <div><div className="label-stamp text-alert">Machine-generated · multi-factor records</div><h2 className="text-3xl sm:text-4xl">Mission assessments & broadcast gaps</h2></div>
      <Button variant="outline" size="icon" aria-label="Refresh machine records" title="Refresh machine records" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw /></Button>
    </div>
    <p className="text-sm mb-4">The ML system generates these labels and hypotheses from recorded factors and patterns. A broadcast gap alone does not establish a deliberate switch-off.</p>
    {query.isPending && <p role="status" className="font-mono text-sm">Reading machine records…</p>}
    {query.isError && <p role="alert" className="font-mono text-sm text-alert">Machine records could not be retrieved. Refresh to check again.</p>}
    {data && <>
      <p className="text-xs font-mono opacity-70 mb-4">{data.scope} · read {fmtClock(data.readAt)}. Samples are not fleet-wide totals.</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <div><div className="flex items-center justify-between gap-2 border-b-4 border-ink pb-2 mb-3"><h3 className="text-2xl">Mission hypotheses</h3><Button variant="outline" size="icon" title="Export mission sample" aria-label="Export mission sample" disabled={!data.missions.rows.length} onClick={() => downloadRecords(data.missions.rows, "watchtower-mission-sample")}><Download /></Button></div>
          {data.missions.error ? <p role="alert" className="text-alert text-sm">{data.missions.error}</p> : !data.missions.rows.length ? <p className="font-mono text-sm">No hypotheses linked to this observation sample. Historical assessments may exist outside it.</p> : <div className="space-y-3">{data.missions.rows.map(r => <article key={r.id} className="brutal-border p-3">
            <div className="label-stamp text-xs">MACHINE · {r.type.replace(/_/g, " ")}</div>
            <Link to="/aircraft/$id" params={{ id: r.aircraft ?? r.icao ?? "unknown" }} className="font-bold underline">{r.aircraft ?? r.icao ?? "Identity unavailable"}</Link>
            <p className="font-mono text-xs mt-1">{fmtClock(r.at)} · {r.county ?? "County not recorded"}</p>
            <p className="font-mono text-xs mt-1">Confidence {r.confidence == null ? "not recorded" : `${(r.confidence * 100).toFixed(1)}%`} · {r.observations ?? "—"} supporting observations · status {r.status ?? "not recorded"}</p>
            <details className="mt-2 text-xs"><summary className="cursor-pointer underline">Recorded reasoning & fingerprint</summary><pre className="whitespace-pre-wrap break-words mt-2 font-mono">{r.reasoning ?? "Reasoning not recorded"}</pre><p className="mt-2">Disproof criteria: {r.disproof ?? "Not recorded"}</p><code className="block break-all mt-2">{r.hash ?? "Fingerprint not recorded"}</code></details>
          </article>)}</div>}
        </div>
        <div><div className="flex items-center justify-between gap-2 border-b-4 border-ink pb-2 mb-3"><h3 className="text-2xl">Broadcast-gap audit</h3><Button variant="outline" size="icon" title="Export gap sample" aria-label="Export gap sample" disabled={!data.cycles.rows.length} onClick={() => downloadRecords(data.cycles.rows, "watchtower-gap-sample")}><Download /></Button></div>
          {data.cycles.error ? <p role="alert" className="text-alert text-sm">{data.cycles.error}</p> : !data.cycles.rows.length ? <p className="font-mono text-sm">No gap records returned for this aircraft.</p> : <div className="space-y-3">{data.cycles.rows.map(r => <article key={r.id} className="brutal-border p-3">
            <Link to="/aircraft/$id" params={{ id: r.aircraft ?? r.icao }} className="font-bold underline">{r.aircraft ?? r.icao}</Link>
            <p className="label-stamp text-xs mt-1">MACHINE · {r.hypothesis?.replace(/_/g, " ") ?? "No hypothesis recorded"}</p>
            <p className="font-mono text-xs mt-1">Last signal {fmtClock(r.before)}<br />Next signal {fmtClock(r.after)}</p>
            <p className="font-mono text-xs mt-2">Gap {r.gapMinutes?.toFixed(1) ?? "—"} min · displacement {r.distanceKm?.toFixed(1) ?? "—"} km</p>
            <details className="mt-2 text-xs"><summary className="cursor-pointer underline">Coverage context & fingerprint</summary><p className="mt-2">Concurrent gaps: {r.concurrentGaps ?? "not recorded"} · feed ratio: {r.feedRatio?.toFixed(3) ?? "not recorded"} · parked: {r.parked == null ? "not recorded" : r.parked ? "yes" : "no"}</p><code className="block break-all mt-2">{r.hash ?? "Fingerprint not recorded"}</code></details>
          </article>)}</div>}
        </div>
      </div>
      {aircraft && <div className="mt-5"><h3 className="text-2xl border-b-4 border-ink mb-2">Daily short-gap summaries</h3>{data.dark.error ? <p role="alert">{data.dark.error}</p> : data.dark.rows.length ? <ul className="font-mono text-xs space-y-1">{data.dark.rows.map(r => <li key={r.day}>{r.day} · {r.count} gaps · {r.minSeconds ?? "—"}–{r.maxSeconds ?? "—"} seconds · updated {fmtClock(r.at)}</li>)}</ul> : <p className="font-mono text-sm">No daily summaries returned.</p>}</div>}
    </>}
  </section>;
}