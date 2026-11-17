import { NextResponse, type NextRequest } from "next/server";
import { listOffers } from "@/lib/historyStore";

export async function GET(req: NextRequest) {
  // Ler a requisição mantém a rota dinâmica: o histórico é sempre lido na hora, nunca em cache de build.
  void req.headers.get("accept");
  const offers = await listOffers();
  return NextResponse.json({ offers }, { headers: { "Cache-Control": "no-store" } });
}
