import { portfolioService } from "@/lib/portfolio";

export async function GET() {
  const trades = await portfolioService.getAllTrades();
  const portfolio = await portfolioService.getPortfolio();
  
  // Format as CSV
  const headers = [
    "Timestamp",
    "Symbol",
    "Direction",
    "Leverage",
    "Risk Level",
    "Entry Price",
    "Exit Price",
    "Size (USD)",
    "PnL (USD)",
    "PnL (%)",
    "Balance Before",
    "Balance After",
    "Status",
    "Thesis"
  ];
  
  const rows = trades.map(trade => [
    trade.openedAt.toISOString(),
    trade.symbol,
    trade.direction,
    trade.leverage.toString(),
    trade.riskLevel,
    trade.entry.toFixed(2),
    trade.closePrice ? trade.closePrice.toFixed(2) : "OPEN",
    trade.size.toFixed(2),
    trade.pnl ? trade.pnl.toFixed(2) : "0.00",
    trade.pnlPercent ? trade.pnlPercent.toFixed(2) : "0.00",
    trade.balanceBefore ? trade.balanceBefore.toFixed(2) : "N/A",
    trade.balanceAfter ? trade.balanceAfter.toFixed(2) : "N/A",
    trade.status,
    `"${trade.thesis.replace(/"/g, '""')}"`
  ]);
  
  const csv = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");
  
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=bitagent-trading-log.csv",
    },
  });
}
