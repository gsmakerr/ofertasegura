/**
 * Motor de conversão de links de afiliado.
 * Recebe a URL FINAL (já desencurtada) e devolve a URL limpa com a tag do dono do site.
 * Funções puras sempre que possível, para serem fáceis de testar.
 */
import { createHash } from "node:crypto";
import { hostMatches } from "./domain";

export type Store = "Amazon" | "Shopee" | "Mercado Livre" | "Magalu";

export interface AffiliateEnv {
  AMAZON_ASSOCIATE_TAG?: string;
  SHOPEE_APP_ID?: string;
  SHOPEE_APP_SECRET?: string;
  SHOPEE_AFFILIATE_ID?: string;
  MERCADOLIVRE_MATT_TOOL?: string;
  MERCADOLIVRE_MATT_WORD?: string;
  MAGALU_PARTNER_ID?: string;
}

export interface ConversionResult {
  /** URL final para o botão de compra. */
  url: string;
  store: Store | null;
  /** true quando o link é de uma loja parceira oficial. */
  isAffiliate: boolean;
  /** true quando a tag de afiliado foi de fato aplicada (chaves presentes no .env). */
  tagApplied: boolean;
}

const STORE_DOMAINS: Record<Store, string[]> = {
  Amazon: ["amazon.com.br"],
  Shopee: ["shopee.com.br"],
  "Mercado Livre": ["mercadolivre.com.br", "mercadolivre.com"],
  Magalu: ["magazineluiza.com.br", "magalu.com", "magazinevoce.com.br"],
};

export function detectStore(url: URL): Store | null {
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  for (const store of Object.keys(STORE_DOMAINS) as Store[]) {
    if (STORE_DOMAINS[store].some((d) => hostMatches(host, d))) return store;
  }
  return null;
}

// ---------- Amazon ----------
const AMAZON_STRIP = ["tag", "linkcode", "camp", "creative", "ascsubtag", "creativeasin", "linkid", "ref", "ref_"];

export function convertAmazon(url: URL, tag?: string): { url: string; tagApplied: boolean } {
  const asin = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1];
  let out: URL;
  if (asin) {
    out = new URL(`https://www.amazon.com.br/dp/${asin.toUpperCase()}`);
  } else {
    out = new URL(url.toString());
    out.protocol = "https:";
    out.hash = "";
    for (const key of Array.from(out.searchParams.keys())) {
      if (AMAZON_STRIP.includes(key.toLowerCase())) out.searchParams.delete(key);
    }
    out.pathname = out.pathname.replace(/\/ref=[^/]*$/i, "");
  }
  if (tag) out.searchParams.set("tag", tag);
  return { url: out.toString(), tagApplied: Boolean(tag) };
}

// ---------- Mercado Livre ----------
export function convertMercadoLivre(url: URL, tool?: string, word?: string): { url: string; tagApplied: boolean } {
  const out = new URL(url.toString());
  out.protocol = "https:";
  out.hash = ""; // o fragmento do ML só carrega rastreio (#position=...&tracking_id=...)
  for (const key of Array.from(out.searchParams.keys())) {
    if (key.toLowerCase().startsWith("matt_")) out.searchParams.delete(key);
  }
  const ok = Boolean(tool && word);
  if (ok) {
    out.searchParams.set("matt_tool", tool!);
    out.searchParams.set("matt_word", word!);
  }
  return { url: out.toString(), tagApplied: ok };
}

// ---------- Magalu ----------
/**
 * Programa Parceiro Magalu ("Magazine Você").
 *
 * A loja do parceiro fica em https://www.magazinevoce.com.br/magazine{SUALOJA}/
 * e cada produto do Magalu tem a mesma rota dentro dela:
 *
 *   magazineluiza.com.br/{slug}/p/{codigo}/{cat}/{subcat}/
 *   -> magazinevoce.com.br/magazine{SUALOJA}/{slug}/p/{codigo}/{cat}/{subcat}/
 *
 * MAGALU_PARTNER_ID é o nome da sua loja (com ou sem o prefixo "magazine").
 * Se a URL não for de produto (não tiver "/p/"), mandamos para a vitrine da loja.
 * Sem MAGALU_PARTNER_ID, devolve a URL limpa do Magalu.
 */
export function convertMagalu(url: URL, partnerId?: string): { url: string; tagApplied: boolean } {
  let path = url.pathname;
  // Link que já veio de outra loja parceira: remove o prefixo dela.
  if (hostMatches(url.hostname.toLowerCase(), "magazinevoce.com.br")) {
    path = path.replace(/^\/[^/]+/, "") || "/";
  }
  if (!path.endsWith("/")) path += "/";
  const id = (partnerId || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) {
    return { url: `https://www.magazineluiza.com.br${path}`, tagApplied: false };
  }
  const storeSlug = id.toLowerCase().startsWith("magazine") ? id : `magazine${id}`;
  const isProduct = /\/p\/[a-z0-9]+\//i.test(path);
  return {
    url: `https://www.magazinevoce.com.br/${storeSlug}${isProduct ? path : "/"}`,
    tagApplied: true,
  };
}

// ---------- Shopee ----------
const SHOPEE_ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

export function cleanShopeeUrl(url: URL): string {
  // Link de outro afiliado no formato an_redir: o produto real está em origin_link.
  if (url.pathname.startsWith("/an_redir")) {
    try {
      const origin = new URL(url.searchParams.get("origin_link") || "");
      if (hostMatches(origin.hostname.toLowerCase(), "shopee.com.br")) url = origin;
    } catch {
      /* sem origin_link válido: segue com a URL recebida */
    }
  }
  const out = new URL(url.toString());
  out.protocol = "https:";
  out.hash = "";
  out.search = ""; // os parâmetros da Shopee são só rastreio de quem compartilhou
  return out.toString();
}

/** Assinatura da API de Afiliados da Shopee: SHA256(appId + timestamp + payload + secret). */
export function shopeeAuthHeader(appId: string, secret: string, payload: string, timestamp: number): string {
  const signature = createHash("sha256").update(`${appId}${timestamp}${payload}${secret}`).digest("hex");
  return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;
}

/**
 * Link de afiliado da Shopee SEM a Open API, só com o ID de afiliado:
 *   https://s.shopee.com.br/an_redir?origin_link={produto}&affiliate_id={ID}&sub_id={origem}
 * É o formato de "link personalizado" que a própria Shopee documenta para parceiros.
 */
export function shopeeRedirLink(cleanUrl: string, affiliateId: string): string {
  const id = affiliateId.replace(/\D/g, "");
  return `https://s.shopee.com.br/an_redir?origin_link=${encodeURIComponent(cleanUrl)}&affiliate_id=${id}&sub_id=ofertasegura`;
}

/** Última mensagem de erro devolvida pela API da Shopee (para diagnóstico; nunca contém as chaves). */
let lastShopeeError: string | null = null;
export const shopeeLastError = () => lastShopeeError;

/** Chamada assinada à API de Afiliados da Shopee (GraphQL). Devolve o campo "data" ou null. */
async function shopeeGraphql(
  body: { query: string; variables?: unknown },
  appId: string,
  secret: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown> | null> {
  try {
    const payload = JSON.stringify(body);
    const res = await fetchImpl(SHOPEE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: shopeeAuthHeader(appId, secret, payload, Math.floor(Date.now() / 1000)),
      },
      body: payload,
      signal: AbortSignal.timeout(3500),
    });
    const text = await res.text();
    let json: { data?: Record<string, unknown>; errors?: { message?: string }[] } = {};
    try {
      json = JSON.parse(text);
    } catch {
      /* resposta que não é JSON: fica registrada abaixo */
    }
    lastShopeeError = json?.errors?.[0]?.message
      ? String(json.errors[0].message).slice(0, 200)
      : json?.data
        ? null
        : `HTTP ${res.status}: ${text.slice(0, 160)}`;
    return json?.data ?? null;
  } catch (e) {
    lastShopeeError = e instanceof Error ? e.message.slice(0, 200) : "falha de rede";
    return null; // API fora do ar ou chaves inválidas
  }
}

/** Extrai loja e item de um link de produto da Shopee (…-i.LOJA.ITEM ou /product/LOJA/ITEM). */
export function shopeeIds(url: URL): { shopId: string; itemId: string } | null {
  const m = url.pathname.match(/-i\.(\d+)\.(\d+)/) || url.pathname.match(/\/product\/(\d+)\/(\d+)/);
  return m ? { shopId: m[1], itemId: m[2] } : null;
}

/** Título e foto do produto pela API oficial da Shopee (precisa das chaves). */
export async function shopeeProductInfo(
  url: URL,
  appId?: string,
  secret?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ title: string | null; image: string | null }> {
  const ids = shopeeIds(url);
  if (!ids || !appId || !secret) return { title: null, image: null };
  const data = await shopeeGraphql(
    { query: `{ productOfferV2(shopId: ${ids.shopId}, itemId: ${ids.itemId}) { nodes { productName imageUrl } } }` },
    appId, secret, fetchImpl,
  );
  const node = (data?.productOfferV2 as { nodes?: { productName?: string; imageUrl?: string }[] } | undefined)?.nodes?.[0];
  const image = node?.imageUrl && /^https:\/\//.test(node.imageUrl) ? node.imageUrl : null;
  return { title: node?.productName?.trim() || null, image };
}

export async function convertShopee(
  url: URL,
  appId?: string,
  secret?: string,
  fetchImpl: typeof fetch = fetch,
  affiliateId?: string,
): Promise<{ url: string; tagApplied: boolean }> {
  const clean = cleanShopeeUrl(url);
  // Sem as chaves da API: usa o ID de afiliado, se houver; senão, link limpo.
  const fallback = affiliateId?.replace(/\D/g, "")
    ? { url: shopeeRedirLink(clean, affiliateId), tagApplied: true }
    : { url: clean, tagApplied: false };
  if (!appId || !secret) return fallback;
  const data = await shopeeGraphql(
    {
      query: "mutation($input: ShortLinkInput!){ generateShortLink(input: $input){ shortLink } }",
      variables: { input: { originUrl: clean, subIds: ["ofertasegura"] } },
    },
    appId, secret, fetchImpl,
  );
  const short = (data?.generateShortLink as { shortLink?: string } | undefined)?.shortLink;
  if (short && /^https:\/\//.test(short)) return { url: short, tagApplied: true };
  return fallback;
}

// ---------- Orquestrador ----------
export async function convertToAffiliate(
  finalUrl: string,
  env: AffiliateEnv = process.env as AffiliateEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<ConversionResult> {
  let url: URL;
  try {
    url = new URL(finalUrl);
  } catch {
    return { url: finalUrl, store: null, isAffiliate: false, tagApplied: false };
  }
  const store = detectStore(url);
  if (!store) return { url: finalUrl, store: null, isAffiliate: false, tagApplied: false };

  let r: { url: string; tagApplied: boolean };
  switch (store) {
    case "Amazon":
      r = convertAmazon(url, env.AMAZON_ASSOCIATE_TAG);
      break;
    case "Mercado Livre":
      r = convertMercadoLivre(url, env.MERCADOLIVRE_MATT_TOOL, env.MERCADOLIVRE_MATT_WORD);
      break;
    case "Magalu":
      r = convertMagalu(url, env.MAGALU_PARTNER_ID);
      break;
    case "Shopee":
      r = await convertShopee(url, env.SHOPEE_APP_ID, env.SHOPEE_APP_SECRET, fetchImpl, env.SHOPEE_AFFILIATE_ID);
      break;
  }
  return { ...r, store, isAffiliate: true };
}
