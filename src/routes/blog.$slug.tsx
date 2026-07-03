import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { BlogBanner } from "@/components/blog/BlogBanner";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { getPost, CATEGORY_LABEL, type BlogPost } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }): { post: BlogPost } => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.post.meta.title} — Watchtower Blog` },
          { name: "description", content: loaderData.post.meta.excerpt },
          { property: "og:title", content: loaderData.post.meta.title },
          { property: "og:description", content: loaderData.post.meta.excerpt },
          { property: "article:published_time", content: loaderData.post.meta.date },
        ]
      : [{ title: "Post not found — Watchtower Blog" }],
  }),
  component: PostPage,
});

function PostPage() {
  const loaderData = Route.useLoaderData() as { post: BlogPost };
  const { meta, Content } = loaderData.post;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: meta.title },
        ]}
      />

      <article className="max-w-[1400px] mx-auto px-4 py-10 grid gap-8 lg:grid-cols-[1fr,320px]">
        <div>
          <div className="mb-4 flex items-center gap-2 label-stamp text-[11px]">
            <span className="bg-ink text-paper px-2 py-0.5">
              {CATEGORY_LABEL[meta.category]}
            </span>
            <span>{meta.date}</span>
            <span>· by {meta.author}</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl uppercase leading-tight mb-6">
            {meta.title}
          </h1>

          <BlogBanner />

          <div className="blog-prose max-w-none">
            <Content />
          </div>

          {meta.related && meta.related.length > 0 ? (
            <div className="mt-10 brutal-border bg-paper p-5">
              <div className="label-stamp text-[11px] mb-2">Cross-reference the evidence</div>
              <ul className="space-y-1 text-sm">
                {meta.related.map((r) => (
                  <li key={r.href}>
                    <a href={r.href} className="underline hover:bg-warning">
                      {r.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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