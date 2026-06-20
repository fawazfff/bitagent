import { prisma } from './db';
import { portfolioService } from './portfolio';

export async function updateTradePnL(tradeId: string): Promise<{ pnl: number; pnlPercent: number } | null> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || trade.status !== "OPEN") return null;

  const { fetchTicker } = await import("./bitget");
  const ticker = await fetchTicker(trade.symbol);
  if (!ticker) return null;

  const currentPrice = parseFloat(ticker.lastPr);
  let pnl: number;
  let pnlPercent: number;

  if (trade.direction === "LONG") {
    pnl = ((currentPrice - trade.entry) / trade.entry) * trade.size * (trade.leverage / 10);
    pnlPercent = ((currentPrice - trade.entry) / trade.entry) * 100 * (trade.leverage / 10);
  } else {
    pnl = ((trade.entry - currentPrice) / trade.entry) * trade.size * (trade.leverage / 10);
    pnlPercent = ((trade.entry - currentPrice) / trade.entry) * 100 * (trade.leverage / 10);
  }

  await prisma.trade.update({
    where: { id: tradeId },
    data: { pnl, pnlPercent },
  });

  return { pnl, pnlPercent };
}

export async function closeTrade(
  tradeId: string
): Promise<{ pnl: number; pnlPercent: number; closePrice: number } | null> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || trade.status !== "OPEN") return null;

  const { fetchTicker } = await import("./bitget");
  const ticker = await fetchTicker(trade.symbol);
  if (!ticker) return null;

  const closePrice = parseFloat(ticker.lastPr);
  
  // Use portfolio service to close trade
  const updatedTrade = await portfolioService.closeTrade(tradeId, closePrice);
  
  return {
    pnl: updatedTrade.pnl || 0,
    pnlPercent: updatedTrade.pnlPercent || 0,
    closePrice,
  };
}

export async function getPortfolioStats() {
  const portfolio = await portfolioService.getPortfolio();
  const openTrades = await portfolioService.getOpenTrades();
  const closedTrades = await portfolioService.getClosedTrades();

  // Update open trade PnLs
  for (const trade of openTrades) {
    await updateTradePnL(trade.id);
  }

  const refreshedOpen = await prisma.trade.findMany({ where: { status: "OPEN" } });

  const totalOpenPnL = refreshedOpen.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalClosedPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalPnL = totalOpenPnL + totalClosedPnL;

  const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0).length;
  const losingTrades = closedTrades.filter((t) => (t.pnl || 0) <= 0).length;
  const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

  const avgWin = winningTrades > 0
    ? closedTrades.filter((t) => (t.pnl || 0) > 0).reduce((s, t) => s + (t.pnl || 0), 0) / winningTrades
    : 0;
  const avgLoss = losingTrades > 0
    ? Math.abs(closedTrades.filter((t) => (t.pnl || 0) <= 0).reduce((s, t) => s + (t.pnl || 0), 0) / losingTrades)
    : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999.99 : 0;

  return {
    initialBalance: portfolio.initialBalance,
    currentBalance: portfolio.currentBalance,
    totalEquity: portfolio.currentBalance + totalOpenPnL,
    openPositions: refreshedOpen.length,
    closedPositions: closedTrades.length,
    totalTrades: refreshedOpen.length + closedTrades.length,
    totalPnL,
    totalOpenPnL,
    totalClosedPnL,
    totalPnlPercent: ((portfolio.currentBalance - portfolio.initialBalance) / portfolio.initialBalance) * 100,
    winRate,
    winningTrades,
    losingTrades,
    avgWin,
    avgLoss,
    profitFactor,
    totalVolume: [...refreshedOpen, ...closedTrades].reduce((s, t) => s + t.size, 0),
  };
}
