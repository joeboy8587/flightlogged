# From data site to advocacy engine

I ran a live audit of the quiet-math database against every page on the site. The short version: the machine is producing far more usable evidence than the website is showing, and almost none of the accountability material is being used at all. Below is what's missing, then how to turn it into advocacy.

## What the audit found

The site currently reads about 15 tables. The database now holds 100+. These are **live, updating today**, and invisible to the public:

| Data the machine is producing | Rows | Last updated | On the site? |
|---|---|---|---|
| `sentinel_violations` — typed, severity-rated, hashed violations by county | 7,342 | today | No |
| `aoi_alerts` — critical alerts inside your monitored counties | 40,479 | today | No |
| `hourly_stats` — hourly detections, sub-500ft counts, altitude percentiles per county | 21,677 | today | No |
| `county_baselines` — the learned "normal" per county, per hour | 11,466 | today | No |
| `ensemble_anomaly_scores` — 4 independent models scoring each detection, with disagreement + human-validation fields | 1.2M | today | No |
| `merkle_chain` — the cryptographic chain-of-custody blocks | 3,844 | today | No |
| `compliance_items` / `reform_areas` — consent-decree reform tracking, 9 areas, 30 requirements, year-by-year status | 39 | static | No |

Also present but **stale** (pipeline stopped writing): `daily_narratives` (Jul 10), `weekly_investigator_report` (Jul 13), `visual_evidence` (Jun 20), `incursion_events` (Jun 12). These need a decision: revive on the ML box, or hide from the site so nothing public looks abandoned.

One data-quality flag: every one of the 40,479 `aoi_alerts` rows is labeled `CRITICAL`. If everything is critical, nothing is. That column needs tiering on the ML side before it goes public.

## What to build — advocacy layer

### 1. Accountability Scoreboard (new page, `/accountability`)
The single most advocacy-ready dataset you have is sitting unused: 9 reform areas, 30 consent-decree requirements, each with 2023 / 2024 / 2025 status. Render it as a public report card — compliant vs partial, trend arrows per year, and where our own flight data intersects a reform area (e.g. aerial surveillance over the neighborhoods named in the stops/searches paragraphs). This is the page a journalist screenshots.

### 2. "Your County" page (`/county/$name`)
Right now the public sees a statewide firehose. Advocacy needs local. One page per monitored county pulling `hourly_stats` + `county_baselines`:
- How many aircraft flew over your county last night, and how low
- How that compares to the learned normal for that hour
- The worst three events, in plain English, each with its hash
- One action button: report what you saw / join the alert list / contact your supervisor

This turns a database into a neighbor-level argument.

### 3. Violations ledger, upgraded
`/violations` should read `sentinel_violations` — typed violations with severity and county, each already carrying a SHA-256. Filterable by county and severity, with a per-row "what rule this implicates and why" plain-English line, and CSV export for attorneys and reporters.

### 4. Chain of Custody page (`/attestation` upgrade)
Show the live `merkle_chain`: latest block number, block hash, previous hash, row counts, and a "verify this yourself" walkthrough. This is the page that survives cross-examination and it currently isn't public.

### 5. Honesty panel from the ensemble scores
`ensemble_anomaly_scores` records four models per detection plus their disagreement, and has fields for human validation and false-positive reason. Publish, on `/methodology`: how often the models agree, how many flagged events humans have reviewed, and how many we marked false positive. Publishing your own error rate is the strongest credibility move available to you.

### 6. Action attached to every finding
Today a finding ends at the receipt. Each finding card gets a footer with one concrete next step: file this with the FAA, add it to the FOIA queue, send to the county board, share the receipt card. Advocacy is the data plus the ask.

### 7. Advocacy front door
Homepage gets a third lane beside the alert and the counters: **"What we're asking for."** Three demands, each linked to the evidence that supports it, each with a single action. The technical pages then serve that ask instead of standing alone.

## What does not change
- No ML thresholds, scores, or model logic.
- No schema changes, no writes to the database — read-only queries only.
- Machine output stays separated from editorial voice, with the existing MACHINE / EDITORIAL labeling.
- Every new claim traces to a row and a hash.

## Technical notes
- New read-only server functions in `src/lib/` for: `sentinel_violations`, `hourly_stats` + `county_baselines`, `merkle_chain`, `compliance_items` + `reform_areas`, and ensemble agreement/validation aggregates. All follow the existing cached-snapshot pattern to protect page load.
- New routes: `/accountability`, `/county/$name`; upgrades to `/violations`, `/attestation`, `/methodology`, `/findings`, `/`.
- Stale tables get either a visible "last updated" stamp or are omitted; no page shows silently dead data.
- Each new query gets an index check first — several of these tables are large enough to need one.

## Suggested order
1. Accountability Scoreboard (highest advocacy value, small data, fast).
2. Violations ledger on `sentinel_violations` + CSV export.
3. County pages with baseline comparison.
4. Chain of Custody page.
5. Honesty panel + action footers + homepage "What we're asking for."
