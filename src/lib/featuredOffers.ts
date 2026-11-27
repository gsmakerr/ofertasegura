/**
 * Ofertas sugeridas na página inicial (links de afiliado do GS Achados).
 * Para trocar: edite esta lista e coloque a foto em public/ofertas/ (quadrada, ~480 px).
 * Não há preço aqui de propósito: preço muda todo dia, e a página mostraria valor velho.
 */
export interface FeaturedOffer {
  title: string;
  store: "Mercado Livre" | "Shopee" | "Amazon" | "Magalu";
  highlight: string;
  image: string;
  url: string;
}

export const FEATURED_UPDATED = "2026-11-27";

export const FEATURED_OFFERS: FeaturedOffer[] = [
  {
    title: "Air Fryer Oven Philco 16L Digital com Visor",
    store: "Mercado Livre",
    highlight: "8 funções pré-programadas e visor de vidro. Nota 4,9.",
    image: "/ofertas/oferta-1.webp",
    url: "https://meli.la/2KYnT6T",
  },
  {
    title: "Power Bank Mini 10.000 mAh com Cabo Embutido",
    store: "Shopee",
    highlight: "Cabe no bolso e carrega 2 aparelhos ao mesmo tempo. Nota 4,6.",
    image: "/ofertas/oferta-2.webp",
    url: "https://s.shopee.com.br/7Kys9qRaVr",
  },
  {
    title: "Soundbar LG S40T 300W com Subwoofer",
    store: "Mercado Livre",
    highlight: "Sistema 2.1 com subwoofer e Bluetooth. Nota 4,9.",
    image: "/ofertas/oferta-3.webp",
    url: "https://meli.la/2jqmBD1",
  },
  {
    title: "Tablet Samsung Galaxy Tab S10 Lite 128 GB",
    store: "Mercado Livre",
    highlight: "Tela de 10,9\" a 90 Hz e S Pen inclusa. Nota 4,9.",
    image: "/ofertas/oferta-4.webp",
    url: "https://meli.la/2hVGZ3F",
  },
  {
    title: "Pote Hermético de Vidro 370 ml com Travas",
    store: "Shopee",
    highlight: "Vedação hermética e corpo transparente. Nota 4,9.",
    image: "/ofertas/oferta-5.webp",
    url: "https://s.shopee.com.br/AKcTjN2Z1u",
  },
  {
    title: "Kit Organizador de Pia sem Furar",
    store: "Shopee",
    highlight: "Suporte para rodo, pano e esponja, com fita adesiva. Nota 4,8.",
    image: "/ofertas/oferta-6.webp",
    url: "https://s.shopee.com.br/7AfRxYf5Pf",
  },
];
