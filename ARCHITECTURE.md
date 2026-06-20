# BitAgent Architecture Documentation

## Overview

BitAgent is a full-stack natural language paper trading agent for Bitget futures markets. Users interact through a chat interface, and the system converts natural language trading instructions into structured paper trades with real-time market data from Bitget.

**Key Principle:** This is a paper trading platform only. No real money trades are ever executed.

---

## 1. Database Schema (Prisma Models)

### Technology
- **Database:** SQLite
- **ORM:** Prisma 7.x with driver adapter (`@prisma/adapter-libsql`)
- **Location:** `prisma/dev.db`

### Models

#### Conversation
Tracks chat sessions between users and the agent.

```prisma
model Conversation {
  id        String    @id @default(cuid())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}
```

#### Message
Individual messages in a conversation.

```prisma
model Message {
  id             String        @id @default(cuid())
  conversationId String
  conversation   Conversation  @relation(fields: [conversationId], references: [id])
  role           String        // "user" | "agent"
  content        String
  tradeData      String?       // JSON string of TradePlan when role=agent
  createdAt      DateTime      @default(now())
}
```

**Fields:**
- `role`: Either "user" or "agent"
- `tradeData`: When the agent responds to a trade request, this contains the structured trade plan as JSON

#### Trade
Paper trading positions (open and closed).

```prisma
model Trade {
  id              String    @id @default(cuid())
  symbol          String    // e.g. "BTCUSDT"
  direction       String    // "LONG" | "SHORT"
  leverage        Int
  riskLevel       String    // "low" | "medium" | "high"
  entry           Float
  stopLoss        Float
  takeProfit      Float
  size            Float     // notional USD
  status          String    @default("OPEN") // "OPEN" | "CLOSED"
  pnl             Float?
  pnlPercent      Float?
  closePrice      Float?
  balanceBefore   Float?    // Portfolio balance before this trade
  balanceAfter    Float?    // Portfolio balance after closing
  thesis          String
  reason          String
  conversationId  String?
  openedAt        DateTime  @default(now())
  closedAt        DateTime?
}
```

**Fields:**
- `status`: "OPEN" for active positions, "CLOSED" for settled trades
- `pnl` / `pnlPercent`: Calculated profit/loss in USD and percentage
- `balanceBefore`: Portfolio balance at the time of opening the trade
- `balanceAfter`: Portfolio balance after closing the trade (only for closed trades)
- `thesis`: AI-generated trade reasoning
- `reason`: Structured summary of trade parameters

#### Portfolio
Tracks the overall portfolio balance and performance metrics.

```prisma
model Portfolio {
  id              String   @id @default(cuid())
  initialBalance  Float    @default(20000)
  currentBalance  Float
  totalPnl        Float    @default(0)
  totalTrades     Int      @default(0)
  winningTrades   Int      @default(0)
  losingTrades    Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Fields:**
- `initialBalance`: Starting balance (default $20,000)
- `currentBalance`: Current available balance
- `totalPnl`: Cumulative profit/loss from all closed trades
- `totalTrades`: Total number of trades opened
- `winningTrades`: Count of profitable trades
- `losingTrades`: Count of losing trades

#### BalanceSnapshot
Historical balance tracking for charting and analysis.

```prisma
model BalanceSnapshot {
  id        String   @id @default(cuid())
  balance   Float
  timestamp DateTime @default(now())
}
```

**Purpose:**
- Records balance at key events (trade open, trade close)
- Enables balance history charts
- Provides audit trail for portfolio performance

---

## 2. API Endpoints

### Chat API
**Endpoint:** `POST /api/chat`

**Request:**
```json
{
  "message": "Long BTC with 5x leverage",
  "conversationId": "optional-existing-conversation-id"
}
```

**Response:**
```json
{
  "conversationId": "clx123...",
  "messageId": "clx456...",
  "response": "Formatted agent response with trade details...",
  "tradeData": {
    "tradeId": "clx789...",
    "symbol": "BTCUSDT",
    "direction": "LONG",
    "leverage": 5,
    "riskLevel": "medium",
    "entry": 67234.50,
    "stopLoss": 65890.21,
    "takeProfit": 70596.23,
    "size": 1000,
    "riskRewardRatio": 2.0,
    "thesis": "BTC showing strength above key support...",
    "currentPrice": 67234.50,
    "high24h": 68100.00,
    "low24h": 66500.00,
    "change24h": 0.0234
  }
}
```

**Behavior:**
- Creates or retrieves a conversation
- Saves user message
- Detects if message is a trade request (keywords: long, short, buy, sell, trade, open, position, leverage, futures)
- If trade request: invokes AI agent → fetches market data → creates paper trade
- If general chat: returns conversational response
- Saves agent message with optional trade data

---

### Market Data APIs

#### Ticker
**Endpoint:** `GET /api/market/ticker?symbol=BTCUSDT`

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "lastPr": "67234.50",
  "high24h": "68100.00",
  "low24h": "66500.00",
  "change24h": "0.0234",
  "baseVolume": "1234.56",
  "quoteVolume": "82345678.90",
  "openUtc0": "66800.00",
  "bidPr": "67234.00",
  "askPr": "67235.00"
}
```

#### Candles
**Endpoint:** `GET /api/market/candles?symbol=BTCUSDT&granularity=1H&limit=100`

**Response:**
```json
[
  {
    "ts": "1718900000000",
    "open": "67000.00",
    "high": "67500.00",
    "low": "66800.00",
    "close": "67234.50",
    "baseVol": "123.45",
    "quoteVol": "8234567.89"
  }
]
```

#### Contracts
**Endpoint:** `GET /api/market/contracts`

**Response:**
```json
[
  {
    "symbol": "BTCUSDT",
    "baseCoin": "BTC",
    "quoteCoin": "USDT",
    "minTradeNum": "0.001",
    "pricePlace": "1",
    "volumePlace": "3",
    "priceEndStep": "0.1",
    "volUnit": "BTC"
  }
]
```

---

### Trades API

#### List Trades
**Endpoint:** `GET /api/trades`

**Response:**
```json
{
  "openTrades": [
    {
      "id": "clx789...",
      "symbol": "BTCUSDT",
      "direction": "LONG",
      "leverage": 5,
      "riskLevel": "medium",
      "entry": 67234.50,
      "stopLoss": 65890.21,
      "takeProfit": 70596.23,
      "size": 1000,
      "status": "OPEN",
      "pnl": 123.45,
      "pnlPercent": 1.23,
      "thesis": "...",
      "openedAt": "2026-06-20T14:30:00.000Z"
    }
  ],
  "closedTrades": [...]
}
```

#### Close Trade
**Endpoint:** `POST /api/trades`

**Request:**
```json
{
  "action": "close",
  "tradeId": "clx789..."
}
```

**Response:**
```json
{
  "success": true,
  "pnl": 456.78,
  "pnlPercent": 4.56,
  "closePrice": 68500.00
}
```

---

### Portfolio Stats
**Endpoint:** `GET /api/trades/stats`

**Response:**
```json
{
  "openPositions": 3,
  "closedPositions": 12,
  "totalTrades": 15,
  "totalPnL": 1234.56,
  "totalOpenPnL": 234.56,
  "totalClosedPnL": 1000.00,
  "winRate": 66.67,
  "winningTrades": 8,
  "losingTrades": 4,
  "avgWin": 250.00,
  "avgLoss": 125.00,
  "profitFactor": 2.0,
  "totalVolume": 15000.00
}
```

---

### Conversations API

#### List Conversations
**Endpoint:** `GET /api/conversations`

**Response:**
```json
[
  {
    "id": "clx123...",
    "createdAt": "2026-06-20T14:00:00.000Z",
    "updatedAt": "2026-06-20T14:30:00.000Z",
    "messages": [
      {
        "id": "clx456...",
        "role": "user",
        "content": "Long BTC with 5x leverage",
        "tradeData": null,
        "createdAt": "2026-06-20T14:00:00.000Z"
      },
      {
        "id": "clx789...",
        "role": "agent",
        "content": "Trade executed...",
        "tradeData": "{...}",
        "createdAt": "2026-06-20T14:00:01.000Z"
      }
    ]
  }
]
```

#### Create Conversation
**Endpoint:** `POST /api/conversations`

**Response:**
```json
{
  "id": "clx123...",
  "createdAt": "2026-06-20T14:00:00.000Z",
  "updatedAt": "2026-06-20T14:00:00.000Z",
  "messages": []
}
```

---

### Portfolio API

#### Get Portfolio
**Endpoint:** `GET /api/portfolio`

**Response:**
```json
{
  "portfolio": {
    "id": "clx123...",
    "initialBalance": 20000,
    "currentBalance": 21234.56,
    "totalPnl": 1234.56,
    "totalTrades": 15,
    "winningTrades": 10,
    "losingTrades": 5,
    "createdAt": "2026-06-20T14:00:00.000Z",
    "updatedAt": "2026-06-20T15:30:00.000Z"
  },
  "balanceHistory": [
    {
      "id": "clx456...",
      "balance": 20000,
      "timestamp": "2026-06-20T14:00:00.000Z"
    },
    {
      "id": "clx789...",
      "balance": 20500,
      "timestamp": "2026-06-20T14:30:00.000Z"
    },
    {
      "id": "clx012...",
      "balance": 21234.56,
      "timestamp": "2026-06-20T15:30:00.000Z"
    }
  ]
}
```

**Purpose:**
- Returns current portfolio state and balance history
- Used by dashboard to display balance chart
- Tracks balance at every trade open/close event

---

### Trading Log API

#### Export Trading Log
**Endpoint:** `GET /api/trading-log`

**Response:** CSV file download

**CSV Format:**
```csv
Timestamp,Symbol,Direction,Leverage,Risk Level,Entry Price,Exit Price,Size (USD),PnL (USD),PnL (%),Balance Before,Balance After,Status,Thesis
2026-06-20T14:00:00.000Z,BTCUSDT,LONG,10,medium,67000.00,68500.00,2000.00,300.00,1.50,20000.00,20300.00,CLOSED,"BTC showing strength..."
2026-06-20T15:00:00.000Z,ETHUSDT,SHORT,5,low,3500.00,OPEN,1000.00,0.00,0.00,20300.00,N/A,OPEN,"ETH resistance at..."
```

**Fields:**
- `Timestamp`: Trade open time (ISO 8601)
- `Symbol`: Trading pair (e.g., BTCUSDT)
- `Direction`: LONG or SHORT
- `Leverage`: Leverage multiplier
- `Risk Level`: low, medium, or high
- `Entry Price`: Price at which trade was opened
- `Exit Price`: Price at which trade was closed (or "OPEN")
- `Size (USD)`: Position size in USD
- `PnL (USD)`: Profit/loss in USD
- `PnL (%)`: Profit/loss as percentage
- `Balance Before`: Portfolio balance before this trade
- `Balance After`: Portfolio balance after closing (or "N/A" if still open)
- `Status`: OPEN or CLOSED
- `Thesis`: AI-generated trade reasoning

**Purpose:**
- Provides complete trading record for hackathon submission
- Includes all required fields: timestamp, trading pair, direction, price, quantity, balance change
- Can be uploaded to GitHub as proof of paper trading activity

---

## 3. AI Trade Agent Workflow

### Architecture
The agent is implemented in `src/lib/agent.ts` and uses OpenAI's GPT-4o-mini for natural language understanding and thesis generation.

### Workflow Steps

#### Step 1: Parse User Intent
**Function:** `parseIntent(userMessage: string)`

**Process:**
1. Send user message to OpenAI with system prompt defining extraction schema
2. Extract structured intent:
   - `rawSymbol`: Base asset (BTC, ETH, SOL, etc.)
   - `direction`: LONG | SHORT | UNKNOWN
   - `leverage`: 1-125 (default 10)
   - `riskLevel`: low | medium | high

**System Prompt:**
```
You are a trade intent parser. Extract structured trading intent from natural language.
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
- If no symbol found, default to "BTC"
```

**Example:**
- Input: `"Long BTC with medium risk and 5x leverage"`
- Output: `{ rawSymbol: "BTC", direction: "LONG", leverage: 5, riskLevel: "medium" }`

---

#### Step 2: Resolve Symbol
**Function:** `resolveSymbol(input: string)`

Maps base symbol to Bitget futures contract symbol.

**Mapping:**
```typescript
{
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  DOGE: "DOGEUSDT",
  // ... 25+ supported symbols
}
```

---

#### Step 3: Fetch Live Market Data
**Functions:** `fetchTicker(symbol)`, `fetchCandles(symbol, granularity, limit)`

**Data Retrieved:**
- Current price (`lastPr`)
- 24h high/low
- 24h change percentage
- Recent candlestick data (48 hourly candles)

**Source:** Bitget Public API v2
- Ticker: `GET /api/v2/mix/market/ticker`
- Candles: `GET /api/v2/mix/market/candles`

---

#### Step 4: Calculate Trade Levels
**Function:** `calculateStopLossAndTakeProfit(entry, direction, riskLevel)`

**Risk Multipliers:**
| Risk Level | Stop Loss % | Take Profit % | R:R Ratio |
|------------|-------------|---------------|-----------|
| Low        | 2%          | 4%            | 2:1       |
| Medium     | 4%          | 8%            | 2:1       |
| High       | 7%          | 14%           | 2:1       |

**Calculation:**
```typescript
// LONG
stopLoss = entry * (1 - riskPct)
takeProfit = entry * (1 + rewardPct)

// SHORT
stopLoss = entry * (1 + riskPct)
takeProfit = entry * (1 - rewardPct)
```

---

#### Step 5: Calculate Position Size
**Function:** `calculatePositionSize(riskLevel, leverage)`

**Base Sizes:**
| Risk Level | Base Size | Formula              |
|------------|-----------|----------------------|
| Low        | $500      | 500 * (leverage / 5) |
| Medium     | $1000     | 1000 * (leverage / 5)|
| High       | $2000     | 2000 * (leverage / 5)|

**Example:**
- Medium risk, 10x leverage → $1000 * (10/5) = $2000 position size

---

#### Step 6: Generate Trade Thesis
**Function:** `generateThesis(intent, currentPrice, high24h, low24h, change24h, candles)`

**Process:**
1. Compile market context (price, 24h stats, recent candles)
2. Send to OpenAI with system prompt requesting 2-3 sentence thesis
3. AI analyzes momentum, support/resistance, and trade rationale

**System Prompt:**
```
You are a professional crypto futures trading analyst. Generate a concise trade thesis (2-3 sentences) for a {direction} position on {symbol}.

Current price: ${currentPrice}
24h High: ${high24h}
24h Low: ${low24h}
24h Change: {change24h}%
Leverage: {leverage}x
Risk: {riskLevel}

Recent price action (last 12 hourly closes): {closes}

Be specific about price levels, momentum, and why this trade makes sense. Sound like a professional trader, not a chatbot. Do NOT use markdown formatting. Keep it to 2-3 sentences max.
```

---

#### Step 7: Create Paper Trade
**Function:** `createTradePlan(userMessage)` (orchestrator)

**Process:**
1. Parse intent (Step 1)
2. Resolve symbol (Step 2)
3. Fetch market data (Step 3)
4. Calculate levels (Steps 4-5)
5. Generate thesis (Step 6)
6. Store trade in database via Prisma
7. Return structured `TradePlan` object

**TradePlan Structure:**
```typescript
interface TradePlan {
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
```

---

## 4. Bitget API Integration

### Base URL
```
https://api.bitget.com
```

### Endpoints Used

#### 1. Ticker (Real-time Price)
**Endpoint:** `GET /api/v2/mix/market/ticker`

**Parameters:**
- `productType`: "USDT-FUTURES"
- `symbol`: "BTCUSDT"

**Response:**
```json
{
  "code": "00000",
  "data": [
    {
      "symbol": "BTCUSDT",
      "lastPr": "67234.50",
      "high24h": "68100.00",
      "low24h": "66500.00",
      "change24h": "0.0234",
      "baseVolume": "1234.56",
      "quoteVolume": "82345678.90"
    }
  ]
}
```

**Usage:**
- Fetch current price for trade entry
- Update PnL for open positions
- Display market data in UI

**Caching:** 5 seconds (`{ next: { revalidate: 5 } }`)

---

#### 2. Candles (Historical Data)
**Endpoint:** `GET /api/v2/mix/market/candles`

**Parameters:**
- `productType`: "USDT-FUTURES"
- `symbol`: "BTCUSDT"
- `granularity`: "1H" (1 hour)
- `limit`: 100

**Response:**
```json
{
  "code": "00000",
  "data": [
    ["1718900000000", "67000.00", "67500.00", "66800.00", "67234.50", "123.45", "8234567.89"]
  ]
}
```

**Array Format:** `[timestamp, open, high, low, close, baseVolume, quoteVolume]`

**Usage:**
- Analyze recent price action for thesis generation
- Provide context to AI agent

---

#### 3. Contracts (Market Info)
**Endpoint:** `GET /api/v2/mix/market/contracts`

**Parameters:**
- `productType`: "USDT-FUTURES"

**Response:**
```json
{
  "code": "00000",
  "data": [
    {
      "symbol": "BTCUSDT",
      "baseCoin": "BTC",
      "quoteCoin": "USDT",
      "minTradeNum": "0.001",
      "pricePlace": "1",
      "volumePlace": "3"
    }
  ]
}
```

**Usage:**
- Validate supported symbols
- Display contract specifications

**Caching:** 1 hour (`{ next: { revalidate: 3600 } }`)

---

### Supported Symbols
The system supports 25+ major crypto futures pairs:
- BTC, ETH, SOL, DOGE, XRP, ADA, AVAX, LINK, DOT, MATIC
- ARB, OP, SUI, APT, NEAR, ATOM, FIL, LTC, BCH, SHIB
- PEPE, WIF, BONK, TRX, TON

All symbols are automatically suffixed with "USDT" for Bitget futures contracts.

---

## 5. Paper Trading Engine

### Location
`src/lib/trading-engine.ts`

### Core Functions

#### 1. Update Trade PnL
**Function:** `updateTradePnL(tradeId: string)`

**Process:**
1. Fetch trade from database
2. Get current price from Bitget
3. Calculate unrealized PnL:
   ```typescript
   // LONG
   pnl = ((currentPrice - entry) / entry) * size * (leverage / 10)
   pnlPercent = ((currentPrice - entry) / entry) * 100 * (leverage / 10)
   
   // SHORT
   pnl = ((entry - currentPrice) / entry) * size * (leverage / 10)
   pnlPercent = ((entry - currentPrice) / entry) * 100 * (leverage / 10)
   ```
4. Update trade record with new PnL values

**Note:** Leverage is normalized by dividing by 10 (base leverage unit)

---

#### 2. Close Trade
**Function:** `closeTrade(tradeId: string)`

**Process:**
1. Fetch trade from database
2. Get current price from Bitget
3. Calculate realized PnL (same formula as above)
4. Update trade:
   - `status`: "CLOSED"
   - `closePrice`: current price
   - `pnl`: calculated PnL
   - `pnlPercent`: calculated PnL percentage
   - `closedAt`: current timestamp

**Returns:**
```typescript
{
  pnl: number,
  pnlPercent: number,
  closePrice: number
}
```

---

#### 3. Get Portfolio Stats
**Function:** `getPortfolioStats()`

**Process:**
1. Fetch all open and closed trades
2. Update PnL for all open trades
3. Calculate aggregate statistics:

**Statistics:**
- `openPositions`: Count of open trades
- `closedPositions`: Count of closed trades
- `totalTrades`: Total count
- `totalPnL`: Sum of all PnL (open + closed)
- `totalOpenPnL`: Sum of unrealized PnL
- `totalClosedPnL`: Sum of realized PnL
- `winRate`: (winning trades / closed trades) * 100
- `winningTrades`: Count of trades with positive PnL
- `losingTrades`: Count of trades with negative PnL
- `avgWin`: Average PnL of winning trades
- `avgLoss`: Average absolute PnL of losing trades
- `profitFactor`: avgWin / avgLoss
- `totalVolume`: Sum of all position sizes

---

### PnL Calculation Example

**Scenario:**
- Entry: $67,000
- Current Price: $68,500
- Direction: LONG
- Size: $2,000
- Leverage: 10x

**Calculation:**
```typescript
pnl = ((68500 - 67000) / 67000) * 2000 * (10 / 10)
pnl = (1500 / 67000) * 2000 * 1
pnl = 0.02239 * 2000
pnl = $44.78

pnlPercent = ((68500 - 67000) / 67000) * 100 * (10 / 10)
pnlPercent = 2.24%
```

---

## 6. Dashboard Features

### Location
`src/components/Dashboard.tsx`

### Features

#### 1. Portfolio Balance Card
Displays the main portfolio overview at the top:

**Current Balance Section:**
- Starting balance: $20,000
- Current balance: Real-time balance after all trades
- Total PnL: Cumulative profit/loss with percentage
- Color-coded: Green for profit, Red for loss

**Total Equity:**
- Balance + Open PnL
- Shows total portfolio value including unrealized gains/losses

**Open PnL:**
- Sum of unrealized PnL from all open positions
- Number of open positions

**Closed PnL:**
- Sum of realized PnL from all closed trades
- Number of closed trades

**Performance Metrics (5-column grid):**
- Win Rate: Percentage with W/L count
- Profit Factor: Win/Loss ratio
- Avg Win: Average profit from winning trades
- Avg Loss: Average loss from losing trades
- Total Volume: Sum of all position sizes

**Export Button:**
- Downloads complete trading log as CSV
- Includes all required hackathon fields

---

#### 2. Balance History Chart
Visual representation of portfolio performance over time:

**Features:**
- Bar chart showing balance at each trade event
- Hover tooltips with exact balance values
- Date range labels (first to last snapshot)
- Auto-scales based on min/max balance

**Data Source:**
- BalanceSnapshot table
- Records taken at trade open and close events
- Enables performance tracking and analysis

---

#### 3. Portfolio Statistics Cards
Displays 8 key metrics in a grid:

| Metric | Description | Color Coding |
|--------|-------------|--------------|
| Total PnL | Sum of all PnL | Green if positive, Red if negative |
| Win Rate | Percentage of winning trades | Green if ≥50%, Red if <50% |
| Open Positions | Count of active trades | Default color |
| Total Trades | Total trade count | Default color |
| Open PnL | Unrealized PnL | Green/Red |
| Closed PnL | Realized PnL | Green/Red |
| Avg Win | Average winning trade PnL | Green |
| Profit Factor | Win/Loss ratio | Default color |

**Auto-refresh:** Every 5 seconds

---

#### 4. Open Positions Tab
**Features:**
- List of all active paper trades
- Real-time PnL updates
- Close button for each position
- Trade details: symbol, direction, leverage, risk level, entry, SL, TP, size, thesis
- Balance before trade
- Required margin
- Timestamp of when trade was opened

**Close Action:**
- Fetches current price from Bitget
- Calculates realized PnL
- Updates trade status to "CLOSED"
- Updates portfolio balance
- Records balance snapshot
- Refreshes dashboard

---

#### 5. Closed Positions Tab
**Features:**
- List of all settled trades
- Final PnL for each trade
- Entry and exit prices
- Balance before and after trade
- Trade thesis and reasoning
- Open and close timestamps

---

#### 6. Empty States
- "No open positions. Start a conversation to place a trade."
- "No closed trades yet."

---

### UI Design
- Dark trading terminal aesthetic
- Color-coded PnL (green/red)
- Monospace fonts for numbers
- Responsive grid layout
- Hover effects on trade rows
- Compact trade information display
- Balance history chart with interactive tooltips

---

## 7. State Management Approach

### Client-Side State
**Technology:** React `useState` and `useEffect` hooks

**No external state library** (Redux, Zustand, etc.) — the app uses React's built-in state management for simplicity.

---

### Chat Interface State
**Location:** `src/components/ChatInterface.tsx`

```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [conversationId, setConversationId] = useState<string | null>(null);
```

**State Flow:**
1. User types message → `input` state
2. User sends → message added to `messages` array, `isLoading` = true
3. API call to `/api/chat`
4. Response received → agent message added to `messages`, `isLoading` = false
5. If new conversation → `conversationId` set

---

### Dashboard State
**Location:** `src/components/Dashboard.tsx`

```typescript
const [openTrades, setOpenTrades] = useState<Trade[]>([]);
const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
const [stats, setStats] = useState<Stats | null>(null);
const [loading, setLoading] = useState(true);
const [tab, setTab] = useState<"open" | "closed">("open");
```

**Auto-refresh:**
```typescript
useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 10000); // Every 10 seconds
  return () => clearInterval(interval);
}, [fetchData]);
```

---

### Server-Side State
**Technology:** SQLite database via Prisma

**Persistent State:**
- Conversations
- Messages
- Trades (open and closed)

**No caching layer** — all data fetched directly from database.

---

## 8. MVP Implementation Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Next.js 16 project setup with TypeScript
- [x] Tailwind CSS configuration
- [x] Prisma schema with SQLite
- [x] Database migrations
- [x] Basic API route structure

---

### Phase 2: Bitget Integration ✅
- [x] Ticker API client
- [x] Candles API client
- [x] Contracts API client
- [x] Symbol resolution mapping
- [x] Error handling for API failures

---

### Phase 3: AI Agent ✅
- [x] OpenAI integration
- [x] Intent parsing system prompt
- [x] Trade level calculations (SL/TP)
- [x] Position sizing logic
- [x] Thesis generation system prompt
- [x] Trade plan orchestration

---

### Phase 4: Paper Trading Engine ✅
- [x] Trade creation
- [x] PnL calculation
- [x] Trade closing
- [x] Portfolio statistics

---

### Phase 5: Chat Interface ✅
- [x] Message list component
- [x] Input field with send button
- [x] Trade card component
- [x] Typing indicator
- [x] Quick action suggestions
- [x] Conversation persistence

---

### Phase 6: Dashboard ✅
- [x] Statistics cards
- [x] Open positions list
- [x] Closed positions list
- [x] Close trade functionality
- [x] Auto-refresh (10s interval)
- [x] Empty states

---

### Phase 7: UI/UX Polish ✅
- [x] Dark mode theme
- [x] Trading terminal aesthetic
- [x] Responsive design
- [x] Animations (fade-in, typing dots)
- [x] Color-coded PnL
- [x] Professional typography

---

### Phase 8: Deployment (In Progress)
- [ ] Environment variable configuration
- [ ] Production build verification
- [ ] Deployment to hosting platform

---

## 9. File Structure

```
bitagent/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── dev.db                 # SQLite database
│   └── migrations/            # Database migrations
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main page (chat + dashboard tabs)
│   │   ├── globals.css        # Global styles
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts   # Chat API endpoint
│   │       ├── market/
│   │       │   ├── ticker/
│   │       │   │   └── route.ts
│   │       │   ├── candles/
│   │       │   │   └── route.ts
│   │       │   └── contracts/
│   │       │       └── route.ts
│   │       ├── trades/
│   │       │   ├── route.ts   # Trades CRUD
│   │       │   └── stats/
│   │       │       └── route.ts
│   │       ├── portfolio/
│   │       │   └── route.ts   # Portfolio API
│   │       ├── trading-log/
│   │       │   └── route.ts   # CSV export
│   │       └── conversations/
│   │           └── route.ts
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── bitget.ts          # Bitget API client
│   │   ├── agent.ts           # AI trade agent
│   │   ├── portfolio.ts       # Portfolio management
│   │   └── trading-engine.ts  # PnL calculations
│   ├── components/
│   │   ├── ChatInterface.tsx  # Chat UI
│   │   ├── TradeCard.tsx      # Trade display card
│   │   └── Dashboard.tsx      # Portfolio dashboard
│   └── generated/
│       └── prisma/            # Generated Prisma client
├── .env                       # Environment variables
├── next.config.ts             # Next.js config
├── tsconfig.json              # TypeScript config
├── tailwind.config.ts         # Tailwind config
└── package.json               # Dependencies
```

---

## 10. Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"

# OpenAI API
OPENAI_API_KEY="sk-your-key-here"
```

---

## 11. Dependencies

### Core
- `next`: 16.2.9
- `react`: 19.x
- `typescript`: 5.x

### Database
- `prisma`: 7.8.0
- `@prisma/client`: 7.8.0
- `@prisma/adapter-libsql`: 7.8.0
- `@libsql/client`: 0.14.x

### AI
- `openai`: 4.x

### Styling
- `tailwindcss`: 4.x
- `@tailwindcss/postcss`: 4.x

### Types
- `@types/node`: 20.x
- `@types/react`: 19.x
- `@types/react-dom`: 19.x

---

## 12. Security Considerations

### Paper Trading Only
- **No real money trades** are ever executed
- All positions are simulated in SQLite database
- Bitget API is read-only (no authentication required)

### API Keys
- OpenAI API key stored in `.env` (not committed to git)
- Bitget public API requires no authentication

### Data Privacy
- No user authentication (single-user demo)
- Conversation history stored locally in SQLite
- No external data transmission except to OpenAI and Bitget

---

## 13. Performance Optimizations

### Caching
- Bitget ticker: 5-second cache
- Bitget contracts: 1-hour cache
- Next.js static generation for pages

### Database
- SQLite for low-latency local queries
- Prisma connection pooling via singleton pattern

### UI
- React memoization for expensive components
- Debounced auto-refresh (10s interval)
- Optimistic UI updates for trade closing

---

## 14. Future Enhancements

### Potential Features
- User authentication (NextAuth.js)
- Multiple conversation support
- Trade history export (CSV/PDF)
- Advanced charting (TradingView integration)
- WebSocket for real-time price updates
- More sophisticated risk management
- Backtesting engine
- Portfolio allocation recommendations
- Mobile app (React Native)

### AI Improvements
- Fine-tuned model for crypto trading
- Sentiment analysis from news/social media
- Multi-timeframe analysis
- Correlation analysis between assets
- Automated position sizing based on portfolio risk

---

## 15. Testing Strategy

### Manual Testing Checklist
- [ ] Send trade request (e.g., "Long BTC with 5x leverage")
- [ ] Verify trade card displays correctly
- [ ] Check trade appears in dashboard
- [ ] Close a trade and verify PnL calculation
- [ ] Verify portfolio statistics update
- [ ] Test non-trade messages (e.g., "help", "what can you do")
- [ ] Test invalid symbols
- [ ] Test conversation persistence (refresh page)
- [ ] Test responsive design on mobile

### Automated Testing (Future)
- Unit tests for PnL calculations
- Integration tests for API routes
- E2E tests for chat flow
- Mock Bitget API for deterministic tests

---

## 16. Deployment Checklist

- [ ] Set `OPENAI_API_KEY` environment variable
- [ ] Configure production database path
- [ ] Enable HTTPS
- [ ] Set up monitoring/logging
- [ ] Configure CORS if needed
- [ ] Set up backup strategy for SQLite database
- [ ] Configure rate limiting for API routes
- [ ] Set up error tracking (Sentry, etc.)

---

## 17. Support & Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Bitget API Docs](https://bitgetlimited.github.io/apidoc/en/futures/)
- [OpenAI API Docs](https://platform.openai.com/docs)

### BitAgent Specific
- Database schema: `prisma/schema.prisma`
- API routes: `src/app/api/`
- AI agent logic: `src/lib/agent.ts`
- Trading engine: `src/lib/trading-engine.ts`

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-20  
**Author:** BitAgent Development Team
