# Output Templates

Each template ends with the **Attestation Footer** (see anti-bias.md) and a **SHA-256 line** computed by `scripts/hash_artifact.py`.

---

## 1. PUBLIC REPORT

```
# <Headline — population-scale, no individuals>
*The Architecture of Never — Public Finding — <ISO date>*

## What the public record shows
<2–4 sentences, plain language, no first person>

## The numbers
- Observation window: <start> → <end> (<hours> h)
- Total detections in window: <N>
- Flagged by Watchtower 2.0: <K> (<K/N %>)
- Statistical confidence: <anomaly score / p-value>

## Regulatory context
<14 CFR § …  /  42 U.S.C. § 1983  /  state cite>

## What this is not
This is not an accusation against any individual. It is a description of a pattern in publicly broadcast data.

---
<Attestation Footer>
<SHA-256: …>
```

## 2. LEGAL EXHIBIT

```
EXHIBIT <letter> — <short title>
Custodian: The Architecture of Never (civilian airspace observatory)
Date prepared: <ISO date>

1. Source
   ADS-B Mode S broadcasts (public FAA-mandated transmissions),
   corporate registry filings (public Secretary of State / FAA records).

2. Collection method
   <sensor / receiver class>, continuous capture, no human selection.

3. Query
   <SQL or server-function call, verbatim>

4. Result set
   <table or CSV reference>

5. Statistical analysis
   - Population N: <N>
   - Subset K: <K>
   - Anomaly score: <score>
   - Bradford Hill score: <score, if biometric correlation>

6. Regulatory reference
   <14 CFR Part 91 §91.119 minimum safe altitudes, etc.>

7. Chain of custody
   Raw row hash: <sha256>
   Artifact hash: <sha256 footer>

---
<Attestation Footer>
<SHA-256: …>
```

## 3. LEGISLATIVE BRIEF

```
# Policy Brief — <jurisdiction> — <topic>
Prepared for: <Member / Committee>
Prepared by: The Architecture of Never

## The gap
<one paragraph: what current law does not cover>

## The evidence
<3 bullets, each tied to a public dataset>

## The cost
Estimated taxpayer cost of unreviewed operations: <$ figure with source>

## The model fix
<2–4 sentences proposing statute / rule change, with citation to comparable jurisdictions>

---
<Attestation Footer>
<SHA-256: …>
```

## 4. JOURNALIST RESPONSE

```
To: <reporter>, <outlet>
Re: <request>

1. What we can share
   - Aggregated CSV: <path>
   - Methodology: <link to /methodology>
   - Server-function endpoints used: <names>

2. What we can NOT share
   - Any data that would identify a private individual
   - Biometric data tied to a named person

3. How to verify independently
   - ADS-B archives: adsbexchange / opensky
   - Corporate filings: <state SOS URL>
   - Our hashes: <sha256 of each artifact>

---
<Attestation Footer>
<SHA-256: …>
```

## 5. COMMUNITY ALERT

```
# What happened over <area> on <date>
*Plain language. ~250 words.*

## What we saw
<no jargon, no individuals>

## What it means for you
<concrete: noise, privacy, safety — no fear-mongering>

## What you can do
- Read the public record: <link>
- File an FAA noise complaint: <link>
- Contact your representative: <link>

---
<Attestation Footer>
<SHA-256: …>
```
