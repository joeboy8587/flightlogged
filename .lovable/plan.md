# County-Weighted Baselines — Implementation Plan

Josiah's diagnosis is right: a single regional baseline lets LA's traffic volume drown Kern signals. We'll add per-county baselines, score each detection against its own county's normal, and surface Kern as a first-class lens — without touching the cross-county coordination logic.

## What changes (user-visible)

**Threat Index page**
- New county filter pill row: All • Kern • Tulare • Kings • Fresno • San Bernardino • Other
- Default still "All", but a prominent "Kern only" toggle right next to the headline
- Each event row gets a county chip showing which county's baseline it was scored against
- Top-25 list re-ranks live when filter changes

**Live Feed**
- Existing county filter promoted to the top of the page
- New "Kern County Alerts" section pinned above the regional feed

**Findings page**
- Add County column to the anomaly table
- Add a Kern-only filter chip

**Coordination, Military, Foreign, Operators** — no change. Cross-county detection stays intact.

## What changes (under the hood — for your records)

**Database (one migration)**
- New table `county_baselines` keyed by `(county, hour_of_day)` storing median/p95 altitude, median speed, loiter rate, sample size, and `updated_at`
- New view `detection_county_scores` that joins each detection to its county's baseline and computes a per-county z-score
- New column `county_score` and `scoring_county` added to the threat-index materialized view (or a sibling view if the existing one is locked)
- A SQL function `refresh_county_baselines()` that recomputes per-county baselines from the last 48h of detections, partitioned by county, with "OTHER" as the catch-all
- Hourly pg_cron job calling `refresh_county_baselines()`

**Server functions (`src/lib/watchtower.functions.ts`)**
- `getCountyBaselines()` — returns the published per-county baseline table (for the methodology section)
- `getThreatIndex({ county? })` — extend existing fn to accept optional county filter; when present, filters and re-ranks by `county_score` instead of regional score
- `getKernAlerts()` — convenience fn for the Live Feed Kern section
- All fns include the county each event was scored against

**Frontend wiring**
- `/threat-index` — add county filter state (search param `?county=kern`), pass through to query, render chips
- `/live` — promote county filter, add Kern Alerts section above main feed
- `/findings` — add County column + filter
- `/methodology` — add a section documenting the per-county baseline approach and linking to `getCountyBaselines()` output so anyone can reproduce

**Scoring rule (per Josiah's defensibility note)**
- An aircraft crossing multiple counties is scored in each, and its displayed score = MAX(per-county scores). Prevents a quiet LA segment from masking a loud Kern segment.

## Order of work

1. Migration: `county_baselines` table + grants + `refresh_county_baselines()` + cron + scoring view
2. Seed first baseline run so the UI has data immediately
3. Extend server functions
4. Threat Index UI (county filter + chips)
5. Live Feed Kern Alerts section
6. Findings county column + filter
7. Methodology page update
8. Verify: pull a known Kern event (e.g. N81KS over Oildale) and confirm it now outranks comparable LA traffic

## What I need from you before I start

Nothing blocking — I have everything I need. I'll keep the existing regional Threat Index visible alongside the county-weighted view so you can compare outputs before we make county-weighted the default, exactly as Josiah suggested.