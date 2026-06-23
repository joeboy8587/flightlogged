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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState("idle");
  };

  const play = async () => {
    setError(null);
    setState("scripting");
    try {
      const { script: text, voice } = await generate({ data: { episodeId: ep.id } });
      setScript(text);
      setState("playing");

      const ac = new AbortController();
      abortRef.current = ac;
      const res = await fetch("/api/public/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, voice }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`TTS failed: ${res.status} ${msg.slice(0, 160)}`);
      }
      const blob = await res.blob();
      if (!blob.size) throw new Error("Empty audio response");
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      // Wait a tick so the <audio> element picks up the new src
      await new Promise((r) => setTimeout(r, 0));
      const el = audioRef.current;
      if (el) {
        el.src = url;
        el.onended = () => setState("done");
        el.onerror = () => { setError("Playback error"); setState("error"); };
        try { await el.play(); } catch (e) {
          // Autoplay block — user can press the inline audio control
          console.warn("autoplay blocked", e);
        }
      }
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
      <audio
        ref={audioRef}
        controls
        preload="none"
        className={`mt-3 w-full ${audioUrl ? "" : "hidden"}`}
      />
      {script && (
        <details className="mt-3">
          <summary className="label-stamp cursor-pointer">Transcript</summary>
          <p className="text-xs font-mono whitespace-pre-wrap mt-2 opacity-80">{script}</p>
        </details>
      )}
    </article>
  );
}