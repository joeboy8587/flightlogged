import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { listPodcasts, generatePodcastScript, type PodcastEpisode } from "@/lib/podcasts.functions";

const listQO = queryOptions({
  queryKey: ["podcasts", "list"],
  queryFn: () => listPodcasts(),
  staleTime: 5 * 60_000,
});

const crumbs = [{ label: "Home", href: "/" }, { label: "Podcasts" }];

export const Route = createFileRoute("/podcasts")({
  head: () => ({
    meta: [
      { title: "AI Podcasts — The Architecture of Never" },
      { name: "description", content: "Machine-narrated briefings of multi-county airspace surveillance. Numbers pulled live from the quiet-math database, narrated by AI. No human in the loop." },
      { property: "og:title", content: "AI Podcasts — Architecture of Never" },
      { property: "og:description", content: "Daily AI-narrated airspace briefings. Hash-fingerprinted, court-ready." },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/podcasts" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listQO),
  component: PodcastsPage,
});

function PodcastsPage() {
  const { data: episodes } = useSuspenseQuery(listQO);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />
      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="label-stamp text-alert mb-2">AI PODCASTS · MACHINE-NARRATED</div>
          <h1 className="text-4xl sm:text-6xl mb-3">The machine speaks the headline.</h1>
          <p className="max-w-3xl text-sm sm:text-base">
            Each episode is generated on demand from the live quiet-math database, scripted by
            Lovable AI from the numbers below, and narrated in real time. No human in the loop.
            Press play — the audio streams as it's spoken.
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-8 grid md:grid-cols-2 gap-6">
          {episodes.length === 0 && (
            <div className="brutal-border p-6 col-span-full bg-warning/30">
              <div className="label-stamp mb-2">No data</div>
              <p className="text-sm">The database returned no rows for episode synthesis. Check back shortly.</p>
            </div>
          )}
          {episodes.map((ep) => <EpisodeCard key={ep.id} ep={ep} />)}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function EpisodeCard({ ep }: { ep: PodcastEpisode }) {
  const generate = useServerFn(generatePodcastScript);
  const [state, setState] = useState<"idle" | "scripting" | "playing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setState("idle");
  };

  const play = async () => {
    setError(null);
    setState("scripting");
    try {
      const { script: text, voice } = await generate({ data: { episodeId: ep.id } });
      setScript(text);
      setState("playing");

      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new Ctx({ sampleRate: 24000 });
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      let playhead = 0;
      let pending = new Uint8Array(0);

      const playChunk = (incoming: Uint8Array) => {
        const bytes = new Uint8Array(pending.length + incoming.length);
        bytes.set(pending); bytes.set(incoming, pending.length);
        const usable = bytes.length - (bytes.length % 2);
        pending = bytes.slice(usable);
        if (usable === 0) return;
        const samples = new Int16Array(bytes.buffer, 0, usable / 2);
        const floats = Float32Array.from(samples, (s) => s / 32768);
        const buf = ctx.createBuffer(1, floats.length, 24000);
        buf.copyToChannel(floats, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination);
        if (playhead === 0) playhead = ctx.currentTime + 0.05;
        else playhead = Math.max(playhead, ctx.currentTime);
        src.start(playhead);
        playhead += buf.duration;
      };

      const ac = new AbortController();
      abortRef.current = ac;
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, voice }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`TTS failed: ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
          const dataLines = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
          if (dataLines.length === 0) continue;
          const payloadRaw = dataLines.join("");
          if (!payloadRaw || payloadRaw === "[DONE]") continue;
          let payload: any;
          try { payload = JSON.parse(payloadRaw); } catch { continue; }
          if (payload?.type === "speech.audio.delta" && payload.audio) {
            const bin = atob(payload.audio);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            playChunk(arr);
          }
        }
      }
      setState("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error(err);
      setError((err as Error).message || "Generation failed");
      setState("error");
    }
  };

  const isBusy = state === "scripting" || state === "playing";

  return (
    <article className="brutal-border bg-paper p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="label-stamp text-alert mb-1">EP · {ep.duration} · voice: {ep.voice}</div>
          <h2 className="text-2xl font-display uppercase leading-tight">{ep.title}</h2>
          <p className="text-sm mt-1 opacity-80">{ep.subtitle}</p>
        </div>
      </div>
      <ul className="text-xs font-mono border-t border-ink/30 pt-3 space-y-1">
        {ep.dataPoints.map((p, i) => (
          <li key={i} className="flex justify-between gap-3"><span className="truncate">{p.label}</span><span className="font-bold">{p.value}</span></li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2 flex-wrap">
        {!isBusy && (
          <button onClick={play} className="brutal-border bg-ink text-paper label-stamp px-4 py-2 hover:bg-alert">
            ▶ {state === "done" ? "Play again" : "Play episode"}
          </button>
        )}
        {isBusy && (
          <button onClick={stop} className="brutal-border bg-warning label-stamp px-4 py-2 hover:bg-alert hover:text-paper">
            ■ Stop
          </button>
        )}
        <span className="label-stamp px-2 py-2 self-center">
          {state === "scripting" && "Writing script…"}
          {state === "playing" && "Streaming audio…"}
          {state === "done" && "Finished"}
          {state === "error" && "Error"}
          {state === "idle" && "Ready"}
        </span>
      </div>
      {error && <div className="mt-2 text-xs font-mono text-alert">{error}</div>}
      {script && (
        <details className="mt-3">
          <summary className="label-stamp cursor-pointer">Transcript</summary>
          <p className="text-xs font-mono whitespace-pre-wrap mt-2 opacity-80">{script}</p>
        </details>
      )}
    </article>
  );
}