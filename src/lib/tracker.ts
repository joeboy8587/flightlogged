export type TrackerMode = "live" | "replay";

export type FlightReplayPoint = {
  capturedAt: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  county: string | null;
  onGround: boolean;
};

export type FlightReplayResult = {
  registration: string;
  icao: string;
  owner: string | null;
  model: string | null;
  windowStart: string;
  windowEnd: string;
  latestRetainedAt: string | null;
  totalInWindow: number;
  sampled: boolean;
  points: FlightReplayPoint[];
};

export type FlightReplayInput = {
  tail: string;
  start?: string;
  end?: string;
};

/** Initial bearing in degrees, clockwise from north, for the replay plane icon. */
export function bearingBetween(
  from: Pick<FlightReplayPoint, "latitude" | "longitude">,
  to: Pick<FlightReplayPoint, "latitude" | "longitude">,
): number {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Last retained observation at or before the replay cursor. */
export function pointIndexAtTime(points: FlightReplayPoint[], cursorMs: number): number {
  if (!points.length) return 0;
  let low = 0;
  let high = points.length - 1;
  let answer = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const point = points[middle];
    if (!point) break;
    if (new Date(point.capturedAt).getTime() <= cursorMs) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return answer;
}

export function utcInputValue(iso: string): string {
  return iso.slice(0, 16);
}

export function utcInputToIso(value: string): string {
  return `${value}:00.000Z`;
}
