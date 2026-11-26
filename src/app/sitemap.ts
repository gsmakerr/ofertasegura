import type { MetadataRoute } from "next";
import { FEATURED_UPDATED } from "@/lib/featuredOffers";

const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://ofertasegura.pages.dev").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  // Só a página principal: "/?aba=site" é a mesma página e o Google trata como cópia.
  return [{ url: `${site}/`, lastModified: new Date(FEATURED_UPDATED), changeFrequency: "daily", priority: 1 }];
}
