import { createFileRoute } from "@tanstack/react-router";
import { KernAirspaceApp } from "@/components/airspace/KernAirspaceApp";

export const Route = createFileRoute("/airspace")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kern County 3D Airspace · Watchtower" },
      { name: "description", content: "Explore Kern County airspace in 3D: FAA airspace layers, terrain, airports and live aircraft matched to the public FAA registry." },
      { property: "og:title", content: "Kern County 3D Airspace · Watchtower" },
      { property: "og:description", content: "A three-dimensional atlas of Kern County airspace with live aircraft and FAA registry matches." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: KernAirspaceApp,
});
