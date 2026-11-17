import { describe, expect, it, vi } from "vitest";
import {
  amazonAsin, amazonProductInfo, mercadoLivreIds, mercadoLivreProductInfo, parseAmazonItem, parseMercadoLivre,
} from "@/lib/productApis";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("Amazon (Creators API)", () => {
  it("acha o ASIN no link", () => {
    expect(amazonAsin(new URL("https://www.amazon.com.br/Echo-Dot/dp/B09B8VGCR8?tag=x"))).toBe("B09B8VGCR8");
    expect(amazonAsin(new URL("https://www.amazon.com.br/gp/product/b09b8vgcr8"))).toBe("B09B8VGCR8");
    expect(amazonAsin(new URL("https://www.amazon.com.br/s?k=fone"))).toBeNull();
  });

  it("lê título e foto nos dois estilos de resposta", () => {
    const camel = { itemsResult: { items: [{ itemInfo: { title: { displayValue: "Echo Dot" } }, images: { primary: { large: { url: "https://m.media-amazon.com/images/I/a.jpg" } } } }] } };
    const pascal = { ItemsResult: { Items: [{ ItemInfo: { Title: { DisplayValue: "Echo Dot" } }, Images: { Primary: { Medium: { URL: "x" }, Large: { Url: "https://m.media-amazon.com/images/I/b.jpg" } } } }] } };
    expect(parseAmazonItem(camel)).toEqual({ title: "Echo Dot", image: "https://m.media-amazon.com/images/I/a.jpg" });
    expect(parseAmazonItem(pascal)).toEqual({ title: "Echo Dot", image: "https://m.media-amazon.com/images/I/b.jpg" });
    expect(parseAmazonItem({})).toEqual({ title: null, image: null });
  });

  it("sem chaves não chama nada", async () => {
    const f = vi.fn();
    expect(await amazonProductInfo(new URL("https://www.amazon.com.br/dp/B09B8VGCR8"), {}, f as never)).toEqual({ title: null, image: null });
    expect(f).not.toHaveBeenCalled();
  });

  it("pega o token, consulta o GetItems do Brasil e reaproveita o token", async () => {
    const f = vi.fn(async (u: string | URL | Request) =>
      String(u).includes("auth/o2/token")
        ? json({ access_token: "tok", expires_in: 3600 })
        : json({ itemsResult: { items: [{ itemInfo: { title: { displayValue: "Echo Dot" } }, images: { primary: { large: { url: "https://m.media-amazon.com/images/I/a.jpg" } } } }] } }),
    );
    const env = { id: "amzn1.application-oa2-client.teste", secret: "s", tag: "meutag-20" };
    const r = await amazonProductInfo(new URL("https://www.amazon.com.br/dp/B09B8VGCR8"), env, f as never);
    expect(r.image).toBe("https://m.media-amazon.com/images/I/a.jpg");
    const [, init] = f.mock.calls[1] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-marketplace"]).toBe("www.amazon.com.br");
    expect(JSON.parse(String(init.body))).toMatchObject({ itemIds: ["B09B8VGCR8"], partnerTag: "meutag-20" });
    await amazonProductInfo(new URL("https://www.amazon.com.br/dp/B000000001"), env, f as never);
    expect(f.mock.calls.filter((c) => String(c[0]).includes("auth/o2/token"))).toHaveLength(1);
  });

  it("se a Amazon recusar (conta ainda sem acesso), segue sem foto", async () => {
    const f = vi.fn(async () => json({ errors: [{ code: "AssociateNotEligible" }] }, 403));
    const r = await amazonProductInfo(new URL("https://www.amazon.com.br/dp/B09B8VGCR8"), { id: "outro", secret: "s", tag: "t" }, f as never);
    expect(r).toEqual({ title: null, image: null });
  });
});

describe("Mercado Livre (API oficial)", () => {
  it("separa página de catálogo e anúncio", () => {
    expect(mercadoLivreIds(new URL("https://www.mercadolivre.com.br/whey/p/MLB19373961"))).toEqual({ kind: "products", id: "MLB19373961" });
    expect(mercadoLivreIds(new URL("https://produto.mercadolivre.com.br/MLB-5312090728-sapateira-_JM"))).toEqual({ kind: "items", id: "MLB5312090728" });
    expect(mercadoLivreIds(new URL("https://www.mercadolivre.com.br/ofertas"))).toBeNull();
  });

  it("lê nome e foto de produto e de anúncio", () => {
    expect(parseMercadoLivre({ name: "Whey", pictures: [{ url: "https://http2.mlstatic.com/D_1.jpg" }] })).toEqual({ title: "Whey", image: "https://http2.mlstatic.com/D_1.jpg" });
    expect(parseMercadoLivre({ title: "Sapateira", thumbnail: "http://http2.mlstatic.com/D_2.jpg" })).toEqual({ title: "Sapateira", image: "https://http2.mlstatic.com/D_2.jpg" });
  });

  it("usa o token do aplicativo para consultar o produto", async () => {
    const f = vi.fn(async (u: string | URL | Request) =>
      String(u).includes("oauth/token") ? json({ access_token: "APP_USR-1", expires_in: 21600 }) : json({ name: "Whey", pictures: [{ secure_url: "https://http2.mlstatic.com/D_1.jpg" }] }),
    );
    const r = await mercadoLivreProductInfo(new URL("https://www.mercadolivre.com.br/whey/p/MLB19373961"), { id: "123", secret: "s" }, f as never);
    expect(r).toEqual({ title: "Whey", image: "https://http2.mlstatic.com/D_1.jpg" });
    expect(String(f.mock.calls[1][0])).toBe("https://api.mercadolibre.com/products/MLB19373961");
  });

  it("sem chaves, ou com a API recusando, segue sem foto", async () => {
    const f = vi.fn(async () => json({ code: "unauthorized" }, 401));
    expect(await mercadoLivreProductInfo(new URL("https://www.mercadolivre.com.br/x/p/MLB1"), {}, f as never)).toEqual({ title: null, image: null });
    expect(await mercadoLivreProductInfo(new URL("https://www.mercadolivre.com.br/x/p/MLB1"), { id: "9", secret: "s" }, f as never)).toEqual({ title: null, image: null });
  });
});
