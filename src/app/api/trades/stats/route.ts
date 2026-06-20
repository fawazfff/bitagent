import { getPortfolioStats } from "@/lib/trading-engine";
import { portfolioService } from "@/lib/portfolio";

export async function GET() {
  const stats = await getPortfolioStats();
  return Response.json(stats);
}
