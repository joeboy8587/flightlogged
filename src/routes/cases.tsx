import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getCaseInventory } from "@/lib/guardian.functions";
import { fmtClock } from "@/lib/format";
export const Route = createFileRoute("/cases")({ head: () => ({ meta: [
  { title: "Case File Inventory — Guardian Watchtower" },
  { name: "description", content: "Current legal case-file inventory and publication review status. Private case notes and personal information remain withheld." },
  { property: "og:title", content: "Guardian Watchtower Case File Inventory" },
  { property: "og:description", content: "Case records, evidence inventory and transparent publication boundaries." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Cases });
function Cases() {
  const fn = useServerFn(getCaseInventory);
  const q = useQuery({ queryKey: ["case-file-inventory"], queryFn: () => fn(), staleTime: 60_000, retry: false });
  const d = q.data?.inventory;
  return <div className="min-h-screen bg-paper text-ink"><SiteHeader /><SiteBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cases" }]} />
    <section className="bg-ink text-paper border-b-4 border-ink"><div className="max-w-[1100px] mx-auto px-4 py-12"><div className="label-stamp text-warning">Legal coordination · publication review</div><h1 className="text-4xl sm:text-6xl mt-3">Case file inventory</h1><p className="max-w-3xl text-sm mt-4">The current case records are connected. Names, private notes and unreviewed claims remain withheld from the public record.</p></div></section>
    <section className="max-w-[1100px] mx-auto px-4 py-10"><div className="flex justify-between items-center gap-3 mb-5"><h2 className="text-3xl">Current evidence inventory</h2><Button variant="outline" size="icon" title="Refresh inventory" aria-label="Refresh inventory" disabled={q.isFetching} onClick={() => q.refetch()}><RefreshCw /></Button></div>
    {q.isPending && <p role="status">Reading case inventory…</p>}{(q.isError || q.data?.error) && <p role="alert" className="text-alert">{q.data?.error ?? "Case inventory could not be retrieved."}</p>}
    {d && <><dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 border-y-4 border-ink py-6">{[["Case records", d.cases], ["Entity records", d.entities], ["Relationship records", d.links], ["Timeline entries", d.timeline], ["Verified timeline entries", d.verified], ["Evidence entries", d.evidence]].map(([label, value]) => <div key={label}><dt className="label-stamp text-xs">{label}</dt><dd className="text-4xl font-display mt-2">{Number(value).toLocaleString()}</dd></div>)}</dl><p className="font-mono text-xs mt-3">Source: case_file · case metadata last updated {fmtClock(d.updated)}. Counts describe records, not verified legal conclusions.</p></>}
    <div className="mt-8 border-l-4 border-warning pl-4"><h3 className="text-2xl">Publication approval pending</h3><p className="text-sm mt-2 max-w-3xl">These records do not yet carry a public-release approval marker. Active case status and timeline verification do not authorize publication. Personal names, case notes, extracted documents and evidence claims are not returned to this public page.</p></div></section><SiteFooter /></div>;
}
