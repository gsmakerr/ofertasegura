import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  convertAmazon, convertMagalu, convertMercadoLivre, convertShopee, convertToAffiliate,
  detectStore, shopeeAuthHeader, shopeeIds, shopeeProductInfo,
} from "@/lib/affiliateConverter";

const env = {
  AMAZON_ASSOCIATE_TAG: "meutag-20",
  MERCADOLIVRE_MATT_TOOL: "11111111",
  MERCADOLIVRE_MATT_WORD: "minhapalavra",
  MAGALU_PARTNER_ID: "minhaloja",
};

describe("detectStore", () => {
  it("reconhece as quatro lojas parceiras", () => {
    expect(detectStore(new URL("https://www.amazon.com.br/dp/B0ABCDEFGH"))).toBe("Amazon");
    expect(detectStore(new URL("https://shopee.com.br/produto-i.1.2"))).toBe("Shopee");
    expect(detectStore(new URL("https://produto.mercadolivre.com.br/MLB-123-x-_JM"))).toBe("Mercado Livre");
    expect(detectStore(new URL("https://www.magazineluiza.com.br/tv/p/123/et/tv/"))).toBe("Magalu");
  });
  it("não aceita imitações nem outras lojas", () => {
    expect(detectStore(new URL("https://amazon.com.br.promo-x.com/dp/B0ABCDEFGH"))).toBeNull();
    expect(detectStore(new URL("https://fakeamazon.com.br/"))).toBeNull();
    expect(detectStore(new URL("https://www.kabum.com.br/produto/1"))).toBeNull();
  });
});

describe("Amazon", () => {
  it("limpa parâmetros antigos e aplica a tag", () => {
    const r = convertAmazon(
      new URL("https://www.amazon.com.br/Echo-Dot/dp/B09B8VGCR8/ref=sr_1_1?tag=outro-20&linkCode=ll1&camp=1&creative=2&ascsubtag=x&th=1"),
      "meutag-20",
    );
    expect(r.url).toBe("https://www.amazon.com.br/dp/B09B8VGCR8?tag=meutag-20");
    expect(r.tagApplied).toBe(true);
  });
  it("sem ASIN, remove só o rastreio e mantém a página", () => {
    const r = convertAmazon(new URL("https://www.amazon.com.br/s?k=fone&tag=outro-20&linkCode=x"), "meutag-20");
    expect(r.url).toBe("https://www.amazon.com.br/s?k=fone&tag=meutag-20");
  });
  it("sem tag configurada devolve o link limpo", () => {
    const r = convertAmazon(new URL("https://www.amazon.com.br/dp/B09B8VGCR8?tag=outro-20"), undefined);
    expect(r).toEqual({ url: "https://www.amazon.com.br/dp/B09B8VGCR8", tagApplied: false });
  });
});

describe("Mercado Livre", () => {
  it("troca os parâmetros matt_ pelos do dono do site", () => {
    const r = convertMercadoLivre(
      new URL("https://www.mercadolivre.com.br/fone-jbl/p/MLB123?matt_tool=999&matt_word=outro&matt_source=x&pdp_filters=a#position=3"),
      "11111111", "minhapalavra",
    );
    const u = new URL(r.url);
    expect(u.searchParams.get("matt_tool")).toBe("11111111");
    expect(u.searchParams.get("matt_word")).toBe("minhapalavra");
    expect(u.searchParams.has("matt_source")).toBe(false);
    expect(u.searchParams.get("pdp_filters")).toBe("a");
    expect(u.hash).toBe("");
  });
  it("sem configuração apenas limpa", () => {
    const r = convertMercadoLivre(new URL("https://www.mercadolivre.com.br/x/p/MLB1?matt_tool=9"));
    expect(r).toEqual({ url: "https://www.mercadolivre.com.br/x/p/MLB1", tagApplied: false });
  });
});

describe("Magalu", () => {
  it("leva o produto para a loja do parceiro", () => {
    const r = convertMagalu(new URL("https://www.magazineluiza.com.br/smart-tv-50/p/236591400/et/tv4k/?utm_source=x"), "minhaloja");
    expect(r.url).toBe("https://www.magazinevoce.com.br/magazineminhaloja/smart-tv-50/p/236591400/et/tv4k/");
  });
  it("substitui a loja de outro parceiro", () => {
    const r = convertMagalu(new URL("https://www.magazinevoce.com.br/magazineoutro/smart-tv/p/123abc/et/tv/"), "magazineminhaloja");
    expect(r.url).toBe("https://www.magazinevoce.com.br/magazineminhaloja/smart-tv/p/123abc/et/tv/");
  });
  it("sem ID devolve o link limpo do Magalu", () => {
    const r = convertMagalu(new URL("https://www.magazineluiza.com.br/smart-tv/p/123/et/tv/?a=1"));
    expect(r).toEqual({ url: "https://www.magazineluiza.com.br/smart-tv/p/123/et/tv/", tagApplied: false });
  });
});

describe("Shopee", () => {
  it("sem chaves devolve a URL limpa, sem erro e sem chamar a API", async () => {
    const f = vi.fn();
    const r = await convertShopee(new URL("https://shopee.com.br/Fone-i.123.456?sp_atk=abc&utm=1"), undefined, undefined, f as never);
    expect(r).toEqual({ url: "https://shopee.com.br/Fone-i.123.456", tagApplied: false });
    expect(f).not.toHaveBeenCalled();
  });
  it("com chaves assina a chamada e usa o link curto devolvido", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ data: { generateShortLink: { shortLink: "https://s.shopee.com.br/abc" } } })));
    const r = await convertShopee(new URL("https://shopee.com.br/Fone-i.123.456"), "app", "segredo", f as never);
    expect(r).toEqual({ url: "https://s.shopee.com.br/abc", tagApplied: true });
    const [endpoint, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe("https://open-api.affiliate.shopee.com.br/graphql");
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^SHA256 Credential=app, Timestamp=\d+, Signature=[0-9a-f]{64}$/);
  });
  it("se a API falhar, cai para a URL limpa", async () => {
    const f = vi.fn(async () => { throw new Error("fora do ar"); });
    const r = await convertShopee(new URL("https://shopee.com.br/x-i.1.2?a=1"), "app", "segredo", f as never);
    expect(r).toEqual({ url: "https://shopee.com.br/x-i.1.2", tagApplied: false });
  });
  it("só com o ID de afiliado monta o link an_redir", async () => {
    const r = await convertShopee(new URL("https://shopee.com.br/Fone-i.123.456?sp_atk=abc"), undefined, undefined, undefined, "18367380014");
    expect(r).toEqual({
      url: "https://s.shopee.com.br/an_redir?origin_link=https%3A%2F%2Fshopee.com.br%2FFone-i.123.456&affiliate_id=18367380014&sub_id=ofertasegura",
      tagApplied: true,
    });
  });
  it("troca o afiliado de um link an_redir de outra pessoa", async () => {
    const outro = "https://s.shopee.com.br/an_redir?origin_link=https%3A%2F%2Fshopee.com.br%2FFone-i.123.456&affiliate_id=999&sub_id=x";
    const r = await convertShopee(new URL(outro), undefined, undefined, undefined, "18367380014");
    expect(r.url).toContain("affiliate_id=18367380014");
    expect(r.url).not.toContain("999");
  });
  it("lê loja e item do link e busca título e foto pela API", async () => {
    expect(shopeeIds(new URL("https://shopee.com.br/Fone-Bluetooth-i.123.456"))).toEqual({ shopId: "123", itemId: "456" });
    expect(shopeeIds(new URL("https://shopee.com.br/product/123/456"))).toEqual({ shopId: "123", itemId: "456" });
    expect(shopeeIds(new URL("https://shopee.com.br/flash_sale"))).toBeNull();
    const f = vi.fn(async () => new Response(JSON.stringify({ data: { productOfferV2: { nodes: [{ productName: "Fone Bluetooth", imageUrl: "https://cf.shopee.com.br/file/abc" }] } } })));
    const info = await shopeeProductInfo(new URL("https://shopee.com.br/Fone-i.123.456"), "app", "segredo", f as never);
    expect(info).toEqual({ title: "Fone Bluetooth", image: "https://cf.shopee.com.br/file/abc" });
    expect(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)).toContain("shopId: 123, itemId: 456");
    expect(await shopeeProductInfo(new URL("https://shopee.com.br/Fone-i.123.456"))).toEqual({ title: null, image: null });
  });
  it("assinatura é o SHA256 de appId+timestamp+payload+secret", () => {
    const esperado = createHash("sha256").update("a1cd").digest("hex");
    expect(shopeeAuthHeader("a", "d", "c", 1)).toBe(`SHA256 Credential=a, Timestamp=1, Signature=${esperado}`);
  });
});

describe("convertToAffiliate", () => {
  it("lojas parceiras saem como afiliado", async () => {
    const r = await convertToAffiliate("https://www.amazon.com.br/dp/B09B8VGCR8?tag=x-20", env);
    expect(r).toEqual({ url: "https://www.amazon.com.br/dp/B09B8VGCR8?tag=meutag-20", store: "Amazon", isAffiliate: true, tagApplied: true });
  });
  it("outras lojas voltam intactas", async () => {
    const url = "https://www.kabum.com.br/produto/123?utm=1";
    expect(await convertToAffiliate(url, env)).toEqual({ url, store: null, isAffiliate: false, tagApplied: false });
  });
  it("clone de loja não recebe link de afiliado", async () => {
    const url = "https://amazon-ofertas.shop/dp/B09B8VGCR8";
    expect((await convertToAffiliate(url, env)).isAffiliate).toBe(false);
  });
});
