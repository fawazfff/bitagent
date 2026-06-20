import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createTradePlan } from "@/lib/agent";
import { portfolioService } from "@/lib/portfolio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {},
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Check if this is a trade request
    const isTradeRequest = /long|short|buy|sell|trade|open|position|leverage|futures/i.test(message);

    let agentResponse: string;
    let tradeData = null;

    if (isTradeRequest) {
      try {
        const plan = await createTradePlan(message);
        
        // Get portfolio to check balance
        const portfolio = await portfolioService.getPortfolio();
        const requiredMargin = plan.size / plan.leverage;
        
        if (portfolio.currentBalance < requiredMargin) {
          agentResponse = `⚠️ **Insufficient Balance**

Current Balance: $${portfolio.currentBalance.toFixed(2)}
Required Margin: $${requiredMargin.toFixed(2)}

This trade requires $${requiredMargin.toFixed(2)} in margin (position size $${plan.size.toFixed(2)} / ${plan.leverage}x leverage).

Try reducing the position size or leverage, or close some open positions to free up capital.`;
        } else {
          // Create paper trade with portfolio tracking
          const trade = await portfolioService.openTrade({
            symbol: plan.symbol,
            direction: plan.direction,
            leverage: plan.leverage,
            riskLevel: plan.riskLevel,
            entry: plan.entry,
            stopLoss: plan.stopLoss,
            takeProfit: plan.takeProfit,
            size: plan.size,
            thesis: plan.thesis,
            reason: plan.reason,
            conversationId: conversation.id,
          });

          tradeData = {
            tradeId: trade.id,
            symbol: plan.symbol,
            direction: plan.direction,
            leverage: plan.leverage,
            riskLevel: plan.riskLevel,
            entry: plan.entry,
            stopLoss: plan.stopLoss,
            takeProfit: plan.takeProfit,
            size: plan.size,
            riskRewardRatio: plan.riskRewardRatio,
            thesis: plan.thesis,
            currentPrice: plan.currentPrice,
            high24h: plan.high24h,
            low24h: plan.low24h,
            change24h: plan.change24h,
            balanceBefore: portfolio.currentBalance,
            requiredMargin: requiredMargin,
            remainingBalance: portfolio.currentBalance - requiredMargin,
          };

          agentResponse = formatTradeResponse(plan, portfolio.currentBalance, requiredMargin);
        }
      } catch (err: unknown) {
        console.error("Trade creation error:", err);
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        
        // Check if it's an OpenAI API key issue
        if (errorMsg.includes("Incorrect API key") || errorMsg.includes("sk-placeholder")) {
          agentResponse = `⚠️ **OpenAI API Key Not Configured**

The AI agent requires a valid OpenAI API key to analyze trades and generate thesis.

**Current Status:**
- Market data: ✅ Working (Bitget API connected)
- AI analysis: ❌ Missing API key
- Paper trading: ✅ Working

**To enable full functionality:**
1. Get an OpenAI API key from platform.openai.com
2. Add it to the .env file: OPENAI_API_KEY=your-key-here
3. Restart the application

**Fallback Mode:**
I can still create basic paper trades without AI analysis. Try rephrasing your request or check the dashboard to see market data.`;
        } else {
          agentResponse = `I wasn't able to process that trade request. ${errorMsg}. Try specifying a different symbol or rephrasing your request.`;
        }
      }
    } else {
      // General conversation
      agentResponse = generateGeneralResponse(message);
    }

    // Save agent message
    const agentMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "agent",
        content: agentResponse,
        tradeData: tradeData ? JSON.stringify(tradeData) : null,
      },
    });

    return Response.json({
      conversationId: conversation.id,
      messageId: agentMsg.id,
      response: agentResponse,
      tradeData,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    
    // Provide helpful error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("database") || errorMessage.includes("prisma")) {
      return Response.json({ 
        error: "Database connection error. The application is running but the database is not initialized properly.",
        details: errorMessage
      }, { status: 500 });
    }
    
    return Response.json({ 
      error: "Internal server error",
      details: errorMessage
    }, { status: 500 });
  }
}

function formatTradeResponse(
  plan: Awaited<ReturnType<typeof createTradePlan>>,
  currentBalance: number,
  requiredMargin: number
): string {
  const arrow = plan.direction === "LONG" ? "📈" : "📉";
  const riskColor = plan.riskLevel === "low" ? "🟢" : plan.riskLevel === "medium" ? "🟡" : "🔴";

  return `${arrow} **${plan.direction} ${plan.symbol}** — Paper Trade Executed

**Portfolio**
Balance: $${currentBalance.toFixed(2)}
Required Margin: $${requiredMargin.toFixed(2)}
Remaining: $${(currentBalance - requiredMargin).toFixed(2)}

**Market Overview**
Current Price: $${plan.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
24h Range: $${plan.low24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — $${plan.high24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
24h Change: ${(plan.change24h * 100).toFixed(2)}%

**Trade Parameters**
Direction: ${plan.direction}
Leverage: ${plan.leverage}x
${riskColor} Risk: ${plan.riskLevel.toUpperCase()}
Position Size: $${plan.size.toLocaleString()}

**Trade Levels**
Entry: $${plan.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Stop Loss: $${plan.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Take Profit: $${plan.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Risk/Reward: ${plan.riskRewardRatio.toFixed(2)}:1

**Thesis**
${plan.thesis}

*Paper trade confirmed. No real funds at risk.*`;
}

function generateGeneralResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("help") || lower.includes("what can")) {
    return `I'm BitAgent, your natural language futures trading assistant. Here's what I can do:

**Trade Commands:**
• "Long BTC with 5x leverage"
• "Short ETH with medium risk"
• "Open a conservative SOL futures trade"
• "Aggressive long DOGE at 20x"

**Portfolio Management:**
• Starting balance: $20,000
• Track PnL and balance changes
• View open and closed positions
• Export trading log

**I'll analyze:**
• Market conditions from Bitget
• Calculate entry, stop loss, and take profit
• Generate a trade thesis
• Execute a simulated paper trade
• Track your portfolio balance

All trades are paper trades — no real money is ever at risk. What would you like to trade?`;
  }

  if (lower.includes("portfolio") || lower.includes("balance") || lower.includes("positions") || lower.includes("pnl")) {
    return `Check the **Dashboard** tab to see:
• Current portfolio balance
• Open positions with live PnL
• Closed trades history
• Win rate and performance stats
• Balance history chart

Your starting balance is $20,000. Each trade tracks margin usage and balance changes.`;
  }

  if (lower.includes("price") || lower.includes("market")) {
    return `I can fetch live prices from Bitget when you mention a trading pair. Try something like "Long BTC" or "What's the price of SOL?" — just phrase it as a trade request and I'll pull the latest market data.`;
  }

  return `I'm BitAgent, your paper trading assistant for Bitget futures. Tell me what you'd like to trade — for example:

• "Long BTC with 10x leverage"
• "Short ETH if momentum weakens"
• "Open a conservative SOL trade"

Your portfolio starts with $20,000. Type **help** for more options, or just tell me what you want to trade.`;
}
