import { after, NextResponse } from "next/server";
import { convertToAffiliate, detectStore, shopeeLastError, shopeeProductInfo } from "@/lib/affiliateConverter";
import { rootDomain } from "@/lib/domain";
import { addOffer } from "@/lib/historyStore";
import { cleanTitle, extractMetadata, titleFromUrl } from "@/lib/metadata";
import { amazonLastLog, amazonProductInfo, mercadoLivreLastLog, mercadoLivreProductInfo } from "@/lib/productApis";
import { clientIp, followRedirects, PREVIEW_UA, rateLimited } from "@/lib/netSafety";
import { detectClone } from "@/lib/typosquat";

export const maxDuration = 10;

function normalizeInput(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Aceita texto compartilhado de apps ("Olha isso! https://shp.ee/abc"): pega o primeiro link.
  const text = raw.trim().slice(0, 2000);
  const found = text.match(/https?:\/\/[^\s<>"']+/i)?.[0] ?? text.split(/\s+/)[0];
  if (!found) return null;
  const withProto = /^https?:\/\//i.test(found) ? found : `https://${found.replace(/^:?\/\//, "")}`;
  try {
    const u = new URL(withProto);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (rateLimited(`verificar:${clientIp(req)}`, 15)) {
    return NextResponse.json({ error: "Muitas verificações em pouco tempo. Aguarde um minuto e tente de novo." }, { status: 429 });
  }
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Envie o link no formato correto." }, { status: 400 });
  }
  const input = normalizeInput(body?.url);
  if (!input) {
    return NextResponse.json({ error: "Isso não parece um link. Cole o endereço completo do produto." }, { status: 400 });
  }

  let page;
  try {
    page = await followRedirects(input, { timeoutMs: 4500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json(
      { error: msg.includes("não permitido") || msg.includes("Redirecionamentos") ? `Não foi possível verificar: ${msg}.` : "Não foi possível abrir esse link. Confira se ele está completo." },
      { status: 422 },
    );
  }

  // Conversão do link e busca de foto/título correm juntas, para caber no limite de tempo da hospedagem.
  const store = detectStore(new URL(page.finalUrl));
  const first = extractMetadata(page.html, page.finalUrl);
  const needsMore = Boolean(store) && (!first.title || !first.image);

  const finalUrl = new URL(page.finalUrl);
  const [conversion, apiInfo, preview] = await Promise.all([
    convertToAffiliate(page.finalUrl),
    // Título e foto pela API oficial da loja (só funciona com as chaves configuradas).
    !needsMore
      ? Promise.resolve({ title: null, image: null })
      : store === "Shopee"
        ? shopeeProductInfo(finalUrl, process.env.SHOPEE_APP_ID, process.env.SHOPEE_APP_SECRET)
        : store === "Amazon"
          ? amazonProductInfo(finalUrl)
          : store === "Mercado Livre"
            ? mercadoLivreProductInfo(finalUrl)
            : Promise.resolve({ title: null, image: null }),
    // A loja barrou a leitura comum: mesma leitura que WhatsApp e Facebook fazem para a prévia de um link.
    needsMore
      ? followRedirects(page.finalUrl, { userAgent: PREVIEW_UA, timeoutMs: 3500, maxHops: 3 })
          .then((p) => extractMetadata(p.html, p.finalUrl))
          .catch(() => ({ title: null, image: null }))
      : Promise.resolve({ title: null, image: null }),
  ]);
  const meta = {
    title: first.title || cleanTitle(apiInfo.title) || preview.title,
    image: first.image || apiInfo.image || preview.image,
  };
  const title = meta.title || cleanTitle(titleFromUrl(page.finalUrl));
  const finalHost = new URL(page.finalUrl).hostname.toLowerCase();
  const clone = conversion.isAffiliate ? { status: "official" as const, brand: conversion.store! } : detectClone(finalHost);

  if (conversion.isAffiliate && conversion.store && title) {
    // Grava no histórico depois de responder, para o visitante não esperar por isso.
    const offer = { title, image: meta.image, store: conversion.store, affiliateUrl: conversion.url };
    after(() => addOffer(offer).catch(() => {}));
  }

  return NextResponse.json({
    verified: conversion.isAffiliate,
    store: conversion.store,
    isAffiliate: conversion.isAffiliate,
    url: conversion.url,
    title,
    image: meta.image,
    finalHost,
    domain: rootDomain(finalHost),
    wasShortened: page.hops > 0,
    // Diagnóstico pedido explicitamente pelo cabeçalho x-diag: só rotas e códigos, nunca chaves.
    ...(req.headers.get("x-diag") === "1" && store === "Mercado Livre" ? { mlApi: mercadoLivreLastLog() } : {}),
    ...(req.headers.get("x-diag") === "1" && store === "Amazon" ? { amazonApi: amazonLastLog() } : {}),
    // Só no computador de desenvolvimento: motivo de a API da Shopee não ter respondido.
    ...(process.env.NODE_ENV !== "production" && conversion.store === "Shopee" ? { shopeeApi: !process.env.SHOPEE_APP_ID || !process.env.SHOPEE_APP_SECRET ? "chaves não carregadas" : (shopeeLastError() ?? "ok") } : {}),
    clone,
  });
}
