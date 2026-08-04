# Flightlogged

Public transparency site for The Watchtower Project, live at [advocacywatch.live](https://advocacywatch.live).

## What this is

Flightlogged is the public-facing surface of the Watchtower Project's aerial surveillance archive. It allows anyone to verify scan data, export raw artifacts, and understand the methodology behind civilian-led, AI-assisted watchdog operations in Kern County.

## Tech stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Neon (serverless Postgres)
- **Deployment**: Vercel

## Key features

- **`/verify`** — Public verification tool. Paste a scan ID, block hash, or Merkle root to verify against the live chain of custody.
- **`/api/public/export`** — Unauthenticated data export endpoint. Returns all scan artifacts as JSON or CSV with CORS headers. Supports `?format=csv` and `?limit=N`.
- **Methodology page** — Plain-language TL;DR section for non-technical readers, with CSV download and verification tool links.

## Notable fixes

- **pct threshold boundary**: `fmtPct`/`toPct` now uses `< 1` instead of `<= 1` to decide scaling, so a DB value of exactly 1 (meaning 1%) is no longer multiplied to 100%.
- **Neon credential redaction**: Connection URLs are stripped from error messages to prevent credential leaks in logs or responses.

## Development

```bash
npm install
npm run dev
```

Requires Node.js and npm. `NEON_DATABASE_URL` must be set in environment.