import type { Metadata } from "next";
import { Suspense } from "react";
import { lerStats, totalPeriodo, type Dia } from "@/lib/stats";

export const metadata: Metadata = { title: "Painel de uso — Oferta Segura", robots: { index: false, follow: false } };

const LINHAS: { chave: string; rotulo: string }[] = [
  { chave: "visita", rotulo: "Visitas ao site" },
  { chave: "instalacao", rotulo: "Instalações do app" },
  { chave: "app_aberto", rotulo: "Aberturas pelo ícone do app" },
  { chave: "oferta_parceira", rotulo: "Ofertas verificadas (lojas parceiras)" },
  { chave: "oferta_parceira:Amazon", rotulo: "   · Amazon" },
  { chave: "oferta_parceira:Mercado Livre", rotulo: "   · Mercado Livre" },
  { chave: "oferta_parceira:Shopee", rotulo: "   · Shopee" },
  { chave: "oferta_parceira:Magalu", rotulo: "   · Magalu" },
  { chave: "oferta_outra", rotulo: "Links de outras lojas" },
  { chave: "site_confiavel", rotulo: "Sites analisados: confiáveis" },
  { chave: "site_atencao", rotulo: "Sites analisados: atenção" },
  { chave: "site_risco", rotulo: "Sites analisados: alto risco" },
];

async function Conteudo({ searchParams }: { searchParams: Promise<{ chave?: string }> }) {
  const { chave } = await searchParams;
  const certa = process.env.PAINEL_CHAVE;
  if (!certa || chave !== certa) {
    return <p className="p-6 text-center text-muted">Página não encontrada.</p>;
  }
  const s = await lerStats();
  const periodos: [string, Dia][] = [
    ["Hoje", totalPeriodo(s, 1)],
    ["7 dias", totalPeriodo(s, 7)],
    ["30 dias", totalPeriodo(s, 30)],
    ["Total", totalPeriodo(s, 0)],
  ];
  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <h1 className="font-display text-2xl font-extrabold text-petrol">Painel de uso</h1>
      <p className="mt-1 text-sm text-muted">
        Contagem anônima, sem dados pessoais. Datas no horário de Brasília. Atualize a página para ver os números novos.
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="p-3"></th>
              {periodos.map(([p]) => (
                <th key={p} className="p-3 text-right font-semibold">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => (
              <tr key={l.chave} className="border-b border-line/60 last:border-0">
                <td className={`p-3 ${l.rotulo.startsWith(" ") ? "pl-7 text-muted" : "font-medium"}`}>{l.rotulo.trim()}</td>
                {periodos.map(([p, d]) => (
                  <td key={p} className="p-3 text-right tabular-nums">{d[l.chave] || 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        “Instalações” conta o aviso do Android/Chrome e, no iPhone, a primeira abertura do app instalado. Quem limpa os dados do
        navegador pode ser contado de novo.
      </p>
    </main>
  );
}

export default function Painel({ searchParams }: { searchParams: Promise<{ chave?: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-muted">Carregando…</p>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}
