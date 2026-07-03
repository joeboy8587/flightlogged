import type { ComponentType } from "react";

export type BlogCategory =
  | "weekly-briefing"
  | "deep-dive"
  | "legal"
  | "commentary"
  | "community";

export type BlogMeta = {
  slug: string;
  title: string;
  date: string; // ISO YYYY-MM-DD
  category: BlogCategory;
  excerpt: string;
  author: string;
  citations?: string[];
  related?: { label: string; href: string }[];
};

export type BlogPost = {
  meta: BlogMeta;
  Content: ComponentType;
};

type PostModule = { meta: BlogMeta; Content: ComponentType };

// Eagerly import all post modules so SSR + client agree on the registry.
const modules = import.meta.glob<PostModule>("../content/blog/*.tsx", {
  eager: true,
});

const POSTS: BlogPost[] = Object.values(modules)
  .map((m) => ({ meta: m.meta, Content: m.Content }))
  .sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));

export function listPosts(category?: BlogCategory): BlogPost[] {
  return category ? POSTS.filter((p) => p.meta.category === category) : POSTS;
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.meta.slug === slug);
}

export const CATEGORY_LABEL: Record<BlogCategory, string> = {
  "weekly-briefing": "Weekly Briefing",
  "deep-dive": "Deep Dive",
  legal: "Legal & Policy",
  commentary: "Commentary",
  community: "Community",
};