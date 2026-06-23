import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Server not configured", { status: 500 });
        let body: { input?: string; voice?: string };
        try { body = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
        const input = (body.input ?? "").toString().slice(0, 8000);
        const voice = (body.voice ?? "alloy").toString();
        if (!input.trim()) return new Response("Missing input", { status: 400 });

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input, voice,
              stream_format: "sse",
              response_format: "pcm",
            }),
            signal: request.signal,
          });
          if (!upstream.ok) {
            const t = await upstream.text().catch(() => "");
            return new Response(`TTS upstream ${upstream.status}: ${t.slice(0, 200)}`, { status: upstream.status });
          }
          return new Response(upstream.body, { headers: { "Content-Type": "text/event-stream" } });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          return new Response(`TTS error: ${(err as Error).message}`, { status: 500 });
        }
      },
    },
  },
});