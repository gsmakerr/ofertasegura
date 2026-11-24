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

export const FEATURED_UPDATED = "2026-11-24";

export const FEATURED_OFFERS: FeaturedOffer[] = [
  {
    title: "Air Fryer Forno Mondial 12 L (AFON-12L-BG)",
    store: "Mercado Livre",
    highlight: "2 em 1 com 3 assadeiras e painel digital de 10 funções. Nota 4,9.",
    image: "/ofertas/oferta-1.webp",
    url: "https://meli.la/1THsmV8",
  },
  {
    title: "Protetor de Colchão Impermeável Jacquard",
    store: "Shopee",
    highlight: "100% impermeável e super silencioso, para colchões até 40 cm. Nota 4,9.",
    image: "/ofertas/oferta-2.webp",
    url: "https://s.shopee.com.br/9071M9iPtU",
  },
  {
    title: "Vídeo Porteiro Intelbras IVR 1010",
    store: "Mercado Livre",
    highlight: "Tela colorida e abertura da porta pelo monitor. Nota 4,8.",
    image: "/ofertas/oferta-3.webp",
    url: "https://meli.la/2P2ZjPU",
  },
  {
    title: "Fone de Ouvido Bluetooth Philips TAT1109",
    store: "Mercado Livre",
    highlight: "Sem fio TWS com resistência à água IPX4. Nota 4,8.",
    image: "/ofertas/oferta-4.webp",
    url: "https://meli.la/1JF6JnD",
  },
  {
    title: "Capa para Máquina de Lavar Impermeável",
    store: "Shopee",
    highlight: "Flanelada e reforçada, serve de 9 a 18 kg. Nota 4,6.",
    image: "/ofertas/oferta-5.webp",
    url: "https://s.shopee.com.br/2qWO0psDke",
  },
  {
    title: "Petisqueira de Natal em Madeira Pinus",
    store: "Shopee",
    highlight: "Formatos natalinos para mesa posta e petiscos. Nota 4,9.",
    image: "/ofertas/oferta-6.webp",
    url: "https://s.shopee.com.br/4qHSOY1Szu",
  },
];
