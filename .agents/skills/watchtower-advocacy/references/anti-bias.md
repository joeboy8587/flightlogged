# Anti-Bias Methodology

The single most common attack on civilian airspace work is "you cherry-picked." Every artifact pre-empts that with an **Attestation Footer**.

## Attestation Footer (paste verbatim, fill brackets)

```
— Attestation —
Observation window: <ISO start> → <ISO end>  (<hours> h)
Total events evaluated by Watchtower 2.0: <N>
Events flagged for this artifact: <K>
Selection rate: <K/N as percent, 2 decimals>
Selection rule: <exact threshold — e.g. "altitude_ft < 1500 AND on_ground = false">
No event meeting the rule above was excluded from this artifact.
All inputs are public-source ADS-B and public-record corporate filings,
independently verifiable by any member of the public.
```

## Rules

1. **N must be the full population in the window**, not a pre-filtered subset.
2. **The selection rule must be deterministic and reproducible** — paste the actual SQL or server-function call.
3. **If K/N > 25%**, the artifact is no longer "anomaly reporting" — reclassify as a survey or remove the anomaly framing.
4. **Never round K or N down**. Round percentages to 2 decimals.
5. **If any flagged event was excluded** for any reason (sensor dropout, dedup), say so explicitly with the count.
