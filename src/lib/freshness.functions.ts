import { createServerFn } from "@tanstack/react-start";
import { watchtower } from "./neon.server";

export type FeedFreshness = {
  key: string;
  label: string;
  lastUpdated: string | null;
  cadenceHours: number;
  status: "fresh" | "delayed" | "stale" | "empty";
};

const FEEDS = [
  { key: "detections", label: "Raw detections", table: "detections", column: "captured_at", cadenceHours: 1 },
  { key: "violations", label: "Violations ledger", table: "sentinel_violations", column: "detection_timestamp", cadenceHours: 24 },
  { key: "narratives", label: "Daily narratives", table: "daily_narratives", column: "narrative_date", cadenceHours: 24 },
  { key: "visual-evidence", label: "Photo / visual evidence", table: "visual_evidence", column: "ingested_at", cadenceHours: 24 },
  { key: "incursions", label: "Incursion events", table: "incursion_events", column: "event_timestamp", cadenceHours: 24 },
  { key: "chain", label: "Cryptographic seal chain", table: "merkle_chain", column: "timestamp", cadenceHours: 24 },
  { key: "county-stats", label: "Hourly county statistics", table: "hourly_stats", column: "hour_start", cadenceHours: 2 },
  { key: "alerts", label: "AOI alerts", table: "aoi_alerts", column: "captured_at", cadenceHours: 1 },
] as const;

let cache: { at: number; value: FeedFreshness[] } | null = null;
const TTL = 60_000;

export const getFeedFreshness = createServerFn({ method: "GET" }).handler(async (): Promise<FeedFreshness[]> => {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  const w = watchtower();
  const rows = await Promise.all(FEEDS.map(async (feed) => {
    try {
      // Identifiers are compile-time constants above; this function intentionally
      // performs read-only MAX watermark queries and never touches raw rows.
      const result = await w(`SELECT MAX(${feed.column}) AS last_updated FROM ${feed.table}`) as any[];
      const raw = result[0]?.last_updated;
      const lastUpdated = raw ? new Date(raw).toISOString() : null;
      const ageHours = lastUpdated ? (Date.now() - new Date(lastUpdated).getTime()) / 36e5 : Infinity;
      const status = !lastUpdated ? "empty" : ageHours > 48 ? "stale" : ageHours > feed.cadenceHours * 2 ? "delayed" : "fresh";
      return { key: feed.key, label: feed.label, lastUpdated, cadenceHours: feed.cadenceHours, status } satisfies FeedFreshness;
    } catch (error) {
      console.error(`freshness query failed for ${feed.table}:`, error);
      return { key: feed.key, label: feed.label, lastUpdated: null, cadenceHours: feed.cadenceHours, status: "empty" } satisfies FeedFreshness;
    }
  }));
  cache = { at: Date.now(), value: rows };
  return rows;
});
