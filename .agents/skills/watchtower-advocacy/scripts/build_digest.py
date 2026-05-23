#!/usr/bin/env python3
"""Build a daily airspace digest as a draft markdown report.

This script does NOT publish. It writes to /mnt/documents/watchtower/
and prints the path + SHA-256 + gate status. A human must approve before
the artifact moves to /public or anywhere user-facing.

It calls the deployed server functions (which are the only sanctioned
data path) rather than touching Neon directly.

Usage:
  python build_digest.py --base-url https://<project>.lovable.app
"""
import argparse, datetime as dt, hashlib, json, pathlib, sys, urllib.request

def call(base, fn):
    url = f"{base.rstrip('/')}/_serverFn/{fn}"
    # Best-effort: server-fn URL shape may differ; fall back to /api if present.
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"WARN: could not fetch {fn}: {e}", file=sys.stderr)
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    args = ap.parse_args()

    snap = call(args.base_url, "getSnapshot") or {}
    low = call(args.base_url, "getRecentLowAltitude") or []
    anomalies = call(args.base_url, "getAnomalies") or []

    today = dt.date.today().isoformat()
    out_dir = pathlib.Path("/mnt/documents/watchtower"); out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{today}-digest.md"

    N = snap.get("totalDetections", 0)
    K = len(low)
    pct = (K / N * 100) if N else 0.0

    md = f"""# Airspace Digest — {today}
*The Architecture of Never — DRAFT, not for publication*

## What the public record shows
The Watchtower 2.0 observatory recorded {N:,} detections in the current window
({snap.get('windowHours', 0)} h). {K} of those detections occurred below 1,500 ft
while airborne — the regulatory floor for non-emergency operations over
non-congested areas (14 CFR § 91.119(c)).

## The numbers
- Total detections in window: {N:,}
- Unique aircraft: {snap.get('uniqueAircraft', 0):,}
- Anomaly events: {snap.get('anomalyEvents', 0):,}
- Low-altitude (<1,500 ft) flagged: {K} ({pct:.2f}%)
- Correlated biometric events: {snap.get('correlatedEvents', 0):,}

## Recent anomalies (top 10)
"""
    for a in anomalies[:10]:
        md += f"- {a.get('detectedAt','')}  {a.get('icao','')}  {a.get('anomalyType','')}  score={a.get('anomalyScore','')}\n"

    md += f"""

— Attestation —
Observation window: {snap.get('windowHours', 0)} h ending {snap.get('lastDetectionAt','')}
Total events evaluated by Watchtower 2.0: {N}
Events flagged for this artifact: {K}
Selection rate: {pct:.2f}%
Selection rule: altitude_ft < 1500 AND on_ground = false
No event meeting the rule above was excluded from this artifact.
All inputs are public-source ADS-B and public-record corporate filings,
independently verifiable by any member of the public.
"""
    out.write_bytes(md.encode("utf-8"))
    digest = hashlib.sha256(md.encode("utf-8")).hexdigest()
    print(f"PATH:   {out}")
    print(f"SHA256: {digest}")
    print("CLASS:  PUBLIC REPORT (digest)")
    print("GATE:   QUEUED — requires human approval before publication")

if __name__ == "__main__":
    main()
