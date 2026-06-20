# BitAgent - AI-Powered Natural Language Trading Agent

<div align="center">

**Track 1 · Trading Agent**

[Live Demo](https://txevcacg.mule.page/) · [Paper Trading Log](./trading-log.csv) · [Architecture Docs](./ARCHITECTURE.md)

</div>

---

## Overview

BitAgent is an AI-powered paper trading platform that converts natural language instructions into structured crypto futures trades. Users interact through a chat interface, and the system autonomously analyzes market conditions, calculates risk parameters, and executes simulated trades using real-time Bitget market data.

**Starting Balance:** $20,000 USD  
**Trading Type:** Paper Trading (Simulated)  
**Market:** Bitget USDT-M Futures  
**Supported Assets:** 25+ major cryptocurrencies (BTC, ETH, SOL, DOGE, etc.)

---

## Project Description

### 1. What It Does

BitAgent is a natural language-driven trading agent that:

- **Parses user intent** from plain English (e.g., "Long BTC with 5x leverage")
- **Fetches real-time market data** from Bitget futures API
- **Calculates trade parameters** (entry, stop loss, take profit, position size)
- **Generates AI-powered trade thesis** using OpenAI GPT-4o-mini
- **Tracks portfolio performance** with $20,000 starting balance
- **Records all trades** with complete audit trail for analysis

### 2. How It Works

**User Flow:**
1. User types natural language trade instruction in chat
2. AI agent parses intent (symbol, direction, leverage, risk level)
3. System fetches live Bitget market data (price, 24h stats, candles)
4. Trade parameters calculated (SL/TP based on risk level, position sizing)
5. AI generates professional trade thesis
6. Paper trade executed and stored in database
7. Portfolio balance updated, PnL tracked in real-time
8. User can close positions, view dashboard, export trading log

**Example Interaction:**
```
User: "Long BTC with 5x leverage"

BitAgent:
📈 LONG BTCUSDT — Paper Trade Executed

Portfolio:
Balance: $20,000.00
Required Margin: $200.00
Remaining: $19,800.00

Market Overview:
Current Price: $64,016.30
24h Range: $63,014.70 — $64,361.10
24h Change: +1.46%

Trade Parameters:
Direction: LONG
Leverage: 10x
Risk: MEDIUM
Position Size: $2,000

Trade Levels:
Entry: $64,016.30
Stop Loss: $61,455.65
Take Profit: $69,137.60
Risk/Reward: 2.00:1

Thesis:
LONG BTC at $64,016.3. 24h range: $63,014.7 - $64,361.1. 
Change: 1.46%. Risk level: medium.
```

### 3. Key Features

**AI Trading Agent:**
- Natural language understanding (OpenAI GPT-4o-mini)
- Intent extraction (symbol, direction, leverage, risk)
- Professional trade thesis generation
- Market context analysis

**Portfolio Management:**
- $20,000 starting balance
- Real-time balance tracking
- Margin requirement validation
- PnL calculation (open and closed positions)
- Balance history chart

**Risk Management:**
- Three risk levels (low, medium, high)
- Automatic stop loss and take profit calculation
- Position sizing based on risk profile
- Risk/reward ratio display

**Dashboard:**
- Portfolio overview (balance, equity, PnL)
- Performance metrics (win rate, profit factor, avg win/loss)
- Open positions with live PnL
- Closed trades history
- Balance history visualization
- CSV trading log export

**Market Data:**
- Real-time Bitget futures prices
- 24h high/low/change
- Historical candlestick data
- 25+ supported trading pairs

### 4. Technical Architecture

**Stack:**
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (Node.js)
- **Database:** SQLite with Prisma ORM
- **AI:** OpenAI GPT-4o-mini
- **Market Data:** Bitget Public API v2

**Key Components:**
- `src/lib/agent.ts` - AI trade planning agent
- `src/lib/portfolio.ts` - Portfolio balance management
- `src/lib/trading-engine.ts` - PnL calculations
- `src/lib/bitget.ts` - Bitget API integration
- `src/components/Dashboard.tsx` - Portfolio dashboard
- `src/components/ChatInterface.tsx` - Chat UI

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete technical documentation.

---

## Live Demo

**URL:** https://txevcacg.mule.page/

No login required. Try these commands:
- "Long BTC with 5x leverage"
- "Short ETH with medium risk"
- "Open a conservative SOL trade"
- "help" - See all available commands

---

## Paper Trading Log

Complete trading record available in [trading-log.csv](./trading-log.csv)

**Required fields included:**
- Timestamp
- Trading pair
- Direction (LONG/SHORT)
- Entry/Exit price
- Position size (quantity in USD)
- PnL (USD and %)
- Account balance before/after
- Status (OPEN/CLOSED)
- AI-generated thesis

---

## Installation & Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- OpenAI API key (optional - app works without it)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/bitagent.git
cd bitagent
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-your-key-here"  # Optional
```

4. **Initialize database**
```bash
npx prisma migrate deploy
```

5. **Run development server**
```bash
npm run dev
```

6. **Open browser**
Visit http://localhost:3000

---

## Usage Examples

### Basic Trade
```
User: "Long BTC with 10x leverage"
→ Creates LONG BTCUSDT position with 10x leverage
→ Calculates SL/TP based on medium risk
→ Deducts margin from balance
→ Tracks PnL in real-time
```

### Risk Management
```
User: "Short ETH with low risk"
→ Creates SHORT ETHUSDT position
→ Uses conservative SL/TP (2% SL, 4% TP)
→ Smaller position size ($500 base)
→ 2:1 risk/reward ratio
```

### Portfolio Management
```
User: "Show my portfolio"
→ Displays current balance
→ Shows open positions
→ Lists recent trades
→ Provides performance metrics
```

---

## Project Structure

```
bitagent/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main page
│   │   ├── layout.tsx         # Root layout
│   │   └── api/
│   │       ├── chat/          # Chat API
│   │       ├── trades/        # Trades API
│   │       ├── portfolio/     # Portfolio API
│   │       ├── trading-log/   # CSV export
│   │       └── market/        # Bitget data
│   ├── lib/
│   │   ├── agent.ts           # AI agent
│   │   ├── portfolio.ts       # Portfolio management
│   │   ├── trading-engine.ts  # PnL calculations
│   │   ├── bitget.ts          # Bitget API
│   │   └── db.ts              # Database client
│   └── components/
│       ├── ChatInterface.tsx  # Chat UI
│       ├── TradeCard.tsx      # Trade display
│       └── Dashboard.tsx      # Portfolio dashboard
├── trading-log.csv            # Paper trading record
├── ARCHITECTURE.md            # Technical documentation
└── README.md                  # This file
```

---

## Database Schema

**Portfolio Model:**
- Tracks $20,000 starting balance
- Records current balance, total PnL
- Counts winning/losing trades

**Trade Model:**
- Symbol, direction, leverage, risk level
- Entry, stop loss, take profit prices
- Position size, PnL, balance before/after
- AI-generated thesis

**BalanceSnapshot Model:**
- Historical balance tracking
- Enables performance charts

---

## API Endpoints

- `POST /api/chat` - Send message to AI agent
- `GET /api/trades` - List all trades
- `POST /api/trades` - Close a trade
- `GET /api/trades/stats` - Portfolio statistics
- `GET /api/portfolio` - Portfolio data
- `GET /api/trading-log` - Export CSV
- `GET /api/market/ticker` - Live prices
- `GET /api/market/candles` - Historical data

---

## Risk Management

**Risk Levels:**
- **Low:** 2% stop loss, 4% take profit, $500 base size
- **Medium:** 4% stop loss, 8% take profit, $1000 base size
- **High:** 7% stop loss, 14% take profit, $2000 base size

All levels maintain 2:1 risk/reward ratio.

**Position Sizing:**
```
Size = Base Size × (Leverage / 5)
```

**Margin Validation:**
System prevents trades that exceed available balance.

---

## Performance Metrics

**Dashboard displays:**
- Current balance and total equity
- Open and closed PnL
- Win rate percentage
- Profit factor
- Average win/loss
- Total trading volume
- Balance history chart

---

## Limitations & Notes

**Paper Trading Only:**
- No real money trades
- All positions simulated
- For educational/demonstration purposes

**AI Thesis:**
- Requires OpenAI API key for full functionality
- Falls back to basic text without key
- Core trading works without AI

**Market Data:**
- Uses Bitget public API (no authentication needed)
- Real-time prices with 5-second cache
- 25+ supported futures pairs

---

## Future Enhancements

Potential additions:
- BTC adaptive trend + mean-reversion strategy
- Meme coin on-chain signal copy bot
- Advanced technical indicators (RSI, MACD, Bollinger Bands)
- Automated strategy execution
- Backtesting engine
- Multi-timeframe analysis
- Social sentiment integration

---

## Hackathon Submission Checklist

- ✅ **Project Description** - Complete README with four-part structure
- ✅ **Live Demo** - https://txevcacg.mule.page/ (no login required)
- ✅ **Paper Trading Log** - [trading-log.csv](./trading-log.csv) with all required fields
- ✅ **Architecture Documentation** - [ARCHITECTURE.md](./ARCHITECTURE.md)
- ✅ **Public GitHub Repository** - This repo
- ✅ **Open Source** - MIT License

---

## License

MIT License - see [LICENSE](./LICENSE) file

---

## Credits

Built for the Trading Agent hackathon (Track 1)

**Technologies:**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite
- OpenAI GPT-4o-mini
- Bitget API

---

## Contact & Support

**Live Demo:** https://txevcacg.mule.page/  
**Documentation:** [ARCHITECTURE.md](./ARCHITECTURE.md)  
**Trading Log:** [trading-log.csv](./trading-log.csv)

---

<div align="center">

**BitAgent** - AI-Powered Natural Language Trading Agent

[Live Demo](https://txevcacg.mule.page/) · [Paper Trading Log](./trading-log.csv) · [Architecture Docs](./ARCHITECTURE.md)

</div>
