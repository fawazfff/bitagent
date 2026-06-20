import { portfolioService } from "@/lib/portfolio";

export async function GET() {
  const portfolio = await portfolioService.getPortfolio();
  const balanceHistory = await portfolioService.getBalanceHistory();
  
  return Response.json({
    portfolio,
    balanceHistory,
  });
}
