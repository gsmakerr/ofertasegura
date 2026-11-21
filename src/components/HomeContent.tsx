// Conteúdo fixo da página inicial, renderizado no servidor: é o texto que o Google lê.
import { FEATURED_OFFERS } from "@/lib/featuredOffers";

const STORE_STYLE: Record<string, string> = {
  Amazon: "bg-[#232f3e] text-white",
  Shopee: "bg-[#ee4d2d] text-white",
  "Mercado Livre": "bg-[#ffe600] text-[#2d3277]",
  Magalu: "bg-[#0086ff] text-white",
};

const SIGNS = [
  {
    t: "Endereço parecido, mas diferente",
    d: "Golpistas registram nomes como \"mercadoliivre\" ou \"shopee-ofertas\" para imitar a loja. Leia o endereço inteiro antes de pagar.",
  },
  {
    t: "Preço baixo demais",
    d: "Celular, TV ou air fryer pela metade do preço de todas as outras lojas é o sinal mais comum de golpe.",
  },
  {
    t: "Só aceita Pix ou boleto",
    d: "Loja que esconde o cartão de crédito e pressiona por Pix dificulta o estorno se o produto não chegar.",
  },
  {
    t: "Site criado há poucos dias",
    d: "Lojas falsas costumam durar semanas. A aba \"Site confiável?\" mostra a idade do domínio.",
  },
  {
    t: "Pressa e contagem regressiva",
    d: "\"Últimas unidades\" e cronômetros que reiniciam servem para você não parar para conferir.",
  },
];

const FAQ = [
  {
    q: "Como saber se um link de oferta é golpe?",
    a: "Cole o link na aba \"Verificar oferta\". O Oferta Segura segue todos os redirecionamentos, mostra em qual site o link termina de verdade e avisa se o endereço imita uma loja conhecida.",
  },
  {
    q: "Como saber se um site é confiável?",
    a: "Na aba \"Site confiável?\", digite o endereço da loja. A análise confere a idade do domínio, o certificado de segurança (HTTPS) e se o nome se parece com o de uma marca famosa, e dá uma nota de 0 a 100.",
  },
  {
    q: "O Oferta Segura é gratuito?",
    a: "Sim, é grátis e não pede cadastro. O site pode receber comissão quando você compra por um link de loja oficial exibido aqui, sem custo extra para você.",
  },
  {
    q: "Funciona com links encurtados do WhatsApp e do Instagram?",
    a: "Funciona. Links curtos (como bit.ly, meli.la e s.shopee.com.br) são abertos até o destino final antes da análise.",
  },
  {
    q: "Dá para instalar no celular?",
    a: "Dá. No Android, toque em \"Instalar app\". No iPhone, use Compartilhar e depois \"Adicionar à Tela de Início\". Depois de instalado, você pode compartilhar um produto direto do app da loja para o Oferta Segura.",
  },
];

export default function HomeContent({ siteUrl }: { siteUrl: string }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Oferta Segura",
      url: siteUrl,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Android, iOS, Windows",
      inLanguage: "pt-BR",
      description:
        "Verificador gratuito de links de ofertas e de lojas online: mostra para onde o link leva e se o site é confiável.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <section aria-labelledby="sugestoes-titulo" className="mt-10">
        <h2 id="sugestoes-titulo" className="font-display text-[1.35rem] font-bold leading-tight tracking-tight">
          Ofertas sugeridas hoje
        </h2>
        <p className="mt-1 text-sm text-muted">
          Achadinhos escolhidos pelo GS Achados, todos de lojas oficiais e com boas avaliações. Confira o preço na loja antes de
          comprar.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FEATURED_OFFERS.map((o) => (
            <li key={o.url} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.image} alt={o.title} width={480} height={480} loading="lazy" className="aspect-square w-full bg-white object-contain" />
                <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold ${STORE_STYLE[o.store] || "bg-ink text-white"}`}>
                  {o.store}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{o.title}</h3>
                <p className="mt-1 flex-1 text-xs leading-snug text-muted">{o.highlight}</p>
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener sponsored"
                  className="mt-3 block rounded-lg bg-petrol py-2 text-center text-sm font-semibold text-white hover:bg-petrol-deep"
                >
                  Ver oferta
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="como-titulo" className="mt-10">
        <h2 id="como-titulo" className="font-display text-[1.35rem] font-bold leading-tight tracking-tight">
          Como funciona a verificação de ofertas
        </h2>
        <ol className="mt-4 space-y-3">
          {[
            ["Cole o link", "Copie o link da oferta que chegou no WhatsApp, Instagram, TikTok ou e-mail e cole na caixa lá em cima."],
            [
              "Veja o destino real",
              "O Oferta Segura abre o link por você, passa por todos os redirecionamentos e mostra em qual site ele termina.",
            ],
            [
              "Decida com segurança",
              "Se o destino for a loja oficial (Amazon, Mercado Livre, Shopee ou Magalu), você vê o produto. Se o endereço imitar uma loja, o aviso aparece em vermelho.",
            ],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-2xl border border-line bg-card p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tag font-display font-bold text-petrol-deep">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sinais-titulo" className="mt-10">
        <h2 id="sinais-titulo" className="font-display text-[1.35rem] font-bold leading-tight tracking-tight">
          5 sinais de que a oferta pode ser golpe
        </h2>
        <ul className="mt-4 space-y-2">
          {SIGNS.map((s) => (
            <li key={s.t} className="rounded-2xl border border-line bg-card p-4">
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-titulo" className="mt-10">
        <h2 id="faq-titulo" className="font-display text-[1.35rem] font-bold leading-tight tracking-tight">
          Perguntas frequentes
        </h2>
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <h3 className="inline">{f.q}</h3>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
