import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://advocacywatch.live";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", priority: "1.0", changefreq: "daily" as const },
          { path: "/live", priority: "0.9", changefreq: "hourly" as const },
          { path: "/findings", priority: "0.9", changefreq: "hourly" as const },
          { path: "/violations", priority: "0.9", changefreq: "hourly" as const },
          { path: "/coordination", priority: "0.9", changefreq: "daily" as const },
          { path: "/threat-index", priority: "0.8", changefreq: "daily" as const },
          { path: "/operators", priority: "0.8", changefreq: "daily" as const },
          { path: "/foreign", priority: "0.9", changefreq: "daily" as const },
          { path: "/military", priority: "0.9", changefreq: "daily" as const },
          { path: "/tail-search", priority: "0.8", changefreq: "weekly" as const },
          { path: "/ml-detections", priority: "0.8", changefreq: "hourly" as const },
          { path: "/citations", priority: "0.8", changefreq: "daily" as const },
          { path: "/reports", priority: "0.9", changefreq: "weekly" as const },
          { path: "/rules", priority: "0.8", changefreq: "weekly" as const },
          { path: "/methodology", priority: "0.7", changefreq: "monthly" as const },
          { path: "/legal", priority: "0.7", changefreq: "monthly" as const },
          { path: "/act", priority: "0.8", changefreq: "monthly" as const },
          { path: "/about", priority: "0.6", changefreq: "monthly" as const },
          { path: "/how-to-read", priority: "0.8", changefreq: "monthly" as const },
          { path: "/toolkit", priority: "0.9", changefreq: "weekly" as const },
          { path: "/toolkit/foia", priority: "0.9", changefreq: "weekly" as const },
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(e => `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`).join("\n")}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});