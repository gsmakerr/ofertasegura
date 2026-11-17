import { describe, expect, it, vi } from "vitest";
import { followRedirects } from "@/lib/netSafety";
import { convertToAffiliate } from "@/lib/affiliateConverter";

const ok = async () => ["93.184.216.34"];

describe("desencurtador", () => {
  it("segue o link curto até a loja e converte para afiliado", async () => {
    const f = vi.fn(async (url: string | URL | Request) => {
      if (String(url).startsWith("https://amzn.to/")) {
        return new Response(null, { status: 301, headers: { location: "https://www.amazon.com.br/Echo/dp/B09B8VGCR8?tag=outro-20&linkCode=x" } });
      }
      return new Response("<html><head><title>Echo Dot</title></head></html>", { status: 200, headers: { "content-type": "text/html" } });
    });
    const page = await followRedirects("https://amzn.to/abc123", { fetchImpl: f as never, resolve: ok });
    expect(page.hops).toBe(1);
    expect(page.html).toContain("Echo Dot");
    const r = await convertToAffiliate(page.finalUrl, { AMAZON_ASSOCIATE_TAG: "meutag-20" });
    expect(r.url).toBe("https://www.amazon.com.br/dp/B09B8VGCR8?tag=meutag-20");
  });

  it("ignora o desvio para a tela de verificação de conta (anti-robô)", async () => {
    const produto = "https://www.mercadolivre.com.br/fone-jbl/p/MLB123?matt_tool=999&matt_word=outro";
    const f = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: `https://www.mercadolivre.com.br/gz/account-verification?go=${encodeURIComponent(produto)}&tid=abc` },
    }));
    const page = await followRedirects(produto, { fetchImpl: f as never, resolve: ok });
    expect(page).toMatchObject({ finalUrl: produto, blocked: true });
    const r = await convertToAffiliate(page.finalUrl, { MERCADOLIVRE_MATT_TOOL: "80278591", MERCADOLIVRE_MATT_WORD: "gslinks" });
    expect(r.url).toBe("https://www.mercadolivre.com.br/fone-jbl/p/MLB123?matt_tool=80278591&matt_word=gslinks");
  });

  it("link curto que cai na verificação usa o destino do parâmetro go", async () => {
    const produto = "https://www.mercadolivre.com.br/fone-jbl/p/MLB123";
    const f = vi.fn(async (u: string | URL | Request) => String(u).includes("/sec/")
      ? new Response(null, { status: 302, headers: { location: `https://www.mercadolivre.com.br/gz/account-verification?go=${encodeURIComponent(produto)}` } })
      : new Response("", { status: 200 }));
    const page = await followRedirects("https://mercadolivre.com/sec/abc", { fetchImpl: f as never, resolve: ok });
    expect(page.finalUrl).toBe(produto);
  });

  it("recusa redirecionamento para a rede interna", async () => {
    const f = vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } }));
    await expect(followRedirects("https://curto.example/x", { fetchImpl: f as never })).rejects.toThrow();
  });

  it("para depois de redirecionamentos demais", async () => {
    const f = vi.fn(async (u: string | URL | Request) => new Response(null, { status: 302, headers: { location: String(u) + "a" } }));
    await expect(followRedirects("https://loop.example/", { fetchImpl: f as never, resolve: ok })).rejects.toThrow("Redirecionamentos demais");
  });

  it("se a loja bloquear, mantém o endereço alcançado", async () => {
    const f = vi.fn(async () => { throw new Error("bloqueado"); });
    const page = await followRedirects("https://shopee.com.br/x-i.1.2", { fetchImpl: f as never, resolve: ok });
    expect(page).toMatchObject({ finalUrl: "https://shopee.com.br/x-i.1.2", blocked: true, html: "" });
  });
});
