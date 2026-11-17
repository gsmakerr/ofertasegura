import { NextResponse } from "next/server";
import { extractHostname } from "@/lib/domain";
import { clientIp, rateLimited } from "@/lib/netSafety";
import { analyzeSite } from "@/lib/siteCheck";

export const maxDuration = 10;

export async function POST(req: Request) {
  if (rateLimited(`site:${clientIp(req)}`, 12)) {
    return NextResponse.json({ error: "Muitas análises em pouco tempo. Aguarde um minuto e tente de novo." }, { status: 429 });
  }
  let body: { domainOrUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Envie o endereço no formato correto." }, { status: 400 });
  }
  const host = typeof body?.domainOrUrl === "string" ? extractHostname(body.domainOrUrl) : null;
  if (!host) {
    return NextResponse.json({ error: "Digite um endereço de site válido, como lojaexemplo.com.br." }, { status: 400 });
  }
  try {
    return NextResponse.json(await analyzeSite(host.replace(/^www\./, "")));
  } catch {
    return NextResponse.json({ error: "A análise falhou. Tente de novo em instantes." }, { status: 500 });
  }
}
