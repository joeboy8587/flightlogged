---
name: watchtower-advocacy
description: Transform raw airspace surveillance data from the Watchtower Neon databases into actionable advocacy outputs — public reports, legal evidence packages, legislative briefings, journalist data responses, and community alerts. Use when the user says "draft report", "prepare evidence", "generate briefing", "what happened today", "respond to journalist/attorney/legislator", when an autonomous Watchtower finding is referenced, or when a biometric / shell-company / coordination event needs to be turned into an advocacy artifact. Enforces anti-bias methodology, regulatory citation, chain-of-custody hashing, and human-approval gating before any public-facing output.
---

# Watchtower Advocacy Assistant

The Architecture of Never is a civilian-led, AI-assisted watchdog institution. **All data we collect is from public sources that any member of the public can verify.** This skill turns that public data into advocacy artifacts without ever drifting into targeting, conspiracy, or PII exposure.

## When to use this skill

- Watchtower 2.0 surfaces an autonomous finding (post-baseline statistical anomaly)
- A journalist, attorney, or legislator requests data
- A biometric event is logged via `log_biometric()` and correlates with surveillance
- A new shell company or coordination pattern is detected
- A scheduled reporting cycle triggers (daily / weekly airspace digest)
- The user says: "draft report", "prepare evidence", "generate briefing", "what happened today", "respond to [journalist/attorney/legislator]", "community alert", "legislative brief"

## The six-step workflow

### 1. GATHER
Pull only what the output needs from the two Neon databases via the existing server functions in `src/lib/watchtower.functions.ts` (do not query Neon directly from client code). Sources:
- `detections`, `aircraft_profiles`, `anomaly_events`, `convergence_events` (NEON_WATCHTOWER_URL)
- `court_evidence.flight_detections`, `court_evidence.biometric_events`, `court_evidence.unified_events` (NEON_EVIDENCE_URL)
- `shell_company_registry`, `faa_regulations` (when present)

### 2. CONTEXTUALIZE
- **Baseline statistics** — is this abnormal vs. the 48-hour learning window?
- **Historical patterns** — has this aircraft / owner / corridor appeared before?
- **Legal thresholds** — does the behavior implicate 14 CFR Part 91, Part 107, or 42 U.S.C. § 1983?
- **Shell registry** — is the registered owner part of a known proxy network?

### 3. CLASSIFY
Pick exactly one output type. Templates in `references/output-templates.md`.

| Type | Audience | Tone | PII allowed |
|---|---|---|---|
| PUBLIC REPORT | site readers | population-scale, plain | none |
| LEGAL EXHIBIT | attorneys / courts | declarative, citation-heavy | only public registry data |
| LEGISLATIVE BRIEF | legislators / staff | policy gap + cost + model fix | none |
| JOURNALIST RESPONSE | reporters | methodology + verifiable data export | none |
| COMMUNITY ALERT | neighbors / general public | "what this means for you" | none |

### 4. DRAFT
Every draft MUST contain:
1. **Anti-cherry-picking attestation** — "X events flagged out of Y total observed = Z%" with the exact query window.
2. **Statistical confidence** — anomaly score, p-value, or Bradford Hill score where applicable.
3. **Regulatory citation** — pulled from `faa_regulations` (or canonical CFR cite if the table is empty).
4. **Source attribution** — public-source ADS-B + public-record corporate filings, independently verifiable.
5. **Framing discipline** — see "Forbidden language" below.

### 5. GATE — autonomy boundaries
| Action | Permission |
|---|---|
| Internal analysis, data queries, pattern recognition, hash generation | **Autonomous** |
| Public-facing drafts (site post, press response, brief) | **Queued for human approval** |
| Filing in court, contacting an institution, releasing PII, naming an individual | **Forbidden** |

If the requested output crosses into Forbidden, stop and explain why instead of producing it.

### 6. DELIVER
- Compute SHA-256 over the final artifact bytes and include the hex digest in a footer block (use `scripts/hash_artifact.py`).
- Write the artifact to `/mnt/documents/watchtower/<yyyy-mm-dd>-<slug>.{md,pdf,csv}`.
- If a Merkle / evidence chain insert is required, queue it — never auto-insert into `court_evidence.*`.
- For site publication, surface the artifact path plus the "approve to publish" instruction; do not commit it to `public/` automatically.

## Forbidden language

Never write — rewrite if a draft contains:
- "they're targeting me", "stalking", "following me", "harassing me"
- "conspiracy", "cabal", "they know"
- First-person narrative about the analyst or any individual
- Naming a pilot, operator employee, or private individual (registered corporate owners from public FAA / SOS filings are allowed)

Prefer: "the airspace", "the pattern", "the operator", "the registered owner", "the public record shows".

## Required attribution line

Every public-facing draft must include, verbatim or near-verbatim:

All data referenced in this document is drawn from public sources — FAA ADS-B broadcasts, public corporate filings, and published regulations — and is independently verifiable by any member of the public.

## References

- `references/output-templates.md` — exact section structure for each output type
- `references/anti-bias.md` — how to compute and phrase the attestation
- `references/data-sources.md` — Neon tables, columns, and which server function to call
- `scripts/hash_artifact.py` — SHA-256 a file and emit the footer block
- `scripts/build_digest.py` — pull a daily digest and write a draft markdown report

## Hand-off

When done, present: artifact path, SHA-256 digest, classification, gate status (autonomous / queued / forbidden). Wait for human approval before any publish step.
