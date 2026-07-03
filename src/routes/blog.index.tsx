import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { PostCard } from "@/components/blog/PostCard";
import { listPosts, CATEGORY_LABEL, type BlogCategory } from "@/lib/blog";

const CATS: BlogCategory[] = [
  "weekly-briefing",
  "deep-dive",
  "legal",
  "commentary",
  "community",
];

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "The Watchtower Blog — Advocacy & Analysis" },
      {
        name: "description",
        content:
          "The machine finds the patterns. We explain what they mean. Human-authored advocacy backed by the same quiet-math evidence you can verify on the Live Feed.",
      },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const posts = listPosts();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-10">
          <div className="label-stamp text-alert mb-2">
            ADVOCACY &amp; ANALYSIS — HUMAN-AUTHORED
          </div>
          <h1 className="font-display text-5xl sm:text-6xl uppercase leading-none">
            The Watchtower Blog
          </h1>
          <p className="mt-4 text-lg max-w-3xl">
            <em>The machine finds the patterns. We explain what they mean.</em>
          </p>
          <div className="mt-6 brutal-border-thick bg-warning text-ink p-4 max-w-4xl">
            <p className="text-sm leading-snug">
              This is the Watchtower advocacy blog. Articles here are written by human
              investigators and AI-assisted analysts with a human review chain. They
              translate the machine&rsquo;s objective findings into plain English. Every
              claim is sourced to public data — the same data you can verify on the{" "}
              <Link to="/live" className="underline">Live Feed</Link>,{" "}
              <Link to="/threat-index" className="underline">Threat Index</Link>, and{" "}
              <Link to="/coordination" className="underline">Coordination</Link> pages.
              This is interpretation. The raw evidence is always available.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1400px] mx-auto px-4 py-10 grid gap-8 lg:grid-cols-[1fr,320px]">
          <div>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="label-stamp text-[11px] opacity-70">Filter:</span>
              {CATS.map((c) => {
                const count = listPosts(c).length;
                return (
                  <a
                    key={c}
                    href={`#cat-${c}`}
                    className="label-stamp text-[11px] brutal-border px-2 py-1 hover:bg-warning"
                  >
                    {CATEGORY_LABEL[c]} · {count}
                  </a>
                );
              })}
              <Link
                to="/blog/weekly"
                className="label-stamp text-[11px] brutal-border px-2 py-1 bg-ink text-paper hover:bg-alert"
              >
                Live weekly briefing →
              </Link>
            </div>

            {CATS.map((c) => {
              const posts = listPosts(c);
              if (posts.length === 0) return null;
              return (
                <div key={c} id={`cat-${c}`} className="mb-10 scroll-mt-24">
                  <h2 className="font-display text-2xl uppercase mb-4 border-b-2 border-ink pb-2">
                    {CATEGORY_LABEL[c]}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {posts.map((p) => (
                      <PostCard key={p.meta.slug} post={p.meta} />
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="mt-12">
              <h2 className="font-display text-2xl uppercase mb-4 border-b-2 border-ink pb-2">
                All posts
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {posts.map((p) => (
                  <PostCard key={p.meta.slug} post={p.meta} />
                ))}
              </div>
            </div>
          </div>

          <BlogSidebar />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}