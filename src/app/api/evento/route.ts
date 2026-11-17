import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/netSafety";
import { registrar, type Evento } from "@/lib/stats";

// Só estes eventos podem vir do navegador; os de verificação são contados pelo próprio servidor.
const PERMITIDOS: Evento[] = ["visita", "instalacao", "app_aberto"];

export async function POST(req: Request) {
  if (rateLimited(`evento:${clientIp(req)}`, 30)) return new NextResponse(null, { status: 204 });
  let tipo: unknown;
  try {
    tipo = (await req.json())?.tipo;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (typeof tipo === "string" && PERMITIDOS.includes(tipo as Evento)) {
    await registrar(tipo as Evento);
  }
  return new NextResponse(null, { status: 204 });
}
