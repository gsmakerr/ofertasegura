/**
 * Contador de uso do Oferta Segura — só números agregados por dia, nenhum dado pessoal
 * (sem IP, sem cookie, sem identificador de visitante). Por isso não exige aviso de cookies.
 *
 * Guardado no Netlify Blobs quando o site roda no Netlify; no PC, em data/stats.json.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

export type Evento =
  | "visita" // abriu o site (uma vez por sessão do navegador)
  | "instalacao" // instalou o app (Android/Chrome avisam; no iPhone conta a 1ª abertura do app instalado)
  | "app_aberto" // abriu pelo ícone do app instalado
  | "oferta_parceira" // verificou um link de loja parceira (com afiliado)
  | "oferta_outra" // verificou um link de outra loja
  | "site_confiavel"
  | "site_atencao"
  | "site_risco";

export interface Dia {
  [k: string]: number;
}
export interface Stats {
  dias: Record<string, Dia>; // "2026-11-17" -> contadores
}

const FILE = path.join(process.cwd(), "data", "stats.json");
const KEY = "ofertasegura:stats";
const MAX_DIAS = 400;

const onNetlify = () =>
  Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.SITE_ID || process.env.AWS_LAMBDA_FUNCTION_NAME);

async function store() {
  const { getStore } = await import("@netlify/blobs");
  return getStore("ofertasegura");
}

function timeout<T>(p: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error("lento")), ms))]);
}

/** Data de hoje no fuso de São Paulo. */
export function hoje(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

export async function lerStats(): Promise<Stats> {
  try {
    if (onNetlify()) {
      const s = (await timeout((await store()).get(KEY, { type: "json" }))) as Stats | null;
      return s?.dias ? s : { dias: {} };
    }
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { dias: {} };
  }
}

async function gravar(s: Stats) {
  if (onNetlify()) {
    await timeout((await store()).setJSON(KEY, s));
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(s), "utf8");
}

/** Regra pura (testável): soma 1 ao evento do dia e descarta dias muito antigos. */
export function somar(s: Stats, evento: string, dia: string, detalhe?: string): Stats {
  const dias = { ...s.dias };
  const d = { ...(dias[dia] || {}) };
  d[evento] = (d[evento] || 0) + 1;
  if (detalhe) d[`${evento}:${detalhe}`] = (d[`${evento}:${detalhe}`] || 0) + 1;
  dias[dia] = d;
  const chaves = Object.keys(dias).sort();
  for (const k of chaves.slice(0, Math.max(0, chaves.length - MAX_DIAS))) delete dias[k];
  return { dias };
}

let fila: Promise<unknown> = Promise.resolve();

/** Registra um evento; nunca lança erro (o contador não pode atrapalhar o app). */
export function registrar(evento: Evento, detalhe?: string): Promise<void> {
  const job = fila.then(async () => {
    try {
      await gravar(somar(await lerStats(), evento, hoje(), detalhe));
    } catch {
      /* contador é secundário */
    }
  });
  fila = job.catch(() => {});
  return job;
}

/** Soma os contadores dos últimos `n` dias (n = 0: tudo). */
export function totalPeriodo(s: Stats, n: number, now = new Date()): Dia {
  const limite = n ? hoje(new Date(now.getTime() - (n - 1) * 86_400_000)) : "";
  const out: Dia = {};
  for (const [dia, cont] of Object.entries(s.dias)) {
    if (limite && dia < limite) continue;
    for (const [k, v] of Object.entries(cont)) out[k] = (out[k] || 0) + v;
  }
  return out;
}
