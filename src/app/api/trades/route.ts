import { NextRequest } from "next/server";
import { portfolioService } from "@/lib/portfolio";
import { closeTrade } from "@/lib/trading-engine";

export async function GET() {
  const openTrades = await portfolioService.getOpenTrades();
  const closedTrades = await portfolioService.getClosedTrades();

  return Response.json({ openTrades, closedTrades });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, tradeId } = body;

  if (action === "close" && tradeId) {
    const result = await closeTrade(tradeId);
    if (!result) {
      return Response.json({ error: "Trade not found or already closed" }, { status: 404 });
    }
    return Response.json({ success: true, ...result });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
