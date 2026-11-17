/**
 * Foto e título pelos canais OFICIAIS das lojas, usados quando a página bloqueia a leitura
 * (Amazon, Mercado Livre e Magalu barram leituras vindas de servidores de hospedagem).
 *
 *  - Amazon: Creators API dos Associados (AMAZON_CREATORS_CREDENTIAL_ID / _SECRET).
 *    Exige conta de criador aprovada e pelo menos 10 vendas qualificadas nos últimos 30 dias.
 *  - Mercado Livre: API de desenvolvedores (MERCADOLIVRE_CLIENT_ID / _CLIENT_SECRET),
 *    com token do próprio aplicativo (client_credentials).
 *
 * Sem as chaves, ou se a loja recusar, devolve vazio e o app segue com o que já tinha.
 */

export interface ProductInfo {
  title: string | null;
  image: string | null;
}

const EMPTY: ProductInfo = { title: null, image: null };

/** Tokens de acesso guardados em memória até perto de vencer (as lojas pedem para não gerar um por consulta). */
const tokens = new Map<string, { value: string; expiresAt: number }>();

async function cachedToken(key: string, fetchToken: () => Promise<{ token: string; ttl: number } | null>) {
  const hit = tokens.get(key);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.value;
  const fresh = await fetchToken();
  if (!fresh) return null;
  tokens.set(key, { value: fresh.token, expiresAt: Date.now() + fresh.ttl * 1000 });
  return fresh.token;
}

const https = (u: unknown) => (typeof u === "string" && /^https:\/\//.test(u) ? u : null);
const text = (u: unknown) => (typeof u === "string" && u.trim() ? u.trim().slice(0, 160) : null);

// ---------- Amazon (Creators API) ----------

export function amazonAsin(url: URL): string | null {
  return url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1]?.toUpperCase() ?? null;
}

/** Lê a resposta do GetItems aceitando os dois estilos de nome de campo (camelCase e PascalCase). */
export function parseAmazonItem(json: unknown): ProductInfo {
  const j = (json ?? {}) as Record<string, unknown>;
  const pick = (o: unknown, ...keys: string[]): unknown => {
    let cur = o as Record<string, unknown> | undefined;
    for (const k of keys) {
      if (!cur || typeof cur !== "object") return undefined;
      const alt = k.charAt(0).toUpperCase() + k.slice(1);
      cur = (cur[k] ?? cur[alt]) as Record<string, unknown> | undefined;
    }
    return cur;
  };
  const items = pick(j, "itemsResult", "items");
  const item = Array.isArray(items) ? items[0] : undefined;
  if (!item) return EMPTY;
  return {
    title: text(pick(item, "itemInfo", "title", "displayValue")),
    image:
      https(pick(item, "images", "primary", "large", "url")) ||
      https(pick(item, "images", "primary", "medium", "url")) ||
      https(pick(item, "images", "primary", "small", "url")),
  };
}

export async function amazonProductInfo(
  url: URL,
  env: { id?: string; secret?: string; tag?: string } = {
    id: process.env.AMAZON_CREATORS_CREDENTIAL_ID,
    secret: process.env.AMAZON_CREATORS_CREDENTIAL_SECRET,
    tag: process.env.AMAZON_ASSOCIATE_TAG,
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ProductInfo> {
  const asin = amazonAsin(url);
  if (!asin || !env.id || !env.secret || !env.tag) return EMPTY;
  try {
    // Credenciais versão 3.1 (América do Norte e Brasil) usam o Login with Amazon.
    const token = await cachedToken(`amazon:${env.id}`, async () => {
      const res = await fetchImpl("https://api.amazon.com/auth/o2/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: env.id,
          client_secret: env.secret,
          scope: "creatorsapi::default",
        }),
        signal: AbortSignal.timeout(3000),
      });
      const d = (await res.json()) as { access_token?: string; expires_in?: number };
      return d.access_token ? { token: d.access_token, ttl: d.expires_in ?? 3600 } : null;
    });
    if (!token) return EMPTY;
    const res = await fetchImpl("https://creatorsapi.amazon/catalog/v1/getItems", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-marketplace": "www.amazon.com.br",
      },
      body: JSON.stringify({
        itemIds: [asin],
        itemIdType: "ASIN",
        partnerTag: env.tag,
        marketplace: "www.amazon.com.br",
        resources: ["images.primary.large", "itemInfo.title"],
      }),
      signal: AbortSignal.timeout(3500),
    });
    return parseAmazonItem(await res.json());
  } catch {
    return EMPTY;
  }
}

// ---------- Mercado Livre ----------

/** Página de catálogo (/p/MLB123) ou anúncio (MLB-123-...); devolve qual recurso consultar na API. */
export function mercadoLivreIds(url: URL): { kind: "products" | "items"; id: string } | null {
  const product = url.pathname.match(/\/p\/(MLB\d+)/i)?.[1];
  if (product) return { kind: "products", id: product.toUpperCase() };
  const item = url.pathname.match(/\/(MLB)-?(\d{6,})/i);
  if (item) return { kind: "items", id: `MLB${item[2]}` };
  const wid = url.searchParams.get("wid") || url.searchParams.get("item_id");
  if (wid && /^MLB\d+$/i.test(wid)) return { kind: "items", id: wid.toUpperCase() };
  return null;
}

export function parseMercadoLivre(json: unknown): ProductInfo {
  const j = (json ?? {}) as {
    name?: string;
    title?: string;
    pictures?: { secure_url?: string; url?: string }[];
    thumbnail?: string;
    secure_thumbnail?: string;
  };
  const pic = j.pictures?.[0];
  return {
    title: text(j.name) || text(j.title),
    image:
      https(pic?.secure_url) ||
      https(pic?.url?.replace(/^http:\/\//, "https://")) ||
      https(j.secure_thumbnail) ||
      https(j.thumbnail?.replace(/^http:\/\//, "https://")),
  };
}

/** Diagnóstico da última consulta ao Mercado Livre: rotas e códigos de resposta (sem chaves). */
const mlLog: string[] = [];
export const mercadoLivreLastLog = () => [...mlLog];

export async function mercadoLivreProductInfo(
  url: URL,
  env: { id?: string; secret?: string } = {
    id: process.env.MERCADOLIVRE_CLIENT_ID,
    secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ProductInfo> {
  const ids = mercadoLivreIds(url);
  if (!ids || !env.id || !env.secret) return EMPTY;
  try {
    const token = await cachedToken(`ml:${env.id}`, async () => {
      const res = await fetchImpl("https://api.mercadolibre.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.id!, client_secret: env.secret! }),
        signal: AbortSignal.timeout(3000),
      });
      const d = (await res.json()) as { access_token?: string; expires_in?: number };
      return d.access_token ? { token: d.access_token, ttl: d.expires_in ?? 21600 } : null;
    });
    if (!token) return EMPTY;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    const get = async (path: string) => {
      const res = await fetchImpl(`https://api.mercadolibre.com${path}`, { headers, signal: AbortSignal.timeout(3000) });
      mlLog.push(`${path.split("?")[0]} ${res.status}`);
      return res.ok ? res.json() : null;
    };
    mlLog.length = 0;
    if (ids.kind === "products") return parseMercadoLivre(await get(`/products/${ids.id}`));

    // Anúncio comum: a consulta direta pode ser recusada a aplicativos de terceiros;
    // tenta a consulta em lote e, se o anúncio estiver ligado ao catálogo, a página do produto.
    const direct = await get(`/items/${ids.id}`);
    if (direct) return parseMercadoLivre(direct);
    const multi = (await get(`/items?ids=${ids.id}&attributes=title,pictures,thumbnail,secure_thumbnail,catalog_product_id`)) as
      | { code?: number; body?: Record<string, unknown> }[]
      | null;
    const first = Array.isArray(multi) ? multi[0] : undefined;
    mlLog.push(`lote: código ${first?.code ?? "?"}, campos ${first?.body ? Object.keys(first.body).join(",").slice(0, 120) : "nenhum"}`);
    const body = first?.code === 200 ? first.body : null;
    if (body) {
      const info = parseMercadoLivre(body);
      if (info.image) return info;
      const catalog = typeof body.catalog_product_id === "string" ? body.catalog_product_id : null;
      if (catalog) return parseMercadoLivre(await get(`/products/${catalog}`));
      return info;
    }

    // Última tentativa: a busca pública, procurando pelo título do link e aceitando
    // apenas o resultado com o MESMO código de anúncio (nunca a foto de outro produto).
    const words = url.pathname
      .replace(/^.*?MLB-?\d+-?/i, "")
      .replace(/-_JM.*$/i, "")
      .split(/[-_/]+/)
      .filter((w) => w.length > 1)
      .slice(0, 8)
      .join(" ");
    if (!words) return EMPTY;
    const found = (await get(`/sites/MLB/search?q=${encodeURIComponent(words)}&limit=50`)) as
      | { results?: { id?: string; title?: string; thumbnail?: string; secure_thumbnail?: string }[] }
      | null;
    const hit = found?.results?.find((r) => r.id === ids.id);
    mlLog.push(`busca: ${found?.results?.length ?? 0} resultados, anúncio ${hit ? "encontrado" : "não encontrado"}`);
    if (!hit) return EMPTY;
    const info = parseMercadoLivre(hit);
    // A miniatura da busca é pequena (-I); a versão maior usa o mesmo arquivo com sufixo -O.
    return { ...info, image: info.image?.replace(/-I\.(jpg|webp)$/i, "-O.$1") ?? null };
  } catch {
    return EMPTY;
  }
}
