# Oferta Segura

Confira para onde um link de oferta leva de verdade e descubra se um site é confiável.
Next.js (App Router) + TypeScript + Tailwind. Instalável no celular (Android e iPhone).

## Rodar no computador

Precisa do [Node.js 20.19 ou mais novo](https://nodejs.org) (recomendado: 22).

```bash
npm install
npm run dev        # abre em http://localhost:3000
npm test           # testes automáticos (conversor, anti-clone, nota, histórico, desencurtador)
```

## 1. Suas IDs de afiliado

Tudo fica em **um arquivo: `.env.local`** (já vem criado, vazio; o modelo comentado é o `.env.example`).

| Variável | Onde achar |
| --- | --- |
| `AMAZON_ASSOCIATE_TAG` | Associados Amazon, "ID de rastreamento" (ex.: `gsachados-20`) |
| `SHOPEE_AFFILIATE_ID` | seu ID de afiliado da Shopee (só números); funciona sem a Open API |
| `SHOPEE_APP_ID` / `SHOPEE_APP_SECRET` | affiliate.shopee.com.br, menu "Open API" (opcional; gera links curtos) |
| `MERCADOLIVRE_MATT_TOOL` / `MERCADOLIVRE_MATT_WORD` | os dois valores que aparecem em um link de afiliado seu |
| `MAGALU_PARTNER_ID` | nome da sua loja no Parceiro Magalu (`magazinevoce.com.br/magazineXXXX` → `XXXX`) |

Campo vazio não quebra nada: o link daquela loja sai limpo, só sem comissão.
Depois de editar, reinicie o servidor. **Na hospedagem**, cadastre os mesmos nomes em "Environment variables".

## 2. Publicar (necessário para instalar no celular)

O botão "Instalar app" só funciona em endereço **https**. O projeto está preparado para o **Netlify**:

1. O código fica em um repositório no GitHub.
2. Em [app.netlify.com](https://app.netlify.com), "Add new project" > "Import an existing project", escolha o repositório.
3. Em "Environment variables", cadastre as mesmas variáveis do `minhas-ids.txt` e `NEXT_PUBLIC_SITE_URL` com o endereço final.
4. Deploy. A cada alteração enviada ao GitHub, o Netlify publica de novo sozinho.

**Histórico na hospedagem:** no Netlify o histórico de ofertas é guardado automaticamente no Netlify Blobs,
sem configurar nada. Em outra hospedagem serverless, use Upstash (`UPSTASH_REDIS_REST_URL` e
`UPSTASH_REDIS_REST_TOKEN`). No seu PC ou em VPS, vale o arquivo `data/verified-offers.json`.

Obs.: o plano gratuito da Vercel não permite sites com links de afiliado.

## 3. Instalação no celular

- **Android (Chrome, Edge, Samsung):** o botão amarelo "Instalar app" instala direto.
- **iPhone:** a Apple não permite instalação por botão; o botão abre um passo a passo de três toques
  (Compartilhar → Adicionar à Tela de Início).
- **Aberto de dentro do Instagram/Facebook/TikTok:** o botão ensina a abrir no navegador primeiro.
- **Extra no Android:** depois de instalado, o Oferta Segura aparece no menu "Compartilhar" dos apps
  das lojas. A pessoa compartilha o produto e a verificação roda sozinha.

## O que falta validar com suas contas reais

Os testes automáticos cobrem a lógica, mas três pontos só se confirmam com suas chaves e na internet aberta:

1. **Shopee:** a assinatura da API segue o formato documentado (SHA256 de appId + timestamp + payload + secret);
   confirme gerando um link com suas chaves.
2. **Magalu:** o link é montado como `magazinevoce.com.br/magazine{SUALOJA}/{produto}`. Compare com um link
   gerado no app Parceiro Magalu; se o seu tiver outro formato, ajuste `convertMagalu` em
   `src/lib/affiliateConverter.ts` (função isolada e comentada).
3. **Mercado Livre:** os parâmetros `matt_tool`/`matt_word` são aplicados como pedido. Se o seu painel
   só gerar links curtos, confirme no relatório se os cliques estão sendo contados.

Lojas costumam bloquear leitura automática de páginas. Quando isso acontece, o título é montado a partir
do próprio link e a imagem fica com um marcador no lugar.

## Onde está cada coisa

```
src/lib/affiliateConverter.ts   conversão para links de afiliado (4 lojas)
src/lib/typosquat.ts            detector de clones; a lista de marcas (BRANDS) é editável
src/lib/siteCheck.ts            idade do domínio (RDAP), SSL, nota de 0 a 100
src/lib/historyStore.ts         últimas 20 ofertas (JSON local, Upstash ou memória)
src/lib/netSafety.ts            desencurtador + proteção contra abuso do servidor + limite por IP
src/app/api/                    verificar, checar-site, historico
src/components/                 telas e botão de instalação
public/manifest.webmanifest     nome, cores e ícones do app instalado
public/sw.js                    service worker (instalação e abertura sem internet)
public/icons/                   logo e ícones (edite os .svg e rode `npm run icones`)
```
