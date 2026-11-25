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

export const FEATURED_UPDATED = "2026-11-25";

export const FEATURED_OFFERS: FeaturedOffer[] = [
  {
    title: "Mala de Bordo Wilson 19\"",
    store: "Mercado Livre",
    highlight: "Rodas duplas 360° e tamanho aceito pela ANAC (até 10 kg). Nota 4,8.",
    image: "/ofertas/oferta-1.webp",
    url: "https://meli.la/1SYAG25",
  },
  {
    title: "Kit Utensílios de Silicone com Cabo de Madeira",
    store: "Shopee",
    highlight: "Não risca a panela e aguenta altas temperaturas. Nota 4,8.",
    image: "/ofertas/oferta-2.webp",
    url: "https://s.shopee.com.br/5qA1BE3i6r",
  },
  {
    title: "Impressora Multifuncional Epson EcoTank L4360",
    store: "Mercado Livre",
    highlight: "Wi-Fi e tanque de tinta com kit de tintas incluso. Nota 4,9.",
    image: "/ofertas/oferta-3.webp",
    url: "https://meli.la/2Yb2jVB",
  },
  {
    title: "Smartphone Motorola Moto G06 64 GB",
    store: "Mercado Livre",
    highlight: "Tela de 6,9\" e bateria de 5200 mAh. Nota 4,9.",
    image: "/ofertas/oferta-4.webp",
    url: "https://meli.la/2a8KYfk",
  },
  {
    title: "Toalha Banhão + Rosto 100% Algodão",
    store: "Shopee",
    highlight: "Macia e com alta absorção, em várias cores. Nota 4,8.",
    image: "/ofertas/oferta-5.webp",
    url: "https://s.shopee.com.br/7KyoxzonTo",
  },
  {
    title: "Lixeira Inox 9 L com Tampa Click",
    store: "Shopee",
    highlight: "Tampa click de abertura fácil, para cozinha ou banheiro. Nota 4,7.",
    image: "/ofertas/oferta-6.webp",
    url: "https://s.shopee.com.br/gRv1keZgb",
  },
];
