import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";

// Tells Google which pages exist.
export const dynamic = "force-static";

const SITE = "https://belastingbuddy.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/guides/`, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${SITE}/guides/${g.slug}/`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE}/privacy/`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
