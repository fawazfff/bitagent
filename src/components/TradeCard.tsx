"use client";

interface TradeData {
  tradeId: string;
  symbol: string;
  direction: string;
  leverage: number;
  riskLevel: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  riskRewardRatio: number;
  thesis: string;
  currentPrice: number;
  high24h: number;
  low24h: number;
  change24h: number;
  balanceBefore: number;
  requiredMargin: number;
  remainingBalance: number;
}

export default function TradeCard({ data }: { data: TradeData }) {
  const isLong = data.direction === "LONG";
  const changeColor = data.change24h >= 0 ? "text-green" : "text-red";
  const riskColor =
    data.riskLevel === "low"
      ? "text-green"
      : data.riskLevel === "medium"
      ? "text-yellow"
      : "text-red";

  return (
    <div className="bg-surface-3 border border-border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isLong ? "bg-green/20 text-green" : "bg-red/20 text-red"
          }`}>
            {data.direction}
          </span>
          <span className="font-semibold">{data.symbol}</span>
          <span className="text-text-dim text-sm">{data.leverage}x</span>
        </div>
        <div className={`text-sm ${changeColor}`}>
          {data.change24h >= 0 ? "+" : ""}{(data.change24h * 100).toFixed(2)}%
        </div>
      </div>

      {/* Portfolio Impact */}
      <div className="bg-surface border border-border rounded p-3 space-y-2">
        <div className="text-xs text-text-dim font-medium mb-2">Portfolio Impact</div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-text-dim text-xs">Balance</div>
            <div className="font-medium">${data.balanceBefore.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-text-dim text-xs">Margin</div>
            <div className="font-medium text-yellow">${data.requiredMargin.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-text-dim text-xs">Remaining</div>
            <div className="font-medium">${data.remainingBalance.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Trade Details */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-text-dim text-xs">Entry</div>
          <div className="font-medium">${data.entry.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-text-dim text-xs">Stop Loss</div>
          <div className="font-medium text-red">${data.stopLoss.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-text-dim text-xs">Take Profit</div>
          <div className="font-medium text-green">${data.takeProfit.toFixed(2)}</div>
        </div>
      </div>

      {/* Risk & Size */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-text-dim">Size: </span>
          <span className="font-medium">${data.size.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-text-dim">R:R </span>
          <span className="font-medium">{data.riskRewardRatio.toFixed(2)}</span>
        </div>
        <div className={riskColor}>
          {data.riskLevel.toUpperCase()}
        </div>
      </div>

      {/* Market Context */}
      <div className="text-xs text-text-dim border-t border-border pt-2">
        <div className="flex justify-between">
          <span>24h High: ${data.high24h.toFixed(2)}</span>
          <span>24h Low: ${data.low24h.toFixed(2)}</span>
        </div>
      </div>

      {/* Thesis */}
      {data.thesis && (
        <div className="text-xs text-text-dim italic border-t border-border pt-2">
          "{data.thesis}"
        </div>
      )}
    </div>
  );
}
