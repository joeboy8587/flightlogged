import { createServerFn } from "@tanstack/react-start";
import { watchtower } from "./neon.server";

export type BriefingContext = {
  windowStart: string;
  windowEnd: string;
  detections: number;
  aircraft: number;
  anomalies: number;
  violations: number;
  topOperators: { name: string; detections: number; fleet: number }[];
  topAnomalies: { type: string; count: number }[];
  topCounties: { county: string; count: number }[];
};

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown, f = "Unknown") => String(v ?? f);

async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.warn("blog briefing query failed", (e as Error).message);
    return fallback;
  }
}

export const getBriefingContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<BriefingContext> => {
    const w = watchtower();
    const [snap, ops, anom, county, windowRow] = await Promise.all([
      settle(
        w`SELECT
            (SELECT COUNT(*)::int FROM detections WHERE captured_at >= NOW() - INTERVAL '7 days') AS detections,
            (SELECT COUNT(DISTINCT icao_hex)::int FROM detections WHERE captured_at >= NOW() - INTERVAL '7 days') AS aircraft,
            (SELECT COUNT(*)::int FROM anomaly_events WHERE detected_at >= NOW() - INTERVAL '7 days') AS anomalies,
            (SELECT COUNT(*)::int FROM violation_classifications WHERE classified_at >= NOW() - INTERVAL '7 days') AS violations`,
        [] as Row[],
      ),
      settle(
        w`WITH raw_aircraft AS (
            SELECT icao_hex, COUNT(*)::int AS raw_detections
            FROM detections
            WHERE icao_hex IS NOT NULL AND captured_at >= NOW() - INTERVAL '7 days'
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
          WHERE canonical_name IS NOT NULL
            AND canonical_name !~* '(southwest|american airlines|delta air|united air|jetblue|alaska air|spirit air|frontier air|hawaiian air|allegiant|sun country|fedex|ups |united parcel|atlas air|skywest|republic air|envoy air|mesa air|piedmont air|psa air|endeavor air|gojet|horizon air)'
          GROUP BY canonical_name
          ORDER BY total_detections DESC
          LIMIT 5`,
        [] as Row[],
      ),
      settle(
        w`SELECT anomaly_type, COUNT(*)::int AS c
          FROM anomaly_events
          WHERE anomaly_type IS NOT NULL AND detected_at >= NOW() - INTERVAL '7 days'
          GROUP BY anomaly_type ORDER BY c DESC LIMIT 5`,
        [] as Row[],
      ),
      settle(
        w`SELECT county, COUNT(*)::int AS c
          FROM detections
          WHERE county IS NOT NULL AND captured_at >= NOW() - INTERVAL '7 days'
          GROUP BY county ORDER BY c DESC LIMIT 6`,
        [] as Row[],
      ),
      settle(
        w`SELECT
            (NOW() - INTERVAL '7 days')::text AS window_start,
            NOW()::text AS window_end`,
        [] as Row[],
      ),
    ]);

    const s = (snap as Row[])[0] ?? {};
    const win = (windowRow as Row[])[0] ?? {};
    return {
      windowStart: str(win.window_start, ""),
      windowEnd: str(win.window_end, ""),
      detections: num(s.detections),
      aircraft: num(s.aircraft),
      anomalies: num(s.anomalies),
      violations: num(s.violations),
      topOperators: (ops as Row[]).map((o) => ({
        name: str(o.canonical_name),
        detections: num(o.total_detections),
        fleet: num(o.fleet_size),
      })),
      topAnomalies: (anom as Row[]).map((a) => ({
        type: str(a.anomaly_type),
        count: num(a.c),
      })),
      topCounties: (county as Row[]).map((c) => ({
        county: str(c.county),
        count: num(c.c),
      })),
    };
  },
);

function deterministicBriefing(ctx: BriefingContext) {
  const ops = ctx.topOperators
    .slice(0, 3)
    .map((o) => `${o.name} (${o.detections.toLocaleString()} detections across ${o.fleet} tail${o.fleet === 1 ? "" : "s"})`)
    .join("; ");
  const anoms = ctx.topAnomalies
    .slice(0, 3)
    .map((a) => `${a.type} (${a.count.toLocaleString()})`)
    .join(", ");
  const counties = ctx.topCounties
    .slice(0, 4)
    .map((c) => `${c.county} ${c.count.toLocaleString()}`)
    .join(" · ");
  return (
    `# Watchtower Weekly Briefing\n\n` +
    `**Window:** last seven days. The quiet-math database recorded ${ctx.detections.toLocaleString()} ADS-B detections from ${ctx.aircraft.toLocaleString()} unique aircraft, producing ${ctx.anomalies.toLocaleString()} anomaly events and ${ctx.violations.toLocaleString()} classified rule violations.\n\n` +
    `## Operators of the week\n\n${ops || "No operator activity above threshold in this window."}\n\n` +
    `## Anomaly signature\n\n${anoms || "No anomalies flagged in this window."}\n\n` +
    `## Multi-county share\n\n${counties || "No county-tagged detections in this window."}\n\n` +
    `## The firewall\n\nThis draft was assembled deterministically from the quiet-math database because the AI drafting layer was unavailable. Every number above is a raw query result; nothing was interpolated. Open the Live Feed to verify any figure.\n`
  );
}

export const draftWeeklyBriefing = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ markdown: string; source: "ai" | "deterministic"; context: BriefingContext }> => {
    const ctx = await getBriefingContext();
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { markdown: deterministicBriefing(ctx), source: "deterministic", context: ctx };
    }

    const opsBlock = ctx.topOperators
      .map((o) => `- ${o.name}: ${o.detections} detections across ${o.fleet} tail(s)`)
      .join("\n");
    const anomBlock = ctx.topAnomalies.map((a) => `- ${a.type}: ${a.count}`).join("\n");
    const countyBlock = ctx.topCounties.map((c) => `- ${c.county}: ${c.count}`).join("\n");

    const prompt = `You are the human-reviewed editorial voice of "The Architecture of Never" — a non-partisan civilian airspace watchdog. Draft a Weekly Briefing in Markdown (~450 words) titled "Watchtower Weekly Briefing".

Hard rules:
- Every number must be one of the exact values listed below. Do NOT invent, round, extrapolate, or convert. Do NOT use the word "million" unless a listed value is at least 1,000,000.
- Do NOT allege criminal conduct against any specific person or entity. You may state that a pattern was observed and that rule X applies; the reader interprets.
- Frame KCSO-specific rules only for these four tails: N912KC, N913KC, N597E, N911KC. Every other aircraft is measured against FAA CFR/USC only.
- Structure with H2 sections: "What the machine saw", "Operators surfaced", "Anomaly signature", "Multi-county share", "What to verify". End with a short closer restating the firewall between ML output and human interpretation.

Window rollup (past 7 days):
- Detections: ${ctx.detections}
- Unique aircraft: ${ctx.aircraft}
- Anomaly events: ${ctx.anomalies}
- Classified violations: ${ctx.violations}

Top operators:
${opsBlock || "(none)"}

Top anomaly types:
${anomBlock || "(none)"}

Top counties:
${countyBlock || "(none)"}

Output ONLY the Markdown briefing. No preamble.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`AI gateway ${res.status}`);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const md = (json.choices?.[0]?.message?.content ?? "").trim();
      if (!md) throw new Error("empty draft");
      return { markdown: md, source: "ai", context: ctx };
    } catch (e) {
      console.warn("draftWeeklyBriefing AI fallback", (e as Error).message);
      return { markdown: deterministicBriefing(ctx), source: "deterministic", context: ctx };
    }
  },
);