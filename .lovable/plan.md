# Re-wire every page to the quiet-math Neon DB

## What I found (the actual problem)

Your two Neon connections resolve to:

- `NEON_WATCHTOWER_URL` → `ep-quiet-math-...neon.tech` ← the unbiased ML brain. 49 clean tables. **This is the one we want.**
- `NEON_EVIDENCE_URL` → `ep-lucky-wildflower-...neon.tech` ← legacy/biased store. Hundreds of overlapping tables.

`faaIdentityMap` already reads `faa_master` from quiet-math — good.

The leaks are in `src/lib/watchtower.functions.ts`. Eight functions still call `evidence()` (lucky-wildflower). They power:

| Function | Page(s) | Currently reads from lucky-wildflower |
|---|---|---|
| `getSnapshot` | `/` hero, header counters | `court_evidence.flight_detections`, `biometric_events`, `unified_events` |
| `getCorrelations` | `/` correlation grid | `court_evidence.biometric_events` |
| `getCanonicalOperators` | `/operators` | `canonical_operator_profiles` |
| `getSentinelViolations` | `/violations` | `sentinel_violations` |
| `getThreatIndex` | `/threat-index`, `/live` Kern card, ConvergenceEventCard top WTI | `threat_tiers` |
| `getMlAnomalies` | `/ml-detections` | `ml_anomaly_detections` |

These are why numbers contradict across pages and why "biased data" creeps in.

## Quiet-math equivalents (verified)

| Old (lucky) | New (quiet-math) | Notes |
|---|---|---|
| `court_evidence.flight_detections` | `public.detections` (2.39M rows) | drop-in, richer schema |
| `canonical_operator_profiles` | `aircraft_profiles` ⨝ `faa_aircraft_registry`/`faa_master` | already has `is_military`, `tactical_role`, `reg_violation_count`, `confirmed_coord_partners` — derive medical/KCSO/XP flags with the same heuristic regex over `registered_owner` |
| `sentinel_violations` | `violation_classifications` (1,537 rows) | already has owner_name/city/state/type_registrant joined in; no FAA round-trip needed |
| `threat_tiers` (WTI) | computed view over `anomaly_events` + `detections` + `convergence_events` | `anomaly_events.anomaly_score`, `county_z_score`, `cross_county_scores`, `contributing_factors` jsonb already exist — we synthesize a WTI score + tier client-side using documented weights (the same ones we publish on `/methodology`) |
| `ml_anomaly_detections` | `anomaly_events` (606k rows) + `ml_brain_reports` as model card | model name/version come from `ml_brain_reports` (14 rows); per-row features from `contributing_factors` jsonb; `human_reviewed` already on the table |
| `court_evidence.biometric_events` (correlations) | **REMOVE** | biometric/heart-rate correlation is the biased signal you want gone. Replace the `/` correlation grid with a "Top convergence events" grid from `convergence_events` (104k rows, has `aircraft_count`, `unique_icao_hexes`, `center_lat/lon`, `anomaly_score`) |

## Implementation order

1. **`src/lib/neon.server.ts`**
   - Keep `watchtower()` (quiet-math). Mark `evidence()` deprecated and make it throw with a clear message in production so any forgotten call site fails loudly, not silently.

2. **`src/lib/watchtower.functions.ts`** — rewrite the eight functions above to only call `watchtower()`:
   - `getSnapshot`: counts from `detections`, `aircraft_profiles`, `anomaly_events`, `convergence_events`. Drop the four biometric counters; replace with `convergenceAircraft`, `mlReports`, `violations` so the snapshot type stays useful.
   - `getCorrelations` → rename to `getTopConvergence`, return `convergence_events` rows.
   - `getCanonicalOperators`: select from `aircraft_profiles` (top by `total_detections`), left-join `faa_aircraft_registry` for owner name, derive `medical`/`military`/`kcso`/`xpServices` from owner regex + `is_military` column.
   - `getSentinelViolations`: select from `violation_classifications`, order by `captured_at`.
   - `getThreatIndex` + `getKernAlerts`: build WTI in SQL from `anomaly_events` (use `anomaly_score`, `county_z_score`) plus a convergence bonus from `convergence_events` matched on `icao_hex` within a 10-min window. Tier thresholds: 0–25 LOW, 25–50 MED, 50–75 HIGH, 75+ CRITICAL. Document on `/methodology`.
   - `getMlAnomalies`: rows from `anomaly_events` (anomalyType=`anomaly_type`, score=`anomaly_score`, features=keys of `contributing_factors`, validated=`human_reviewed`, hash=`sha256_hash`). Model card stats from `ml_brain_reports`.
   - `getConvergenceEvent` (top card on `/reports`): use `convergence_events` ordered by `aircraft_count DESC` — already in quiet-math, just confirm.

3. **Page components** — type names stay the same so most JSX is untouched. Only adjust where field meaning changed:
   - `src/routes/index.tsx`: swap the biometric correlation section for a "Top convergence events" section.
   - `src/routes/operators.tsx`: confirm the four flag columns still render; medical-cover count will now be live and consistent with `/military`.
   - `src/routes/threat-index.tsx`, `src/routes/live.tsx`, `src/components/convergence-event-card.tsx`: no JSX changes expected; the data shape is preserved.
   - `src/routes/ml-detections.tsx`: model-card "Top model" pulls from `ml_brain_reports`; row table is unchanged.
   - `src/routes/methodology.tsx`: add a "Single source of truth" paragraph naming quiet-math and listing the four core tables.

4. **Runtime errors**
   - `TypeError: Failed to fetch` at app load is the Lovable preview probe — not a code bug; it disappears once SSR returns 200 reliably. The hydration error `#418` is caused by the snapshot returning `0`s on the SSR pass (when lucky-wildflower times out) and real numbers on the client. After step 2, SSR uses one DB and one transport so both passes match. Add `staleTime: Infinity` on snapshot/hero queries so the loader-primed value is the one rendered.
   - Re-confirm the `/military` page (you reported it crashing) — once `getThreatIndex` and the snapshot stop touching lucky-wildflower, the cascading 500 should be gone. If anything still crashes I'll wrap the leaf query in the existing `try/empty` pattern used by `getSnapshot`.

5. **Verification (no manual checks needed from you)**
   - I'll hit each server function via `invoke-server-function` after the cutover and confirm no row originates from lucky-wildflower (the `evidence()` stub will throw if it does).
   - Cross-check the four numbers that must agree across pages: total detections, unique aircraft, military count, medical-cover count.

## What you'll see when it's done

- One database powers everything. Numbers stop contradicting between Operators / Military / Threat Index / Live.
- The biometric/heart-rate correlation grid on the home page is replaced with a real convergence-events grid sourced from 104k clean rows.
- `/military` stops crashing.
- The hydration warning on first load goes away.

No new tables, no migrations. Pure rewiring inside `src/lib/watchtower.functions.ts` plus small JSX swaps on `index.tsx` and `methodology.tsx`.
