import { NextResponse, type NextRequest } from "next/server";
import { listOffers, storeStatus } from "@/lib/historyStore";

export async function GET(req: NextRequest) {
  // Ler a requisição mantém a rota dinâmica: o histórico é sempre lido na hora, nunca em cache de build.
  void req.headers.get("accept");
  const offers = await listOffers();
  const debug = req.nextUrl.searchParams.has("diag") ? { diag: storeStatus() } : {};
  return NextResponse.json({ offers, ...debug }, { headers: { "Cache-Control": "no-store" } });
}
