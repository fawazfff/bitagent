"use client";

import { useState, useEffect } from "react";

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  leverage: number;
  riskLevel: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  status: string;
  pnl: number | null;
  pnlPercent: number | null;
  closePrice: number | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
  thesis: string;
  openedAt: string;
  closedAt: string | null;
}

interface PortfolioStats {
  initialBalance: number;
  currentBalance: number;
  totalEquity: number;
  openPositions: number;
  closedPositions: number;
  totalTrades: number;
  totalPnL: number;
  totalOpenPnL: number;
  totalClosedPnL: number;
  totalPnlPercent: number;
  winRate: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalVolume: number;
}

interface BalanceSnapshot {
  id: string;
  balance: number;
  timestamp: string;
}

// Safe number formatting helper
const fmt = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return "0.00";
  return value.toFixed(decimals);
};

export default function Dashboard() {
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<BalanceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [tradesRes, statsRes, portfolioRes] = await Promise.all([
        fetch("/api/trades"),
        fetch("/api/trades/stats"),
        fetch("/api/portfolio"),
      ]);
      
      const tradesData = await tradesRes.json();
      const statsData = await statsRes.json();
      const portfolioData = await portfolioRes.json();

      setOpenTrades(tradesData.openTrades || []);
      setClosedTrades(tradesData.closedTrades || []);
      setStats(statsData);
      setBalanceHistory(portfolioData.balanceHistory || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeTrade = async (tradeId: string) => {
    try {
      await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", tradeId }),
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to close trade:", error);
    }
  };

  const exportTradingLog = async () => {
    try {
      const response = await fetch("/api/trading-log");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bitagent-trading-log.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export trading log:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-dim">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Portfolio Balance Card */}
      {stats && (
        <div className="mb-6 bg-surface-2 border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Portfolio</h2>
            <button
              onClick={exportTradingLog}
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Export Trading Log
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-text-dim text-sm mb-1">Current Balance</div>
              <div className="text-2xl font-bold">${fmt(stats.currentBalance)}</div>
              <div className={`text-sm ${(stats.totalPnL || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                {(stats.totalPnL || 0) >= 0 ? '+' : ''}{fmt(stats.totalPnL)} ({fmt(stats.totalPnlPercent)}%)
              </div>
            </div>
            
            <div>
              <div className="text-text-dim text-sm mb-1">Total Equity</div>
              <div className="text-2xl font-bold">${fmt(stats.totalEquity)}</div>
              <div className="text-text-dim text-sm">Balance + Open PnL</div>
            </div>
            
            <div>
              <div className="text-text-dim text-sm mb-1">Open PnL</div>
              <div className={`text-2xl font-bold ${(stats.totalOpenPnL || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                {(stats.totalOpenPnL || 0) >= 0 ? '+' : ''}${fmt(stats.totalOpenPnL)}
              </div>
              <div className="text-text-dim text-sm">{stats.openPositions} open positions</div>
            </div>
            
            <div>
              <div className="text-text-dim text-sm mb-1">Closed PnL</div>
              <div className={`text-2xl font-bold ${(stats.totalClosedPnL || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                {(stats.totalClosedPnL || 0) >= 0 ? '+' : ''}${fmt(stats.totalClosedPnL)}
              </div>
              <div className="text-text-dim text-sm">{stats.closedPositions} closed trades</div>
            </div>
          </div>
          
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-border">
            <div>
              <div className="text-text-dim text-sm mb-1">Win Rate</div>
              <div className="text-lg font-semibold">{fmt(stats.winRate, 1)}%</div>
              <div className="text-text-dim text-xs">{stats.winningTrades}W / {stats.losingTrades}L</div>
            </div>
            
            <div>
              <div className="text-text-dim text-sm mb-1">Profit Factor</div>
              <div className="text-lg font-semibold">{fmt(stats.profitFactor)}</div>
            </div>
            
            <div>
              <div className="text-text-dim text-sm mb-1">Avg Win</div>
              <div className="text-lg font-semibold text-green">${fmt(stats.avgWin)}</div>
            </div>
            
            <div>
              <div className="text-text-dim text-sm mb-1">Avg Loss</div>
              <div className="text-lg font-semibold text-red">-${fmt(stats.avgLoss)}</div>
            </div>
            
            <div>
              <div className="text-text-dim text-sm mb-1">Total Volume</div>
              <div className="text-lg font-semibold">${fmt(stats.totalVolume, 0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Balance History Chart */}
      {balanceHistory.length > 1 && (
        <div className="mb-6 bg-surface-2 border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Balance History</h3>
          <div className="h-48 flex items-end justify-between gap-1">
            {balanceHistory.map((snapshot, index) => {
              const minBalance = Math.min(...balanceHistory.map(s => s.balance));
              const maxBalance = Math.max(...balanceHistory.map(s => s.balance));
              const range = maxBalance - minBalance || 1;
              const height = ((snapshot.balance - minBalance) / range) * 100;
              
              return (
                <div
                  key={snapshot.id}
                  className="flex-1 bg-accent/30 hover:bg-accent/50 rounded-t transition-colors relative group"
                  style={{ height: `${Math.max(height, 5)}%` }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-3 border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    ${fmt(snapshot.balance)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-text-dim">
            <span>{new Date(balanceHistory[0].timestamp).toLocaleDateString()}</span>
            <span>{new Date(balanceHistory[balanceHistory.length - 1].timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {/* Trades Tabs */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("open")}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === "open"
                ? "bg-surface-3 text-foreground border-b-2 border-accent"
                : "text-text-dim hover:text-foreground"
            }`}
          >
            Open Positions ({openTrades.length})
          </button>
          <button
            onClick={() => setActiveTab("closed")}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === "closed"
                ? "bg-surface-3 text-foreground border-b-2 border-accent"
                : "text-text-dim hover:text-foreground"
            }`}
          >
            Closed Trades ({closedTrades.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === "open" ? (
            openTrades.length === 0 ? (
              <div className="text-center py-12 text-text-dim">
                No open positions. Start a conversation to place a trade.
              </div>
            ) : (
              <div className="space-y-4">
                {openTrades.map((trade) => (
                  <div key={trade.id} className="bg-surface-3 border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            trade.direction === "LONG" ? "bg-green/20 text-green" : "bg-red/20 text-red"
                          }`}>
                            {trade.direction}
                          </span>
                          <span className="font-semibold">{trade.symbol}</span>
                          <span className="text-text-dim text-sm">{trade.leverage}x</span>
                        </div>
                        <div className="text-text-dim text-sm">
                          Entry: ${fmt(trade.entry)} | Size: ${fmt(trade.size)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          (trade.pnl || 0) >= 0 ? 'text-green' : 'text-red'
                        }`}>
                          {(trade.pnl || 0) >= 0 ? '+' : ''}${fmt(trade.pnl)}
                        </div>
                        <div className={`text-sm ${
                          (trade.pnlPercent || 0) >= 0 ? 'text-green' : 'text-red'
                        }`}>
                          {(trade.pnlPercent || 0) >= 0 ? '+' : ''}{fmt(trade.pnlPercent)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <div className="text-text-dim text-xs mb-1">Stop Loss</div>
                        <div className="text-red">${fmt(trade.stopLoss)}</div>
                      </div>
                      <div>
                        <div className="text-text-dim text-xs mb-1">Take Profit</div>
                        <div className="text-green">${fmt(trade.takeProfit)}</div>
                      </div>
                      <div>
                        <div className="text-text-dim text-xs mb-1">Risk Level</div>
                        <div className={
                          trade.riskLevel === "low" ? "text-green" :
                          trade.riskLevel === "medium" ? "text-yellow" : "text-red"
                        }>
                          {trade.riskLevel.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    {trade.thesis && (
                      <div className="text-text-dim text-sm mb-3 italic">
                        "{trade.thesis}"
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="text-text-dim text-xs">
                        Opened: {new Date(trade.openedAt).toLocaleString()}
                      </div>
                      <button
                        onClick={() => closeTrade(trade.id)}
                        className="px-4 py-2 bg-red/20 hover:bg-red/30 text-red rounded-lg text-sm font-medium transition-colors"
                      >
                        Close Position
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            closedTrades.length === 0 ? (
              <div className="text-center py-12 text-text-dim">
                No closed trades yet.
              </div>
            ) : (
              <div className="space-y-4">
                {closedTrades.map((trade) => (
                  <div key={trade.id} className="bg-surface-3 border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            trade.direction === "LONG" ? "bg-green/20 text-green" : "bg-red/20 text-red"
                          }`}>
                            {trade.direction}
                          </span>
                          <span className="font-semibold">{trade.symbol}</span>
                          <span className="text-text-dim text-sm">{trade.leverage}x</span>
                        </div>
                        <div className="text-text-dim text-sm">
                          Entry: ${fmt(trade.entry)} → Exit: ${fmt(trade.closePrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          (trade.pnl || 0) >= 0 ? 'text-green' : 'text-red'
                        }`}>
                          {(trade.pnl || 0) >= 0 ? '+' : ''}${fmt(trade.pnl)}
                        </div>
                        <div className={`text-sm ${
                          (trade.pnlPercent || 0) >= 0 ? 'text-green' : 'text-red'
                        }`}>
                          {(trade.pnlPercent || 0) >= 0 ? '+' : ''}{fmt(trade.pnlPercent)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <div className="text-text-dim text-xs mb-1">Balance Before</div>
                        <div>${fmt(trade.balanceBefore) || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-text-dim text-xs mb-1">Balance After</div>
                        <div className={
                          (trade.pnl || 0) >= 0 ? 'text-green' : 'text-red'
                        }>
                          ${fmt(trade.balanceAfter) || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {trade.thesis && (
                      <div className="text-text-dim text-sm mb-3 italic">
                        "{trade.thesis}"
                      </div>
                    )}
                    
                    <div className="text-text-dim text-xs">
                      Closed: {trade.closedAt ? new Date(trade.closedAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
