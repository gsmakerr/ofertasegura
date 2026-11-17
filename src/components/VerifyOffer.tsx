"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconAlert, IconCheck, IconExternal, IconShield, Spinner } from "./icons";
import OfferHistory, { ProductImage, STORE_STYLE } from "./OfferHistory";

interface VerifyResult {
  verified: boolean;
  store: string | null;
  url: string;
  title: string | null;
  image: string | null;
  finalHost: string;
  domain: string;
  wasShortened: boolean;
  clone: { status: "official" | "clone" | "none"; brand?: string; reason?: string };
}

export default function VerifyOffer({
  initialUrl,
  onAnalyzeSite,
}: {
  initialUrl: string;
  onAnalyzeSite: (domain: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [canPaste, setCanPaste] = useState(false);
  const autoRan = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const verify = useCallback(async (value: string) => {
    const link = value.trim();
    if (!link) {
      setError("Cole o link do produto para verificar.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível verificar esse link.");
      setResult(data);
      if (data.verified) setRefreshKey((k) => k + 1);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch (e) {
      setError(e instanceof TypeError ? "Sem conexão. Confira sua internet e tente de novo." : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCanPaste(Boolean(navigator.clipboard?.readText));
    // Link recebido pelo "Compartilhar" de outro app: verifica sozinho.
    if (initialUrl && !autoRan.current) {
      autoRan.current = true;
      verify(initialUrl);
    }
  }, [initialUrl, verify]);

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setUrl(text);
        setError("");
      }
    } catch {
      setError("O navegador não liberou a área de transferência. Toque no campo, segure e escolha Colar.");
    }
  }

  const shareText = result?.verified
    ? `${result.title ? `${result.title}\n` : ""}Link conferido no Oferta Segura (loja oficial ${result.store}):\n${result.url}`
    : "";

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify(url);
        }}
        className="rounded-3xl border border-line bg-card p-4 shadow-[0_10px_30px_-18px_rgba(9,56,50,0.45)] sm:p-5"
      >
        <label htmlFor="link" className="block text-[15px] font-semibold">
          Link do produto
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="link"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://amzn.to/… ou shopee.com.br/…"
            className="min-w-0 flex-1 rounded-xl border-2 border-line bg-paper px-4 py-3.5 text-base outline-none placeholder:text-muted/70 focus:border-petrol"
          />
          {canPaste && (
            <button type="button" onClick={paste} className="rounded-xl border-2 border-line px-4 font-semibold text-petrol hover:border-petrol">
              Colar
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-petrol py-3.5 text-base font-bold text-white hover:bg-petrol-deep disabled:opacity-70"
        >
          {loading ? <Spinner className="size-5" /> : <IconShield className="size-5" />}
          {loading ? "Verificando…" : "Verificar oferta"}
        </button>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-risk-soft px-4 py-3 text-sm font-medium text-risk">
            {error}
          </p>
        )}
        <p className="mt-3 text-[13px] leading-snug text-muted">
          Abrimos o link por você, inclusive os encurtados, e mostramos para onde ele leva de verdade.
        </p>
      </form>

      <div ref={resultRef} aria-live="polite" className="scroll-mt-4">
        {result?.verified && (
          <article className="relative mt-5 overflow-hidden rounded-3xl border-2 border-ok bg-card">
            <div className="flex items-center gap-2 bg-ok-soft px-4 py-3 pr-28 text-ok">
              <IconCheck className="size-5 shrink-0" />
              <p className="text-[15px] font-bold leading-tight">Este link leva à loja oficial {result.store}</p>
            </div>
            <div
              className="carimbo absolute right-3 top-2 flex size-[92px] flex-col items-center justify-center rounded-full border-[3px] border-double border-ok bg-card text-center text-ok"
              aria-hidden="true"
            >
              <IconCheck className="size-6" />
              <span className="font-display text-[11px] font-extrabold leading-[1.05]">Link<br />oficial</span>
            </div>
            <div className="flex gap-4 p-4 pt-5">
              <ProductImage src={result.image} store={result.store || "?"} className="size-24 shrink-0 rounded-xl border border-line" />
              <div className="min-w-0 flex-1 pr-2">
                <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${STORE_STYLE[result.store || ""] || "bg-ink text-white"}`}>
                  {result.store}
                </span>
                <h3 className="mt-1.5 line-clamp-3 text-[15px] font-semibold leading-snug">
                  {result.title || "Produto na loja oficial"}
                </h3>
                <p className="mt-1 break-all text-xs text-muted">{result.finalHost}</p>
              </div>
            </div>
            <div className="space-y-2 px-4 pb-4">
              <a
                href={result.url}
                target="_blank"
                rel="noopener sponsored"
                className="flex items-center justify-center gap-2 rounded-xl bg-tag py-3.5 text-base font-bold text-petrol-deep shadow-[0_3px_0_var(--color-tag-deep)] active:translate-y-0.5 active:shadow-none"
              >
                Acessar oferta oficial
                <IconExternal className="size-5" />
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener"
                className="block rounded-xl border-2 border-line py-3 text-center text-[15px] font-semibold text-petrol hover:border-petrol"
              >
                Enviar no WhatsApp
              </a>
              <p className="pt-1 text-[13px] leading-snug text-muted">
                Conferimos o endereço, não o preço. Antes de pagar, veja quem é o vendedor e compare o valor.
              </p>
            </div>
          </article>
        )}

        {result && !result.verified && result.clone.status === "clone" && (
          <article className="mt-5 overflow-hidden rounded-3xl border-2 border-risk bg-card">
            <div className="flex items-center gap-2 bg-risk px-4 py-3 text-white">
              <IconAlert className="size-5 shrink-0" />
              <p className="text-[15px] font-bold leading-tight">Suspeita de site falso</p>
            </div>
            <div className="p-4">
              <p className="break-all font-display text-xl font-bold">{result.domain}</p>
              <p className="mt-2 text-[15px] leading-snug">{result.clone.reason}</p>
              <p className="mt-2 text-[15px] font-semibold text-risk">Não informe senha, CPF nem dados de cartão nesse endereço.</p>
              <button
                onClick={() => onAnalyzeSite(result.domain)}
                className="mt-4 w-full rounded-xl bg-petrol py-3.5 font-bold text-white hover:bg-petrol-deep"
              >
                Ver diagnóstico completo do site
              </button>
            </div>
          </article>
        )}

        {result && !result.verified && result.clone.status !== "clone" && (
          <article className="mt-5 overflow-hidden rounded-3xl border-2 border-warn bg-card">
            <div className="flex items-center gap-2 bg-warn-soft px-4 py-3 text-warn">
              <IconAlert className="size-5 shrink-0" />
              <p className="text-[15px] font-bold leading-tight">Loja fora da nossa lista de oficiais</p>
            </div>
            <div className="p-4">
              <p className="text-[15px] leading-snug">
                {result.wasShortened ? "O link encurtado leva a " : "O link leva a "}
                <strong className="break-all">{result.domain}</strong>
                {result.clone.status === "official"
                  ? `, endereço oficial de ${result.clone.brand}.`
                  : ". Isso não quer dizer golpe, mas vale analisar o site antes de comprar."}
              </p>
              {result.title && <p className="mt-2 line-clamp-2 text-sm text-muted">{result.title}</p>}
              <button
                onClick={() => onAnalyzeSite(result.domain)}
                className="mt-4 w-full rounded-xl bg-petrol py-3.5 font-bold text-white hover:bg-petrol-deep"
              >
                Analisar este site agora
              </button>
            </div>
          </article>
        )}
      </div>

      <OfferHistory refreshKey={refreshKey} />
    </div>
  );
}
