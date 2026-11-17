/**
 * Detector de clone / typosquatting.
 * Compara um domínio com marcas grandes e diz se é o site oficial,
 * uma imitação provável ou nenhum dos dois.
 */
import { domainLabel, hostMatches, rootDomain } from "./domain";

export interface Brand {
  name: string;
  /** Palavras que identificam a marca dentro de um domínio. */
  keywords: string[];
  /** Domínios oficiais (subdomínios deles também contam como oficiais). */
  official: string[];
}

export const BRANDS: Brand[] = [
  { name: "Mercado Livre", keywords: ["mercadolivre", "mercadolibre", "mercadopago"],
    official: ["mercadolivre.com.br", "mercadolivre.com", "mercadolibre.com", "mercadopago.com.br", "mercadopago.com"] },
  { name: "Amazon", keywords: ["amazon"],
    official: ["amazon.com.br", "amazon.com", "amzn.to", "amzn.com", "a.co"] },
  { name: "Shopee", keywords: ["shopee"],
    official: ["shopee.com.br", "shopee.com", "shp.ee"] },
  { name: "Magalu", keywords: ["magazineluiza", "magalu", "magazinevoce"],
    official: ["magazineluiza.com.br", "magalu.com", "magalu.com.br", "magazinevoce.com.br"] },
  { name: "Americanas", keywords: ["americanas"], official: ["americanas.com.br", "americanas.com"] },
  { name: "Casas Bahia", keywords: ["casasbahia"], official: ["casasbahia.com.br"] },
  { name: "Nubank", keywords: ["nubank"], official: ["nubank.com.br", "nu.com.br"] },
  { name: "Correios", keywords: ["correios"], official: ["correios.com.br"] },
  { name: "Gov.br", keywords: ["govbr"], official: ["gov.br"] },
];

// Palavras-isca que golpistas juntam ao nome da marca.
const BAIT = [
  "promo", "promocao", "promocoes", "oferta", "ofertas", "desconto", "descontos",
  "loja", "lojas", "shop", "store", "outlet", "oficial", "official", "brasil", "br",
  "black", "friday", "cupom", "cupons", "premio", "premios", "sorteio", "brinde",
  "cliente", "clientes", "login", "conta", "seguro", "segura", "app", "pay", "pix",
  "rastreio", "rastreamento", "entrega", "taxa", "taxas", "liquida", "liquidacao",
  "queima", "saldao", "vip", "prime", "club", "clube", "suporte", "sac", "online",
  "digital", "site", "web", "net", "compras", "vendas", "atacado", "imports",
];

export type CloneStatus = "official" | "clone" | "none";

export interface CloneResult {
  status: CloneStatus;
  brand?: string;
  reason?: string;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Troca caracteres parecidos usados para enganar o olho (0→o, 1→l, rn→m...). */
function deobfuscate(s: string): string {
  return s
    .replace(/0/g, "o").replace(/[1!|]/g, "l").replace(/3/g, "e")
    .replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t")
    .replace(/rn/g, "m").replace(/vv/g, "w");
}

function remainderIsSuspicious(label: string, keyword: string): boolean {
  const rest = label.replace(keyword, "");
  if (rest === "") return true; // mesmo nome em outro final (.shop, .net...)
  if (/[-\d]/.test(rest)) return true; // marca-algo, marca123
  const clean = rest.replace(/[^a-z]/g, "");
  return BAIT.some((w) => clean.includes(w) && (w.length > 2 || clean === w));
}

export function detectClone(hostOrDomain: string): CloneResult {
  const host = hostOrDomain.toLowerCase().replace(/^www\./, "");
  const root = rootDomain(host);

  for (const b of BRANDS) {
    if (b.official.some((d) => hostMatches(host, d))) {
      return { status: "official", brand: b.name, reason: `Domínio oficial de ${b.name}.` };
    }
  }

  const label = domainLabel(root);
  const flat = label.replace(/-/g, "");
  const variants = Array.from(new Set([label, flat, deobfuscate(label), deobfuscate(flat)]));
  const subdomains = host === root ? "" : host.slice(0, -(root.length + 1)).replace(/[.-]/g, "");

  for (const b of BRANDS) {
    for (const kw of b.keywords) {
      // 1. Nome da marca dentro do domínio (mercadolivre-promocao.com)
      for (const v of variants) {
        if (v.includes(kw) && remainderIsSuspicious(v, kw)) {
          return {
            status: "clone", brand: b.name,
            reason: `Usa o nome "${kw}" mas não é um domínio oficial de ${b.name}.`,
          };
        }
      }
      // 2. Marca escondida no subdomínio (mercadolivre.com.br.ofertas-x.com)
      if (subdomains.includes(kw)) {
        return {
          status: "clone", brand: b.name,
          reason: `Coloca "${kw}" antes do endereço real (${root}) para parecer ${b.name}.`,
        };
      }
      // 3. Erro de digitação proposital (amazom, shoppe, nubamk)
      const maxDist = kw.length >= 9 ? 2 : kw.length >= 5 ? 1 : 0;
      for (const v of variants) {
        if (!maxDist || Math.abs(v.length - kw.length) > maxDist) continue;
        const d = levenshtein(v, kw);
        if (d > 0 && d <= maxDist) {
          return {
            status: "clone", brand: b.name,
            reason: `O nome "${label}" é quase idêntico a "${kw}" (${b.name}), com letras trocadas.`,
          };
        }
        if (d === 0 && v !== label) {
          return {
            status: "clone", brand: b.name,
            reason: `O nome "${label}" imita "${kw}" (${b.name}) trocando letras por números ou símbolos.`,
          };
        }
      }
    }
  }

  if (host.split(".").some((l) => l.startsWith("xn--"))) {
    return { status: "clone", reason: "Endereço usa caracteres especiais disfarçados (punycode), técnica comum em sites falsos." };
  }
  return { status: "none" };
}
