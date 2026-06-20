const BITGET_BASE = "https://api.bitget.com";

export interface TickerData {
  symbol: string;
  lastPr: string;
  high24h: string;
  low24h: string;
  change24h: string;
  baseVolume: string;
  quoteVolume: string;
  openUtc0: string;
  bidPr: string;
  askPr: string;
}

export interface CandleData {
  ts: string;
  open: string;
  high: string;
  low: string;
  close: string;
  baseVol: string;
  quoteVol: string;
}

export interface ContractInfo {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  minTradeNum: string;
  pricePlace: string;
  volumePlace: string;
  priceEndStep: string;
  volUnit: string;
}

export async function fetchTicker(symbol: string): Promise<TickerData | null> {
  try {
    const res = await fetch(
      `${BITGET_BASE}/api/v2/mix/market/ticker?productType=USDT-FUTURES&symbol=${symbol}`,
      { next: { revalidate: 5 } }
    );
    const json = await res.json();
    if (json.code === "00000" && json.data?.length > 0) {
      return json.data[0];
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchCandles(
  symbol: string,
  granularity: string = "1H",
  limit: number = 100
): Promise<CandleData[]> {
  try {
    const res = await fetch(
      `${BITGET_BASE}/api/v2/mix/market/candles?productType=USDT-FUTURES&symbol=${symbol}&granularity=${granularity}&limit=${limit}`
    );
    const json = await res.json();
    if (json.code === "00000" && json.data?.length > 0) {
      return json.data.map((c: string[]) => ({
        ts: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        baseVol: c[5],
        quoteVol: c[6],
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchContracts(): Promise<ContractInfo[]> {
  try {
    const res = await fetch(
      `${BITGET_BASE}/api/v2/mix/market/contracts?productType=USDT-FUTURES`,
      { next: { revalidate: 3600 } }
    );
    const json = await res.json();
    if (json.code === "00000" && json.data?.length > 0) {
      return json.data.map((c: Record<string, string>) => ({
        symbol: c.symbol,
        baseCoin: c.baseCoin,
        quoteCoin: c.quoteCoin,
        minTradeNum: c.minTradeNum,
        pricePlace: c.pricePlace,
        volumePlace: c.volumePlace,
        priceEndStep: c.priceEndStep,
        volUnit: c.volUnit,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function resolveSymbol(input: string): string {
  const map: Record<string, string> = {
    BTC: "BTCUSDT",
    ETH: "ETHUSDT",
    SOL: "SOLUSDT",
    DOGE: "DOGEUSDT",
    XRP: "XRPUSDT",
    ADA: "ADAUSDT",
    AVAX: "AVAXUSDT",
    LINK: "LINKUSDT",
    DOT: "DOTUSDT",
    MATIC: "MATICUSDT",
    ARB: "ARBUSDT",
    OP: "OPUSDT",
    SUI: "SUIUSDT",
    APT: "APTUSDT",
    NEAR: "NEARUSDT",
    ATOM: "ATOMUSDT",
    FIL: "FILUSDT",
    LTC: "LTCUSDT",
    BCH: "BCHUSDT",
    SHIB: "SHIBUSDT",
    PEPE: "PEPEUSDT",
    WIF: "WIFUSDT",
    BONK: "BONKUSDT",
    TRX: "TRXUSDT",
    TON: "TONUSDT",
  };
  const upper = input.toUpperCase().replace(/USDT$/, "");
  return map[upper] || `${upper}USDT`;
}
