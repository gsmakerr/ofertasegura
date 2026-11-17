/**
 * Diagnóstico "Site Confiável?": idade do domínio (RDAP), certificado SSL,
 * detector de clone, DNS/IP e pontuação final de 0 a 100.
 */
import tls from "node:tls";
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
  issuer: string | null;
  validTo: string | null;
  daysLeft: number | null;
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
      headers: { Accept: "application/rdap+json, application/json" },
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
export function checkSsl(host: string, ip?: string): Promise<SslInfo> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (info: SslInfo) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(info);
    };
    const socket = tls.connect({ host: ip || host, port: 443, servername: host, rejectUnauthorized: false, timeout: 5000 }, () => {
      const cert = socket.getPeerCertificate();
      if (!cert || !cert.valid_to) {
        return finish({ checked: true, valid: false, issuer: null, validTo: null, daysLeft: null, error: "Sem certificado" });
      }
      const validTo = new Date(cert.valid_to);
      const issuer = cert.issuer?.O || cert.issuer?.CN || null;
      finish({
        checked: true,
        valid: socket.authorized,
        issuer: Array.isArray(issuer) ? issuer[0] : issuer,
        validTo: validTo.toISOString(),
        daysLeft: Math.floor((validTo.getTime() - Date.now()) / DAY),
        error: socket.authorized ? undefined : String(socket.authorizationError || "Certificado inválido"),
      });
    });
    socket.on("timeout", () => finish({ checked: true, valid: false, issuer: null, validTo: null, daysLeft: null, error: "Sem resposta na porta segura (443)" }));
    socket.on("error", () => finish({ checked: true, valid: false, issuer: null, validTo: null, daysLeft: null, error: "Site não aceita conexão segura (HTTPS)" }));
  });
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
    positives.push(`Conexão segura (HTTPS) válida${ssl.issuer ? `, emitida por ${ssl.issuer}` : ""}.`);
    if (ssl.daysLeft !== null && ssl.daysLeft < 7) alerts.push("O certificado de segurança vence em poucos dias.");
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
      ? checkSsl(reachable, dns.ip || undefined)
      : Promise.resolve<SslInfo>({ checked: false, valid: false, issuer: null, validTo: null, daysLeft: null, error: "Site fora do ar" }),
  ]);

  return {
    domain, host, age, ssl, clone, dns,
    ...computeScore({ age, ssl, clone, dns }),
    links: quickLinks(domain),
    checkedAt: Date.now(),
  };
}
