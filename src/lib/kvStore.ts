/** Armazenamento KV do Cloudflare (binding OFERTAS_KV, declarado no wrangler.jsonc). */
import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface KvStore {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
}

export const onCloudflare = () => globalThis.navigator?.userAgent === "Cloudflare-Workers";

export function kv(): KvStore {
  const store = (getCloudflareContext().env as { OFERTAS_KV?: KvStore }).OFERTAS_KV;
  if (!store) throw new Error("KV OFERTAS_KV não configurado");
  return store;
}
