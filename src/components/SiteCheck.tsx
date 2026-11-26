"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconAlert, IconCheck, IconExternal, IconSearch, Spinner } from "./icons";

interface Report {
  domain: string;
  score: number;
  level: "confiavel" | "atencao" | "risco";
  positives: string[];
  alerts: string[];
  age: { createdAt: string | null; ageDays: number | null; holder: string | null; error?: string };
  ssl: { valid: boolean; error?: string };
  clone: { status: "official" | "clone" | "none"; brand?: string; reason?: string };
  dns: { resolves: boolean; ip: string | null };
  links: { reclameAqui: string; googleTransparencia: string; receitaCnpj: string };
}

const LEVEL = {
  confiavel: { label: "Confiável", color: "var(--color-ok)", text: "text-ok", soft: "bg-ok-soft", note: "Os sinais técnicos são bons." },
  atencao: { label: "Atenção", color: "var(--color-warn)", text: "text-warn", soft: "bg-warn-soft", note: "Há pontos que pedem cuidado." },
  risco: { label: "Alto risco", color: "var(--color-risk)", text: "text-risk", soft: "bg-risk-soft", note: "Suspeita de golpe. Evite comprar." },
} as const;

function formatAge(days: number): string {
  if (days < 1) return "hoje";
  if (days < 60) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  const y = Math.floor(days / 365);
  return `há ${y} ${y === 1 ? "ano" : "anos"}`;
}

const dateBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "");

function Gauge({ score, level }: { score: number; level: Report["level"] }) {
  const r = 80;
  const len = Math.PI * r;
  const L = LEVEL[level];
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`Pontuação ${score} de 100: ${L.label}`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--color-line)" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={L.color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * len} ${len}`}
          style={{ transition: "stroke-dasharray 700ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className={`font-display text-6xl font-extrabold leading-none tracking-tight ${L.text}`}>{score}</span>
        <span className="text-base font-semibold text-muted"> /100</span>
      </div>
    </div>
  );
}

function Fact({ title, tone, value, detail }: { title: string; tone: "ok" | "warn" | "risk"; value: string; detail?: string }) {
  const toneClass = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-risk";
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[13px] font-semibold text-muted">{title}</p>
      <p className={`mt-1 flex items-start gap-1.5 text-[15px] font-bold leading-snug ${toneClass}`}>
        {tone === "ok" ? <IconCheck className="mt-0.5 size-4 shrink-0" /> : <IconAlert className="mt-0.5 size-4 shrink-0" />}
        <span>{value}</span>
      </p>
      {detail && <p className="mt-1 break-words text-[13px] leading-snug text-muted">{detail}</p>}
    </div>
  );
}

export default function SiteCheck({ initialDomain }: { initialDomain: string }) {
  const [value, setValue] = useState(initialDomain);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const lastAuto = useRef("");

  const analyze = useCallback(async (input: string) => {
    const v = input.trim();
    if (!v) {
      setError("Digite o endereço do site para analisar.");
      return;
    }
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/checar-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainOrUrl: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "A análise falhou.");
      setReport(data);
    } catch (e) {
      setError(e instanceof TypeError ? "Sem conexão. Confira sua internet e tente de novo." : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialDomain && lastAuto.current !== initialDomain) {
      lastAuto.current = initialDomain;
      setValue(initialDomain);
      analyze(initialDomain);
    }
  }, [initialDomain, analyze]);

  const L = report ? LEVEL[report.level] : null;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyze(value);
        }}
        className="rounded-3xl border border-line bg-card p-4 shadow-[0_10px_30px_-18px_rgba(9,56,50,0.45)] sm:p-5"
      >
        <label htmlFor="site" className="block text-[15px] font-semibold">
          Endereço do site
        </label>
        <input
          id="site"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="lojaexemplo.com.br"
          className="mt-2 w-full rounded-xl border-2 border-line bg-paper px-4 py-3.5 text-base outline-none placeholder:text-muted/70 focus:border-petrol"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-petrol py-3.5 text-base font-bold text-white hover:bg-petrol-deep disabled:opacity-70"
        >
          {loading ? <Spinner className="size-5" /> : <IconSearch className="size-5" />}
          {loading ? "Analisando… leva alguns segundos" : "Analisar site"}
        </button>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-risk-soft px-4 py-3 text-sm font-medium text-risk">
            {error}
          </p>
        )}
        <p className="mt-3 text-[13px] leading-snug text-muted">
          Conferimos há quanto tempo o site existe, o certificado de segurança e se ele imita uma marca conhecida.
        </p>
      </form>

      <div aria-live="polite">
        {report && L && (
          <div className="mt-5 space-y-3">
            <section className={`rounded-3xl border-2 bg-card p-5 text-center`} style={{ borderColor: L.color }}>
              <p className="break-all text-sm font-semibold text-muted">{report.domain}</p>
              <div className="mt-2">
                <Gauge score={report.score} level={report.level} />
              </div>
              <p className={`mt-3 font-display text-2xl font-extrabold ${L.text}`}>{L.label}</p>
              <p className="text-[15px] text-muted">{L.note}</p>
            </section>

            {report.clone.status === "clone" && (
              <div className="flex gap-3 rounded-2xl bg-risk p-4 text-white">
                <IconAlert className="mt-0.5 size-6 shrink-0" />
                <div>
                  <p className="font-bold">Alerta crítico: possível site falso (phishing)</p>
                  <p className="mt-1 text-[15px] leading-snug">{report.clone.reason} Não informe senha, CPF nem cartão.</p>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Fact
                title="Tempo de registro do domínio"
                tone={report.age.ageDays === null ? "warn" : report.age.ageDays < 183 ? "risk" : report.age.ageDays < 365 ? "warn" : "ok"}
                value={
                  report.age.ageDays === null
                    ? report.age.error || "Não foi possível consultar"
                    : report.age.ageDays < 183
                      ? `Alerta: criado ${formatAge(report.age.ageDays)}`
                      : `Registrado ${formatAge(report.age.ageDays)}`
                }
                detail={[report.age.createdAt ? `Desde ${dateBR(report.age.createdAt)}` : "", report.age.holder ? `Titular: ${report.age.holder}` : ""].filter(Boolean).join(". ")}
              />
              <Fact
                title="Certificado de segurança (SSL)"
                tone={report.ssl.valid ? "ok" : "risk"}
                value={report.ssl.valid ? "Válido" : report.dns.resolves ? "Inválido ou ausente" : "Não verificado"}
                detail={
                  report.ssl.valid
                    ? "Conexão segura conferida: certificado aceito e dentro da validade."
                    : report.ssl.error
                }
              />
              <Fact
                title="Marca oficial e anti-clone"
                tone={report.clone.status === "clone" ? "risk" : "ok"}
                value={
                  report.clone.status === "official"
                    ? `Domínio oficial: ${report.clone.brand}`
                    : report.clone.status === "clone"
                      ? `Imitação${report.clone.brand ? ` de ${report.clone.brand}` : ""}`
                      : "Não imita marcas conhecidas"
                }
                detail={report.clone.status === "none" ? "Comparado com Mercado Livre, Amazon, Shopee, Magalu, Americanas, Casas Bahia, Nubank, Correios e Gov.br." : report.clone.reason}
              />
              <Fact
                title="Servidor ativo"
                tone={report.dns.resolves ? "ok" : "risk"}
                value={report.dns.resolves ? "Site no ar" : "Site fora do ar"}
                detail={report.dns.ip ? `IP ${report.dns.ip}` : "O endereço não aponta para nenhum servidor."}
              />
            </div>

            {(report.alerts.length > 0 || report.positives.length > 0) && (
              <section className="rounded-2xl border border-line bg-card p-4">
                <h3 className="font-display text-lg font-bold">O que pesou na nota</h3>
                <ul className="mt-2 space-y-2 text-[15px] leading-snug">
                  {report.alerts.map((a) => (
                    <li key={a} className="flex gap-2 text-risk">
                      <IconAlert className="mt-0.5 size-4 shrink-0" />
                      <span>{a}</span>
                    </li>
                  ))}
                  {report.positives.map((p) => (
                    <li key={p} className="flex gap-2">
                      <IconCheck className="mt-0.5 size-4 shrink-0 text-ok" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-line bg-card p-4">
              <h3 className="font-display text-lg font-bold">Confira também</h3>
              <p className="mt-1 text-sm text-muted">Reclamações de clientes e o CNPJ dizem o que a análise técnica não vê.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  ["Buscar no Reclame Aqui", report.links.reclameAqui],
                  ["Consultar CNPJ na Receita", report.links.receitaCnpj],
                  ["Google Transparência", report.links.googleTransparencia],
                ].map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border-2 border-line px-3 py-3 text-sm font-semibold text-petrol hover:border-petrol"
                  >
                    {label}
                    <IconExternal className="size-4 shrink-0" />
                  </a>
                ))}
              </div>
            </section>

            <p className="px-1 text-[13px] leading-snug text-muted">
              A nota é uma análise automática de sinais técnicos. Ela ajuda a decidir, mas não é garantia: um site bem avaliado ainda pode atrasar entregas, e um site novo pode ser honesto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
