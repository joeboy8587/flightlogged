# Site + data audit: what I found, and what to strengthen

I ran a read-only audit of every page and the live Quiet Math database this morning. The site builds clean and no page is erroring. But there are six real discrepancies, and two of them could be used to attack our credibility. Fixing them is mostly honesty plumbing, not new features.

## Priority zero — Live Feed legal and evidentiary corrections

These corrections will be completed before the broader audit work. The live checks confirm all three reported failures and identify their causes.

### 1. Correct the altitude citation

The live rule table contains both `14 CFR 137.51` (incorrect for this purpose) and `14 CFR 91.119`. The page matcher excludes §137.53 but fails to exclude §137.51, then selects it because its score is higher than §91.119. The matcher will:

- exclude all Part 137 rules from general minimum-altitude citation;
- use §91.119 for ordinary aircraft only where the measured facts support that comparison;
- preserve the existing agricultural-operator exception;
- show Part 137 on `/rules` as an agricultural-operations rule that must not tag the general feed;
- audit every other feed query that maps altitude to a citation, not only the five cards.

### 2. Remove the synthetic funnel until real stage data arrives

The scan-artifact table is empty. The page currently fabricates a fallback funnel by combining three unrelated 24-hour queries, then copies the same anomaly count into Kinematic hits, Handoffs, and Flagged. That creates the impossible 4,244 → 11,880 sequence. The fallback will be removed. Until the scanner submits a real artifact, the page will show one honest state: **Scan-stage artifact not received**, alongside the independently measured 24-hour detection total. A staged funnel returns only when a valid artifact satisfies `detections ≥ candidates ≥ kinematic hits ≥ handoffs ≥ flagged`; invalid artifacts display a data-integrity warning rather than impossible numbers.

### 3. Repair FAA owner resolution

The latest-events query currently selects only six detection fields and never joins the FAA registry or aircraft profile, even though the mapper later expects owner fields. That is why known aircraft become “no public owner.” The query will resolve owners by case-normalised ICAO first and registration second, deduplicate upper/lower-case profile rows, and return the registry owner. Verified live owners include:

- N71FF — FF22 LLC
- N743AM — TEXTRON FINANCIAL CORP
- N912PF — ANYWHERE AIRPLANE LLC
- N514JD — CITY OF FRESNO POLICE DEPARTMENT
- N21714 — AERO EQUITIES LLC

If a tail remains unresolved after both joins, the card will identify it by tail only. “No public owner on file” will be reserved for a confirmed no-match result, not an empty joined field.

### 4. Resolve KCSO manual section consistency

The live baseline table currently contains both §B-401 and §B-301 at a 2,000-foot night floor, with §B-401 chosen only because it ties at the highest score and appears first. The website will not silently choose between conflicting internal citations. It will use the consistently documented §B-301 baseline and display a correction note on `/rules`; §B-401 remains visible as a conflicting source record pending source-document reconciliation.

### 5. Make scope and denominator explicit

- Label the 2,852.3-hour figure **lifetime AOI observation window**.
- Keep Kern’s table labeled **last 24 hours**.
- Rewrite the anomaly percentage as a complete fraction: anomaly events divided by all monitored detections in the same named window, with numerator and denominator visible.
- Do not compare percentages built from different time windows.

### 6. Make “latest five” chronologically honest

The query is correctly sorted by newest timestamp, but multiple receivers can record several aircraft in the same second. The section will say **five latest distinct aircraft observations**, preserve descending timestamps, and show sub-minute precision or relative ordering so same-second records do not appear duplicated. If the intended editorial view is five separate moments, it will select one record per timestamp bucket rather than claiming they are simply the latest five rows.

### Protected elements

The KCSO Active Now banner, Your Rights panel, MACHINE / EDITORIAL split, and sensor-coverage disclosure remain unchanged.

## What is genuinely healthy

- Raw detections are seconds fresh (1,905 in the last hour).
- The ML ensemble scores are 18 minutes old.
- Hourly county statistics are current to the 08:00 hour.
- The cryptographic seal chain is current — block 5,096, sealed 5 minutes ago.

## The discrepancies

**1. Four feeds stopped writing, and the site doesn't say so.**

| Feed | Last wrote | Age |
|---|---|---|
| Violations ledger (12,311 rows) | Aug 12 | 32 days |
| Daily narratives | Jul 10 | 2 months |
| Photo/visual evidence (360 items) | Jun 20 | ~3 months |
| Incursion events (1,940 rows) | Jun 12 | 3 months |

Anything reading these presents month-old numbers as if they were today's. That is the single biggest credibility exposure on the site.

**2. Every alert is "critical."** All 59,982 alerts in the alert table carry the same CRITICAL label. If everything is critical, nothing is — and a hostile reader will say so. The site should not print the word "critical" from that column until the machine tiers it.

**3. Duplicate aircraft identities.** 20,982 of 68,254 aircraft records are upper/lower-case duplicates of the same aircraft hex. That means fleet counts, dossier totals, and the federal-fronts page can double-count the same plane, and two dossier pages can exist for one aircraft.

**4. The Master Report numbers are frozen.** They were correct when queried, but detections grow every hour, so those figures now understate reality and will keep drifting. They need a visible "figures as of" timestamp, and a documented refresh step.

**5. The scan pipeline has never delivered anything.** The scan-artifact table is empty, so the ML funnel silently falls back to raw detections instead of stating that the ingest has not run.

**6. Search-engine coverage is behind.** The sitemap still lists the older pages only. Master Report, Federal Fleet, Targeting Equation, Accountability, Aircraft dossiers, County Pulse, Attestation, Surveillance Grid, Verify, Blog, Cases, Podcasts and Mosaic are all missing from it.

## What I propose to change

### A. A freshness stamp on every data block (the core fix)
One shared "last updated" component. Every panel that reads a database feed gets a small stamp: fresh (green), delayed, or an explicit **STALE — last updated Aug 12** banner in the alert colour when a feed is more than 48 hours behind its own cadence. Stale panels stay visible with the honest label rather than being quietly hidden — that is the witness posture we've committed to.

### B. Retire or label the four dead feeds
The violations ledger, narratives, photo evidence and incursion pages each get a dated archive header ("archive — collection paused Aug 12") so nothing reads as current. No data is deleted.

### C. Stop printing "critical" from an untiered column
Alert rows show altitude, distance and county — the facts — with the severity word suppressed and a one-line note that severity tiering is pending on the machine side. Kern banners keep triggering on the measured altitude rule, which is real.

### D. Collapse duplicate aircraft identities
All aircraft lookups, fleet lists, dossiers and the federal page normalise the aircraft hex to one case before counting, so one plane is one row and one page. This will slightly reduce some headline aircraft counts — that reduction is the correction.

### E. Master Report "as of" stamp
Add the query date next to the figure block, plus a short note that later figures will be higher, and re-verify the seven-county numbers now so the page opens with today's values.

### F. Honest funnel + sitemap
The funnel states plainly when no scan artifact has been ingested. The sitemap is rebuilt to include every public page, with the dossier and county pages generated from the live list.

## What does not change

- No machine thresholds, model logic, or scores.
- No database writes, no schema changes — read-only queries only.
- No claim is removed; claims are dated and sourced.

## Technical notes

- New `src/components/freshness-stamp.tsx` plus per-feed watermark queries (`MAX(timestamp)` on `sentinel_violations.detection_timestamp`, `merkle_chain.timestamp`, `hourly_stats.hour_start`, `aoi_alerts.captured_at`, `daily_narratives.narrative_date`, `visual_evidence.ingested_at`, `incursion_events.event_timestamp`) folded into one cached server function.
- Hex normalisation applied in `src/lib/aircraft.server.ts`, `src/lib/federal.server.ts`, and `src/lib/watchtower.functions.ts` — group by `UPPER(icao_hex)` and dedupe before aggregation.
- `src/routes/sitemap[.]xml.ts` gains the missing static routes; dynamic aircraft/county entries come from the existing cached fleet and county lists.
- All existing caches (60s snapshot, 5-min dossier, 10-min federal) are preserved; no new uncached query touches raw `detections`.

## Suggested order

1. Freshness stamps + stale labels (biggest credibility win).
2. Duplicate aircraft collapse (fixes counts everywhere at once).
3. Severity wording + funnel honesty.
4. Master Report re-verification and "as of" stamp.
5. Sitemap rebuild.
