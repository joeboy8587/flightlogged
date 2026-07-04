# Plan — Fix hydration + ship ML-transparency upgrades

## Part 1 — Fix the runtime hydration error on `/live` (and site-wide)

**Symptom:** React reports server/client HTML mismatch. The diff shows identical DOM except `data-tsd-source="/src/components/site-header.tsx:52:11"` (client) vs `:52:13` (server) on every nav link. That's a source-map/dev-instrumentation artifact — the header's `NavLink` component is rendering on two different code paths between SSR and client.

**Root cause:** `SiteHeader` likely uses `NavLink`/`Link` inside a `.map()` where the JSX line position drifts between build passes, or the header has a `typeof window !== "undefined"` branch (mobile menu, mascot mount) that changes output before hydration.

**Fix:**
1. Open `src/components/site-header.tsx`, find any `typeof window`, `useState(false)` gated by client-only, `Date.now()`, or locale-formatted output. Gate any such branch behind a `useHydrated()` hook so SSR + first client render match, then flip after mount.
2. If the mascot added in the previous pass mounts inside the header with a client-only animation, wrap it in `<ClientOnly>` (render `null` on server + first paint).
3. Verify by loading `/live` and confirming console shows no hydration warning.

## Part 2 — ML transparency upgrades on the public site

All changes are **frontend + one new public read endpoint**. Nothing touches the ML box; it just needs to POST scan artifacts to the new endpoint (docs section added).

### 2a. Reframe the "objectivity" stat on `/methodology`
Current line implies 86.1% flagged = loose threshold. Replace with a live counter component:

> **26,406** aircraft observed over **N months**. **22,744 (86.1%)** have crossed the 99th-percentile threshold *at least once*. **3,662 (13.9%)** never triggered.
> This is what a fixed statistical threshold looks like against a large population — not a curated watchlist.

### 2b. Candidate → Flagged funnel on `/methodology` and `/live`
Add a horizontal funnel bar:

```text
Detections this scan  →  Candidates  →  Kinematic hits  →  Handoffs  →  Flagged
       9                     33              0              0            0
```

Reads from the same snapshot function; shows that most scans flag *nothing*.

### 2c. Public scan artifact endpoint
New server route: `src/routes/api/public/scans/latest.ts` (GET, no auth) — returns the latest scan JSON from the `quiet-math` DB.

New table `public.scan_artifacts` (via migration) with columns:
`scan_id uuid PK, ts timestamptz, method_version text, candidates int, flagged int, kinematic_hits int, handoffs int, subject_absent bool, merkle_root text, payload jsonb`

Plus a POST endpoint at `/api/public/scans/ingest` that requires an HMAC signature (`SCAN_INGEST_SECRET` stored via Lovable Cloud secrets) so the ML box can push artifacts in.

### 2d. Merkle root page + hourly attestation
New route `/attestation`:
- Latest Merkle root (short + long form, copy button)
- Last 24 hourly roots in a table with SHA-256 links
- Instructions: "How to independently recompute this root from the public scan artifacts"

### 2e. False-positive review counter
New table `public.review_dismissals` (`id, anomaly_id, reviewer_note, dismissed_at, published bool`). Small strip on `/methodology`:

> **Human review overrides this month: 7 anomalies dismissed after review.**
> We publish our misses.

### 2f. Docs section on `/methodology`
Add "Publishing the machine's own logs" subsection linking to `/api/public/scans/latest.json`, `/attestation`, and the FP counter — closes the audit loop.

## Files touched

**Fixed:** `src/components/site-header.tsx` (hydration), `src/components/mascot.tsx` (client-only guard)

**New:**
- `src/hooks/use-hydrated.ts`
- `src/components/client-only.tsx`
- `src/components/ml-funnel.tsx`
- `src/components/objectivity-stat.tsx`
- `src/routes/api/public/scans/latest.ts`
- `src/routes/api/public/scans/ingest.ts`
- `src/routes/attestation.tsx`
- `src/lib/scans.functions.ts`
- migration: `scan_artifacts` + `review_dismissals` tables with grants + RLS (public SELECT on both; INSERT only via HMAC-verified ingest route using service role)

**Edited:** `src/routes/methodology.tsx` (funnel, reframed stat, FP counter, docs section), `src/routes/live.tsx` (funnel strip at top), `src/routes/__root.tsx` (nothing to change unless mascot lives there)

## Out of scope
- Changes to the ML system itself (that stays on your Ubuntu box)
- The Postgres `ON CONFLICT` / `IMPOSSIBLE_PHYSICS` fixes on the fortress box — those are your ML-side infra, not this app. I'll note in the docs that ingest expects deduped rows.

## Deliverable
Hydration error gone from console on `/live` and every other route. `/methodology` shows the reframed 86.1% stat + live funnel + FP counter + attestation link. `/attestation` publishes the Merkle root. `/api/public/scans/latest.json` returns the newest artifact for third-party auditors. ML box can start POSTing to `/api/public/scans/ingest` with the shared HMAC secret.