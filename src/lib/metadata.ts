/** Leitura de título e imagem de uma página de produto, com alternativas quando a loja bloqueia. */

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

function metaContent(html: string, prop: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (key?.toLowerCase() !== prop) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (content) return decodeEntities(content).trim();
  }
  return null;
}

// Títulos de páginas de bloqueio, login ou vitrine genérica: não descrevem um produto.
const GENERIC = [
  /^amazon(\.com\.br)?$/i, /robot check/i, /captcha/i, /access denied/i, /acesso negado/i,
  /just a moment/i, /attention required/i, /^shopee brasil/i, /^mercado livre( brasil)?$/i,
  /^magazine luiza$/i, /^magalu$/i, /^login/i, /^entrar/i, /p[áa]gina n[ãa]o encontrada/i,
  /^404/, /something went wrong/i, /^error/i, /^erro/i,
];

export function cleanTitle(raw: string | null): string | null {
  if (!raw) return null;
  let t = raw.replace(/\s+/g, " ").trim();
  t = t.replace(/\s*[|\-–]\s*(Amazon\.com\.br|Amazon|Shopee Brasil|Shopee|Mercado ?Livre|MercadoLivre|Magazine Luiza|Magalu)\b.*$/i, "").trim();
  t = t.replace(/^(Amazon\.com\.br|Amazon\.com):\s*/i, "").trim();
  if (t.length < 4 || GENERIC.some((re) => re.test(t))) return null;
  return t.slice(0, 160);
}

/** A Amazon não publica og:image; a foto principal fica no próprio HTML da página. */
function amazonImage(html: string): string | null {
  if (!html.includes("media-amazon.com")) return null;
  const tag = html.match(/<img\b[^>]*\bid=["']landingImage["'][^>]*>/i)?.[0];
  const attr = (name: string) =>
    tag?.match(new RegExp(`\\b${name}=["'](https:\\/\\/m\\.media-amazon\\.com\\/images\\/I\\/[^"']+)["']`, "i"))?.[1];
  const fromTag = attr("data-old-hires") || attr("src");
  const hiRes = html.match(/"(?:hiRes|large)":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/)?.[1];
  return fromTag || hiRes || null;
}

export function extractMetadata(html: string, baseUrl: string): { title: string | null; image: string | null } {
  const head = html.slice(0, 400_000);
  const rawTitle =
    metaContent(head, "og:title") ||
    metaContent(head, "twitter:title") ||
    (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decodeEntities(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]) : null);
  const rawImage = metaContent(head, "og:image") || metaContent(head, "twitter:image") || amazonImage(head);

  let image: string | null = null;
  if (rawImage) {
    try {
      const u = new URL(rawImage, baseUrl);
      if (u.protocol === "http:") u.protocol = "https:";
      if (u.protocol === "https:") image = u.toString();
    } catch {
      /* imagem inválida: ignora */
    }
  }
  return { title: cleanTitle(rawTitle), image };
}

/** Quando a loja bloqueia a leitura, tenta montar um título a partir do próprio link. */
export function titleFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
    const slug = parts.find(
      (p) => p.includes("-") && p.length > 12 && !/^(dp|p|gp|product)$/i.test(p) && !/^MLB-?\d+$/i.test(p),
    );
    if (!slug) return null;
    const words = slug
      .replace(/^MLB-?\d+-/i, "").replace(/-?_JM$/i, "").replace(/-i\.\d+\.\d+$/i, "")
      .split(/[-_]+/).filter(Boolean);
    if (words.length < 2) return null;
    const text = words.join(" ");
    return (text.charAt(0).toUpperCase() + text.slice(1)).slice(0, 160);
  } catch {
    return null;
  }
}
