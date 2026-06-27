## What I scanned

I read every table and column in your quiet-math Neon database (65 tables) and compared them to what the site currently shows. Every page already reads from quiet-math only — the legacy `evidence()` call is a silent redirect to `watchtower()`, so the "one source of truth" rule is intact. The gaps below are about **data we already have but aren't showing**, and **consistency tweaks** so the same value looks the same on every page.

## Group A — New data your tables now expose but the UI ignores

Each item lists the table → field → where it should appear. None of these require new DB work; they're already populated.

1. **`aircraft_profiles.tactical_role` + `confirmed_coord_partners`** → add a "Tactical role" column on **Operators** and a "Confirmed coordination partners" chip on **Tail Search**. This is your new entity-resolved coordination data.
2. **`aircraft_profiles.reg_violation_count` + `integrity_failure_rate`** → add to the Operators table as a "Registry integrity" badge (e.g. "3 violations · 12% integrity failure"). High-signal, currently hidden.
3. **`detections.is_91_227_violator` + `max_obstacle_amsl_2k_ft`** → surface on **Violations** as a dedicated "FAR 91.227 (ADS-B integrity)" filter chip and an "Obstacle proximity" column on the Live Feed.
4. **`detections.loiter_ratio` + `is_congested`** → use on **Live Feed** story cards ("loitered 73% of pass over a congested area") — pairs perfectly with the existing `StoryCard` template.
5. **`anomaly_events.kinematic_anomaly_score`, `graph_anomaly_score`, `physics_violation`, `surveillance_indicator`, `county_z_score`** → expand **ML Detections** with a multi-model score breakdown row instead of the single number it shows today.
6. **`ensemble_anomaly_scores`** (multi-model agreement: wavenet / isolation forest / LOF / temporal) → add a new section on **ML Detections** titled "Models that agreed" with the per-model bars and the `disagreement` metric.
7. **`cases` table** (WTI tier, Bradford-Hill flags, `is_published`, `publish_tier`, `public_summary`, `report_url`) → add a new public **Cases** page (`/cases`) listing every published case dossier. This is the highest-leverage missing surface — the machine is already opening and scoring cases, but the public can't see them.
8. **`wtpr_registry` + `wtpr_convergent_locks`** (court-ready fingerprints) → new **Court-Ready Evidence** page (`/wtpr`) showing the legal-grade chain hashes and convergent locks. Strengthens the "evidence integrity" pitch.
9. **`weekly_investigator_report`** → add to **Reports** page: a weekly auto-brief list with `kcso_detections`, `military_detections`, `convergence_events`, and the rendered `report_content`.
10. **`monitoring_reports` + `compliance_items` + `reform_areas`** → new **Consent Decree** page (`/consent-decree`) tracking the SJ paragraphs and 2023/2024/2025 status columns. Connects the airspace data to the existing legal accountability framework.
11. **`radar_screenshots` + `visual_evidence` + `flightradar24_vision_extracts`** → new **Visual Corroboration** section on Tail Search that pulls matching screenshots by tail. The `best_match_id`/`match_status` columns already link these to detections.
12. **`learned_patterns`** (active ML patterns with `confidence`, `peak_hour`, `active_days`) → new **Patterns** page (`/patterns`) listing what the system has learned to recognize.
13. **`corridor_zones` + `corridor_aircraft`** → new **Corridors** page (`/corridors`) with a zone-by-zone breakdown and the heavy-rotation aircraft per zone.
14. **`aoi_alerts`** (Area-of-Interest alert level, distance, reason) → small "Active alerts" banner on the home page when fresh rows exist.
15. **`digital_obstacles`** → use in the Violations page to label which low-altitude events were near a charted tower (joins via `max_obstacle_amsl_2k_ft`).
16. **`ml_brain_reports.top_hypothesis` + `four_factor_links`** → add to Tail Search as "AI brief" panel for that registration when one exists.

## Group B — Consistency fixes across existing pages

Things that already exist but render differently page-to-page.

- **Percent rendering**: enforce `fmtPct()` everywhere `night_pct`, `weekend_pct`, `below_1000ft_rate`, `hover_rate`, `integrity_failure_rate` appear (some pages call `.toFixed(0) + "%"` directly).
- **Date rendering**: a shared `fmtClock()` / `fmtDate()` helper. Today some pages show ISO, others `toLocaleString`.
- **County name**: route everything through `normalizeCountyKey()` already in `watchtower.functions.ts` so "Kern", "KERN", "kern county" stop appearing as three different rows.
- **Tail / ICAO display**: always prefer registration, fall back to ICAO hex with a `mono` style. Codify in a tiny `<TailBadge />` component.
- **Detection count source**: after the recent fix, all detection counts come from raw `detections` rows. Audit the remaining pages (Mosaic, Threat Index, Foreign, Military) that still reference `total_detections` / `occurrences_total` directly and switch them to the raw-count CTE pattern so headline numbers match across pages.
- **Flag chips** (KCSO / MIL / MED / SHELL / XP): extract the inline `<Flag>` from `operators.tsx` into `src/components/flag-chips.tsx` and reuse it on Tail Search, Foreign, Military.
- **Share row** is already a component but not on every page (Reports, ML Detections, Violations don't have it). Add it.

## Group C — Small quality improvements

- **SEO**: add `og:image` per-route where a page has a hero/cover; today every page inherits the root og image.
- **JSON-LD**: extend the `Dataset` schema currently on Operators to Violations, Threat Index, Cases (once added). Same shape, different `name` / `description`.
- **Stale-time alignment**: every dataset page caches 5–10 min already; align the few outliers (Mosaic, Live) on the same `staleTime` so headline numbers don't drift between tabs.

## Recommended sequence

```text
P0 — Group B (consistency): no new pages, just makes existing numbers agree.
P1 — Group A items 1, 2, 3, 4 (in-place column additions on existing pages).
P2 — Group A item 7 (Cases page) — biggest narrative payoff.
P3 — Group A items 5, 6 (richer ML Detections).
P4 — Group A items 10, 12, 13 (Consent Decree, Patterns, Corridors pages).
P5 — Group A items 8, 9, 11, 14, 15, 16 (WTPR, Weekly, Visual, AOI, Obstacles, Brain).
P6 — Group C (SEO + JSON-LD + stale-time polish).
```

## How I'd like to proceed

Tell me which priority bands to ship (e.g. "do P0 and P1 now", or "do everything through P3"). I'll keep the data source restricted to `watchtower()` (quiet-math) only, reuse the existing brutal-border / label-stamp styling, and won't add any new components outside what's listed above.

## Technical notes (skip if not interested)

- All new queries go through `src/lib/watchtower.functions.ts` as new `createServerFn` handlers next to the existing ones, following the SSR-loader + `useSuspenseQuery` pattern the rest of the site uses.
- New routes follow the existing flat naming (`src/routes/cases.tsx`, `src/routes/corridors.tsx`, etc.) with `head()` metadata + breadcrumb + JSON-LD + share row, matching `operators.tsx` as the template.
- The flag-chip / tail-badge / fmt helpers go in `src/components/` and `src/lib/format.ts` (extending the existing `fmtPct`).
- Nothing here touches `evidence()`; the deprecation shim stays so any forgotten caller still ends up on quiet-math.
