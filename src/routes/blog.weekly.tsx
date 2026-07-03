import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { BlogBanner } from "@/components/blog/BlogBanner";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { getBriefingContext, draftWeeklyBriefing } from "@/lib/blog.functions";

const ctxQO = queryOptions({
  queryKey: ["blog", "weekly", "context"],
  queryFn: () => getBriefingContext(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/blog/weekly")({
  head: () => ({
    meta: [
      { title: "Live Weekly Briefing — Watchtower Blog" },
      {
        name: "description",
        content:
          "AI-drafted, human-review-ready Weekly Briefing regenerated on demand from the quiet-math database. Every figure is a live query result.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ctxQO),
  component: WeeklyBriefingPage,
});

function renderMarkdown(md: string) {
  // Minimal, safe-ish markdown: headings + paragraphs + bold. No HTML injection paths.
  const escape = (s: string) =>
    s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const lines = md.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (line.startsWith("### ")) {
      html.push(`<h3>${escape(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      html.push(`<h2>${escape(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      html.push(`<h1>${escape(line.slice(2))}</h1>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(escape(line.slice(2)))}</li>`);
    } else {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<p>${inline(escape(line))}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("\n");
}

function inline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function WeeklyBriefingPage() {
  const { data: ctx } = useSuspenseQuery(ctxQO);
  const draftFn = useServerFn(draftWeeklyBriefing);
  const [draft, setDraft] = useState<{ markdown: string; source: "ai" | "deterministic" } | null>(
    null,
  );
  const m = useMutation({
    mutationFn: () => draftFn(),
    onSuccess: (d) => setDraft({ markdown: d.markdown, source: d.source }),
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Live Weekly Briefing" },
        ]}
      />

      <article className="max-w-[1400px] mx-auto px-4 py-10 grid gap-8 lg:grid-cols-[1fr,320px]">
        <div>
          <div className="mb-4 label-stamp text-[11px]">
            <span className="bg-ink text-paper px-2 py-0.5">WEEKLY BRIEFING</span>
            <span className="ml-2">
              Window: last 7 days · Regenerated on demand from quiet-math
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl uppercase leading-tight mb-6">
            The live weekly briefing
          </h1>

          <BlogBanner />

          <div className="brutal-border bg-paper p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Stat label="Detections" value={ctx.detections} />
            <Stat label="Unique aircraft" value={ctx.aircraft} />
            <Stat label="Anomaly events" value={ctx.anomalies} />
            <Stat label="Violations" value={ctx.violations} />
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={() => m.mutate()}
              disabled={m.isPending}
              className="label-stamp bg-ink text-paper brutal-border px-4 py-2 hover:bg-alert disabled:opacity-50"
            >
              {m.isPending ? "Drafting…" : draft ? "Redraft" : "Generate draft"}
            </button>
            {draft ? (
              <span className="label-stamp text-[11px] opacity-70">
                source: {draft.source === "ai" ? "AI (human-review pending)" : "deterministic fallback"}
              </span>
            ) : (
              <span className="label-stamp text-[11px] opacity-70">
                Draft is not published until a human reviewer clears it.
              </span>
            )}
          </div>

          {draft ? (
            <div
              className="blog-prose max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.markdown) }}
            />
          ) : (
            <div className="brutal-border bg-paper p-6 text-sm opacity-80">
              <p>
                Click <strong>Generate draft</strong> to have the AI drafting layer
                assemble a Weekly Briefing from the quiet-math window above.
              </p>
              <p className="mt-3">
                The context strip above is the ML-core output. The draft that appears
                below the button will be an interpretive translation of that context —
                to be reviewed by a human editor before being promoted to a published
                blog post.
              </p>
            </div>
          )}

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <MiniList title="Top operators" rows={ctx.topOperators.map((o) => ({ label: o.name, value: `${o.detections} · ${o.fleet} tail(s)` }))} />
            <MiniList title="Anomaly types" rows={ctx.topAnomalies.map((a) => ({ label: a.type, value: String(a.count) }))} />
            <MiniList title="Counties" rows={ctx.topCounties.map((c) => ({ label: c.county, value: String(c.count) }))} />
          </div>

          <div className="mt-8">
            <Link to="/blog" className="label-stamp underline">
              ← All posts
            </Link>
          </div>
        </div>

        <BlogSidebar />
      </article>

      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="label-stamp text-[10px] opacity-70">{label}</div>
      <div className="font-display text-3xl leading-none mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function MiniList({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="brutal-border bg-paper p-4">
      <div className="label-stamp text-[11px] mb-2">{title}</div>
      {rows.length === 0 ? (
        <div className="text-sm opacity-60">No data in window.</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((r, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate">{r.label}</span>
              <span className="font-mono opacity-70">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}