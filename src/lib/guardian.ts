export type SourceRows<T> = { rows: T[]; error: string | null };
export type MissionRecord = { id: string; aircraft: string | null; icao: string | null; county: string | null; at: string | null; type: string; confidence: number | null; observations: number | null; status: string | null; reasoning: string | null; disproof: string | null; hash: string | null };
export type CycleRecord = { id: string; aircraft: string | null; icao: string; before: string | null; after: string | null; at: string | null; gapMinutes: number | null; distanceKm: number | null; hypothesis: string | null; concurrentGaps: number | null; feedRatio: number | null; parked: boolean | null; hash: string | null };
export type DarkRecord = { icao: string; day: string; count: number; minSeconds: number | null; maxSeconds: number | null; at: string | null };
export type GuardianRecords = { missions: SourceRows<MissionRecord>; cycles: SourceRows<CycleRecord>; dark: SourceRows<DarkRecord>; readAt: string; scope: string };
export type ClassificationRecord = { id: string; aircraft: string | null; icao: string; at: string | null; rule: string; statute: string | null; owner: string | null; altitude: number | null; agl: number | null; altitudeSource: string | null; severityScore: number | null; confidence: string | null; mode: string | null; version: string | null; hash: string | null };
export function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function normalizedHex(value: unknown): string { return String(value ?? "").trim().toUpperCase(); }
export function csvText(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [keys.map(cell).join(","), ...rows.map((row) => keys.map((k) => cell(row[k])).join(","))].join("\n");
}