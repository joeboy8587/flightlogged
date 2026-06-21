# Fix preview + build the Surveillance Mosaic

## Part 1 — The "Preview has not been built yet" message

Quick diagnosis I just ran:

- Dev server (sandbox): running clean, no errors in the Vite log.
- Published site (`advocacywatch.live`): returns **HTTP 200** with HTML — the build is healthy.
- Preview URL: returns a normal **302 → auth-bridge** redirect (expected behavior; not a build failure).

So there is no actual build error in the code right now. The message you're seeing is the Lovable preview pane telling you the **last preview build hasn't finished yet** (or the preview iframe is stuck behind the auth-bridge handshake). The published site at `advocacywatch.live` is live and serving the latest deploy.

What I'll do to make sure it stays that way:

1. Re-read `src/lib/watchtower.functions.ts` end-to-end and confirm none of the recently-rewired functions still reference removed types or stale field names (the file has a leftover `biometricEvents: 0` line on the snapshot — harmless, but I'll keep it to avoid breaking JSX that still reads it, OR remove it everywhere in lockstep).
2. Hit each server function once via `invoke-server-function` (`/`, `/operators`, `/military`, `/threat-index`, `/live`, `/findings`, `/ml-detections`) and confirm every one returns 200. Any 500 gets fixed before moving on.
3. Trigger a fresh preview build by saving a no-op edit if the preview iframe is still showing the "not built yet" state after step 2.

If after that the preview pane still says "not built yet," it's a Lovable preview-infra issue, not a code issue — refreshing the editor tab clears it.

## Part 2 — The Surveillance Mosaic

A new route, `/mosaic`, that stacks six independent data layers over a single Kern-centered map. Every layer reads from **quiet-math** (the unbiased DB) via existing or new server functions — no lucky-wildflower, no new tables.

### What the user sees

A full-bleed map (centered ~35.43°N, −119.05°W, zoom 10) with:

- A **layer toggle panel** (top-right) — six checkboxes, each layer can be turned on/off independently. Default: Density + Violations on, others off.
- A **time filter** (top-left) — All / Last 7 days / Last 24h / Friday-Saturday nights only.
- A **legend** (bottom-left) that updates based on which layers are active.
- A **detail drawer** (right side) — clicking any tile / pin / arrow opens a popup with the underlying rows + a "Copy SHA-256 hash" button so it stays evidence-grade.

### The six layers

```text
┌─ Layer 1  Density Heatmap          choropleth 1km² tiles, color = total pings
├─ Layer 2  Violation Heatmap        overlay 60% opacity, color = dominant anomaly type
├─ Layer 3  Time-of-Day Calendar     7×24 grid below the map (not on the map)
├─ Layer 4  Anomaly Type Pins        point markers, color = anomaly_type, size = count
├─ Layer 5  Handoff Arrows           lines between aircraft pairs, thickness = handoff count
└─ Layer 6  Entity Network Pins      named pins (KCSO, ALF IX, AERO EQUITIES…), click = dossier
```

### Map library

Use **Leaflet** + **react-leaflet** (MIT-licensed, no API key, works with OpenStreetMap tiles). It bundles cleanly into the Worker runtime and doesn't require Mapbox / Google Maps tokens. Heatmap layer uses `leaflet.heat`. The Lovable Google Maps connector is overkill here — we don't need geocoding, just a tile background.

### Server functions to add (all in `src/lib/watchtower.functions.ts`, all read quiet-math)

Each function bins on a **0.01°×0.01° tile** (~1 km at this latitude) using `floor(lat*100)/100` and `floor(lon*100)/100` so the six layers share a tile grid and can be cross-referenced.

| Function | Source table(s) | Returns |
|---|---|---|
| `getDensityTiles({ since })` | `detections` | `[{ lat, lon, pings, uniqueAircraft, avgAltitude }]` |
| `getViolationTiles({ since })` | `anomaly_events` | `[{ lat, lon, events, uniqueAircraft, criticalCount, maxScore, dominantType }]` |
| `getTimeOfDayHeat({ since })` | `detections` + `anomaly_events` | `[{ dow, hour, pings, belowFloor, aircraft }]` (7×24 = 168 rows) |
| `getAnomalyPoints({ since, limit: 2000 })` | `anomaly_events` | `[{ lat, lon, anomalyType, anomalyScore, icao, registration, detectedAt }]` |
| `getHandoffPairs({ since })` | `detections` self-join on time + distance | `[{ fromIcao, toIcao, fromLat, fromLon, toLat, toLon, count }]` (existing `convergence_events` table may already have this — confirm and use it if so) |
| `getEntityCentroids()` | `aircraft_profiles` ⨝ `faa_master` + regex bucketing | `[{ entity, lat, lon, totalPings, aircraftCount, color }]` |

All tile queries cap at top-N tiles (500) and use `staleTime: 5 * 60_000` so the map isn't refetched on every layer toggle.

### Files

- **New**: `src/routes/mosaic.tsx` — the page (head/SEO, map, layer panel, time filter, legend, drawer).
- **New**: `src/components/mosaic/` — `MosaicMap.tsx`, `LayerPanel.tsx`, `TimeFilter.tsx`, `Legend.tsx`, `CalendarHeatmap.tsx`, `DetailDrawer.tsx`.
- **Edited**: `src/lib/watchtower.functions.ts` — add the 6 new server functions above.
- **Edited**: `src/components/site-header.tsx` — add "Mosaic" to nav between "Live" and "Threat Index".
- **Edited**: `src/routes/methodology.tsx` — add a short "Mosaic" section explaining the 1km² tile binning and the six layers.
- **Edited**: `package.json` — add `leaflet`, `react-leaflet`, `leaflet.heat`, `@types/leaflet`.

### Evidence integrity

Every tile and pin payload includes:
- `sha256_hash` for the underlying detection/anomaly rows (already in quiet-math).
- `tileFingerprint` = SHA-256 of `(lat, lon, count, since)` so a screenshot of the mosaic can be verified later.
- A "Copy evidence bundle" button in the detail drawer that produces a JSON blob with the rows + their hashes for FOIA / legal export.

### Out of scope (will not do unless asked)

- No write-back to the database.
- No ML re-training — we read existing `anomaly_events.anomaly_type` as-is.
- No real-time WebSocket layer (5-minute cache is plenty; can add later).
- No mobile-optimized layout v1 — map is desktop-first; mobile gets a "Open on desktop for full mosaic" notice.

## What you'll see when it's done

- A new "Mosaic" link in the header. Click it and the Kern map renders within ~2s with Density + Violations layers on by default. The KCSO ramp tile glows dark red on both layers — that's the finding visualized.
- Toggle Layer 5 and the handoff arrows draw between `N787FA ↔ N790FA` and friends, with line thickness proportional to handoff count.
- Toggle Layer 3 and the 7×24 calendar appears below the map showing Fri 21:00 PDT as the hottest cell.
- Every tile and pin has a "Copy evidence bundle" button so anything you screenshot is chain-of-custody verifiable.
- The "Preview has not been built yet" message disappears as soon as the preview build completes (no code change required for that — but Part 1's verification pass ensures no server function is silently 500-ing and blocking the build probe).
