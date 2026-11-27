# Roadmap

## Dedicated 2D airspace tracker
- [ ] Build `/tracker` with a responsive live aircraft map, tail/hex search, telemetry, and FAA registry identity.
- [ ] Add bounded historical detection replay with explicit UTC windows, timeline controls, and sampled-result disclosure.
- [ ] Add navigation and sitemap entries; verify live selection, replay, mobile layout, exports/links, and focused tests.

## N912KC Tail Search correction
- [x] Reconcile FAA identity, duplicate profiles, and detection count; verified N912KC sheriff identity, 414,340 maintained detections versus 13,539 retained observations, N913KC regression, and 1,000-row CSV without changing database records.
- [ ] Sweep aircraft identity, count, and navigation paths across public screens and exports; apply FAA-first matching without modifying stored evidence or ML outputs.

## Current screen recovery
- [x] Restore Tail Search and CSV export using the linked My Neon connection; N913KC returns records and a 1,000-row CSV; homepage counts read back successfully.
- [x] Replace incompatible SSR query adapter; verify homepage and Live Feed render at desktop and the user's screen size without page errors.
- [x] Replace legacy database access with the linked Neon connection; real homepage counts are restored.

## Current approved database integrations
- [x] Explain missing scan-stage artifact notice: observed detections are independent of authenticated stage summaries.
- [x] Add user-identified N97E to KCSO aircraft matching and test policy eligibility.
- [x] Connect Cases to aggregate case_file inventory; private case content remains withheld.
- [x] Show machine mission hypotheses and broadcast gaps on Live Feed and aircraft dossiers.
- [x] Make active violation_classifications the primary Violations source.
- [x] Verify real records and exports without changing ML scores or database rows.
- [ ] Publish navigable case contents — blocked by absent per-record public-release approval and personal-data review.

- [x] Correct live low-altitude citations to 14 CFR § 91.119 and reconcile KCSO §B-301/§B-401.
- [x] Replace the synthetic scan funnel with an honest missing/invalid artifact state.
- [x] Join FAA owners into latest-event cards and reserve unidentified language for confirmed no-match aircraft.
- [x] Clarify lifetime versus 24-hour windows, anomaly denominator, and latest-event ordering.
- [ ] Add freshness labels and archive notices for stale feeds.
- [ ] Normalize aircraft hex identities across fleet, dossiers, federal listings, and counts.
- [ ] Suppress unsupported CRITICAL severity wording while preserving measured Kern triggers.
- [ ] Add Master Report verification date and refresh its county figures.
- [ ] Rebuild the sitemap with current public pages.
- [ ] Verify the corrected live page, rules page, and build status.

- [ ] Correct site-wide language: ML generates findings, labels, and threat tags from multiple factors over time; humans advocate from those outputs.
