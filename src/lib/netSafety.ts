/**
 * Proteção contra SSRF: como o servidor acessa endereços digitados pelo público,
 * nunca pode ser usado para alcançar a rede interna (localhost, 10.x, 192.168.x...).
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff");
}

/** Resolve o host e devolve os IPs públicos; lança erro se algum for interno. */
export async function resolvePublic(hostname: string): Promise<string[]> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Endereço interno não permitido");
    return [host];
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Endereço interno não permitido");
  }
  const records = await lookup(host, { all: true });
  if (!records.length) throw new Error("Domínio não encontrado");
  if (records.some((r) => isPrivateIp(r.address))) throw new Error("Endereço interno não permitido");
  return records.map((r) => r.address);
}

/** Identificação usada por prévias de link (WhatsApp, Facebook): as lojas liberam título e foto para elas. */
export const PREVIEW_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export interface ResolvedPage {
  finalUrl: string;
  html: string;
  hops: number;
  blocked: boolean;
}

/**
 * Segue redirecionamentos um a um (até maxHops), validando cada salto,
 * e devolve a URL final + o começo do HTML para leitura de metadados.
 */
export async function followRedirects(
  startUrl: string,
  opts: { maxHops?: number; timeoutMs?: number; fetchImpl?: typeof fetch; resolve?: (h: string) => Promise<unknown>; userAgent?: string } = {},
): Promise<ResolvedPage> {
  const { maxHops = 8, timeoutMs = 9000, fetchImpl = fetch, resolve = resolvePublic, userAgent = UA } = opts;
  let current = startUrl;
  const deadline = Date.now() + timeoutMs;

  for (let hop = 0; hop <= maxHops; hop++) {
    const u = new URL(current);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Protocolo não permitido");
    if (u.port && !["80", "443"].includes(u.port)) throw new Error("Porta não permitida");
    await resolve(u.hostname);

    const remaining = Math.max(1500, deadline - Date.now());
    let res: Response;
    try {
      res = await fetchImpl(current, {
        redirect: "manual",
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(remaining),
      });
    } catch {
      // A loja não respondeu ou bloqueou: ficamos com o endereço alcançado até aqui.
      return { finalUrl: current, html: "", hops: hop, blocked: true };
    }

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, current);
      // A loja desviou o servidor para uma tela de login/"verifique sua conta" (anti-robô).
      // Isso não é o destino do link: ficamos com o endereço real do produto.
      if (INTERSTITIAL.test(next.pathname)) {
        res.body?.cancel().catch(() => {});
        return { finalUrl: interstitialTarget(next) ?? current, html: "", hops: hop, blocked: true };
      }
      current = next.toString();
      continue;
    }

    let html = "";
    const type = res.headers.get("content-type") || "";
    if (res.ok && type.includes("html") && res.body) {
      html = await readLimited(res.body, 400_000);
    } else {
      res.body?.cancel().catch(() => {});
    }
    return { finalUrl: current, html, hops: hop, blocked: !res.ok };
  }
  throw new Error("Redirecionamentos demais");
}

const INTERSTITIAL = /account-verification|\/login|\/signin|sign-in|captcha|\/challenge|\/authentication|\/verify/i;

/** Em telas de verificação, o destino original costuma vir num parâmetro (go=, redirect=...). */
function interstitialTarget(u: URL): string | null {
  for (const key of ["go", "redirect", "redirect_url", "return_to", "returnUrl", "next", "url"]) {
    const value = u.searchParams.get(key);
    if (!value) continue;
    try {
      const target = new URL(value);
      const sameSite = target.hostname.split(".").slice(-2).join(".") === u.hostname.split(".").slice(-2).join(".");
      if (target.protocol === "https:" && sameSite) return target.toString();
    } catch {
      /* não é uma URL: tenta o próximo parâmetro */
    }
  }
  return null;
}

async function readLimited(body: ReadableStream<Uint8Array>, max: number): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let out = "";
  try {
    while (out.length < max) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value, { stream: true });
    }
  } catch {
    /* conexão cortada: usa o que já chegou */
  }
  reader.cancel().catch(() => {});
  return out;
}

/** Limite simples de uso por IP, em memória. */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

export function clientIp(req: Request): string {
  // No Cloudflare, cf-connecting-ip é o IP real; o começo do x-forwarded-for pode ser forjado pelo visitante.
  return req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
