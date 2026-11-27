import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LiveAircraft } from "@/components/airspace/contracts";
import { isKcsoAircraft } from "@/lib/kcso";
import { bearingBetween, type FlightReplayResult, type TrackerMode } from "@/lib/tracker";
import "./tracker-map.css";

type TrackerMapProps = {
  mode: TrackerMode;
  aircraft: LiveAircraft[];
  selectedHex: string | null;
  onSelectLive: (hex: string) => void;
  liveTrail: [number, number][];
  replay: FlightReplayResult | null;
  replayIndex: number;
};

const PLANE_PATH = "M12 2 L19 21 L12 17 L5 21 Z";

function planeIcon(heading: number, kcso: boolean, selected: boolean) {
  const safeHeading = Number.isFinite(heading) ? heading : 0;
  return L.divIcon({
    className: "",
    html: `<span class="tracker-aircraft-marker${kcso ? " is-kcso" : ""}${selected ? " is-selected" : ""}"><svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${safeHeading}deg)"><path d="${PLANE_PATH}" fill="currentColor"/></svg></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function tooltipText(label: string, detail: string) {
  const node = document.createElement("div");
  const strong = document.createElement("strong");
  const small = document.createElement("div");
  strong.textContent = label;
  small.textContent = detail;
  node.append(strong, small);
  return node;
}

export function TrackerMap({ mode, aircraft, selectedHex, onSelectLive, liveTrail, replay, replayIndex }: TrackerMapProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const liveLayerRef = useRef<L.LayerGroup | null>(null);
  const liveTrailRef = useRef<L.Polyline | null>(null);
  const replayLayerRef = useRef<L.LayerGroup | null>(null);
  const replayVisibleRef = useRef<L.Polyline | null>(null);
  const replayMarkerRef = useRef<L.Marker | null>(null);
  const lastFocusedHexRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelectLive);
  onSelectRef.current = onSelectLive;

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    const map = L.map(elementRef.current, { zoomControl: true, preferCanvas: true }).setView([35.55, -119.15], 7);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    L.control.scale({ imperial: true, metric: true }).addTo(map);
    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(elementRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    liveLayerRef.current?.remove();
    liveLayerRef.current = null;
    if (mode !== "live") return;
    const group = L.layerGroup();
    for (const item of aircraft) {
      const registration = item.registry?.registration ?? item.registration;
      const label = registration ?? item.callsign ?? item.hex.toUpperCase();
      const kcso = isKcsoAircraft(registration, item.hex);
      const marker = L.marker([item.lat, item.lon], {
        icon: planeIcon(item.trackDeg ?? 0, kcso, item.hex === selectedHex),
        keyboard: true,
        title: `${label} · ${item.hex.toUpperCase()}`,
        alt: `Select aircraft ${label}`,
        zIndexOffset: item.hex === selectedHex ? 1000 : kcso ? 500 : 0,
      });
      marker.bindTooltip(tooltipText(label, `${item.altitudeFt == null ? "Altitude unavailable" : `${item.altitudeFt.toLocaleString()} ft`} · ${item.groundSpeedKt == null ? "Speed unavailable" : `${Math.round(item.groundSpeedKt)} kt`}`), { className: "tracker-tooltip", direction: "top", offset: [0, -15] });
      marker.on("click", () => onSelectRef.current(item.hex));
      group.addLayer(marker);
    }
    group.addTo(map);
    liveLayerRef.current = group;
  }, [aircraft, mode, selectedHex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "live" || !selectedHex || lastFocusedHexRef.current === selectedHex) return;
    const item = aircraft.find((candidate) => candidate.hex === selectedHex);
    if (!item) return;
    map.flyTo([item.lat, item.lon], Math.max(map.getZoom(), 9), { duration: 0.6 });
    lastFocusedHexRef.current = selectedHex;
  }, [aircraft, mode, selectedHex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    liveTrailRef.current?.remove();
    liveTrailRef.current = null;
    if (mode !== "live" || liveTrail.length < 2) return;
    liveTrailRef.current = L.polyline(liveTrail, { color: "var(--alert)", weight: 3, opacity: 0.85 }).addTo(map);
  }, [liveTrail, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    replayLayerRef.current?.remove();
    replayLayerRef.current = null;
    replayVisibleRef.current = null;
    replayMarkerRef.current = null;
    if (mode !== "replay" || !replay || replay.points.length === 0) return;

    const allPoints = replay.points.map((point) => [point.latitude, point.longitude] as [number, number]);
    const group = L.layerGroup();
    L.polyline(allPoints, { color: "var(--ink)", weight: 2, opacity: 0.3, dashArray: "5 7" }).addTo(group);
    replayVisibleRef.current = L.polyline(allPoints.slice(0, 1), { color: "var(--alert)", weight: 4, opacity: 0.95 }).addTo(group);
    const first = replay.points[0];
    if (first) {
      replayMarkerRef.current = L.marker([first.latitude, first.longitude], {
        icon: planeIcon(0, isKcsoAircraft(replay.registration, replay.icao), true),
        keyboard: false,
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(group);
    }
    group.addTo(map);
    replayLayerRef.current = group;
    if (allPoints.length === 1 && allPoints[0]) map.setView(allPoints[0], 11);
    else map.fitBounds(L.latLngBounds(allPoints), { padding: [34, 34], maxZoom: 11 });
  }, [mode, replay]);

  useEffect(() => {
    if (mode !== "replay" || !replay?.points.length) return;
    const index = Math.min(Math.max(replayIndex, 0), replay.points.length - 1);
    const current = replay.points[index];
    if (!current) return;
    const previous = replay.points[Math.max(0, index - 1)] ?? current;
    replayVisibleRef.current?.setLatLngs(replay.points.slice(0, index + 1).map((point) => [point.latitude, point.longitude] as [number, number]));
    replayMarkerRef.current?.setLatLng([current.latitude, current.longitude]);
    replayMarkerRef.current?.setIcon(planeIcon(bearingBetween(previous, current), isKcsoAircraft(replay.registration, replay.icao), true));
  }, [mode, replay, replayIndex]);

  return <div ref={elementRef} className="tracker-map brutal-border-thick" aria-label="Interactive live and historical aircraft map" />;
}
