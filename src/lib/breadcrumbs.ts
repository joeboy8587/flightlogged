const BASE = "https://flightlogged.lovable.app";

export type Crumb = { label: string; href?: string };

export function buildBreadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: c.href.startsWith("http") ? c.href : `${BASE}${c.href}` } : {}),
    })),
  };
}

export function breadcrumbScript(items: Crumb[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(buildBreadcrumbJsonLd(items)),
  };
}