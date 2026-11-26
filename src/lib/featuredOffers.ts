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

export const FEATURED_UPDATED = "2026-11-26";

export const FEATURED_OFFERS: FeaturedOffer[] = [
  {
    title: "Ventilador de Mesa Mondial Super Power 30 cm",
    store: "Mercado Livre",
    highlight: "Hélice de 6 pás e 3 velocidades com baixo ruído. Nota 4,8.",
    image: "/ofertas/oferta-1.webp",
    url: "https://meli.la/2U6EDqJ",
  },
  {
    title: "Guirlanda de Natal para Porta",
    store: "Shopee",
    highlight: "Formato árvore ou redonda, com opção de luzinha LED. Nota 4,8.",
    image: "/ofertas/oferta-2.webp",
    url: "https://s.shopee.com.br/8fUE9KWxe0",
  },
  {
    title: "Fone de Ouvido JBL Tune 530BT",
    store: "Mercado Livre",
    highlight: "Até 76 h de bateria e Bluetooth multiponto. Nota 4,9.",
    image: "/ofertas/oferta-3.webp",
    url: "https://meli.la/2nnHDur",
  },
  {
    title: "Tira Manchas Percarbonato de Sódio Calisul",
    store: "Shopee",
    highlight: "Sem cloro e clareia roupas brancas e coloridas. Nota 4,9.",
    image: "/ofertas/oferta-4.webp",
    url: "https://s.shopee.com.br/60TSyRyEvI",
  },
  {
    title: "Batedeira Mondial Prática B-44",
    store: "Mercado Livre",
    highlight: "Tigela de 3,6 L e 3 velocidades + turbo. Nota 4,8.",
    image: "/ofertas/oferta-5.webp",
    url: "https://meli.la/33w7vw2",
  },
  {
    title: "Cortina de LED 300 LEDs 3x3 m",
    store: "Shopee",
    highlight: "8 modos de iluminação, em luz quente ou fria. Nota 4,8.",
    image: "/ofertas/oferta-6.webp",
    url: "https://s.shopee.com.br/2BGkPTK9ae",
  },
];
