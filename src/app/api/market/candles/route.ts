import { NextRequest } from "next/server";
import { fetchCandles } from "@/lib/bitget";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const granularity = request.nextUrl.searchParams.get("granularity") || "1H";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100");

  const candles = await fetchCandles(symbol, granularity, limit);
  return Response.json(candles);
}
