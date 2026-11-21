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

export const FEATURED_UPDATED = "2026-11-21";

export const FEATURED_OFFERS: FeaturedOffer[] = [
  {
    title: "Batedeira Planetária Philco 900W 5L",
    store: "Mercado Livre",
    highlight: "12 velocidades + turbo, 3 batedores em aço. Nota 4,8.",
    image: "/ofertas/batedeira-philco.webp",
    url: "https://meli.la/1RtL3P8",
  },
  {
    title: "Mini Processador Sem Fio 250 ml",
    store: "Shopee",
    highlight: "Tritura alho, cebola e carne; recarrega no USB. Nota 4,7.",
    image: "/ofertas/mini-processador.webp",
    url: "https://s.shopee.com.br/6L6BOiwPGN",
  },
  {
    title: "Lavadora de Alta Pressão Kärcher Compacta 1.500 PSI",
    store: "Mercado Livre",
    highlight: "Aplicador de detergente e lança regulável. Nota 4,8.",
    image: "/ofertas/lavadora-karcher.webp",
    url: "https://meli.la/1CpQq9V",
  },
  {
    title: "Cetaphil Loção Hidratante Advanced 473 ml",
    store: "Mercado Livre",
    highlight: "Para pele seca e sensível, sem fragrância. Nota 4,9.",
    image: "/ofertas/cetaphil-473ml.webp",
    url: "https://meli.la/2vjj6cm",
  },
  {
    title: "Cascata de Natal LED (5 m ou 10 m)",
    store: "Shopee",
    highlight: "200 ou 400 LEDs, 8 funções ou fixo. Nota 4,9.",
    image: "/ofertas/cascata-led-natal.webp",
    url: "https://s.shopee.com.br/2gCt1sVCid",
  },
  {
    title: "Mop Giratório com Cesto Inox + 2 Refis",
    store: "Shopee",
    highlight: "Cabo de 140 cm e balde com centrífuga. Nota 4,8.",
    image: "/ofertas/mop-giratorio.webp",
    url: "https://s.shopee.com.br/BVY3OogFk",
  },
];
