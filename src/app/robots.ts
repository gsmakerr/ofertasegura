import type { MetadataRoute } from "next";

const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://ofertasegura.pages.dev").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    // O histórico público pode ser lido pelo Google; o resto da API e o painel continuam fechados.
    rules: [{ userAgent: "*", allow: ["/", "/api/historico"], disallow: ["/api/", "/painel"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
