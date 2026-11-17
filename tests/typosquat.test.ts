import { describe, expect, it } from "vitest";
import { extractHostname, rootDomain } from "@/lib/domain";
import { detectClone, levenshtein } from "@/lib/typosquat";
import { computeScore, parseRdap } from "@/lib/siteCheck";
import { mergeOffer, type VerifiedOffer } from "@/lib/historyStore";
import { extractMetadata, titleFromUrl } from "@/lib/metadata";
import { isPrivateIp } from "@/lib/netSafety";

describe("domínio", () => {
  it("extrai o host de entradas variadas", () => {
    expect(extractHostname("://lojaexemplo.com.br")).toBe("lojaexemplo.com.br");
    expect(extractHostname("HTTPS://WWW.Loja.com.br/produto?x=1")).toBe("www.loja.com.br");
    expect(extractHostname("loja xpto")).toBeNull();
    expect(extractHostname("127.0.0.1")).toBeNull();
  });
  it("acha o domínio raiz", () => {
    expect(rootDomain("www.loja.exemplo.com.br")).toBe("exemplo.com.br");
    expect(rootDomain("blog.exemplo.com")).toBe("exemplo.com");
    expect(rootDomain("gov.br")).toBe("gov.br");
  });
});

describe("levenshtein", () => {
  it("conta trocas, inserções e remoções", () => {
    expect(levenshtein("amazon", "amazom")).toBe(1);
    expect(levenshtein("shopee", "shoppe")).toBe(1);
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
  });
});

describe("detector de clones", () => {
  it.each([
    "mercadolivre-promocao.com", "magalu-ofertas.shop", "amazom.com.br", "shoppe.com.br",
    "amaz0n.com.br", "nubamk.com.br", "mercadolivre.com.br.ofertas-x.com", "amazon.shop",
    "lojaamericanas.net", "correios-rastreio.com", "casasbahiaofertas.com.br", "shopee-brasil.top",
    "mercadolivree.com", "magazineluizaa.com.br",
  ])("%s é apontado como clone", (d) => {
    expect(detectClone(d).status).toBe("clone");
  });

  it.each([
    ["mercadolivre.com.br", "Mercado Livre"], ["produto.mercadolivre.com.br", "Mercado Livre"],
    ["amazon.com.br", "Amazon"], ["www.amazon.com.br", "Amazon"], ["shopee.com.br", "Shopee"],
    ["magazineluiza.com.br", "Magalu"], ["sacola.magazineluiza.com.br", "Magalu"],
    ["americanas.com.br", "Americanas"], ["casasbahia.com.br", "Casas Bahia"],
    ["nubank.com.br", "Nubank"], ["correios.com.br", "Correios"], ["www.gov.br", "Gov.br"],
    ["receita.fazenda.gov.br", "Gov.br"],
  ])("%s é oficial (%s)", (d, brand) => {
    expect(detectClone(d)).toMatchObject({ status: "official", brand });
  });

  it.each(["kabum.com.br", "amazonia.com.br", "lojaxpto.com.br", "google.com", "netshoes.com.br", "magazine.com.br"])(
    "%s não é acusado à toa",
    (d) => {
      expect(detectClone(d).status).toBe("none");
    },
  );
});

describe("pontuação", () => {
  const ssl = { checked: true, valid: true, issuer: "Let's Encrypt", validTo: null, daysLeft: 60 };
  const dns = { resolves: true, ip: "1.2.3.4" };
  const age = (d: number | null) => ({ createdAt: null, ageDays: d, holder: null });

  it("domínio antigo e oficial fica no topo", () => {
    const s = computeScore({ age: age(14 * 365), ssl, dns, clone: { status: "official", brand: "Amazon" } });
    expect(s.score).toBeGreaterThanOrEqual(95);
    expect(s.level).toBe("confiavel");
  });
  it("domínio com menos de 6 meses é alto risco", () => {
    const s = computeScore({ age: age(12), ssl, dns, clone: { status: "none" } });
    expect(s.score).toBeLessThanOrEqual(35);
    expect(s.level).toBe("risco");
    expect(s.alerts.join(" ")).toContain("há 12 dias");
  });
  it("clone nunca passa de 15, mesmo antigo e com SSL", () => {
    const s = computeScore({ age: age(3000), ssl, dns, clone: { status: "clone", brand: "Amazon", reason: "x" } });
    expect(s.score).toBeLessThanOrEqual(15);
    expect(s.alerts[0]).toContain("phishing");
  });
  it("sem SSL válido cai para atenção ou pior", () => {
    const s = computeScore({ age: age(800), ssl: { ...ssl, valid: false, error: "expirado" }, dns, clone: { status: "none" } });
    expect(s.level).not.toBe("confiavel");
  });
});

describe("RDAP", () => {
  it("lê a data de criação e o titular com CNPJ", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const r = parseRdap({
      events: [{ eventAction: "registration", eventDate: "2016-01-01T00:00:00Z" }],
      entities: [{ roles: ["registrant"], publicIds: [{ type: "cnpj" }], vcardArray: ["vcard", [["fn", {}, "text", "Loja Exemplo LTDA"]]] }],
    }, now);
    expect(r.ageDays).toBe(3653);
    expect(r.holder).toBe("Loja Exemplo LTDA");
  });
  it("não expõe titular pessoa física", () => {
    const r = parseRdap({
      events: [{ eventAction: "registration", eventDate: "2020-01-01T00:00:00Z" }],
      entities: [{ roles: ["registrant"], publicIds: [{ type: "cpf" }], vcardArray: ["vcard", [["fn", {}, "text", "Fulano"]]] }],
    });
    expect(r.holder).toBeNull();
  });
});

describe("histórico", () => {
  const o = (n: number, extra: Partial<VerifiedOffer> = {}): VerifiedOffer => ({
    id: String(n), title: `Produto ${n}`, image: null, store: "Amazon", affiliateUrl: `https://www.amazon.com.br/dp/${n}`, verifiedAt: n, ...extra,
  });
  it("guarda no máximo 20, com a mais nova no topo", () => {
    let list: VerifiedOffer[] = [];
    for (let i = 1; i <= 25; i++) list = mergeOffer(list, o(i));
    expect(list).toHaveLength(20);
    expect(list[0].id).toBe("25");
  });
  it("não duplica o mesmo produto", () => {
    const list = mergeOffer(mergeOffer(mergeOffer([], o(1)), o(2)), o(1, { id: "novo", verifiedAt: 99 }));
    expect(list.map((x) => x.id)).toEqual(["novo", "2"]);
  });
});

describe("metadados e segurança de rede", () => {
  it("lê og:title e og:image", () => {
    const m = extractMetadata(
      `<html><head><meta property="og:title" content="Fone JBL &amp; Case | Amazon.com.br"><meta content="//img.x.com/a.jpg" property="og:image"></head>`,
      "https://www.amazon.com.br/dp/X",
    );
    expect(m).toEqual({ title: "Fone JBL & Case", image: "https://img.x.com/a.jpg" });
  });
  it("acha a foto principal em páginas da Amazon", () => {
    const html = `<title>Echo Dot</title><img alt="x" src="https://m.media-amazon.com/images/I/71abc._AC_SX679_.jpg" id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/71abc._AC_SL1000_.jpg">`;
    expect(extractMetadata(html, "https://www.amazon.com.br/dp/X").image).toBe("https://m.media-amazon.com/images/I/71abc._AC_SL1000_.jpg");
    expect(extractMetadata(`<script>{"hiRes":"https://m.media-amazon.com/images/I/81zz.jpg"}</script>`, "https://www.amazon.com.br/dp/X").image).toBe("https://m.media-amazon.com/images/I/81zz.jpg");
  });
  it("ignora páginas de bloqueio e usa o link como alternativa", () => {
    expect(extractMetadata("<title>Robot Check</title>", "https://a.com").title).toBeNull();
    expect(titleFromUrl("https://www.magazineluiza.com.br/smart-tv-50-4k-samsung/p/236591400/et/tv4k/")).toBe("Smart tv 50 4k samsung");
  });
  it("bloqueia endereços internos", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.169.254", "172.16.0.1", "::1", "fd00::1"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });
});
