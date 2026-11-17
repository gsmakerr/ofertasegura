/**
 * Utilidades de domínio: normalização de entrada e extração do domínio raiz
 * (ex.: "https://www.loja.exemplo.com.br/produto" -> "exemplo.com.br").
 */

// Sufixos de dois níveis mais comuns. Não é a Public Suffix List completa,
// mas cobre o que aparece no varejo brasileiro e nos golpes mais comuns.
const BR_SLDS = [
  "com", "net", "org", "gov", "edu", "art", "blog", "eco", "emp", "ind", "inf",
  "log", "mil", "app", "dev", "tec", "tur", "tv", "wiki", "adm", "adv", "arq",
  "bio", "eng", "esp", "etc", "far", "flog", "imb", "jor", "jus", "leg", "med",
  "mus", "not", "ntr", "odo", "ppg", "pro", "psc", "psi", "rec", "seg", "srv",
  "vet", "vlog", "zlg", "agr", "coop", "radio", "social", "ong", "b", "g12",
  "sp", "rj", "mg", "am", "ba", "pr", "rs", "sc", "pe", "ce", "go", "df", "es",
];
const OTHER_SUFFIXES = [
  "co.uk", "org.uk", "com.ar", "com.mx", "com.co", "com.pt", "com.au",
  "co.jp", "com.cn", "co.in", "com.es", "co.id", "com.my", "com.sg",
];

export function publicSuffixOf(host: string): string {
  const labels = host.split(".");
  if (labels.length >= 2) {
    const last2 = labels.slice(-2).join(".");
    if (labels[labels.length - 1] === "br" && BR_SLDS.includes(labels[labels.length - 2])) {
      return last2;
    }
    if (OTHER_SUFFIXES.includes(last2)) return last2;
  }
  return labels[labels.length - 1];
}

/** Aceita "loja.com.br", "://loja.com.br", "https://loja.com.br/x" etc. */
export function extractHostname(input: string): string | null {
  let s = (input || "").trim().toLowerCase();
  if (!s || s.length > 2000) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^:?\/\//, "");
  s = s.split(/[/?#\s]/)[0];
  s = s.replace(/^.*@/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  if (!/^[a-z0-9.-]+$/.test(s) || !s.includes(".")) return null;
  if (s.split(".").some((l) => !l || l.length > 63 || l.startsWith("-") || l.endsWith("-"))) return null;
  if (/^\d+(\.\d+){3}$/.test(s)) return null; // IP puro não é domínio
  return s;
}

/** Domínio registrável: "www.loja.exemplo.com.br" -> "exemplo.com.br". */
export function rootDomain(host: string): string {
  const suffix = publicSuffixOf(host);
  if (host === suffix) return host; // ex.: "gov.br"
  const rest = host.slice(0, -(suffix.length + 1)).split(".");
  return `${rest[rest.length - 1]}.${suffix}`;
}

/** Nome sem o sufixo: "exemplo.com.br" -> "exemplo". */
export function domainLabel(root: string): string {
  const suffix = publicSuffixOf(root);
  return root === suffix ? root : root.slice(0, -(suffix.length + 1));
}

export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}
