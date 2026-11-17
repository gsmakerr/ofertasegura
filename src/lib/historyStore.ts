/**
 * Histórico público das últimas ofertas verificadas (máx. 20).
 *
 * Camadas, escolhidas automaticamente:
 *  1. Upstash Redis (se UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN existirem).
 *  2. Netlify Blobs, quando o site roda no Netlify (não precisa configurar nada).
 *  3. Arquivo JSON local em data/verified-offers.json (padrão; ideal no PC ou em VPS).
 *  4. Memória, como último recurso, se nada acima estiver disponível.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Store } from "./affiliateConverter";

export interface VerifiedOffer {
  id: string;
  title: string;
  image: string | null;
  store: Store;
  affiliateUrl: string;
  verifiedAt: number;
}

export const MAX_OFFERS = 20;
const FILE = path.join(process.cwd(), "data", "verified-offers.json");
const REDIS_KEY = "ofertasegura:verified-offers";

let memory: VerifiedOffer[] | null = null;
let lastStoreError: string | null = null;
/** Diagnóstico: último erro do armazenamento do histórico (nunca contém chaves). */
export const storeStatus = () => ({ netlify: onNetlify(), error: lastStoreError });
let queue: Promise<unknown> = Promise.resolve();

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redisCommand(cmd: string[]): Promise<unknown> {
  const cfg = redisConfig()!;
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

function onNetlify() {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.SITE_ID || process.env.AWS_LAMBDA_FUNCTION_NAME);
}


async function blobStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore("ofertasegura");
}

/** O histórico é complementar: se o armazenamento demorar, seguimos sem ele em vez de travar a página. */
function withTimeout<T>(work: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("armazenamento lento")), ms)),
  ]);
}

function sanitize(list: unknown): VerifiedOffer[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((o) => o && typeof o.title === "string" && typeof o.affiliateUrl === "string" && /^https:\/\//.test(o.affiliateUrl))
    .slice(0, MAX_OFFERS);
}

async function readAll(): Promise<VerifiedOffer[]> {
  if (redisConfig()) {
    try {
      const raw = await redisCommand(["GET", REDIS_KEY]);
      return sanitize(typeof raw === "string" ? JSON.parse(raw) : []);
    } catch {
      return memory ?? [];
    }
  }
  if (onNetlify()) {
    try {
      const list = sanitize(await withTimeout(blobStore().then((b) => b.get(REDIS_KEY, { type: "json" }))));
      lastStoreError = null;
      return list;
    } catch (e) {
      lastStoreError = `leitura: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`.slice(0, 300);
      return memory ?? [];
    }
  }
  if (memory) return memory;
  try {
    return sanitize(JSON.parse(await fs.readFile(FILE, "utf8")));
  } catch {
    return [];
  }
}

async function writeAll(list: VerifiedOffer[]): Promise<void> {
  if (redisConfig()) {
    try {
      await redisCommand(["SET", REDIS_KEY, JSON.stringify(list)]);
      return;
    } catch {
      memory = list;
      return;
    }
  }
  if (onNetlify()) {
    try {
      await withTimeout(blobStore().then((b) => b.setJSON(REDIS_KEY, list)));
      memory = null;
    } catch (e) {
      lastStoreError = `gravação: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`.slice(0, 300);
      memory = list;
    }
    return;
  }
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf8");
    await fs.rename(tmp, FILE);
    memory = null;
  } catch {
    memory = list; // disco somente-leitura: mantém em memória
  }
}

/** Regra pura (testável): põe a oferta no topo, sem repetir o mesmo produto. */
export function mergeOffer(list: VerifiedOffer[], offer: VerifiedOffer): VerifiedOffer[] {
  const same = (o: VerifiedOffer) =>
    o.affiliateUrl === offer.affiliateUrl ||
    (o.store === offer.store && o.title.toLowerCase() === offer.title.toLowerCase());
  return [offer, ...list.filter((o) => !same(o))].slice(0, MAX_OFFERS);
}

export async function listOffers(): Promise<VerifiedOffer[]> {
  return readAll();
}

export async function addOffer(input: Omit<VerifiedOffer, "id" | "verifiedAt">): Promise<VerifiedOffer> {
  const offer: VerifiedOffer = { ...input, id: randomUUID(), verifiedAt: Date.now() };
  // Fila: evita que duas verificações simultâneas sobrescrevam o arquivo uma da outra.
  const job = queue.then(async () => writeAll(mergeOffer(await readAll(), offer)));
  queue = job.catch(() => {});
  await job;
  return offer;
}
