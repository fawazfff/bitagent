import { NextRequest } from "next/server";
import { fetchTicker } from "@/lib/bitget";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const ticker = await fetchTicker(symbol);

  if (!ticker) {
    return Response.json({ error: "Ticker not found" }, { status: 404 });
  }

  return Response.json(ticker);
}
