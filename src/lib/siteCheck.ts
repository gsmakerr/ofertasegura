/**
 * Diagnóstico "Site Confiável?": idade do domínio (RDAP), certificado SSL,
 * detector de clone, DNS/IP e pontuação final de 0 a 100.
 */
import { domainLabel, rootDomain } from "./domain";
import { resolvePublic } from "./netSafety";
import { detectClone, type CloneResult } from "./typosquat";

export interface DomainAge {
  createdAt: string | null;
  ageDays: number | null;
  /** Razão social do titular, quando o registro é de empresa (.br com CNPJ). */
  holder: string | null;
  error?: string;
}

export interface SslInfo {
  checked: boolean;
  valid: boolean;
  error?: string;
}

export interface DnsInfo {
  resolves: boolean;
  ip: string | null;
}

export type Level = "confiavel" | "atencao" | "risco";

export interface Score {
  score: number;
  level: Level;
  positives: string[];
  alerts: string[];
}

export interface SiteReport extends Score {
  domain: string;
  host: string;
  age: DomainAge;
  ssl: SslInfo;
  clone: CloneResult;
  dns: DnsInfo;
  links: { reclameAqui: string; googleTransparencia: string; receitaCnpj: string };
  checkedAt: number;
}

const DAY = 86_400_000;
export const YOUNG_DAYS = 183; // 6 meses

export function formatAge(days: number): string {
  if (days < 1) return "hoje";
  if (days < 60) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

// ---------- RDAP ----------
interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, unknown[][]];
  publicIds?: { type?: string }[];
  legalRepresentative?: string;
}

export function parseRdap(json: unknown, now = Date.now()): DomainAge {
  const data = (json || {}) as { events?: { eventAction?: string; eventDate?: string }[]; entities?: RdapEntity[] };
  const ev = data.events?.find((e) => e.eventAction === "registration");
  const time = ev?.eventDate ? Date.parse(ev.eventDate) : NaN;
  let holder: string | null = null;
  const registrant = data.entities?.find((e) => e.roles?.includes("registrant"));
  // Só mostramos o titular quando é empresa (CNPJ). Pessoa física fica de fora.
  if (registrant?.publicIds?.some((p) => (p.type || "").toLowerCase() === "cnpj")) {
    const fn = registrant.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3];
    if (typeof fn === "string" && fn.trim()) holder = fn.trim().slice(0, 120);
  }
  if (Number.isNaN(time)) return { createdAt: null, ageDays: null, holder, error: "Data de criação não informada" };
  return { createdAt: new Date(time).toISOString(), ageDays: Math.max(0, Math.floor((now - time) / DAY)), holder };
}

export async function lookupDomainAge(domain: string, fetchImpl: typeof fetch = fetch): Promise<DomainAge> {
  const url = domain.endsWith(".br")
    ? `https://rdap.registro.br/domain/${domain}`
    : `https://rdap.org/domain/${domain}`;
  try {
    const res = await fetchImpl(url, {
      // O rdap.org recusa (403) pedidos sem identificação.
      headers: { Accept: "application/rdap+json, application/json", "User-Agent": "OfertaSegura/1.0" },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });
    if (res.status === 404) return { createdAt: null, ageDays: null, holder: null, error: "Domínio não registrado" };
    if (!res.ok) return { createdAt: null, ageDays: null, holder: null, error: "Consulta de registro indisponível" };
    return parseRdap(await res.json());
  } catch {
    return { createdAt: null, ageDays: null, holder: null, error: "Consulta de registro indisponível" };
  }
}

// ---------- SSL/TLS ----------
// O Cloudflare não deixa ler o certificado, mas recusa a conexão quando ele é inválido:
// se o site responde por HTTPS, o certificado passou na conferência.
const SSL_ERROS: [RegExp, string][] = [
  [/expired|NotValidYet/i, "Certificado vencido ou fora da validade"],
  [/NotValidForName/i, "O certificado é de outro endereço"],
  [/UnknownIssuer|self.signed/i, "Certificado não foi emitido por uma autoridade reconhecida"],
  [/certificate/i, "Certificado inválido"],
];
const SEM_HTTPS = "Site não aceita conexão segura (HTTPS)";
/** Códigos que o Cloudflare devolve quando não consegue conectar com segurança ao site. */
const CF_FALHAS = [520, 521, 522, 523, 524, 525, 526];

export async function checkSsl(host: string, fetchImpl: typeof fetch = fetch): Promise<SslInfo> {
  try {
    const res = await fetchImpl(`https://${host}/`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5000) });
    res.body?.cancel().catch(() => {});
    if (res.status === 526) return { checked: true, valid: false, error: "Certificado inválido" };
    if (CF_FALHAS.includes(res.status)) return { checked: true, valid: false, error: SEM_HTTPS };
    return { checked: true, valid: true };
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return { checked: true, valid: false, error: "Sem resposta na porta segura (443)" };
    }
    const message = e instanceof Error ? `${e.message} ${String(e.cause ?? "")}` : String(e);
    return { checked: true, valid: false, error: SSL_ERROS.find(([re]) => re.test(message))?.[1] ?? SEM_HTTPS };
  }
}

// ---------- Pontuação ----------
export function computeScore(input: { age: DomainAge; ssl: SslInfo; clone: CloneResult; dns: DnsInfo }): Score {
  const { age, ssl, clone, dns } = input;
  const positives: string[] = [];
  const alerts: string[] = [];
  let score = 50;
  let cap = 100;

  if (age.ageDays === null) {
    score -= 5;
    alerts.push(
      age.error === "Domínio não registrado"
        ? "Este domínio não aparece como registrado."
        : "Não foi possível confirmar quando o domínio foi criado.",
    );
    if (age.error === "Domínio não registrado") cap = Math.min(cap, 20);
  } else if (age.ageDays < YOUNG_DAYS) {
    score -= 30;
    cap = Math.min(cap, 35);
    alerts.push(`Domínio criado ${formatAge(age.ageDays)}. Lojas falsas costumam ter menos de 6 meses.`);
  } else if (age.ageDays < 365) {
    score += 5;
    alerts.push(`Domínio ainda novo: registrado ${formatAge(age.ageDays)}.`);
  } else {
    score += age.ageDays >= 5 * 365 ? 30 : age.ageDays >= 2 * 365 ? 22 : 15;
    positives.push(`Domínio registrado ${formatAge(age.ageDays)}.`);
  }
  if (age.holder) positives.push(`Registrado em nome de empresa: ${age.holder}.`);

  if (!dns.resolves) {
    score -= 20;
    alerts.push("O endereço não está no ar (não aponta para nenhum servidor).");
  } else if (ssl.valid) {
    score += 15;
    positives.push("Conexão segura (HTTPS) válida.");
  } else {
    score -= 25;
    alerts.push(`Sem conexão segura válida: ${ssl.error || "certificado inválido"}. Não digite dados nem senha.`);
  }

  if (clone.status === "official") {
    score += 10;
    positives.push(clone.reason || "Domínio oficial de marca conhecida.");
  } else if (clone.status === "clone") {
    cap = Math.min(cap, 15);
    alerts.unshift(`Suspeita de site falso (phishing). ${clone.reason || ""}`.trim());
  } else {
    positives.push("Não imita o endereço de nenhuma grande marca monitorada.");
  }

  score = Math.max(0, Math.min(cap, score));
  const level: Level = score >= 70 ? "confiavel" : score >= 40 ? "atencao" : "risco";
  return { score, level, positives, alerts };
}

export function quickLinks(domain: string) {
  const name = domainLabel(domain).replace(/-/g, " ");
  return {
    reclameAqui: `https://www.reclameaqui.com.br/busca/?q=${encodeURIComponent(name)}`,
    googleTransparencia: `https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(domain)}&hl=pt_BR`,
    receitaCnpj: "https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp",
  };
}

export async function analyzeSite(host: string): Promise<SiteReport> {
  const domain = rootDomain(host);
  const clone = detectClone(host);

  let dns: DnsInfo = { resolves: false, ip: null };
  let reachable = host;
  for (const candidate of Array.from(new Set([host, domain, `www.${domain}`]))) {
    try {
      const ips = await resolvePublic(candidate);
      dns = { resolves: true, ip: ips[0] };
      reachable = candidate;
      break;
    } catch {
      /* tenta o próximo */
    }
  }

  const [age, ssl] = await Promise.all([
    lookupDomainAge(domain),
    dns.resolves
      ? checkSsl(reachable)
      : Promise.resolve<SslInfo>({ checked: false, valid: false, error: "Site fora do ar" }),
  ]);

  return {
    domain, host, age, ssl, clone, dns,
    ...computeScore({ age, ssl, clone, dns }),
    links: quickLinks(domain),
    checkedAt: Date.now(),
  };
}
