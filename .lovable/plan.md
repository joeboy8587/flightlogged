# Site + data audit: what I found, and what to strengthen

I ran a read-only audit of every page and the live Quiet Math database this morning. The site builds clean and no page is erroring. But there are six real discrepancies, and two of them could be used to attack our credibility. Fixing them is mostly honesty plumbing, not new features.

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
