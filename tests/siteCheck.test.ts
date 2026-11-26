import { describe, expect, it } from "vitest";
import { checkSsl } from "@/lib/siteCheck";

const responde = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;
const falha = (erro: Error) => (async () => { throw erro; }) as unknown as typeof fetch;

describe("checkSsl", () => {
  it("aceita quando o site responde por HTTPS, mesmo com erro da própria página", async () => {
    expect((await checkSsl("loja.com.br", responde(403))).valid).toBe(true);
  });
  it("reprova os códigos de falha de conexão segura do Cloudflare", async () => {
    expect((await checkSsl("loja.com.br", responde(526))).valid).toBe(false);
    expect((await checkSsl("loja.com.br", responde(525))).valid).toBe(false);
  });
  it("explica o certificado vencido", async () => {
    const r = await checkSsl("loja.com.br", falha(new Error("TLS handshake failed: invalid peer certificate: Expired")));
    expect(r).toMatchObject({ valid: false, error: "Certificado vencido ou fora da validade" });
  });
  it("reprova quando não há resposta", async () => {
    const r = await checkSsl("loja.com.br", falha(new DOMException("demorou", "TimeoutError")));
    expect(r).toMatchObject({ valid: false, error: "Sem resposta na porta segura (443)" });
  });
});
