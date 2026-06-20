import { prisma } from './db';

export class PortfolioService {
  private static instance: PortfolioService;
  
  private constructor() {}
  
  static getInstance(): PortfolioService {
    if (!PortfolioService.instance) {
      PortfolioService.instance = new PortfolioService();
    }
    return PortfolioService.instance;
  }

  async getOrCreatePortfolio() {
    let portfolio = await prisma.portfolio.findFirst();
    
    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          initialBalance: 20000,
          currentBalance: 20000,
          totalPnl: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
        },
      });
      
      // Create initial balance snapshot
      await prisma.balanceSnapshot.create({
        data: { balance: 20000 },
      });
    }
    
    return portfolio;
  }

  async openTrade(tradeData: {
    symbol: string;
    direction: string;
    leverage: number;
    riskLevel: string;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    size: number;
    thesis: string;
    reason: string;
    conversationId?: string;
  }) {
    const portfolio = await this.getOrCreatePortfolio();
    
    // Check if we have enough balance
    const requiredMargin = tradeData.size / tradeData.leverage;
    if (portfolio.currentBalance < requiredMargin) {
      throw new Error(`Insufficient balance. Required: $${requiredMargin.toFixed(2)}, Available: $${portfolio.currentBalance.toFixed(2)}`);
    }
    
    // Create trade with balance tracking
    const trade = await prisma.trade.create({
      data: {
        ...tradeData,
        balanceBefore: portfolio.currentBalance,
        status: 'OPEN',
      },
    });
    
    // Update portfolio stats
    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        totalTrades: { increment: 1 },
      },
    });
    
    // Record balance snapshot
    await prisma.balanceSnapshot.create({
      data: { balance: portfolio.currentBalance },
    });
    
    return trade;
  }

  async closeTrade(tradeId: string, closePrice: number) {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });
    
    if (!trade) {
      throw new Error('Trade not found');
    }
    
    if (trade.status !== 'OPEN') {
      throw new Error('Trade is already closed');
    }
    
    const portfolio = await this.getOrCreatePortfolio();
    
    // Calculate PnL
    const priceChange = trade.direction === 'LONG' 
      ? (closePrice - trade.entry) / trade.entry
      : (trade.entry - closePrice) / trade.entry;
    
    const pnl = priceChange * trade.size * trade.leverage;
    const pnlPercent = priceChange * 100 * trade.leverage;
    
    // Update trade
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'CLOSED',
        closePrice,
        pnl,
        pnlPercent,
        balanceAfter: portfolio.currentBalance + pnl,
        closedAt: new Date(),
      },
    });
    
    // Update portfolio
    const newBalance = portfolio.currentBalance + pnl;
    const newTotalPnl = portfolio.totalPnl + pnl;
    const isWin = pnl > 0;
    
    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        currentBalance: newBalance,
        totalPnl: newTotalPnl,
        winningTrades: isWin ? { increment: 1 } : undefined,
        losingTrades: !isWin ? { increment: 1 } : undefined,
      },
    });
    
    // Record balance snapshot
    await prisma.balanceSnapshot.create({
      data: { balance: newBalance },
    });
    
    return updatedTrade;
  }

  async getPortfolio() {
    return await this.getOrCreatePortfolio();
  }

  async getBalanceHistory() {
    return await prisma.balanceSnapshot.findMany({
      orderBy: { timestamp: 'asc' },
    });
  }

  async getOpenTrades() {
    return await prisma.trade.findMany({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
  }

  async getClosedTrades() {
    return await prisma.trade.findMany({
      where: { status: 'CLOSED' },
      orderBy: { closedAt: 'desc' },
    });
  }

  async getAllTrades() {
    return await prisma.trade.findMany({
      orderBy: { openedAt: 'desc' },
    });
  }

  async updateOpenTradePnL(tradeId: string, currentPrice: number) {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });
    
    if (!trade || trade.status !== 'OPEN') {
      return null;
    }
    
    const priceChange = trade.direction === 'LONG'
      ? (currentPrice - trade.entry) / trade.entry
      : (trade.entry - currentPrice) / trade.entry;
    
    const pnl = priceChange * trade.size * trade.leverage;
    const pnlPercent = priceChange * 100 * trade.leverage;
    
    await prisma.trade.update({
      where: { id: tradeId },
      data: { pnl, pnlPercent },
    });
    
    return { pnl, pnlPercent };
  }
}

export const portfolioService = PortfolioService.getInstance();
