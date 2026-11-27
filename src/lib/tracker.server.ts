import { watchtower } from "./neon.server";
import { resolveAircraftIdentity } from "./aircraft-identity.server";
import type { FlightReplayInput, FlightReplayPoint, FlightReplayResult } from "./tracker";

const MAX_REPLAY_POINTS = 5_000;

export async function loadFlightReplay(input: FlightReplayInput): Promise<FlightReplayResult | null> {
  const w = watchtower();
  const resolved = await resolveAircraftIdentity(input.tail);
  const icao = resolved.icao?.trim().toUpperCase();
  if (!icao) return null;

  const latestRows = (await w`
    SELECT MAX(captured_at) AS latest
    FROM detections
    WHERE icao_hex IN (${icao}, ${icao.toLowerCase()})
  `) as Array<{ latest: string | Date | null }>;
  const latestValue = latestRows[0]?.latest;
  const latestMs = latestValue ? new Date(latestValue).getTime() : NaN;
  if (!resolved.profile && !resolved.registry && !Number.isFinite(latestMs)) return null;

  const requestedStart = input.start ? new Date(input.start).getTime() : null;
  const requestedEnd = input.end ? new Date(input.end).getTime() : null;
  const fallbackEnd = Number.isFinite(latestMs) ? latestMs : Date.now();
  const windowStartMs = requestedStart ?? fallbackEnd - 24 * 60 * 60 * 1000;
  const windowEndMs = requestedEnd ?? fallbackEnd;
  const windowStart = new Date(windowStartMs).toISOString();
  const windowEnd = new Date(windowEndMs).toISOString();

  const rows = (await w`
    WITH matched AS (
      SELECT id, captured_at, altitude_ft, speed_kts, county,
             latitude, longitude, on_ground
      FROM detections
      WHERE icao_hex IN (${icao}, ${icao.toLowerCase()})
        AND captured_at >= ${windowStart}::timestamptz
        AND captured_at <= ${windowEnd}::timestamptz
        AND latitude BETWEEN -90 AND 90
        AND longitude BETWEEN -180 AND 180
    ), numbered AS (
      SELECT matched.*,
             ROW_NUMBER() OVER (ORDER BY captured_at, id)::int AS row_num,
             COUNT(*) OVER()::int AS total_in_window
      FROM matched
    ), sampled AS (
      SELECT numbered.*,
             GREATEST(1, CEIL(total_in_window / ${MAX_REPLAY_POINTS}::float)::int) AS stride
      FROM numbered
    )
    SELECT captured_at, altitude_ft, speed_kts, county, latitude, longitude,
           on_ground, total_in_window
    FROM sampled
    WHERE total_in_window <= ${MAX_REPLAY_POINTS}
       OR row_num = 1
       OR row_num = total_in_window
       OR row_num % stride = 0
    ORDER BY row_num
    LIMIT ${MAX_REPLAY_POINTS + 2}
  `) as Array<Record<string, unknown>>;

  const points: FlightReplayPoint[] = rows.map((row) => ({
    capturedAt: new Date(String(row.captured_at)).toISOString(),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    altitude: row.altitude_ft == null ? null : Number(row.altitude_ft),
    speed: row.speed_kts == null ? null : Number(row.speed_kts),
    county: row.county == null ? null : String(row.county),
    onGround: Boolean(row.on_ground),
  }));
  const totalInWindow = Number(rows[0]?.total_in_window ?? 0);
  const profile = resolved.profile as Record<string, unknown> | undefined;
  const registry = resolved.registry as Record<string, unknown> | undefined;

  return {
    registration: resolved.registration ?? icao,
    icao,
    owner: (registry?.name as string | undefined) ?? (profile?.registered_owner as string | undefined) ?? null,
    model: (profile?.aircraft_model as string | undefined) ?? null,
    windowStart,
    windowEnd,
    latestRetainedAt: Number.isFinite(latestMs) ? new Date(latestMs).toISOString() : null,
    totalInWindow,
    sampled: totalInWindow > points.length,
    points,
  };
}
