import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { watchtower } from "@/lib/neon.server";

// External ingest endpoint: the ML box POSTs one scan artifact per scan.
// Preferred auth: `x-scan-signature: sha256=<hex>` where the digest is
// HMAC-SHA256(SCAN_INGEST_SECRET, raw_body). For the field ML box we also
// accept the shared secret as a HTTPS-only bearer/custom header so a scanner
// configured with SCAN_INGEST_SECRET can publish without a HMAC wrapper.

type ScanBody = {
  scan_id: string;
  ts: string;
  method_version?: string;
  candidates?: number;
  flagged?: number;
  kinematic_hits?: number;
  handoffs?: number;
  detections?: number;
  subject_absent?: boolean;
  merkle_root?: string | null;
  payload?: unknown;
};

function verify(secret: string, sig: string | null, body: string): boolean {
  if (!sig) return false;
  const clean = sig.startsWith("sha256=") ? sig.slice(7) : sig;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(clean, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch { return false; }
}

function safeEquals(a: string | null, b: string): boolean {
  if (!a) return false;
  try {
    const left = Buffer.from(a.trim());
    const right = Buffer.from(b.trim());
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch { return false; }
}

function bearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isAuthorized(secret: string, request: Request, raw: string): boolean {
  return (
    verify(secret, request.headers.get("x-scan-signature"), raw) ||
    verify(secret, request.headers.get("x-hub-signature-256"), raw) ||
    safeEquals(request.headers.get("x-scan-ingest-secret"), secret) ||
    safeEquals(request.headers.get("x-ingest-secret"), secret) ||
    safeEquals(bearerToken(request.headers.get("authorization")), secret)
  );
}

export const Route = createFileRoute("/api/public/scans/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SCAN_INGEST_SECRET;
        if (!secret) return new Response("Not configured", { status: 500 });
        const raw = await request.text();
        if (!isAuthorized(secret, request, raw)) {
          return Response.json(
            { ok: false, error: "Invalid SCAN_INGEST_SECRET or scan signature" },
            { status: 401 },
          );
        }
        let body: ScanBody;
        try { body = JSON.parse(raw); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
        if (!body.scan_id || !body.ts) return Response.json({ ok: false, error: "Missing scan_id or ts" }, { status: 400 });

        try {
          const w = watchtower();
          await w`
            CREATE TABLE IF NOT EXISTS scan_artifacts (
              scan_id uuid PRIMARY KEY,
              ts timestamptz NOT NULL,
              method_version text NOT NULL DEFAULT 'unknown',
              candidates int NOT NULL DEFAULT 0,
              flagged int NOT NULL DEFAULT 0,
              kinematic_hits int NOT NULL DEFAULT 0,
              handoffs int NOT NULL DEFAULT 0,
              detections int NOT NULL DEFAULT 0,
              subject_absent boolean NOT NULL DEFAULT false,
              merkle_root text,
              payload jsonb
            )
          `;
          await w`
            INSERT INTO scan_artifacts (
              scan_id, ts, method_version, candidates, flagged,
              kinematic_hits, handoffs, detections, subject_absent, merkle_root, payload
            ) VALUES (
              ${body.scan_id}, ${body.ts},
              ${body.method_version ?? "unknown"},
              ${body.candidates ?? 0}, ${body.flagged ?? 0},
              ${body.kinematic_hits ?? 0}, ${body.handoffs ?? 0},
              ${body.detections ?? 0}, ${body.subject_absent ?? false},
              ${body.merkle_root ?? null},
              ${JSON.stringify(body.payload ?? null)}::jsonb
            )
            ON CONFLICT (scan_id) DO NOTHING
          `;
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("scan ingest failed:", err);
          return new Response(`Ingest failed: ${(err as Error).message}`, { status: 500 });
        }
      },
    },
  },
});