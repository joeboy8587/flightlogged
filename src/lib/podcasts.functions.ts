import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { watchtower } from "./neon.server";

export type PodcastEpisode = {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  voice: string;
  dataPoints: { label: string; value: string }[];
};

async function snapshotForScript() {
  const w = watchtower();
  const settle = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try { return await p; } catch (e) { console.warn("podcast query failed", (e as Error).message); return fallback; }
  };
  const [snap, ops, anom, county] = await Promise.all([
    settle(w`SELECT
        (SELECT COUNT(*)::int FROM detections) AS detections,
        (SELECT COUNT(DISTINCT icao_hex)::int FROM detections) AS aircraft,
        (SELECT COUNT(*)::int FROM anomaly_events) AS anomalies,
        (SELECT COUNT(*)::int FROM violation_classifications) AS violations,
        (SELECT MAX(captured_at) FROM detections) AS last_seen`, [] as any[]),
    settle(w`SELECT COALESCE(m.name, p.registered_owner) AS canonical_name,
               p.total_detections,
               1 AS fleet_size
          FROM aircraft_profiles p
          LEFT JOIN faa_master m ON UPPER(m.mode_s_code_hex) = UPPER(p.icao_hex)
         WHERE p.total_detections IS NOT NULL
         ORDER BY p.total_detections DESC NULLS LAST LIMIT 5`, [] as any[]),
    settle(w`SELECT anomaly_type, COUNT(*)::int AS c
        FROM anomaly_events
        WHERE anomaly_type IS NOT NULL
        GROUP BY anomaly_type ORDER BY c DESC LIMIT 5`, [] as any[]),
    settle(w`SELECT county, COUNT(*)::int AS c
        FROM detections WHERE county IS NOT NULL
        GROUP BY county ORDER BY c DESC LIMIT 5`, [] as any[]),
  ]);
  return {
    snap: (snap as any[])[0] ?? {},
    operators: ops as any[],
    anomalies: anom as any[],
    counties: county as any[],
  };
}

export const listPodcasts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PodcastEpisode[]> => {
    try {
      const d = await snapshotForScript();
      const s: any = d.snap;
      return [
        {
          id: "daily-briefing",
          title: "Daily Briefing",
          subtitle: "What the machine saw across the Valley today.",
          duration: "~90 sec",
          voice: "alloy",
          dataPoints: [
            { label: "Detections", value: Number(s.detections ?? 0).toLocaleString() },
            { label: "Unique aircraft", value: Number(s.aircraft ?? 0).toLocaleString() },
            { label: "Anomalies", value: Number(s.anomalies ?? 0).toLocaleString() },
            { label: "Violations", value: Number(s.violations ?? 0).toLocaleString() },
          ],
        },
        {
          id: "operators-spotlight",
          title: "Operators Spotlight",
          subtitle: "Top entities by detection volume — registry-resolved.",
          duration: "~90 sec",
          voice: "sage",
          dataPoints: d.operators.slice(0, 4).map((o) => ({
            label: o.canonical_name ?? "Unknown",
            value: `${Number(o.total_detections ?? 0).toLocaleString()} det · ${o.fleet_size ?? 0} a/c`,
          })),
        },
        {
          id: "anomaly-watch",
          title: "Anomaly Watch",
          subtitle: "Behaviors the baseline model flagged this week.",
          duration: "~90 sec",
          voice: "verse",
          dataPoints: d.anomalies.map((a) => ({
            label: a.anomaly_type,
            value: `${Number(a.c).toLocaleString()} events`,
          })),
        },
        {
          id: "county-roundup",
          title: "Multi-County Roundup",
          subtitle: "Detection share across counties — non-biased coverage.",
          duration: "~90 sec",
          voice: "coral",
          dataPoints: d.counties.map((c) => ({
            label: c.county,
            value: `${Number(c.c).toLocaleString()} pings`,
          })),
        },
      ];
    } catch (err) {
      console.error("listPodcasts failed", err);
      return [];
    }
  },
);

const ScriptInput = z.object({ episodeId: z.string() });

export const generatePodcastScript = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ScriptInput.parse(d))
  .handler(async ({ data }): Promise<{ script: string; voice: string; title: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const episodes = await listPodcasts();
    const ep = episodes.find((e) => e.id === data.episodeId);
    if (!ep) throw new Error("Episode not found");

    const dataBlock = ep.dataPoints.map((p) => `- ${p.label}: ${p.value}`).join("\n");
    const prompt = `You are the narrator of "The Architecture of Never", a non-partisan civilian airspace watchdog podcast. Write a tight 90-second spoken-word briefing titled "${ep.title}". Speak plainly, no jargon. Cite the numbers below verbatim. Do NOT invent agencies, names, or counties. End with one sentence reminding listeners the data is hash-fingerprinted and court-ready. Output ONLY the spoken script — no stage directions, no markdown, no headings.

Topic: ${ep.subtitle}

Data:
${dataBlock}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const script: string = json?.choices?.[0]?.message?.content ?? "";
    if (!script.trim()) throw new Error("Empty script from model");
    return { script: script.trim(), voice: ep.voice, title: ep.title };
  });