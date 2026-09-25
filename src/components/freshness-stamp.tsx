import { useQuery } from "@tanstack/react-query";
import { getFeedFreshness, type FeedFreshness } from "@/lib/freshness.functions";
import { fmtDate } from "@/lib/format";

const freshnessQO = {
  queryKey: ["feed-freshness"],
  queryFn: () => getFeedFreshness(),
  staleTime: 60_000,
  refetchInterval: 60_000,
};

export function FreshnessStamp({ feed, compact = false }: { feed: string | FeedFreshness; compact?: boolean }) {
  const { data } = useQuery(freshnessQO);
  const item = typeof feed === "string" ? data?.find((f) => f.key === feed) : feed;
  if (!item) return null;
  const stale = item.status === "stale";
  const delayed = item.status === "delayed";
  const text = !item.lastUpdated
    ? "NO DATA — feed has not written"
    : stale
      ? `STALE — last updated ${fmtDate(item.lastUpdated)}`
      : delayed
        ? `DELAYED — last updated ${fmtDate(item.lastUpdated)}`
        : `Updated ${fmtDate(item.lastUpdated)}`;
  return (
    <span className={`label-stamp inline-flex items-center gap-1 text-[10px] ${stale ? "brutal-border bg-alert text-paper px-2 py-1" : delayed ? "brutal-border bg-warning text-ink px-2 py-1" : "opacity-70"}`} title={`${item.label}: ${text}`}>
      <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${stale ? "bg-paper" : delayed ? "bg-alert" : item.status === "empty" ? "bg-alert" : "bg-green-600"}`} />
      {compact ? text : `${item.label} · ${text}`}
    </span>
  );
}

export function FreshnessBanner() {
  const { data } = useQuery(freshnessQO);
  const stale = data?.filter((f) => f.status === "stale") ?? [];
  if (stale.length === 0) return null;
  return (
    <div className="brutal-border bg-alert text-paper p-3 font-mono text-xs" role="status">
      <strong>STALE DATA NOTICE:</strong>{" "}
      {stale.map((f) => `${f.label} — ${f.lastUpdated ? `last updated ${fmtDate(f.lastUpdated)}` : "no records"}`).join(" · ")}
    </div>
  );
}
