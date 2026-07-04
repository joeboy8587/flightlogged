import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { watchtower } from "@/lib/neon.server";

// External ingest endpoint: the ML box POSTs one scan artifact per scan.
// Requires header `x-scan-signature: sha256=<hex>` where the digest is
// HMAC-SHA256(SCAN_INGEST_SECRET, raw_body).

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

export const Route = createFileRoute("/api/public/scans/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SCAN_INGEST_SECRET;
        if (!secret) return new Response("Not configured", { status: 500 });
        const raw = await request.text();
        const sig = request.headers.get("x-scan-signature");
        if (!verify(secret, sig, raw)) {
          return new Response("Invalid signature", { status: 401 });
        }
        let body: ScanBody;
        try { body = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
        if (!body.scan_id || !body.ts) return new Response("Missing scan_id or ts", { status: 400 });

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