"use client";
import { useEffect } from "react";

/** Avisa o contador de uso: visita, instalação e abertura pelo ícone. Nenhum dado pessoal é enviado. */
function enviar(tipo: string) {
  try {
    const body = JSON.stringify({ tipo });
    if (!navigator.sendBeacon?.("/api/evento", new Blob([body], { type: "application/json" }))) {
      fetch("/api/evento", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* ignora */
  }
}

export default function UsageBeacon() {
  useEffect(() => {
    const ss = (k: string) => {
      try {
        if (sessionStorage.getItem(k)) return false;
        sessionStorage.setItem(k, "1");
        return true;
      } catch {
        return true;
      }
    };
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (ss("os_visita")) enviar("visita");
    if (instalado) {
      if (ss("os_app_aberto")) enviar("app_aberto");
      // iPhone não avisa a instalação: conta a primeira vez que o app instalado é aberto.
      try {
        if (!localStorage.getItem("os_instalado")) {
          localStorage.setItem("os_instalado", "1");
          if (!/Android/i.test(navigator.userAgent)) enviar("instalacao");
        }
      } catch {
        /* ignora */
      }
    }
    const onInstalled = () => {
      try {
        localStorage.setItem("os_instalado", "1");
      } catch {
        /* ignora */
      }
      enviar("instalacao");
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);
  return null;
}
