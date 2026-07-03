# The Watchtower Blog + UI Fixes (in tandem)

Two tracks shipped together. The blog is the "mouth" that translates the ML's raw findings; the UI fixes clear runtime errors and re-verify quiet-math consistency along the way.

## Track A — UI fixes (done in tandem)

1. **Runtime scan** — read console/network on `/`, `/live`, `/mosaic`, `/operators`, `/podcasts`, `/violations`. Fix anything red (unresolved imports, SSR crashes, 500s from server functions).
2. **Number consistency re-audit** — snapshot totals should match across Home, Operators, About, Methodology, Findings. If any page still sums per-aircraft counters instead of `getSnapshot()` canonical totals, repoint it.
3. **PDT formatter sweep** — grep for any remaining raw `toLocaleString`/UTC output in newly touched files and route through `src/lib/format.ts`.

## Track B — `/blog` advocacy section (Hybrid: MDX + AI drafts)

### Architecture: firewalled translation layer

```text
 ┌─────────────────────────┐        ┌──────────────────────────────┐
 │ ML CORE (unchanged)     │        │ TRANSLATION LAYER (/blog)    │
 │ Live · Findings · Mosaic│  ───►  │ Human MDX + AI-drafted       │
 │ Threat · Coordination   │ cites  │ Weekly Briefing              │
 │ Non-biased. Math-chosen.│        │ Every claim links back to ML │
 └─────────────────────────┘        └──────────────────────────────┘
```

Every post carries a permanent banner: **"ADVOCACY & ANALYSIS — HUMAN-AUTHORED"** with firewall language, and every claim uses the standardized citation format (tail + hex + detection UUID + rule cite).

### Storage — Hybrid

- **MDX posts** in `src/content/blog/*.mdx` with frontmatter (`title`, `slug`, `date`, `category`, `excerpt`, `author`, `citations[]`, `related` — links to `/operators?tail=…`, `/live`, `/coordination`, etc.).
- **AI-drafted Weekly Briefing** at `/blog/weekly` — server function pulls live snapshot + top violations + top operators from quiet-math, Lovable AI writes a 1,200-word briefing on demand, rendered with the same banner + citation format. Not persisted (draft-on-view).

### Routes

```text
src/routes/
  blog.tsx              → layout: sidebar (firewall, verify, report-error) + <Outlet/>
  blog.index.tsx        → /blog: featured Weekly Briefing card + post grid by category
  blog.$slug.tsx        → /blog/:slug: MDX post + citation footer + share row + related-evidence links
  blog.weekly.tsx       → /blog/weekly: live AI-drafted Weekly Briefing
  blog.category.$cat.tsx → filter view (weekly-briefing | deep-dive | legal | commentary | community)
```

### Files created

- `src/lib/blog.ts` — MDX loader (`import.meta.glob`), category/slug helpers, frontmatter type.
- `src/lib/blog.functions.ts` — `getWeeklyBriefingContext()` (quiet-math snapshot + top violations + top operators + coordination events) and `draftWeeklyBriefing()` (Lovable AI via `google/gemini-2.5-flash`, structured output).
- `src/components/blog/BlogBanner.tsx` — permanent firewall banner.
- `src/components/blog/BlogSidebar.tsx` — verify / firewall / report-error links.
- `src/components/blog/CitationRef.tsx` — inline `<Cite tail hex uuid rule/>` renderer that links back to the ML page.
- `src/components/blog/PostCard.tsx`, `PostGrid.tsx`, `CategoryChip.tsx`.
- `src/content/blog/weekly-briefing-2026-07-03.mdx` — seed AI-drafted post (human-reviewed placeholder text pulled from current snapshot).
- `src/content/blog/legal-marsh-v-alabama.mdx` — legal explainer on shell-company surveillance and the Marsh doctrine.
- `src/content/blog/how-to-verify-a-watchtower-claim.mdx` — community doc mapping every UI element to its raw source.

### Nav

Add **Blog** to `src/components/site-header.tsx` between `Podcasts` and `Citations`. Add a small "Latest from the Blog" strip on `/` (home) linking the three seed posts.

### Defensibility guarantees baked in

- Blog routes never write to quiet-math; read-only server functions.
- Weekly Briefing prompt is constrained to a whitelist of numbers pulled from the DB (no free-form invention); if the model output references a number not in the whitelist, it's replaced with the deterministic sentence (same guard already used in podcasts).
- MDX posts render through a controlled component set (no raw HTML, no `dangerouslySetInnerHTML`).
- Every post's footer auto-lists every citation in a "Verify this article" block linking to `/methodology`, `/live`, `/operators`, and the relevant detection page.

### Dependencies

- `@mdx-js/rollup` + `@mdx-js/react` + `remark-frontmatter` + `remark-mdx-frontmatter` (added via `bun add`).
- Vite plugin wired in `vite.config.ts` before the TanStack router plugin.

### Out of scope this pass

- Comments/moderation (Phase 4).
- Social auto-cross-post.
- Admin authoring UI (MDX-in-repo covers it for now).

---

**Deliverable at end of build:** `/blog` live with three seed posts + live AI-drafted `/blog/weekly`, nav updated, home strip added, and any red console/network errors on the current pages fixed.
