import { Link } from "@tanstack/react-router";
import type { BlogMeta } from "@/lib/blog";

const CATEGORY_LABEL: Record<BlogMeta["category"], string> = {
  "weekly-briefing": "Weekly Briefing",
  "deep-dive": "Deep Dive",
  legal: "Legal & Policy",
  commentary: "Commentary",
  community: "Community",
};

export function PostCard({ post }: { post: BlogMeta }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="block brutal-border bg-paper p-5 hover:bg-warning transition-colors"
    >
      <div className="flex items-center gap-2 label-stamp text-[10px] mb-2 opacity-70">
        <span className="bg-ink text-paper px-1.5 py-0.5">{CATEGORY_LABEL[post.category]}</span>
        <span>{post.date}</span>
      </div>
      <h3 className="font-display text-2xl uppercase leading-tight mb-2">{post.title}</h3>
      <p className="text-sm opacity-80 leading-snug">{post.excerpt}</p>
      <div className="label-stamp text-[10px] mt-3 opacity-60">by {post.author}</div>
    </Link>
  );
}