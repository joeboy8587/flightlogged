import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type {
  MosaicDensityTile, MosaicViolationTile, MosaicAnomalyPoint,
  MosaicHandoffPair, MosaicEntity,
} from "@/lib/watchtower.functions";

const ANOMALY_COLORS: Record<string, string> = {
  LOW_ALTITUDE: "#dc2626",
  SPOOFING_SIGNAL: "#ea580c",
  SURVEILLANCE_MASKING: "#7c3aed",
  HOVER_PATTERN: "#ca8a04",
  IMPOSSIBLE_PHYSICS: "#0891b2",
  ALTITUDE_SPOOF: "#db2777",
  GHOST_TRACK: "#475569",
  UNUSUAL_ROUTE: "#16a34a",
  UNKNOWN: "#737373",
};

export type MosaicLayers = {
  density: boolean; violations: boolean; anomalyPins: boolean;
  handoffs: boolean; entities: boolean;
};

export type MosaicData = {
  density: MosaicDensityTile[];
  violations: MosaicViolationTile[];
  anomalyPoints: MosaicAnomalyPoint[];
  handoffs: MosaicHandoffPair[];
  entities: MosaicEntity[];
};

export function MosaicMap({
  layers, data, onSelect,
}: {
  layers: MosaicLayers;
  data: MosaicData;
  onSelect: (payload: { kind: string; data: any }) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{
    density?: L.LayerGroup; violations?: L.LayerGroup;
    anomalyPins?: L.LayerGroup; handoffs?: L.LayerGroup; entities?: L.LayerGroup;
  }>({});

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true }).setView([35.6, -119.2], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Render layers whenever data or visibility flips
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const groups = layerGroupsRef.current;

    // ----- Density -----
    groups.density?.remove(); groups.density = undefined;
    if (layers.density && data.density.length) {
      const max = Math.max(...data.density.map((t) => t.pings));
      const lg = L.layerGroup();
      for (const t of data.density) {
        const intensity = t.pings / max;
        const color = intensity > 0.66 ? "#7f1d1d" : intensity > 0.33 ? "#ea580c" : "#fde047";
        const rect = L.rectangle([[t.lat, t.lon], [t.lat + 0.01, t.lon + 0.01]], {
          color, weight: 0.5, fillColor: color, fillOpacity: 0.55,
        }).on("click", () => onSelect({ kind: "density", data: t }));
        rect.bindTooltip(`${t.pings} pings · ${t.uniqueAircraft} a/c`);
        lg.addLayer(rect);
      }
      lg.addTo(map); groups.density = lg;
    }

    // ----- Violations -----
    groups.violations?.remove(); groups.violations = undefined;
    if (layers.violations && data.violations.length) {
      const lg = L.layerGroup();
      for (const t of data.violations) {
        const color = ANOMALY_COLORS[t.dominantType] ?? ANOMALY_COLORS.UNKNOWN;
        const rect = L.rectangle([[t.lat, t.lon], [t.lat + 0.01, t.lon + 0.01]], {
          color, weight: 1.5, fillColor: color, fillOpacity: 0.45, dashArray: "4",
        }).on("click", () => onSelect({ kind: "violation", data: t }));
        rect.bindTooltip(`${t.events} anomalies · ${t.dominantType}`);
        lg.addLayer(rect);
      }
      lg.addTo(map); groups.violations = lg;
    }

    // ----- Anomaly pins -----
    groups.anomalyPins?.remove(); groups.anomalyPins = undefined;
    if (layers.anomalyPins && data.anomalyPoints.length) {
      const lg = L.layerGroup();
      for (const p of data.anomalyPoints) {
        const color = ANOMALY_COLORS[p.anomalyType] ?? ANOMALY_COLORS.UNKNOWN;
        const m = L.circleMarker([p.lat, p.lon], {
          radius: 3 + Math.round(p.anomalyScore * 6),
          color, fillColor: color, fillOpacity: 0.8, weight: 1,
        }).on("click", () => onSelect({ kind: "anomaly", data: p }));
        m.bindTooltip(`${p.anomalyType} · ${(p.anomalyScore * 100).toFixed(0)} · ${p.registration ?? p.icao}`);
        lg.addLayer(m);
      }
      lg.addTo(map); groups.anomalyPins = lg;
    }

    // ----- Handoffs -----
    groups.handoffs?.remove(); groups.handoffs = undefined;
    if (layers.handoffs && data.handoffs.length) {
      const lg = L.layerGroup();
      const maxC = Math.max(...data.handoffs.map((h) => h.count), 1);
      for (const h of data.handoffs) {
        const w = 1 + (h.count / maxC) * 5;
        const line = L.polyline([[h.fromLat, h.fromLon], [h.toLat, h.toLon]], {
          color: "#0a0a0a", weight: w, opacity: 0.7,
        }).on("click", () => onSelect({ kind: "handoff", data: h }));
        line.bindTooltip(`${h.fromIcao} ↔ ${h.toIcao} · ${h.count} handoffs`);
        lg.addLayer(line);
      }
      lg.addTo(map); groups.handoffs = lg;
    }

    // ----- Entities -----
    groups.entities?.remove(); groups.entities = undefined;
    if (layers.entities && data.entities.length) {
      const lg = L.layerGroup();
      for (const e of data.entities) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${e.color};color:#fff;padding:4px 8px;border:2px solid #0a0a0a;font:bold 11px monospace;white-space:nowrap;box-shadow:2px 2px 0 #0a0a0a">${e.entity} · ${e.aircraftCount}</div>`,
          iconSize: [120, 24], iconAnchor: [60, 12],
        });
        const m = L.marker([e.lat, e.lon], { icon }).on("click", () => onSelect({ kind: "entity", data: e }));
        lg.addLayer(m);
      }
      lg.addTo(map); groups.entities = lg;
    }

    const visiblePoints: [number, number][] = [];
    if (layers.density) data.density.slice(0, 200).forEach((t) => visiblePoints.push([t.lat, t.lon]));
    if (layers.violations) data.violations.slice(0, 200).forEach((t) => visiblePoints.push([t.lat, t.lon]));
    if (layers.anomalyPins) data.anomalyPoints.slice(0, 200).forEach((p) => visiblePoints.push([p.lat, p.lon]));
    if (layers.handoffs) data.handoffs.slice(0, 100).forEach((h) => { visiblePoints.push([h.fromLat, h.fromLon]); visiblePoints.push([h.toLat, h.toLon]); });
    if (layers.entities) data.entities.forEach((e) => visiblePoints.push([e.lat, e.lon]));
    if (visiblePoints.length > 0) map.fitBounds(L.latLngBounds(visiblePoints), { padding: [24, 24], maxZoom: 10 });
  }, [layers, data, onSelect]);

  return <div ref={elRef} style={{ height: "70vh", minHeight: 480, width: "100%" }} className="brutal-border" />;
}