import OpenAI from "openai";
import { fetchTicker, fetchCandles, resolveSymbol } from "./bitget";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
});

export interface TradePlan {
  symbol: string;
  direction: "LONG" | "SHORT";
  leverage: number;
  riskLevel: "low" | "medium" | "high";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  riskRewardRatio: number;
  thesis: string;
  reason: string;
  currentPrice: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

interface ParsedIntent {
  symbol: string;
  direction: "LONG" | "SHORT" | "UNKNOWN";
  leverage: number;
  riskLevel: "low" | "medium" | "high";
  rawSymbol: string;
}

function calculateStopLossAndTakeProfit(
  entry: number,
  direction: "LONG" | "SHORT",
  riskLevel: "low" | "medium" | "high"
): { stopLoss: number; takeProfit: number; riskRewardRatio: number } {
  const riskMultipliers = { low: 0.02, medium: 0.04, high: 0.07 };
  const rewardMultipliers = { low: 0.04, medium: 0.08, high: 0.14 };

  const riskPct = riskMultipliers[riskLevel];
  const rewardPct = rewardMultipliers[riskLevel];

  let stopLoss: number;
  let takeProfit: number;

  if (direction === "LONG") {
    stopLoss = entry * (1 - riskPct);
    takeProfit = entry * (1 + rewardPct);
  } else {
    stopLoss = entry * (1 + riskPct);
    takeProfit = entry * (1 - rewardPct);
  }

  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  return { stopLoss, takeProfit, riskRewardRatio };
}

function calculatePositionSize(
  riskLevel: "low" | "medium" | "high",
  leverage: number
): number {
  const baseSizes = { low: 500, medium: 1000, high: 2000 };
  return baseSizes[riskLevel] * (leverage / 5);
}

async function parseIntent(userMessage: string): Promise<ParsedIntent> {
  const systemPrompt = `You are a trade intent parser. Extract structured trading intent from natural language.
Respond ONLY with valid JSON, no markdown, no explanation.

Schema:
{
  "rawSymbol": "BTC",
  "direction": "LONG" | "SHORT" | "UNKNOWN",
  "leverage": number (1-125, default 10),
  "riskLevel": "low" | "medium" | "high"
}

Rules:
- "long", "buy", "bullish" → LONG
- "short", "sell", "bearish" → SHORT
- If direction unclear, infer from context. If truly ambiguous, use "LONG" as default.
- "conservative", "safe", "low risk" → low
- "moderate", "medium", "balanced" → medium
- "aggressive", "high risk", "degen" → high
- Default leverage: 10x if not specified
- Extract the base symbol (BTC, ETH, SOL, etc.)
- If no symbol found, default to "BTC"`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const text = completion.choices[0]?.message?.content || "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      rawSymbol: parsed.rawSymbol || "BTC",
      symbol: resolveSymbol(parsed.rawSymbol || "BTC"),
      direction: parsed.direction === "SHORT" ? "SHORT" : "LONG",
      leverage: Math.min(125, Math.max(1, parseInt(parsed.leverage) || 10)),
      riskLevel: ["low", "medium", "high"].includes(parsed.riskLevel)
        ? parsed.riskLevel
        : "medium",
    };
  } catch {
    return {
      rawSymbol: "BTC",
      symbol: "BTCUSDT",
      direction: "LONG",
      leverage: 10,
      riskLevel: "medium",
    };
  }
}

async function generateThesis(
  intent: ParsedIntent,
  currentPrice: number,
  high24h: number,
  low24h: number,
  change24h: number,
  candles: { close: string; high: string; low: string; baseVol: string }[]
): Promise<string> {
  const recentCandles = candles.slice(0, 12).map((c) => ({
    close: parseFloat(c.close),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
  }));

  const systemPrompt = `You are a professional crypto futures trading analyst. Generate a concise trade thesis (2-3 sentences) for a ${intent.direction} position on ${intent.rawSymbol}.

Current price: $${currentPrice.toLocaleString()}
24h High: $${high24h.toLocaleString()}
24h Low: $${low24h.toLocaleString()}
24h Change: ${(change24h * 100).toFixed(2)}%
Leverage: ${intent.leverage}x
Risk: ${intent.riskLevel}

Recent price action (last 12 hourly closes): ${JSON.stringify(recentCandles.map(c => c.close))}

Be specific about price levels, momentum, and why this trade makes sense. Sound like a professional trader, not a chatbot. Do NOT use markdown formatting. Keep it to 2-3 sentences max.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate thesis for ${intent.direction} ${intent.rawSymbol} at $${currentPrice.toLocaleString()}` },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || `Analyzing ${intent.rawSymbol} for a ${intent.direction} opportunity based on current market structure and momentum.`;
  } catch {
    return `${intent.direction.charAt(0) + intent.direction.slice(1)} ${intent.rawSymbol} at $${currentPrice.toLocaleString()}. 24h range: $${low24h.toLocaleString()} - $${high24h.toLocaleString()}. Change: ${(change24h * 100).toFixed(2)}%. Risk level: ${intent.riskLevel}.`;
  }
}

export async function createTradePlan(userMessage: string): Promise<TradePlan> {
  // 1. Parse intent
  const intent = await parseIntent(userMessage);

  // 2. Fetch live market data
  const ticker = await fetchTicker(intent.symbol);
  const candles = await fetchCandles(intent.symbol, "1H", 48);

  const currentPrice = ticker ? parseFloat(ticker.lastPr) : 0;
  const high24h = ticker ? parseFloat(ticker.high24h) : 0;
  const low24h = ticker ? parseFloat(ticker.low24h) : 0;
  const change24h = ticker ? parseFloat(ticker.change24h) : 0;

  if (currentPrice === 0) {
    throw new Error(`Unable to fetch price for ${intent.symbol}. The symbol may not exist on Bitget futures.`);
  }

  // 3. Calculate trade levels
  const direction: "LONG" | "SHORT" = intent.direction === "SHORT" ? "SHORT" : "LONG";
  const { stopLoss, takeProfit, riskRewardRatio } = calculateStopLossAndTakeProfit(
    currentPrice,
    direction,
    intent.riskLevel
  );

  const size = calculatePositionSize(intent.riskLevel, intent.leverage);

  // 4. Generate thesis
  const thesis = await generateThesis(
    intent,
    currentPrice,
    high24h,
    low24h,
    change24h,
    candles
  );

  // 5. Build reason summary
  const reason = `${direction} ${intent.rawSymbol} at $${currentPrice.toLocaleString()} with ${intent.leverage}x leverage. ${intent.riskLevel.charAt(0).toUpperCase() + intent.riskLevel.slice(1)} risk profile. R:R ratio of ${riskRewardRatio.toFixed(2)}:1.`;

  return {
    symbol: intent.symbol,
    direction,
    leverage: intent.leverage,
    riskLevel: intent.riskLevel,
    entry: currentPrice,
    stopLoss,
    takeProfit,
    size,
    riskRewardRatio,
    thesis,
    reason,
    currentPrice,
    high24h,
    low24h,
    change24h,
  };
}
