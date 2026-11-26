import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Páginas prontas saem dos próprios arquivos do site (o site não revalida páginas; não precisa de R2).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
