
# Breadcrumbs + Schema-Aware Data Expansion

## Part 1 — Breadcrumb Navigation (sitewide)

**Goal:** Every non-home route shows a visible breadcrumb trail AND emits `BreadcrumbList` JSON-LD for Google's SERP breadcrumb feature.

Steps:
1. Create `src/components/site-breadcrumbs.tsx` — a small component built on the existing shadcn `breadcrumb.tsx`. It takes `items: { label, href? }[]` and renders the trail in the site's brutalist style (mono uppercase, ink-on-paper).
2. Create `src/lib/breadcrumbs.ts` — helper `buildBreadcrumbJsonLd(items, baseUrl)` returning the schema.org object so each route can drop it into `head().scripts`.
3. Mount the breadcrumbs at the top of each route's main `<div>` (just under `SiteHeader`) for: `/live`, `/findings`, `/reports`, `/rules`, `/methodology`, `/legal`, `/act`, `/about`, and the 4 new routes below. Home (`/`) gets no breadcrumb (per SEO convention).
4. In each route's `head()`, add a `scripts` entry with `application/ld+json` containing the `BreadcrumbList` for that page, using absolute `https://advocacywatch.live` URLs (matches existing canonical/og:url convention).

## Part 2 — Schema-Aware DB Analysis (findings)

Surveyed both Neon databases:

- **watchtower** — 17 tables, ~600K rows. Already fully surfaced (`detections`, `aircraft_profiles`, `anomaly_events`, `convergence_events`, `faa_master`, `faa_regulations`, `faa_airspace`, `regulatory_baselines`).
- **evidence** — 816 public tables + 15+ schemas, **20M+ rows**. Most are intermediate/forensic. After ranking by size, recency, and public-interest signal, the highest-value tables NOT yet on the site are:

| Table | Rows | What it adds |
|---|---|---|
| `canonical_operator_profiles` | 33K | Resolved operator identities w/ shell-company links, KCSO/military/medical flags — perfect for an "Operators" directory |
| `sentinel_violations` | 125K | Timestamped airspace violations w/ severity + lat/lon + SHA-256 hash — perfect for a "Violations log" |
| `threat_tiers` | 2.8M | WTI threat scores per detection w/ tier 1–5 — perfect for a "Threat index" summary |
| `ml_anomaly_detections` | 432K | ML-classified anomalies w/ model name/version, confidence, validation status — perfect for an "ML detections" page |
| `aircraft_master_profile` | 63K | Per-aircraft rollups (avg/max altitude, threat score, spoofing events) — enriches existing `/findings` |
| `was_threat_assessments` | 43K | Narrative threat assessments w/ Bradford-Hill + legal exposure — feeds `/legal` |

Tables intentionally excluded: anything with biometric/personal data (`legal_ada_violations_proper`, `exhibit_d_biometric_harm`, `biometric_correlations_*`) — these contain individual harm records and don't belong on a public site even with hashing. They stay internal.

## Part 3 — New Public Routes

Add 4 new routes, each backed by a new `createServerFn` in `src/lib/watchtower.functions.ts` (extended to also query the evidence DB via the existing `evidence()` client):

1. **`/operators`** — Canonical Operators Directory
   - Server fn: `getCanonicalOperators` → top 50 by `occurrences_total`, columns: registration, operator_resolved, aircraft_model, flags (shell/KCSO/military), confidence, last_seen.
   - JSON-LD: `ItemList` of operators.

2. **`/violations`** — Sentinel Violations Log
   - Server fn: `getSentinelViolations` → latest 100, columns: timestamp, registration, violation_type, severity, altitude, lat/lon, evidence_hash (truncated).
   - JSON-LD: `Dataset` schema (this IS a public dataset).

3. **`/threat-index`** — WTI Threat Tier Summary
   - Server fn: `getThreatTierSummary` → aggregate counts by `tier_level` + `threat_level`, plus top 25 highest WTI-score detections joined to aircraft.
   - JSON-LD: `Dataset` + summary `Table`.

4. **`/ml-detections`** — ML Anomaly Detections
   - Server fn: `getMlAnomalies` → latest 50, columns: detected_at, registration, anomaly_type, confidence_level, model_name/version, validated.
   - JSON-LD: `Dataset` schema.

## Part 4 — Wire-up

- Add the 4 new routes to `NAV` in `src/components/site-header.tsx` (nav is already responsive/overflow-scroll, so 4 more items fit). Add to mobile nav too.
- Add to `src/routes/sitemap[.]xml.ts` so they get crawled.
- Add to `public/llms.txt` summary.
- Update `/findings` to include a small "See also" section linking to all 4 new pages (improves internal linking — direct SEO benefit).
- Each new route gets full `head()` meta: title, description, og:title, og:description, og:url, canonical (leaf only), BreadcrumbList JSON-LD, plus Dataset/ItemList JSON-LD as listed above.
- Error/notFound boundaries on each (static user-friendly message — matches the security pattern already enforced).

## Files (technical)

**Created:**
- `src/components/site-breadcrumbs.tsx`
- `src/lib/breadcrumbs.ts`
- `src/routes/operators.tsx`
- `src/routes/violations.tsx`
- `src/routes/threat-index.tsx`
- `src/routes/ml-detections.tsx`

**Edited:**
- `src/lib/watchtower.functions.ts` (+4 server fns, querying evidence DB)
- `src/components/site-header.tsx` (NAV entries)
- `src/routes/sitemap[.]xml.ts` (+4 URLs)
- `src/routes/findings.tsx` (See-also block)
- `public/llms.txt`
- All existing routes (`live`, `findings`, `reports`, `rules`, `methodology`, `legal`, `act`, `about`) — add breadcrumb component + BreadcrumbList JSON-LD in `head().scripts`

## Out of scope (flagged for future)

- Biometric/ADA harm tables — kept internal due to personal-data sensitivity.
- The 200+ legacy/forensic/backup schemas (`forensic_oct2025`, `archive_legacy`, etc.) — appear to be historical snapshots; not public-facing.
- Per-operator detail pages (e.g. `/operators/$registration`) — possible follow-up if you want SEO long-tail pages; not in this pass.

Approve and I'll build it.
