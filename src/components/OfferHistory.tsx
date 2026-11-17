"use client";
import { useEffect, useState } from "react";

export interface Offer {
  id: string;
  title: string;
  image: string | null;
  store: string;
  affiliateUrl: string;
  verifiedAt: number;
}

export const STORE_STYLE: Record<string, string> = {
  Amazon: "bg-[#232f3e] text-white",
  Shopee: "bg-[#ee4d2d] text-white",
  "Mercado Livre": "bg-[#ffe600] text-[#2d3277]",
  Magalu: "bg-[#0086ff] text-white",
};

export function timeAgo(ts: number, now: number): string {
  const min = Math.floor((now - ts) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

export function ProductImage({ src, store, className }: { src: string | null; store: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-paper font-display text-3xl font-bold text-line ${className || ""}`} aria-hidden="true">
        {store.charAt(0)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`bg-white object-contain ${className || ""}`} />
  );
}

export default function OfferHistory({ refreshKey }: { refreshKey: number }) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/historico", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          setOffers(Array.isArray(d.offers) ? d.offers : []);
          setNow(Date.now());
        })
        .catch(() => alive && setOffers((cur) => cur ?? []));
    load();
    // A oferta recém-verificada é gravada logo depois da resposta: confere de novo em instantes.
    const again = refreshKey > 0 ? setTimeout(load, 3000) : undefined;
    return () => {
      alive = false;
      if (again) clearTimeout(again);
    };
  }, [refreshKey]);

  return (
    <section aria-labelledby="historico-titulo" className="mt-10">
      <h2 id="historico-titulo" className="font-display text-[1.35rem] font-bold leading-tight tracking-tight">
        Últimas ofertas verificadas pela comunidade
      </h2>
      <p className="mt-1 text-sm text-muted">Links conferidos por outros visitantes, todos de lojas oficiais.</p>

      {offers === null ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-line/40" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line bg-card p-6 text-center text-[15px] text-muted">
          Nenhuma oferta verificada ainda. Cole um link lá em cima e a sua será a primeira.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {offers.map((o) => (
            <li key={o.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card">
              <div className="relative">
                <ProductImage src={o.image} store={o.store} className="aspect-square w-full" />
                <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold ${STORE_STYLE[o.store] || "bg-ink text-white"}`}>
                  {o.store}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug">{o.title}</p>
                <p className="mt-1 text-xs text-muted">Verificada {timeAgo(o.verifiedAt, now)}</p>
                <a
                  href={o.affiliateUrl}
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
      )}
    </section>
  );
}
