# Plan — Fix Preview, Harden Military, Ship Waves 1 + 3, Scaffold Visual Library

Four parallel tracks. Each ends in something you can see in preview. The Visual Library is the biggest lift and gets staged so you see progress before all 80,000 screenshots have been processed.

---

## Track A — Fix the "Preview has not been built yet" error

The dev server is healthy, so the error is in the production/SSR build, not in local Vite. The most likely cause: the Military and Foreign route loaders call Neon at prerender time, and any DB miss (cold connection, missing column, query timeout) crashes the SSR build and the preview never finishes.

Steps:
1. Run a production build locally and capture the failing route + stack trace from the daemon log.
2. Wrap `getMilitaryAircraft`, `getDeadMansCurveStats`, `getForeignAircraft`, and any other loader-reachable server fn in a typed try/catch that returns a safe empty shape (`{ totalAircraft: 0, totalDetections: 0, byBranch: [], aircraft: [] }`) instead of throwing during SSR.
3. Confirm the route's `errorComponent` is still there as a second safety net, and verify the `__root.tsx` shell still renders `<Outlet />`.
4. Re-run build, then preview. Done when both `/` and `/military` prerender cleanly.

---

## Track B — Military page polish (in the same pass as Track A)

1. **Empty-state copy.** When no rows come back, replace the bare "No military aircraft in the current window" with a real explainer card: what the query asked, why nothing matched, and a "View raw data" link.
2. **Dead Man's Curve tiles** at the top of `/military`, scoped to military-flagged airframes (re-use the existing component, add a `branch` filter).
3. **Posse Comitatus pull-quote** styled like the Foreign page header so the legal frame leads.
4. **Tail-search deep links.** Each row's registration becomes a link to `/tail-search?tail=<reg>` so you can pivot from the branch table to the full forensic profile.

---

## Track C — Wave 1: Homepage + Live Feed (story-driven rewrite)

Two-layer cake: stories on top, raw data underneath. No data model changes.

### Homepage (`src/routes/index.tsx`)
- New H1: **"The sky over Kern County is not normal."**
- New lede paragraph: the "We watched the sky for 624 hours…" block, pulled live from the existing observation-window stats so the number stays honest.
- **The Blind Machine** hero section — single column, large body type, no chart. Ends with a "Read the methodology" link.
- **Three story cards** generated from the latest top anomalies (one Dead Man's Curve, one "going dark," one "ghost"), each with timestamp · tail · altitude · one-sentence translation · "Verify this →" link to raw detection row.
- Keep the four-card dataset row (Military, Foreign, Coordination, Tail Search) below the stories.
- Rewrites for "Your Rights" and "What Counts as Low?" using the plain-English language you drafted.

### Live Feed (`src/routes/live.tsx`)
- Above the table: top 5 latest detections rendered as story cards (same component as the homepage).
- Each card auto-refreshes with the table.
- Add a "Show raw feed" toggle so the table can collapse for first-time visitors but stays one click away for researchers.
- No change to the underlying query or refresh interval.

### Shared component
- New `src/components/story-card.tsx` — takes a detection row + an optional override headline, formats the human story, and renders the "Verify" link. Re-used by homepage, Live Feed, Findings, and Violations later.

---

## Track D — Wave 3: Operators Hall of Shame + Coordination + Ghost framing

### `/operators`
- Rename header to **"The Hall of Shame"** and add subhead: "These are the 200 most-detected operators in the window. Sorted by detections, flagged by behavior."
- Rich flag badge component (`<OperatorFlag />`) with six pills: `SHELL`, `LAW_ENFORCEMENT`, `MILITARY`, `MEDICAL_COVER`, `DARK`, `MASKED`. Colors mapped to existing semantic tokens. Driven by existing `operator_flags` columns (no new server work).
- Add CSV export parity with `/military`.

### `/coordination`
- Plain-English summary box above the graph: "We found N private companies flying government patrol patterns. They aren't N independent businesses — they trace back to M LLC families. The picture below proves they're working together." Numbers come from existing aggregation; no new query.

### `/foreign` and `/military`
- Add a **Ghost** callout component above the country/branch breakdown: "N aircraft have no country we can identify. Many are U.S. military operating under non-public callsigns. We don't know who they are. The U.S. government does. They aren't telling."

---

## Track E — Visual Library scaffold (Google Drive cron mirror + EXIF strip + OCR)

This is the biggest piece. Stage it so you see something live within the first ship, even before 80,000 images are imported.

### E1. Link the Google Drive connector
- Link the existing **My Google Drive** connection to the project so server code can call the connector gateway.

### E2. Database (one migration)
- `flight_screenshots` table:
  - `id uuid pk`
  - `drive_file_id text unique` (idempotency key)
  - `original_name text`
  - `captured_at timestamptz` (from OCR; null until OCR runs)
  - `tail_number text` (from OCR; null until OCR runs)
  - `altitude_ft int` (from OCR; null until OCR runs)
  - `sha256_pixel_hash text` (hash of pixel data, post-strip)
  - `bytes int`, `width int`, `height int`, `mime text`
  - `storage_path text` (path in Lovable Cloud Storage to the stripped image)
  - `category text` ("smoking_gun" | "night_shift" | "low_flyer" | "ghost" | null)
  - `detection_id uuid null` (correlated row in `detections`, set after OCR + join)
  - `imported_at timestamptz default now()`
  - `processing_state text default 'pending'` ('pending' | 'stripped' | 'ocr_done' | 'correlated' | 'failed')
- GRANTs for `authenticated`, `service_role`, narrow `anon` SELECT of stripped/correlated rows only.
- Cloud Storage bucket `flight-screenshots` (private bucket; public reads via signed URLs only).

### E3. Cron-pulled mirror (server route)
- `src/routes/api/public/screenshot-sync.ts` — POST endpoint guarded by a shared secret.
  - Lists files in the configured Drive folder via the Google Drive gateway.
  - Skips any `drive_file_id` already present.
  - Streams new files, strips EXIF (sharp is incompatible with the Worker runtime — use a pure-JS EXIF stripper like `piexifjs` for JPEG or rebuild PNG chunks dropping `tEXt`/`iTXt`/`zTXt`/`eXIf`).
  - Computes SHA-256 over the stripped pixel bytes.
  - Uploads stripped bytes to Cloud Storage; inserts `flight_screenshots` row at `stripped`.
- Scheduled via pg_cron hitting the stable preview/published URL every 10 minutes.

### E4. OCR correlation worker (separate server route, same auth)
- `src/routes/api/public/screenshot-ocr.ts` — pulls up to N rows with `processing_state='stripped'`, runs OCR via Lovable AI Gateway (vision model), parses tail/altitude/UTC timestamp out of the FR24 chrome.
- Joins to `detections` within ±60 s of the parsed timestamp and matching `icao_hex`/registration; sets `detection_id` and bumps state to `correlated`.
- Failed rows go to `failed` with an error column for the curator UI.

### E5. Public galleries (`src/routes/visuals/*`)
- `/visuals` index with five tiles: Smoking Guns, Night Shift, Low Flyers, Ghosts, Full Archive.
- Each list page reads from `flight_screenshots` with filters (category or computed filter on the correlated `detections` row).
- Image cards show: signed Cloud URL, human headline, one-sentence story, SHA-256 hash (mono), "Verify this →" link to the detection profile.
- Full archive page has search by tail, date range, altitude range, anomaly flag, and "has biometric correlation" toggle (placeholder until biometric table lands).
- Homepage gets a "80,000 receipts" callout linking to `/visuals`.

### E6. Curator surface (`/_authenticated/curator`)
- Authenticated-only page (role-gated via existing `has_role`).
- Inbox of `processing_state in ('ocr_done','failed')` rows: review OCR result, override tail/timestamp, assign category, publish.
- No public-facing exposure until a row is `correlated` AND has a category set.

### Ship order inside Track E
1. E1 + E2 (connector + schema). Nothing visible yet.
2. E3 (cron mirror, no OCR). `/visuals` shows stripped images by import time.
3. E4 (OCR + correlation). Cards get tails + altitudes + verify links.
4. E5 (curated galleries) and E6 (curator inbox) ship together.

---

## What I'll need from you before Track E starts

- The exact Google Drive folder ID for the FR24 screenshots.
- Confirmation I should link the existing **My Google Drive** connection to this project.
- A shared secret name I can add (e.g. `SCREENSHOT_SYNC_SECRET`) for the sync + OCR endpoints.

## Technical notes (skip if you want)

- All new server fns must follow the modern stack rules: `*.functions.ts` for app-internal RPCs, `src/routes/api/public/*` for the Drive webhook/cron callers, request-time `process.env.*`, no `supabaseAdmin` at module scope.
- EXIF stripping must happen in the Worker — `sharp` and `canvas` are banned. JPEG via `piexifjs`, PNG via manual chunk filter, HEIC rejected with a clear error.
- OCR uses Lovable AI Gateway (Gemini vision) — no Tesseract dependency.
- Story cards reuse the existing `detections` query; no new tables for Waves 1 and 3.

---

**Ship sequence I'd recommend:** Track A + B + C this turn (preview is fixable, Military hardening is small, Wave 1 is the highest-impact public change). Track D as the immediate follow-up. Track E as a dedicated build once you confirm the Drive folder ID and secret.
