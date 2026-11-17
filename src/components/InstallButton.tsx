"use client";
import { useCallback, useEffect, useState } from "react";
import { IconClose, IconDownload, IconPlus, IconShare, Logo } from "./icons";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "inapp" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Line\//i.test(ua)) return "inapp";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/** Guarda o evento de instalação do Chrome/Edge/Samsung e expõe o estado para os botões. */
export function useInstall() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true); // começa oculto até sabermos
  const [platform, setPlatform] = useState<Platform>("other");
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setPlatform(detectPlatform());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setSheet(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setSheet(true); // iPhone e navegadores sem instalação direta: mostra o passo a passo
  }, [deferred]);

  return { installed, platform, install, sheet, closeSheet: () => setSheet(false) };
}

export function InstallSheet({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps: { icon?: React.ReactNode; text: React.ReactNode }[] =
    platform === "ios"
      ? [
          { icon: <IconShare className="size-5" />, text: <>Toque no botão <strong>Compartilhar</strong>, na barra do navegador.</> },
          { icon: <IconPlus className="size-5" />, text: <>Role a lista e escolha <strong>Adicionar à Tela de Início</strong>.</> },
          { text: <>Toque em <strong>Adicionar</strong>. O ícone do Oferta Segura aparece junto dos seus apps.</> },
        ]
      : platform === "inapp"
        ? [
            { text: <>Toque nos <strong>três pontinhos</strong> no canto da tela.</> },
            { text: <>Escolha <strong>Abrir no navegador</strong> (Chrome ou Safari).</> },
            { text: <>Já no navegador, toque de novo em <strong>Instalar app</strong>.</> },
          ]
        : [
            { text: <>Abra o <strong>menu do navegador</strong> (três pontinhos).</> },
            { text: <>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</> },
            { text: <>Confirme em <strong>Instalar</strong>.</> },
          ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-petrol-deep/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instalar-titulo"
        className="folha w-full max-w-md rounded-t-3xl bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <Logo className="size-12 shrink-0 rounded-xl" />
          <div className="flex-1">
            <h2 id="instalar-titulo" className="font-display text-xl font-bold leading-tight">
              Instalar o Oferta Segura
            </h2>
            <p className="text-sm text-muted">
              {platform === "inapp"
                ? "Este navegador interno não instala apps. São três toques:"
                : platform === "ios"
                  ? "No iPhone a instalação é feita pelo Safari, em três toques:"
                  : "Não ocupa espaço e abre direto da tela inicial:"}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="-m-2 rounded-full p-2 text-muted hover:bg-paper">
            <IconClose className="size-5" />
          </button>
        </div>
        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-paper p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-petrol font-display text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="flex-1 text-[15px] leading-snug">{s.text}</span>
              {s.icon && <span className="text-petrol">{s.icon}</span>}
            </li>
          ))}
        </ol>
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-petrol py-3 font-semibold text-white">
          Entendi
        </button>
      </div>
    </div>
  );
}

export function InstallHeaderButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-tag px-4 py-2 text-sm font-bold text-petrol-deep shadow-[0_2px_0_var(--color-tag-deep)] active:translate-y-px active:shadow-none"
    >
      <IconDownload className="size-4" />
      Instalar app
    </button>
  );
}
