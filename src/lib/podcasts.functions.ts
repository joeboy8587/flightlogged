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

type DbRow = Record<string, unknown>;

function toCount(value: unknown) {
  return Number(value ?? 0);
}

async function snapshotForScript() {
  const w = watchtower();
  const settle = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (e) {
      console.warn("podcast query failed", (e as Error).message);
      return fallback;
    }
  };
  const [snap, ops, anom, county] = await Promise.all([
    settle(
      w`SELECT
        (SELECT COUNT(*)::int FROM detections) AS detections,
        (SELECT COUNT(DISTINCT icao_hex)::int FROM detections) AS aircraft,
        (SELECT COUNT(*)::int FROM anomaly_events) AS anomalies,
        (SELECT COUNT(*)::int FROM violation_classifications) AS violations,
        (SELECT MAX(captured_at) FROM detections) AS last_seen`,
      [] as DbRow[],
    ),
    settle(
      w`WITH raw_aircraft AS (
            SELECT icao_hex, COUNT(*)::int AS raw_detections
            FROM detections
            WHERE icao_hex IS NOT NULL
            GROUP BY icao_hex
          ), resolved AS (
            SELECT COALESCE(NULLIF(TRIM(m.name), ''), NULLIF(TRIM(p.registered_owner), ''), p.observed_registration, r.icao_hex) AS canonical_name,
                   r.icao_hex,
                   r.raw_detections
            FROM raw_aircraft r
            LEFT JOIN aircraft_profiles p ON p.icao_hex = r.icao_hex
            LEFT JOIN faa_master m ON m.mode_s_code_hex = UPPER(r.icao_hex)
          )
          SELECT canonical_name,
                 SUM(raw_detections)::int AS total_detections,
                 COUNT(DISTINCT icao_hex)::int AS fleet_size
          FROM resolved
          GROUP BY canonical_name
          ORDER BY total_detections DESC
          LIMIT 5`,
      [] as DbRow[],
    ),
    settle(
      w`SELECT anomaly_type, COUNT(*)::int AS c
        FROM anomaly_events
        WHERE anomaly_type IS NOT NULL
        GROUP BY anomaly_type ORDER BY c DESC LIMIT 5`,
      [] as DbRow[],
    ),
    settle(
      w`SELECT county, COUNT(*)::int AS c
        FROM detections WHERE county IS NOT NULL
        GROUP BY county ORDER BY c DESC LIMIT 5`,
      [] as DbRow[],
    ),
  ]);
  return {
    snap: (snap as DbRow[])[0] ?? {},
    operators: ops as DbRow[],
    anomalies: anom as DbRow[],
    counties: county as DbRow[],
  };
}

export const listPodcasts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PodcastEpisode[]> => {
    try {
      const d = await snapshotForScript();
      const s = d.snap;
      return [
        {
          id: "daily-briefing",
          title: "Daily Briefing",
          subtitle: "What the machine saw across the Valley today.",
          duration: "~90 sec",
          voice: "alloy",
          dataPoints: [
            { label: "Detections", value: toCount(s.detections).toLocaleString() },
            { label: "Unique aircraft", value: toCount(s.aircraft).toLocaleString() },
            { label: "Anomalies", value: toCount(s.anomalies).toLocaleString() },
            { label: "Violations", value: toCount(s.violations).toLocaleString() },
          ],
        },
        {
          id: "operators-spotlight",
          title: "Operators Spotlight",
          subtitle: "Top entities by detection volume — registry-resolved.",
          duration: "~90 sec",
          voice: "sage",
          dataPoints: d.operators.slice(0, 4).map((o) => ({
            label: String(o.canonical_name ?? "Unknown"),
            value: `${toCount(o.total_detections).toLocaleString()} det · ${toCount(o.fleet_size)} a/c`,
          })),
        },
        {
          id: "anomaly-watch",
          title: "Anomaly Watch",
          subtitle: "Behaviors the baseline model flagged this week.",
          duration: "~90 sec",
          voice: "verse",
          dataPoints: d.anomalies.map((a) => ({
            label: String(a.anomaly_type ?? "Unknown"),
            value: `${toCount(a.c).toLocaleString()} events`,
          })),
        },
        {
          id: "county-roundup",
          title: "Multi-County Roundup",
          subtitle: "Detection share across counties — non-biased coverage.",
          duration: "~90 sec",
          voice: "coral",
          dataPoints: d.counties.map((c) => ({
            label: String(c.county ?? "Unknown"),
            value: `${toCount(c.c).toLocaleString()} pings`,
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

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseMetric(value: string) {
  const match = value.match(/[\d,]+(?:\.\d+)?/);
  return match ? Number(match[0].replace(/,/g, "")) : null;
}

function hasUnsupportedLargeClaim(script: string, allowedNumbers: number[]) {
  const allowed = new Set(allowedNumbers.filter((n) => Number.isFinite(n) && n >= 1000).map((n) => Math.round(n)));
  for (const match of script.matchAll(/(?:\b(\d[\d,]*(?:\.\d+)?)\s*million\b|\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+million\b)/gi)) {
    const raw = match[1] ? Number(match[1].replace(/,/g, "")) : numberWords[match[2].toLowerCase()];
    const claimed = Math.round(raw * 1_000_000);
    if (!allowed.has(claimed)) return true;
  }
  return false;
}

function deterministicScript(ep: PodcastEpisode) {
  const metrics = ep.dataPoints.map((p) => `${p.label}: ${p.value}`).join(". ");
  return `${ep.title}. ${ep.subtitle} The verified quiet-math figures for this episode are: ${metrics}. These are raw database values, not estimates, and no aircraft or operator count is expanded beyond the rows returned for this briefing. The underlying records are hash-fingerprinted and court-ready.`;
}

export const generatePodcastScript = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ScriptInput.parse(d))
  .handler(async ({ data }): Promise<{ script: string; voice: string; title: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const episodes = await listPodcasts();
    const ep = episodes.find((e) => e.id === data.episodeId);
    if (!ep) throw new Error("Episode not found");

    const dataBlock = ep.dataPoints.map((p) => `- ${p.label}: ${p.value}`).join("\n");
    const allowedNumbers = ep.dataPoints.map((p) => parseMetric(p.value)).filter((n): n is number => n !== null);
    const prompt = `You are the narrator of "The Architecture of Never", a non-partisan civilian airspace watchdog podcast. Write a tight 90-second spoken-word briefing titled "${ep.title}". Speak plainly, no jargon. Cite the numbers below verbatim. Do NOT invent, estimate, multiply, round up, or convert any count. Do NOT use the word million unless one of the exact source values below is at least 1,000,000. End with one sentence reminding listeners the data is hash-fingerprinted and court-ready. Output ONLY the spoken script — no stage directions, no markdown, no headings.

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
    const cleanScript = script.trim();
    return {
      script: hasUnsupportedLargeClaim(cleanScript, allowedNumbers) ? deterministicScript(ep) : cleanScript,
      voice: ep.voice,
      title: ep.title,
    };
  });