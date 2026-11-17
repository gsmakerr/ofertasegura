import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
    images: ["/icons/icon-512.png"],
    locale: "pt_BR",
    type: "website",
  },
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
      </body>
    </html>
  );
}
