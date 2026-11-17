"use client";
import { useEffect, useState } from "react";
import { IconSearch, IconShield, Logo } from "./icons";
import { InstallHeaderButton, InstallSheet, useInstall } from "./InstallButton";
import SiteCheck from "./SiteCheck";
import VerifyOffer from "./VerifyOffer";

type Tab = "oferta" | "site";

export default function App() {
  const [tab, setTab] = useState<Tab>("oferta");
  const [sharedUrl, setSharedUrl] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const { installed, platform, install, sheet, closeSheet } = useInstall();

  useEffect(() => {
    // Abre na aba pedida e recebe links enviados pelo "Compartilhar" de outros apps.
    const p = new URLSearchParams(window.location.search);
    if (p.get("aba") === "site") setTab("site");
    const shared = [p.get("link"), p.get("texto"), p.get("titulo")].filter(Boolean).join(" ");
    const found = shared.match(/https?:\/\/[^\s]+/i)?.[0];
    if (found) {
      setSharedUrl(found);
      setTab("oferta");
    }
    if (p.toString()) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  function analyzeSite(domain: string) {
    setSiteDomain(domain);
    setTab("site");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "oferta", label: "Verificar oferta", icon: <IconSearch className="size-[18px]" /> },
    { id: "site", label: "Site confiável?", icon: <IconShield className="size-[18px]" /> },
  ];

  return (
    <>
      <header className="bg-petrol pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <Logo className="size-9 rounded-[10px]" />
              <span className="font-display text-[1.3rem] font-extrabold leading-none tracking-tight">Oferta Segura</span>
            </div>
            {!installed && <InstallHeaderButton onClick={install} />}
          </div>

          <h1 className="pb-6 pt-5 font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-[2.6rem]">
            {tab === "oferta" ? "Antes de comprar, confira para onde o link leva." : "Esse site é de verdade ou é golpe?"}
          </h1>

          <nav aria-label="Ferramentas" role="tablist" className="grid grid-cols-2 gap-1 rounded-t-2xl bg-petrol-deep p-1 pb-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`aba-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="painel"
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-2 rounded-t-xl px-2 py-3.5 text-[15px] font-bold ${
                  tab === t.id ? "bg-paper text-petrol" : "text-white/80 hover:text-white"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="painel" role="tabpanel" aria-labelledby={`aba-${tab}`} className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-5">
        {/* As duas abas ficam montadas para não perder o que o visitante digitou. */}
        <div hidden={tab !== "oferta"}>
          <VerifyOffer initialUrl={sharedUrl} onAnalyzeSite={analyzeSite} />
        </div>
        <div hidden={tab !== "site"}>
          <SiteCheck initialDomain={siteDomain} />
        </div>

        {!installed && (
          <section className="mt-10 flex items-center gap-4 rounded-3xl bg-petrol p-5 text-white">
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold leading-tight">Deixe o Oferta Segura à mão</h2>
              <p className="mt-1 text-sm text-white/80">
                Instale no celular e confira qualquer link em dois toques. Grátis e sem cadastro.
              </p>
            </div>
            <InstallHeaderButton onClick={install} />
          </section>
        )}
      </main>

      <footer className="border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl space-y-3 px-4 py-6 text-[13px] leading-relaxed text-muted">
          <p>
            <strong className="text-ink">Transparência:</strong> o Oferta Segura é gratuito. Como associado da Amazon e
            participante dos programas de afiliados da Shopee, do Mercado Livre e do Magalu, o site pode receber comissão
            por compras qualificadas feitas a partir dos links exibidos aqui. Você não paga nada a mais por isso.
          </p>
          <p>
            As verificações são automáticas e servem de apoio à sua decisão; não substituem a sua própria conferência de
            preço, vendedor e condições de entrega. O Oferta Segura não tem vínculo com as lojas citadas além dos
            programas de afiliados.
          </p>
          <p>Oferta Segura</p>
        </div>
      </footer>

      {sheet && <InstallSheet platform={platform} onClose={closeSheet} />}
    </>
  );
}
