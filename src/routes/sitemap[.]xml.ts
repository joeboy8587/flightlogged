import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { loadFleet } from "@/lib/aircraft.server";
import { COUNTY_SLUGS } from "@/lib/counties";

const BASE_URL = "https://advocacywatch.live";
const STATIC = [
  ["/", "1.0", "daily"], ["/master-report", "0.9", "weekly"], ["/federal", "0.9", "daily"], ["/the-targeting-equation", "0.8", "monthly"], ["/accountability", "0.8", "weekly"], ["/surveillance-grid", "0.8", "daily"], ["/attestation", "0.8", "hourly"], ["/verify", "0.8", "weekly"], ["/blog", "0.7", "weekly"], ["/cases", "0.8", "daily"], ["/podcasts", "0.7", "weekly"], ["/mosaic", "0.8", "daily"], ["/county/kern", "0.8", "hourly"], ["/county/tulare", "0.8", "hourly"], ["/county/kings", "0.8", "hourly"], ["/county/fresno", "0.8", "hourly"], ["/county/san-bernardino", "0.8", "hourly"], ["/county/los-angeles", "0.7", "hourly"], ["/live", "0.9", "hourly"], ["/findings", "0.9", "hourly"], ["/violations", "0.8", "daily"], ["/coordination", "0.8", "daily"], ["/threat-index", "0.8", "daily"], ["/operators", "0.8", "daily"], ["/foreign", "0.8", "daily"], ["/military", "0.8", "daily"], ["/aircraft", "0.8", "daily"], ["/tail-search", "0.7", "weekly"], ["/ml-detections", "0.8", "hourly"], ["/citations", "0.7", "daily"], ["/reports", "0.8", "weekly"], ["/rules", "0.7", "weekly"], ["/toolkit", "0.7", "weekly"], ["/toolkit/foia", "0.7", "weekly"], ["/methodology", "0.7", "monthly"], ["/legal", "0.6", "monthly"], ["/act", "0.7", "monthly"], ["/about", "0.6", "monthly"], ["/how-to-read", "0.7", "monthly"], ["/foreign", "0.8", "daily"], ["/military", "0.8", "daily"]
] as const;

export const Route = createFileRoute("/sitemap.xml")({ server: { handlers: { GET: async () => {
  const dynamic = [{ path: "/aircraft/" }, ...COUNTY_SLUGS.map((county) => ({ path: `/county/${county}` }))];
  try { const fleet = await loadFleet("score"); dynamic.push(...fleet.map((a) => ({ path: `/aircraft/${encodeURIComponent(a.registration ?? a.icao)}` }))); } catch (error) { console.error("sitemap dynamic aircraft lookup failed", error); }
  const paths = [...STATIC.map(([path]) => ({ path })), ...dynamic].filter((x, i, all) => all.findIndex((y) => y.path === x.path) === i);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(({ path }) => `  <url><loc>${BASE_URL}${path}</loc></url>`).join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
} } } });
