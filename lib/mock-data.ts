export interface OHLC {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketScenario {
  type: 'bullish' | 'bearish' | 'neutral';
  endsAt: number;
}

const BASE_PRICES: Record<string, number> = {
  'BTCUSDT': 65000,
  'ETHUSDT': 3500,
  'BNBUSDT': 580,
  'SOLUSDT': 185,
  'LTCUSDT': 82.4,
  'ADAUSDT': 0.45,
  'XRPUSDT': 1.38,
  'MATICUSDT': 0.37,
  'DOGEUSDT': 0.094,
  'DOTUSDT': 1.32,
};

let currentPrice: Record<string, number> = { ...BASE_PRICES };
let marketScenario: Record<string, MarketScenario> = {};
let candleCount = 0;

const INTERVAL_MAP: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
};

export function generateCandleStickData(symbol: string = 'BTCUSDT', interval: string = '1m'): OHLC[] {
  const data: OHLC[] = [];
  let price = BASE_PRICES[symbol] || 40000;
  const step = INTERVAL_MAP[interval] || 120000;
  
  const now = Date.now();
  for (let i = 50; i >= 0; i--) {
    const timestamp = now - i * step;
    const volatility = (price * 0.005) + Math.random() * (price * 0.005);
    const trend = Math.sin(i / 10) * (price * 0.002);
    
    const open = price;
    const close = price + (Math.random() - 0.5) * volatility + trend;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.2);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.2);
    
    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.floor(100000 + Math.random() * 900000),
    });
    
    price = close;
  }
  
  currentPrice[symbol] = price;
  return data;
}

export function getNextCandle(lastCandle: OHLC, symbol: string = 'BTCUSDT', interval: string = '1m'): OHLC {
  const now = Date.now();
  candleCount++;
  const step = INTERVAL_MAP[interval] || 120000;
  
  // Initialize scenario for symbol if not exists
  if (!marketScenario[symbol]) {
    marketScenario[symbol] = { type: 'neutral', endsAt: 0 };
  }

  // Check if we should change market scenario
  if (marketScenario[symbol].endsAt < now) {
    marketScenario[symbol] = { type: 'neutral', endsAt: now + 5 * step }; 
  }
  
  const basePrice = lastCandle.close;
  let volatility = (basePrice * 0.005) + Math.random() * (basePrice * 0.005);
  let trend = 0;
  
  if (marketScenario[symbol].type === 'bullish') {
    trend = (basePrice * 0.002) + Math.random() * (basePrice * 0.001);
  } else if (marketScenario[symbol].type === 'bearish') {
    trend = -(basePrice * 0.002) - Math.random() * (basePrice * 0.001);
  }
  
  const open = lastCandle.close;
  const close = open + (Math.random() - 0.5) * volatility + trend;
  const high = Math.max(open, close) + Math.random() * (volatility * 0.2);
  const low = Math.min(open, close) - Math.random() * (volatility * 0.2);
  
  currentPrice[symbol] = close;
  
  return {
    timestamp: lastCandle.timestamp + step,
    open,
    high,
    low,
    close,
    volume: Math.floor(100000 + Math.random() * 900000),
  };
}

export function setMarketScenario(symbol: string, type: 'bullish' | 'bearish' | 'neutral', interval: string = '1m'): void {
  const now = Date.now();
  const step = INTERVAL_MAP[interval] || 120000;
  marketScenario[symbol] = { type, endsAt: now + 5 * step }; // 5 candles
}

export function getMarketScenario(symbol: string): MarketScenario {
  return marketScenario[symbol] || { type: 'neutral', endsAt: 0 };
}

export function getCurrentPrice(symbol: string): number {
  return currentPrice[symbol] || BASE_PRICES[symbol] || 0;
}

export function calculateSMA(data: OHLC[], period: number): (number | null)[] {
  return data.map((_, index) => {
    if (index < period - 1) return null;
    const sum = data.slice(index - period + 1, index + 1).reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  });
}

export function calculateEMA(data: OHLC[], period: number): (number | null)[] {
  const ema: (number | null)[] = new Array(data.length).fill(null);
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i].close;
  }
  
  if (period <= data.length) {
    ema[period - 1] = sum / period;
  }
  
  for (let i = period; i < data.length; i++) {
    ema[i] = data[i].close * multiplier + (ema[i - 1] || 0) * (1 - multiplier);
  }
  
  return ema;
}

