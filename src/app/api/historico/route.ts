import { NextResponse } from "next/server";
import { connection } from "next/server";
import { listOffers } from "@/lib/historyStore";

export async function GET() {
  await connection(); // sempre lido na hora, nunca em cache de build
  const offers = await listOffers();
  return NextResponse.json({ offers }, { headers: { "Cache-Control": "no-store" } });
}
