# Give the Witness a Voice

Right now the site speaks like a government report — z-scores, hex codes, "anomaly clusters." The machine is the evidence. The site should be the testimony. This plan keeps every ML output, hash, and score untouched, and adds a **translation layer** on top so the public reads what the math already proved.

Nothing in the database, ML pipeline, or scoring logic changes. All work is frontend + copy.

---

## 1. A "Plain English" verdict on every finding

Every card that currently leads with a score gets a one-sentence human verdict above it, generated from the row's own fields — no editorializing, no new claims.

Pattern:
```text
"A Delaware shell company with no employees spent 12 straight hours
 over homes in Bakersfield with its altitude suppressed."
 [SCORE 0.94] [SHA-256 a1b2…] [Verify →]
```

The score, hash, and receipts stay visible right under it. The verdict is derived deterministically from: operator name, registration state, altitude, duration, county, squawk/altitude-suppression flag. If a field is missing, the sentence omits that clause — we never invent.

Applied to: `findings.tsx`, `ml-detections.tsx`, `violations.tsx`, `threat-index.tsx`, `operators.tsx`, homepage story strip.

## 2. Homepage rewrite — lead with testimony, not dashboards

Replace the current stat-first hero with a rotating **"What the sky did last night"** panel: 3 real events from the last 24h rendered as StoryCards using the plain-English translator, each with its receipt link. Stats move below the fold.

New homepage sections, in order:
1. Hero: one headline event, plain English, with SHA + Verify.
2. "Three things the machine caught while you slept" — 3 StoryCards.
3. "How we know" — 3 tiles: *Public broadcast · Cryptographic chain · Open model card*.
4. Existing counters and links.

## 3. Kill the jargon in labels

Sitewide find/replace on user-facing strings (no data, no code logic):
- "anomaly cluster" → "repeated pattern"
- "data integrity event" → "altitude blackout"
- "potential anomaly requiring further study" → "flagged — awaiting human review"
- "persistent low-altitude orbiting" → "circled low over homes"
- "signal degradation" → "the aircraft stopped broadcasting"
- "unidentified registrant" → "no public owner on file"

Technical terms stay in tooltips and the Methodology page — they don't lead.

## 4. "Read this as a human" toggle on data tables

`/ml-detections`, `/violations`, `/threat-index`, `/operators` get a top-right toggle: **[ Technical | Plain English ]**. Default = Plain English. Technical view is the current table, unchanged. Plain view renders each row as a one-line sentence with the receipt chip. State persists in URL search param so links share the chosen view.

## 5. "The Question This Raises" block on every finding page

Below the receipts on each finding, a fixed block:

```text
THE MACHINE LOGGED:   [exact technical description]
PUBLIC RECORDS SHOW:  [operator, state of registration, FAA record link]
THE QUESTION:         [templated question — never an accusation]
```

Example question templates (chosen by finding type, not written per-row):
- Altitude suppression → *"Why did this aircraft stop broadcasting its altitude for 12 hours over a residential zip code?"*
- Shell-company operator → *"Who is actually paying for these flights?"*
- Repeat low pass → *"What agency authorized 14 sub-500ft passes over the same block?"*

The reader draws the conclusion. We only ask the question the data raises.

## 6. Homepage banner: "We are the witness"

A permanent 2-line manifesto strip under the header, small but always visible:

> **This site translates. It does not editorialize.**
> Every claim links to a hash, a public record, and the raw broadcast.

## 7. Share-ready testimony cards

Every StoryCard already has a Share row. Extend it so the shared image/text is the **plain-English sentence + the SHA short-hash + the Verify URL** — so a screenshot posted to social media carries the receipt on its face.

---

## What does NOT change

- No ML thresholds, model versions, or scores.
- No database writes, no new tables, no schema changes.
- No new claims beyond what a row's own fields support.
- Methodology, Attestation, and Model Card pages stay technical — they are the defense layer.
- `/live` evidence feed stays court-ready. Plain-English is additive, toggleable.

## Technical notes (for the builder, not the reader)

- New pure helper `src/lib/translate.ts` exporting `verdictFor(row)`, `questionFor(row)`, `humanLabel(technicalTerm)`. Pure functions, unit-testable, no side effects.
- `StoryCard` gains an optional `verdict` prop; when absent it calls `verdictFor(row)`.
- Table pages accept `?view=plain|technical` via existing zod search validators.
- Copy dictionary lives in `src/lib/translate.ts` so future edits are one file.
- No new dependencies. No route additions. No server function changes.

---

## Rollout order

1. `translate.ts` + verdict on `StoryCard` (immediate visible lift on homepage + `/live`).
2. Jargon dictionary swap across labels.
3. Plain/Technical toggle on the four data tables.
4. "The Question This Raises" block on finding detail rendering.
5. Homepage recomposition.
6. Share-card upgrade.

Each step is independently shippable and reversible.
