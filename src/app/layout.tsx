import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import UsageBeacon from "@/components/UsageBeacon";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ofertasegura.pages.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Oferta Segura — confira o link antes de comprar",
  description:
    "Cole o link de uma oferta e veja se ele leva à loja oficial. Analise qualquer site e descubra se é confiável ou suspeito de golpe. Grátis.",
  applicationName: "Oferta Segura",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Oferta Segura", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Oferta Segura",
    description: "Confira se a oferta e o site são verdadeiros antes de comprar.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Oferta Segura: confira se a oferta é golpe antes de comprar" }],
    locale: "pt_BR",
    type: "website",
    siteName: "Oferta Segura",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  alternates: { canonical: siteUrl },
};

export const viewport: Viewport = {
  themeColor: "#0E4D45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
        <UsageBeacon />
      </body>
    </html>
  );
}
