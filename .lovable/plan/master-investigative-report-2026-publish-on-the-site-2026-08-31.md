# Master Investigative Report (2026) — publish on the site

Turn the new master report into a permanent, verifiable public page rather than just another PDF link.

## What gets built

**1. New page: `/master-report`**
A single flagship page structured exactly like the report:
- Header block: filing entity, case reference (BCV-20-102971), record counts, "human-authored advocacy" banner (same firewall banner used on the blog).
- Executive summary with the four key findings, each written in plain language.
- Two-layer architecture panel (raw ground truth vs. ML/human interpretation).
- Regional multi-county table (7 counties: detections, sub-1,000 ft counts, average low altitude, role), with each county name linking to its existing County Pulse page.
- Cross-county fleet footprints (N916BQ, N189JC, N7670F), tails linking to their existing aircraft dossiers.
- Ghost aircraft / transponder-casing table, with unmasked registrations linking to dossiers.
- Biometric correlation section, written population-scale (no first-person narrative, no individual named).
- Four enforcement submission packages as action cards, with the existing FOIA/toolkit links.
- Verification footer: which numbers came from which database, plus links to Live Feed, Findings, Methodology, Attestation.

**2. Number verification before the page ships**
Every figure in the report gets checked against the live database first (statewide sub-1,000 ft count, Kern count and average altitude, per-county detection totals, per-tail ping counts, ghost hex detection counts). Each stat is rendered with a small badge:
- VERIFIED — matches the live query
- REPORTED — from the report's own database (Lucky Wildflower, not connected to this site) and labeled as such
Any figure that materially disagrees with the live data is flagged in a short "reconciliation notes" block instead of quietly changed. This keeps the anti-cherry-picking standard intact.

**3. Wiring it in**
- Add the report as the top entry on `/reports` (linking to the new page, plus the PDF once you drop it into the reports folder).
- Add "Master Report" to the site navigation.
- Homepage: one prominent card linking to it.
- Page metadata (title, description, social preview) for sharing with journalists and legislators.

## Framing discipline

- No first-person narrative and no naming of pilots, deputies, or private individuals. Registered corporate owners from public FAA/state filings are kept.
- Correlation language only for the biometric section ("coincided with", not "caused by").
- Attribution line on the page: all data drawn from public ADS-B broadcasts, public corporate filings, and published regulations, independently verifiable.

## Technical notes

- New route `src/routes/master-report.tsx`, static content plus a small read-only server function in `src/lib/advocacy.functions.ts` for the live verification numbers (cached, same pattern as existing advocacy queries).
- No schema changes, no writes, no ML changes.
- Reuses `BlogBanner`, `TailBadge`, county metadata in `src/lib/counties.ts`, and the existing table/card styling.

## Needs from you

- The PDF of this report (drop-in for `public/reports/`) if you want a downloadable version alongside the page.
