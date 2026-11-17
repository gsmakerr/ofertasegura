import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://ofertasegura.netlify.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site}/?aba=site`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
