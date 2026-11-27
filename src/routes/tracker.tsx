import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock3,
  ExternalLink,
  MapPin,
  Pause,
  Plane,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { useLiveAircraft } from "@/components/airspace/useLiveAircraft";
import type { LiveAircraft } from "@/components/airspace/contracts";
import { isKcsoAircraft } from "@/lib/kcso";
import { DISPLAY_TZ, fmtClock } from "@/lib/format";
import { getFlightReplay } from "@/lib/tracker.functions";
import {
  pointIndexAtTime,
  utcInputToIso,
  utcInputValue,
  type FlightReplayInput,
  type FlightReplayResult,
  type TrackerMode,
} from "@/lib/tracker";

const TrackerMap = lazy(() => import("@/components/tracker/TrackerMap").then((module) => ({ default: module.TrackerMap })));
const EMPTY_TRAIL: [number, number][] = [];
const QUICK_TAILS = ["N913KC", "N912KC", "N97E"] as const;
const crumbs = [{ label: "Home", href: "/" }, { label: "Airspace Tracker" }];

export const Route = createFileRoute("/tracker")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.tail === "string" && search.tail.trim() ? { tail: search.tail.trim().toUpperCase() } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Live Airspace Tracker & Detection Replay — Watchtower" },
      { name: "description", content: "Track live aircraft around the San Joaquin Valley, search tail numbers or ICAO codes, and replay retained ADS-B detections on an interactive map." },
      { property: "og:title", content: "Live Airspace Tracker & Detection Replay — Watchtower" },
      { property: "og:description", content: "Live public aircraft positions, FAA registry identity, and historical detection replay in one read-only tactical map." },
      { property: "og:url", content: "https://advocacywatch.live/tracker" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://advocacywatch.live/tracker" }],
  }),
  component: TrackerPage,
});

function replayTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: DISPLAY_TZ,
    timeZoneName: "short",
  });
}

function durationLabel(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function TrackerPage() {
  const { tail: linkedTail } = Route.useSearch();
  const [mode, setMode] = useState<TrackerMode>("live");
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [query, setQuery] = useState(linkedTail ?? "");
  const [filter, setFilter] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [cursorMs, setCursorMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60);
  const trailRef = useRef(new Map<string, [number, number][]>());
  const replayFn = useServerFn(getFlightReplay);
  const live = useLiveAircraft(mode === "live");

  const replayMutation = useMutation<FlightReplayResult | null, Error, FlightReplayInput>({
    mutationFn: (input) => replayFn({ data: input }),
    onSuccess: (result) => {
      setMode("replay");
      setPlaying(false);
      setCursorMs(result ? new Date(result.points[0]?.capturedAt ?? result.windowStart).getTime() : 0);
      if (result) {
        setQuery(result.registration);
        setSelectedHex(result.icao.toLowerCase());
        setStartInput(utcInputValue(result.windowStart));
        setEndInput(utcInputValue(result.windowEnd));
      }
    },
  });

  const startLatest = useCallback((value: string) => {
    const tail = value.trim().toUpperCase();
    if (!tail) {
      setInputError("Enter a tail number or six-character aircraft code.");
      return;
    }
    setInputError(null);
    setQuery(tail);
    replayMutation.mutate({ tail });
    // The mutation callback intentionally owns the latest request state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayFn]);

  const loadWindow = () => {
    if (!startInput || !endInput) {
      setInputError("Choose both UTC times, or use Latest 24 hours.");
      return;
    }
    const start = utcInputToIso(startInput);
    const end = utcInputToIso(endInput);
    if (new Date(start).getTime() >= new Date(end).getTime()) {
      setInputError("The replay end must be after its start.");
      return;
    }
    if (new Date(end).getTime() - new Date(start).getTime() > 7 * 24 * 60 * 60 * 1000) {
      setInputError("Choose a replay window of seven days or less.");
      return;
    }
    setInputError(null);
    replayMutation.mutate({ tail: query.trim().toUpperCase(), start, end });
  };

  useEffect(() => {
    if (linkedTail) {
      setQuery(linkedTail);
      startLatest(linkedTail);
    }
    // Deep links load once whenever the requested tail changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedTail]);

  useEffect(() => {
    if (mode !== "live" || !live.lastUpdated) return;
    for (const item of live.aircraft) {
      if (item.seenPositionSec != null && item.seenPositionSec > 45) continue;
      const trail = trailRef.current.get(item.hex) ?? [];
      const last = trail[trail.length - 1];
      if (!last || last[0] !== item.lat || last[1] !== item.lon) {
        trail.push([item.lat, item.lon]);
        trailRef.current.set(item.hex, trail.slice(-180));
      }
    }
  }, [live.aircraft, live.lastUpdated, mode]);

  useEffect(() => {
    if (!playing || !replayMutation.data || replayMutation.data.points.length < 2) return;
    const end = new Date(replayMutation.data.windowEnd).getTime();
    const timer = window.setInterval(() => {
      setCursorMs((current) => Math.min(end, current + 100 * speed));
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, replayMutation.data, speed]);

  const replay = replayMutation.data ?? null;
  const replayStartMs = replay ? new Date(replay.windowStart).getTime() : 0;
  const replayEndMs = replay ? new Date(replay.windowEnd).getTime() : 0;
  const replayFirstMs = replay?.points[0] ? new Date(replay.points[0].capturedAt).getTime() : replayStartMs;
  const replayIndex = replay ? pointIndexAtTime(replay.points, cursorMs) : 0;
  const replayPoint = replay?.points[replayIndex] ?? null;

  useEffect(() => {
    if (playing && replay && cursorMs >= replayEndMs) setPlaying(false);
  }, [playing, replay, cursorMs, replayEndMs]);

  useEffect(() => {
    if (mode !== "replay") setPlaying(false);
  }, [mode]);

  const filteredAircraft = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    return [...live.aircraft]
      .filter((item) => {
        if (!needle) return true;
        return [item.hex, item.callsign, item.registration, item.aircraftType, item.registry?.registration, item.registry?.registrant]
          .some((value) => value?.toUpperCase().includes(needle));
      })
      .sort((a, b) => Number(isKcsoAircraft(b.registration ?? b.registry?.registration, b.hex)) - Number(isKcsoAircraft(a.registration ?? a.registry?.registration, a.hex)) || a.callsign.localeCompare(b.callsign));
  }, [live.aircraft, filter]);

  const selectedLive = live.aircraft.find((item) => item.hex === selectedHex) ?? null;
  const selectLive = useCallback((hex: string) => {
    setSelectedHex(hex);
    setMode("live");
  }, []);
  const liveTrail = selectedHex ? trailRef.current.get(selectedHex) ?? EMPTY_TRAIL : EMPTY_TRAIL;
  const liveStatusLabel = { connecting: "Connecting", live: "Receiving", stale: "Stale positions", error: "Feed issue", disabled: "Paused" }[live.status];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1600px] mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="label-stamp text-warning mb-2">Public airspace · live + retained evidence</div>
              <h1 className="text-4xl sm:text-6xl">Airspace tracker</h1>
              <p className="mt-3 max-w-2xl text-sm opacity-80">Find an aircraft now. Then rewind its retained detections, one observation at a time.</p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className={`inline-block w-3 h-3 ${live.status === "error" ? "bg-alert" : "bg-warning"} ${live.status === "connecting" ? "blink" : ""}`} aria-hidden />
              <span>{mode === "live" ? liveStatusLabel : "Historical replay"}</span>
              <span className="opacity-60">{mode === "live" ? `${live.aircraft.length} aircraft · 120 NM` : `${replay?.totalInWindow.toLocaleString() ?? 0} retained in window`}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[auto_minmax(280px,1fr)_auto] lg:items-center">
            <div className="flex brutal-border border-paper">
              <button type="button" aria-pressed={mode === "live"} onClick={() => setMode("live")} className={`label-stamp px-4 py-3 ${mode === "live" ? "bg-warning text-ink" : "bg-ink text-paper"}`}><Radio className="inline w-4 h-4 mr-2" />Live</button>
              <button type="button" aria-pressed={mode === "replay"} onClick={() => setMode("replay")} className={`label-stamp px-4 py-3 border-l border-paper ${mode === "replay" ? "bg-warning text-ink" : "bg-ink text-paper"}`}><Clock3 className="inline w-4 h-4 mr-2" />Replay</button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); startLatest(query); }} className="flex min-w-0">
              <label htmlFor="tracker-tail" className="sr-only">Tail number or ICAO aircraft code</label>
              <input id="tracker-tail" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="N913KC or ACA2B4" maxLength={20} className="min-w-0 flex-1 brutal-border border-paper bg-paper text-ink px-4 py-3 font-mono uppercase" />
              <button type="submit" disabled={replayMutation.isPending} className="label-stamp brutal-border border-paper bg-warning text-ink px-4 sm:px-6 disabled:opacity-50"><Search className="inline w-4 h-4 mr-2" />{replayMutation.isPending ? "Loading" : "Replay"}</button>
            </form>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAILS.map((tail) => <button key={tail} type="button" onClick={() => startLatest(tail)} className="font-mono text-xs border border-paper/50 px-2 py-2 hover:bg-warning hover:text-ink">{tail}</button>)}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-[1600px] mx-auto p-3 sm:p-4">
        <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_330px]">
          <aside className="brutal-border-thick min-w-0 order-3 lg:order-1 lg:row-span-2">
            <div className="bg-ink text-paper p-3 flex items-center justify-between gap-2">
              <div><div className="label-stamp text-warning">Live aircraft</div><div className="font-mono text-[10px] opacity-70 mt-1">Public community receivers</div></div>
              <button type="button" aria-label="Refresh live aircraft" title="Refresh live aircraft" disabled={mode !== "live" || live.status === "connecting"} onClick={live.refresh} className="border border-paper p-2 disabled:opacity-40"><RefreshCw className={`w-4 h-4 ${live.status === "connecting" ? "animate-spin" : ""}`} /></button>
            </div>
            <div className="p-3 border-b-2 border-ink">
              <label htmlFor="live-filter" className="label-stamp text-[10px]">Filter this list</label>
              <input id="live-filter" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Tail, code, owner, type" className="mt-2 w-full brutal-border bg-paper px-2 py-2 font-mono text-xs" />
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {mode !== "live" && <p className="p-4 font-mono text-xs opacity-70">Live updates pause during replay. Return to Live to resume.</p>}
              {mode === "live" && live.status === "connecting" && !live.aircraft.length && <p className="p-4 font-mono text-xs">Receiving current aircraft positions…</p>}
              {mode === "live" && live.status === "error" && !live.aircraft.length && <p className="p-4 font-mono text-xs bg-alert text-paper">The public live feed is unavailable. Historical replay remains available.</p>}
              {mode === "live" && !filteredAircraft.length && live.status !== "connecting" && <p className="p-4 font-mono text-xs">No aircraft match this filter.</p>}
              {mode === "live" && filteredAircraft.map((item) => {
                const registration = item.registry?.registration ?? item.registration;
                const label = registration ?? item.callsign ?? item.hex.toUpperCase();
                const kcso = isKcsoAircraft(registration, item.hex);
                return (
                  <button key={item.hex} type="button" onClick={() => selectLive(item.hex)} className={`w-full text-left p-3 border-b border-ink/20 hover:bg-warning/40 ${selectedHex === item.hex ? "bg-warning" : "bg-paper"}`}>
                    <span className="flex items-center justify-between gap-2"><strong className="font-mono text-sm">{label}</strong>{kcso && <span className="label-stamp text-[9px] bg-alert text-paper px-1.5 py-1">KCSO</span>}</span>
                    <span className="block font-mono text-[10px] mt-1 opacity-70">{item.hex.toUpperCase()} · {item.aircraftType ?? "Type unavailable"}</span>
                    <span className="flex justify-between gap-2 font-mono text-[11px] mt-2"><span>{item.onGround ? "Ground" : item.altitudeFt == null ? "Alt —" : `${item.altitudeFt.toLocaleString()} ft`}</span><span>{item.groundSpeedKt == null ? "— kt" : `${Math.round(item.groundSpeedKt)} kt`}</span></span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t-2 border-ink font-mono text-[10px] opacity-70">Yellow markers are KCSO-listed aircraft. Selection is based on the shared aircraft-code list, not observed tail text alone.</div>
          </aside>

          <section className="min-w-0 order-1 lg:order-2">
            <ClientOnly fallback={<div className="tracker-map brutal-border-thick flex items-center justify-center label-stamp">Loading interactive map…</div>}>
              <Suspense fallback={<div className="tracker-map brutal-border-thick flex items-center justify-center label-stamp">Loading interactive map…</div>}>
                <TrackerMap mode={mode} aircraft={live.aircraft} selectedHex={selectedHex} onSelectLive={selectLive} liveTrail={liveTrail} replay={replay} replayIndex={replayIndex} />
              </Suspense>
            </ClientOnly>
            <div className="flex flex-wrap justify-between gap-2 mt-2 font-mono text-[10px] opacity-70">
              <span>{mode === "live" ? `Last public update: ${live.lastUpdated ? fmtClock(live.lastUpdated) : "awaiting data"}` : replay ? `Replay window: ${durationLabel(replayEndMs - replayStartMs)} · UTC inputs` : "Load a tail to begin replay"}</span>
              <span>Not for navigation · positions may be incomplete or delayed</span>
            </div>
          </section>

          <aside className="min-w-0 space-y-4 order-4 lg:order-3 lg:col-span-2 xl:col-span-1 xl:row-span-2">
            {mode === "live" ? (
              <LiveDetails aircraft={selectedLive} onReplay={startLatest} />
            ) : (
              <ReplayDetails replay={replay} pointIndex={replayIndex} />
            )}

            <section className="brutal-border-thick">
              <div className="bg-ink text-paper p-3"><div className="label-stamp text-warning">Replay window</div><div className="font-mono text-[10px] mt-1 opacity-70">Times below are UTC</div></div>
              <div className="p-3 space-y-3">
                <div className="grid sm:grid-cols-2 xl:grid-cols-1 gap-3">
                  <label className="label-stamp text-[10px]">Start UTC<input type="datetime-local" step="60" value={startInput} onChange={(event) => setStartInput(event.target.value)} className="mt-1 w-full brutal-border bg-paper px-2 py-2 font-mono text-xs normal-case" /></label>
                  <label className="label-stamp text-[10px]">End UTC<input type="datetime-local" step="60" value={endInput} onChange={(event) => setEndInput(event.target.value)} className="mt-1 w-full brutal-border bg-paper px-2 py-2 font-mono text-xs normal-case" /></label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={loadWindow} disabled={replayMutation.isPending || !query.trim()} className="label-stamp brutal-border bg-ink text-paper px-3 py-2 disabled:opacity-40">Load window</button>
                  <button type="button" onClick={() => startLatest(query)} disabled={replayMutation.isPending || !query.trim()} className="label-stamp brutal-border bg-warning px-3 py-2 disabled:opacity-40">Latest 24 hours</button>
                </div>
                {inputError && <p role="alert" className="font-mono text-xs bg-alert text-paper p-2">{inputError}</p>}
                {replayMutation.isError && <p role="alert" className="font-mono text-xs bg-alert text-paper p-2">Replay could not be loaded. Check the aircraft and time window, then try again.</p>}
                {replayMutation.isSuccess && !replay && <p className="font-mono text-xs bg-warning p-2">No single FAA-matched aircraft or retained detections resolved for this search. Try the six-character aircraft code.</p>}
                <p className="font-mono text-[10px] opacity-70">An empty custom window means no retained observations then; latest 24 hours anchors to the aircraft’s newest retained detection, not necessarily today.</p>
              </div>
            </section>
          </aside>

          {mode === "replay" && replay && (
            <section className="brutal-border-thick order-2 lg:order-4 lg:col-start-2 xl:col-start-2">
              <div className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><div className="label-stamp text-alert">Detection timeline</div><div className="font-mono text-xs mt-1">{replayPoint ? replayTime(replayPoint.capturedAt) : "No mapped observations in this window"}</div></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" aria-label={playing ? "Pause replay" : "Play replay"} disabled={replay.points.length < 2} onClick={() => { if (cursorMs >= replayEndMs) setCursorMs(replayFirstMs); setPlaying((value) => !value); }} className="brutal-border bg-warning p-3 disabled:opacity-40">{playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
                    <button type="button" aria-label="Restart replay" disabled={!replay.points.length} onClick={() => { setCursorMs(replayFirstMs); setPlaying(false); }} className="brutal-border bg-paper p-3 disabled:opacity-40"><RotateCcw className="w-5 h-5" /></button>
                    <label className="label-stamp text-[10px]">Speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="ml-2 brutal-border bg-paper px-2 py-2 font-mono"><option value={1}>1×</option><option value={10}>10×</option><option value={60}>60×</option><option value={300}>300×</option></select></label>
                  </div>
                </div>
                <label htmlFor="replay-position" className="sr-only">Replay position</label>
                <input id="replay-position" type="range" min={0} max={Math.max(1000, replayEndMs - replayStartMs)} step={1000} value={Math.max(0, Math.min(replayEndMs - replayStartMs, cursorMs - replayStartMs))} disabled={!replay.points.length} onChange={(event) => { setPlaying(false); setCursorMs(replayStartMs + Number(event.target.value)); }} className="w-full mt-5 accent-[var(--alert)]" />
                <div className="flex justify-between gap-3 font-mono text-[10px]"><span>{replayTime(replay.windowStart)}</span><span>{replayTime(replay.windowEnd)}</span></div>
                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-ink/30 pt-3 font-mono text-[10px]">
                  <span>Observation {replay.points.length ? replayIndex + 1 : 0} of {replay.points.length.toLocaleString()} displayed</span>
                  <span>{replay.sampled ? `${replay.totalInWindow.toLocaleString()} matched; approximately 5,000 evenly spaced observations plus endpoints displayed.` : `${replay.totalInWindow.toLocaleString()} retained observations displayed without sampling.`}</span>
                </div>
              </div>
            </section>
          )}
        </div>

        <section className="mt-4 brutal-border p-4 font-mono text-[11px] leading-relaxed">
          <strong className="label-stamp">Sources & limits.</strong> Live positions come from adsb.lol community receivers and are matched to the public FAA registry. Historical replay reads retained <code>detections</code> rows through the same FAA-first identity resolution as Tail Search; maintained ML profile totals are not presented as retained map points. Live viewing is read-only and does not change evidence or ML findings. Map © OpenStreetMap contributors.
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function LiveDetails({ aircraft, onReplay }: { aircraft: LiveAircraft | null; onReplay: (tail: string) => void }) {
  if (!aircraft) {
    return <section className="brutal-border-thick p-4"><Plane className="w-8 h-8 mb-3" /><h2 className="text-2xl">Select an aircraft</h2><p className="mt-2 text-sm opacity-70">Choose a marker or a row in the live list to see its public telemetry and FAA registration.</p></section>;
  }
  const registration = aircraft.registry?.registration ?? aircraft.registration;
  const label = registration ?? aircraft.callsign ?? aircraft.hex.toUpperCase();
  const kcso = isKcsoAircraft(registration, aircraft.hex);
  return (
    <section className="brutal-border-thick">
      <div className="p-4 border-b-2 border-ink">
        <div className="flex items-center justify-between gap-2"><div className="label-stamp text-alert">Selected aircraft</div>{kcso && <span className="label-stamp text-[9px] bg-warning px-2 py-1">KCSO listed</span>}</div>
        <h2 className="text-3xl mt-2 break-words">{label}</h2>
        <p className="font-mono text-xs mt-2">{aircraft.registry?.registrant ?? "FAA owner not resolved for this aircraft code"}</p>
        <p className="font-mono text-[11px] mt-1 opacity-70">{aircraft.hex.toUpperCase()} · {aircraft.aircraftType ?? "Type unavailable"}</p>
      </div>
      <dl className="grid grid-cols-2">
        <Telemetry label="Altitude" value={aircraft.onGround ? "Ground" : aircraft.altitudeFt == null ? "—" : `${aircraft.altitudeFt.toLocaleString()} ft`} />
        <Telemetry label="Ground speed" value={aircraft.groundSpeedKt == null ? "—" : `${Math.round(aircraft.groundSpeedKt)} kt`} />
        <Telemetry label="Track" value={aircraft.trackDeg == null ? "—" : `${Math.round(aircraft.trackDeg)}°`} />
        <Telemetry label="Vertical rate" value={aircraft.verticalRateFpm == null ? "—" : `${Math.round(aircraft.verticalRateFpm)} fpm`} />
        <Telemetry label="Position age" value={aircraft.seenPositionSec == null ? "—" : `${Math.round(aircraft.seenPositionSec)} sec`} />
        <Telemetry label="Registry year" value={aircraft.registry?.yearMfr?.toString() ?? "—"} />
      </dl>
      <div className="p-3 space-y-2 border-t-2 border-ink">
        <button type="button" onClick={() => onReplay(aircraft.hex)} className="label-stamp brutal-border bg-warning w-full px-3 py-3"><Clock3 className="inline w-4 h-4 mr-2" />Replay latest detections</button>
        <Link to="/aircraft/$id" params={{ id: aircraft.hex.toUpperCase() }} className="label-stamp brutal-border bg-paper block text-center px-3 py-3 hover:bg-warning">Open aircraft dossier <ExternalLink className="inline w-3 h-3 ml-1" /></Link>
      </div>
    </section>
  );
}

function ReplayDetails({ replay, pointIndex }: { replay: FlightReplayResult | null; pointIndex: number }) {
  if (!replay) {
    return <section className="brutal-border-thick p-4"><Clock3 className="w-8 h-8 mb-3" /><h2 className="text-2xl">Replay an aircraft</h2><p className="mt-2 text-sm opacity-70">Enter a tail number or aircraft code above. The map will use retained observations from its latest 24-hour period.</p></section>;
  }
  const point = replay.points[pointIndex] ?? null;
  return (
    <section className="brutal-border-thick">
      <div className="p-4 border-b-2 border-ink">
        <div className="flex items-center justify-between gap-2"><div className="label-stamp text-alert">Retained detection replay</div>{isKcsoAircraft(replay.registration, replay.icao) && <span className="label-stamp text-[9px] bg-warning px-2 py-1">KCSO listed</span>}</div>
        <h2 className="text-3xl mt-2 break-words">{replay.registration}</h2>
        <p className="font-mono text-xs mt-2">{replay.owner ?? "FAA owner not resolved for this aircraft code"}</p>
        <p className="font-mono text-[11px] mt-1 opacity-70">{replay.icao} · {replay.model ?? "Model unavailable"}</p>
      </div>
      <dl className="grid grid-cols-2">
        <Telemetry label="Altitude" value={point ? point.onGround ? "Ground" : point.altitude == null ? "—" : `${Math.round(point.altitude).toLocaleString()} ft` : "—"} />
        <Telemetry label="Speed" value={point?.speed == null ? "—" : `${Math.round(point.speed)} kt`} />
        <Telemetry label="County" value={point?.county ?? "—"} />
        <Telemetry label="Observation" value={point ? `${pointIndex + 1} / ${replay.points.length}` : "0"} />
      </dl>
      {point && <div className="p-3 border-t border-ink/30 font-mono text-[10px]"><MapPin className="inline w-3 h-3 mr-1" />{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}<br /><span className="opacity-70">Latest retained detection for this aircraft: {replay.latestRetainedAt ? replayTime(replay.latestRetainedAt) : "unavailable"}</span></div>}
      <div className="p-3 grid grid-cols-2 gap-2 border-t-2 border-ink">
        <Link to="/aircraft/$id" params={{ id: replay.icao }} className="label-stamp brutal-border text-center px-2 py-3 hover:bg-warning">Dossier</Link>
        <Link to="/tail-search" search={{ tail: replay.icao }} className="label-stamp brutal-border text-center px-2 py-3 hover:bg-warning">Tail Search</Link>
      </div>
    </section>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return <div className="p-3 border-b border-r border-ink/20"><dt className="label-stamp text-[9px] opacity-60">{label}</dt><dd className="font-mono text-sm mt-1 break-words">{value}</dd></div>;
}
