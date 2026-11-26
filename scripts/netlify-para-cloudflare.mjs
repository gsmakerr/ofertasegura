/**
 * Copia as variáveis do Netlify para os secrets do Cloudflare sem mostrar nem gravar valores.
 * Antes: npx netlify-cli login ; npx netlify-cli link --name ofertasegura ; npx wrangler login
 * Conferir:  node scripts/netlify-para-cloudflare.mjs --so-listar
 * Enviar:    node scripts/netlify-para-cloudflare.mjs
 */
import { spawnSync } from "node:child_process";

const NOMES = [
  "AMAZON_ASSOCIATE_TAG", "SHOPEE_AFFILIATE_ID", "SHOPEE_APP_ID", "SHOPEE_APP_SECRET",
  "MERCADOLIVRE_MATT_TOOL", "MERCADOLIVRE_MATT_WORD", "MAGALU_PARTNER_ID",
  "AMAZON_CREATORS_CREDENTIAL_ID", "AMAZON_CREATORS_CREDENTIAL_SECRET",
  "MERCADOLIVRE_CLIENT_ID", "MERCADOLIVRE_CLIENT_SECRET", "PAINEL_CHAVE",
  "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
];

const netlify = spawnSync("npx --yes netlify-cli env:list --json --context production", {
  shell: true,
  encoding: "utf8",
  stdio: ["inherit", "pipe", "inherit"],
});
let todas;
try {
  todas = JSON.parse(netlify.stdout.slice(netlify.stdout.indexOf("{")));
} catch {
  // Não repete a saída: ela pode conter valores.
  console.error("Não consegui ler as variáveis do Netlify. Confira o login e o link do projeto.");
  process.exit(1);
}

const envio = {};
const faltam = [];
for (const nome of NOMES) {
  const valor = typeof todas[nome] === "string" ? todas[nome].trim() : "";
  // O Netlify esconde com asteriscos as variáveis marcadas como secretas: essas não podem ser copiadas.
  if (!valor || /\*{4,}/.test(valor)) faltam.push(`${nome}${valor ? " (escondida pelo Netlify)" : ""}`);
  else envio[nome] = valor;
}

console.log(`Prontas para enviar (${Object.keys(envio).length}): ${Object.keys(envio).join(", ") || "nenhuma"}`);
console.log(`Sem valor para copiar (${faltam.length}): ${faltam.join(", ") || "nenhuma"}`);
if (faltam.length) console.log("Se alguma delas existir, cadastre com: npx wrangler secret put NOME_DA_VARIAVEL");

if (process.argv.includes("--so-listar") || !Object.keys(envio).length) process.exit(0);

const cloudflare = spawnSync("npx wrangler secret bulk", {
  shell: true,
  input: JSON.stringify(envio),
  stdio: ["pipe", "inherit", "inherit"],
});
process.exit(cloudflare.status ?? 1);
