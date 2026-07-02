## Add "Watcher" mascot as site avatar

Use the uploaded robot-owl illustration as a recurring mascot across the site, with a subtle idle animation.

### Steps

1. **Upload as Lovable Asset** (keeps binary out of repo)
   - `lovable-assets create --file /mnt/user-uploads/1000059027.jpg --filename watcher-mascot.png > src/assets/watcher-mascot.asset.json`

2. **Create `<Mascot />` component** (`src/components/mascot.tsx`)
   - Props: `size` (sm/md/lg/xl), `animated` (default true), `className`
   - Renders the CDN image with alt text "The Watcher — Architecture of Never mascot"
   - Idle animation via Tailwind/CSS: gentle float (translateY) + subtle cyan eye glow pulse (drop-shadow), `prefers-reduced-motion` disables it
   - Optional `hover:scale-[1.03]` micro-interaction

3. **Add CSS keyframes to `src/styles.css`**
   - `@keyframes mascot-float` (4s ease-in-out infinite, ±6px)
   - `@keyframes mascot-glow` (3s pulse on drop-shadow cyan)
   - Wrapped in `@media (prefers-reduced-motion: no-preference)`

4. **Place mascot in key spots** (subtle, not spammy — brutalist site, mascot stays a small accent)
   - **Site header** (`src/components/site-header.tsx`): small 32–40px mascot next to the wordmark
   - **Homepage hero** (`src/routes/index.tsx`): larger animated mascot (~180px) floating beside the H1
   - **Toolkit hero** (`src/routes/toolkit.index.tsx`): medium mascot next to "Watchtower Toolkit." headline — fits the "public tools" tone
   - **404 / error pages**: mascot with magnifying glass on empty states (nice touch, low effort)

5. **SEO / metadata**
   - Do NOT set as og:image (would override page-specific covers). Mascot stays a UI element only.

### Technical notes
- Image is 788×1180 portrait; component uses `object-contain` in a square-ish flex slot so it doesn't distort layouts.
- No JS animation library needed — pure CSS keyframes keep bundle size flat.
- Brutalist design tokens preserved (no new colors); mascot's own cyan glow is intrinsic to the artwork.

### Open questions (answer during build if you have a preference, otherwise I'll use the defaults above)
- Placement scope: **header + homepage + toolkit** (default), or only homepage, or everywhere?
- Animation intensity: **subtle float + glow** (default), static, or more playful (wing flap / blink)?
