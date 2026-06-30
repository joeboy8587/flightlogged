## Problem

Two pages display contradictory totals because they count from different sources:

- **Home / About / Live** read `SELECT COUNT(*) FROM detections` (via `getSnapshot`) → **3,505,773** detections.
- **Operators** sums `aircraft_profiles.total_detections` across the top 500 rows → **742,003,051**, which is ~200× the real detection count.

`aircraft_profiles.total_detections` is a per-aircraft ML rollup that double-counts (it accumulates across feeds / windows / re-ingest passes), so summing it as a headline "Detections" number is wrong and undermines the page's whole "verifiable, factual" promise. The detections table is the single source of truth — every other number must reconcile to it.

The user also pasted a truncated "Court-ready detections 3,505,773 vs " string; that's the home page right-rail stat block stacking awkwardly on a 469px viewport (the label "vs" is actually the next nav item bleeding through). The stat card needs a mobile fix.

## Fix

### 1. Operators page — reconcile to the snapshot (single source of truth)

In `src/routes/operators.tsx`:

- Add `getSnapshot` to the loader alongside `getCanonicalOperators` so the page has the canonical `totalDetections` (3.5M).
- Replace the hero headline `{counts.totalDetections.toLocaleString()} Detections.` with the snapshot total, and clarify the framing:

  > "3,505,773 detections across 500 resolved operators. 386 shell companies. 13 law enforcement. 13 military."

- In the "INDICTMENT SUMMARY" band, drop the `{counts.totalDetections}` sum and replace with: "Together they appear across the **{snapshot.totalDetections}** detections in this window." (no more 742M.)
- Rename the per-row table column **Detections** → **Profile detections** and add a one-line footnote under the table:

  > "Profile detections are the ML's per-aircraft lifetime counter from `aircraft_profiles` — they accumulate across re-ingests and can exceed the snapshot's distinct detection count. The canonical detection total is `SELECT COUNT(*) FROM detections` shown in the page hero."

- Keep sorting by `occurrences` (still the right ordering signal) — only the headline math changes.

### 2. Convergence card — same reconciliation pattern

`src/components/convergence-event-card.tsx` is fine; no change needed (it counts aircraft, not detections).

### 3. Home page right-rail stat card — mobile clipping

In `src/routes/index.tsx` the right-rail `stats` block sits at 469px CSS width and the `font-mono text-2xl` value gets visually adjacent to the nav. Add `break-words tabular-nums text-right` to the value span and wrap the row in `flex-wrap gap-x-3` so the number wraps under the label on narrow screens instead of bleeding into the nav.

### 4. Methodology / About already consume `getSnapshot`

No change — they're already aligned with the 3.5M canonical number.

## Files touched

- `src/routes/operators.tsx` — loader, hero copy, indictment band, table column label + footnote.
- `src/routes/index.tsx` — right-rail stat row mobile wrap fix.

## Out of scope

- The ML's `aircraft_profiles.total_detections` column itself is untouched (per the standing rule: the ML core stays pure). We only stop summing it as a public headline.
- No DB writes, no migrations, no changes to `watchtower.functions.ts` logic — only the consuming UI is corrected.
