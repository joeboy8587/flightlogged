# Data Sources

All access goes through `src/lib/watchtower.functions.ts`. Never embed a Neon
connection string in client code, scripts, or artifacts.

## NEON_WATCHTOWER_URL

| Table | Use for |
|---|---|
| `detections` | raw ADS-B rows (icao_hex, registration, captured_at, altitude_ft, speed_kts, county, on_ground) |
| `aircraft_profiles` | per-tail rollups (total_detections, min_altitude, avg_altitude, night_pct, anomaly_score, last_seen, registered_owner, aircraft_model) |
| `anomaly_events` | post-baseline flags (anomaly_type, anomaly_score, reasoning) |
| `convergence_events` | multi-aircraft coordination patterns |

Server functions: `getSnapshot`, `getRecentLowAltitude`, `getRepeatOffenders`, `getAnomalies`.

## NEON_EVIDENCE_URL  (schema: `court_evidence`)

| Table | Use for |
|---|---|
| `flight_detections` | court-grade mirror of detections with evidence_hash |
| `biometric_events` | heart_rate, stress_level, related_surveillance, related_aircraft_registration, bradford_hill_score, evidence_hash |
| `unified_events` | joined timeline for exhibits |

Server function: `getCorrelations`.

## Optional / when present

- `shell_company_registry` — cross-reference `aircraft_profiles.registered_owner`
- `faa_regulations` — pull the citation string for the DRAFT step

## Public-source disclosure

Every artifact MUST state that inputs are public ADS-B + public corporate
filings + published regulations, independently verifiable.
