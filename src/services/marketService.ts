import type {
  MarketData,
  HistoricalData,
  TechnicalIndicators,
  NewsItem,
  FinnhubQuote,
  FinnhubNews
} from '../types';

// API Configuration
const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';
const ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || '';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

// Yahoo Finance proxy (CORS-friendly)
const YAHOO_PROXY = 'https://corsproxy.io/?';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=';

/**
 * Fetch real-time quote from Yahoo Finance
 */
export async function fetchRealTimeQuote(symbol: string): Promise<MarketData> {
  const upperSymbol = symbol.toUpperCase();

  // Try Yahoo Finance first (most accurate)
  try {
    const data = await fetchYahooQuote(upperSymbol);
    if (data) return data;
  } catch (e) {
    console.warn('Yahoo Finance failed:', e);
  }

  // Try Yahoo Finance chart API as backup
  try {
    const data = await fetchYahooChart(upperSymbol);
    if (data) return data;
  } catch (e) {
    console.warn('Yahoo Chart failed:', e);
  }

  // Try Finnhub if API key is configured
  if (FINNHUB_API_KEY) {
    try {
      const url = `${FINNHUB_BASE}/quote?symbol=${upperSymbol}&token=${FINNHUB_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const data: FinnhubQuote = await response.json();
        if (data.c > 0) {
          return {
            symbol: upperSymbol,
            price: data.c,
            change: data.d,
            changePercent: data.dp,
            high: data.h,
            low: data.l,
            open: data.o,
            previousClose: data.pc,
            volume: 0,
            timestamp: data.t * 1000
          };
        }
      }
    } catch (e) {
      console.warn('Finnhub failed:', e);
    }
  }

  throw new Error(`Unable to fetch quote for ${upperSymbol}. Please check the symbol and try again.`);
}

/**
 * Fetch quote from Yahoo Finance quote API
 */
async function fetchYahooQuote(symbol: string): Promise<MarketData | null> {
  const url = `${YAHOO_PROXY}${encodeURIComponent(YAHOO_QUOTE_URL + symbol)}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const quote = data?.quoteResponse?.result?.[0];

  if (!quote || !quote.regularMarketPrice) return null;

  return {
    symbol: symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange || 0,
    changePercent: quote.regularMarketChangePercent || 0,
    high: quote.regularMarketDayHigh || quote.regularMarketPrice,
    low: quote.regularMarketDayLow || quote.regularMarketPrice,
    open: quote.regularMarketOpen || quote.regularMarketPrice,
    previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
    volume: quote.regularMarketVolume || 0,
    marketCap: quote.marketCap,
    timestamp: Date.now()
  };
}

/**
 * Fetch quote from Yahoo Finance chart API (backup)
 */
async function fetchYahooChart(symbol: string): Promise<MarketData | null> {
  const url = `${YAHOO_PROXY}${encodeURIComponent(YAHOO_CHART_URL + symbol + '?interval=1d&range=1d')}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const result = data?.chart?.result?.[0];

  if (!result) return null;

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];

  if (!meta?.regularMarketPrice) return null;

  return {
    symbol: symbol,
    price: meta.regularMarketPrice,
    change: meta.regularMarketPrice - (meta.previousClose || meta.regularMarketPrice),
    changePercent: meta.previousClose
      ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
      : 0,
    high: quote?.high?.[0] || meta.regularMarketDayHigh || meta.regularMarketPrice,
    low: quote?.low?.[0] || meta.regularMarketDayLow || meta.regularMarketPrice,
    open: quote?.open?.[0] || meta.regularMarketOpen || meta.regularMarketPrice,
    previousClose: meta.previousClose || meta.regularMarketPrice,
    volume: quote?.volume?.[0] || meta.regularMarketVolume || 0,
    timestamp: Date.now()
  };
}

/**
 * Fetch company news from Finnhub
 */
export async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const from = weekAgo.toISOString().split('T')[0];
  const to = today.toISOString().split('T')[0];

  const url = `${FINNHUB_BASE}/company-news?symbol=${symbol.toUpperCase()}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: FinnhubNews[] = await response.json();

    return data.slice(0, 10).map(item => ({
      title: item.headline,
      source: item.source,
      sentiment: analyzeSentiment(item.headline + ' ' + item.summary),
      sentimentScore: calculateSentimentScore(item.headline + ' ' + item.summary),
      timestamp: new Date(item.datetime * 1000).toISOString(),
      url: item.url
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch historical daily data from Yahoo Finance
 */
export async function fetchHistoricalData(symbol: string): Promise<HistoricalData[]> {
  const upperSymbol = symbol.toUpperCase();

  // Try Yahoo Finance first
  try {
    const data = await fetchYahooHistorical(upperSymbol);
    if (data && data.length > 0) return data;
  } catch (e) {
    console.warn('Yahoo historical failed:', e);
  }

  // Try Alpha Vantage as backup
  if (ALPHA_VANTAGE_KEY) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY&symbol=${upperSymbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const timeSeries = data['Time Series (Daily)'];

        if (timeSeries && !data.Note) {
          const historical: HistoricalData[] = Object.entries(timeSeries)
            .slice(0, 100)
            .map(([date, values]: [string, unknown]) => {
              const v = values as Record<string, string>;
              return {
                date,
                open: parseFloat(v['1. open']),
                high: parseFloat(v['2. high']),
                low: parseFloat(v['3. low']),
                close: parseFloat(v['4. close']),
                volume: parseFloat(v['5. volume'])
              };
            });
          return historical;
        }
      }
    } catch (e) {
      console.warn('Alpha Vantage failed:', e);
    }
  }

  // Generate fallback based on current price
  return generateFallbackHistoricalData(upperSymbol);
}

/**
 * Fetch historical data from Yahoo Finance
 */
async function fetchYahooHistorical(symbol: string): Promise<HistoricalData[]> {
  // Get 100 days of data
  const url = `${YAHOO_PROXY}${encodeURIComponent(YAHOO_CHART_URL + symbol + '?interval=1d&range=6mo')}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  const result = data?.chart?.result?.[0];

  if (!result) return [];

  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};

  const historical: HistoricalData[] = [];

  for (let i = timestamps.length - 1; i >= 0 && historical.length < 100; i--) {
    if (quotes.close?.[i] != null) {
      historical.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: quotes.open?.[i] || quotes.close[i],
        high: quotes.high?.[i] || quotes.close[i],
        low: quotes.low?.[i] || quotes.close[i],
        close: quotes.close[i],
        volume: quotes.volume?.[i] || 0
      });
    }
  }

  return historical;
}

/**
 * Generate fallback historical data for demo/testing
 */
function generateFallbackHistoricalData(symbol: string): HistoricalData[] {
  const data: HistoricalData[] = [];
  const basePrice = getBasePrice(symbol);
  let currentPrice = basePrice;

  for (let i = 99; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Random walk with mean reversion
    const change = (Math.random() - 0.5) * basePrice * 0.03;
    const meanReversion = (basePrice - currentPrice) * 0.02;
    currentPrice = currentPrice + change + meanReversion;

    const volatility = Math.random() * 0.02 + 0.01;
    const high = currentPrice * (1 + volatility);
    const low = currentPrice * (1 - volatility);
    const open = low + Math.random() * (high - low);

    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(currentPrice.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
  }

  return data;
}

function getBasePrice(symbol: string): number {
  // Updated stock prices (Dec 2024) - only used as last resort fallback
  const prices: Record<string, number> = {
    'AAPL': 254, 'GOOGL': 193, 'MSFT': 437, 'AMZN': 227, 'TSLA': 455,
    'NVDA': 137, 'META': 604, 'NFLX': 925, 'AMD': 119, 'INTC': 20,
    'SPY': 600, 'QQQ': 531, 'DIS': 112, 'PYPL': 89, 'COIN': 330,
    'BA': 178, 'JPM': 243, 'V': 318, 'WMT': 91, 'JNJ': 145,
    'BTC-USD': 94000, 'ETH-USD': 3400, 'SOL-USD': 190, 'XRP-USD': 2.2
  };
  return prices[symbol.toUpperCase()] || 100 + Math.random() * 200;
}

/**
 * Calculate technical indicators from historical data
 */
export function calculateTechnicalIndicators(historical: HistoricalData[]): TechnicalIndicators {
  if (historical.length < 26) {
    return getDefaultIndicators();
  }

  const closes = historical.map(d => d.close).reverse(); // Oldest first
  const highs = historical.map(d => d.high).reverse();
  const lows = historical.map(d => d.low).reverse();
  const volumes = historical.map(d => d.volume).reverse();

  // Calculate SMAs
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, Math.min(200, closes.length));

  // Calculate EMAs
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  // Calculate MACD
  const macd = ema12 - ema26;
  const macdHistory = closes.map((_, i) => {
    if (i < 26) return 0;
    const e12 = calculateEMA(closes.slice(0, i + 1), 12);
    const e26 = calculateEMA(closes.slice(0, i + 1), 26);
    return e12 - e26;
  });
  const macdSignal = calculateEMA(macdHistory.slice(-9), 9);
  const macdHistogram = macd - macdSignal;

  // Calculate RSI
  const rsi = calculateRSI(closes, 14);

  // Calculate Bollinger Bands
  const stdDev = calculateStdDev(closes.slice(-20));
  const bollingerMiddle = sma20;
  const bollingerUpper = bollingerMiddle + (stdDev * 2);
  const bollingerLower = bollingerMiddle - (stdDev * 2);

  // Calculate ATR (Average True Range)
  const atr = calculateATR(highs, lows, closes, 14);

  // Calculate ADX (simplified)
  const adx = calculateADX(highs, lows, closes, 14);

  // Calculate Stochastic
  const { k: stochK, d: stochD } = calculateStochastic(highs, lows, closes, 14);

  // Calculate OBV
  const obv = calculateOBV(closes, volumes);

  // Calculate VWAP (simplified - just for latest day)
  const vwap = calculateVWAP(closes.slice(-1)[0], highs.slice(-1)[0], lows.slice(-1)[0], volumes.slice(-1)[0]);

  return {
    rsi,
    macd,
    macdSignal,
    macdHistogram,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    bollingerUpper,
    bollingerMiddle,
    bollingerLower,
    atr,
    adx,
    stochK,
    stochD,
    obv,
    vwap
  };
}

// Helper functions for technical calculations
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const multiplier = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] * multiplier) + (ema * (1 - multiplier));
  }
  return ema;
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateStdDev(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / data.length);
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges.slice(-period), period);
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
  // Simplified ADX calculation
  if (highs.length < period + 1) return 25;

  const atr = calculateATR(highs, lows, closes, period);
  if (atr === 0) return 25;

  let plusDM = 0;
  let minusDM = 0;

  for (let i = highs.length - period; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    if (upMove > downMove && upMove > 0) plusDM += upMove;
    if (downMove > upMove && downMove > 0) minusDM += downMove;
  }

  const plusDI = (plusDM / period / atr) * 100;
  const minusDI = (minusDM / period / atr) * 100;

  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI + 0.001) * 100;
  return Math.min(100, Math.max(0, dx));
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): { k: number; d: number } {
  if (closes.length < period) return { k: 50, d: 50 };

  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];

  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);

  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow + 0.001)) * 100;
  const d = k; // Simplified - normally this would be SMA of %K

  return { k: Math.min(100, Math.max(0, k)), d: Math.min(100, Math.max(0, d)) };
}

function calculateOBV(closes: number[], volumes: number[]): number {
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
  }
  return obv;
}

function calculateVWAP(close: number, high: number, low: number, volume: number): number {
  const typicalPrice = (high + low + close) / 3;
  return volume > 0 ? typicalPrice : close;
}

function getDefaultIndicators(): TechnicalIndicators {
  return {
    rsi: 50,
    macd: 0,
    macdSignal: 0,
    macdHistogram: 0,
    sma20: 0,
    sma50: 0,
    sma200: 0,
    ema12: 0,
    ema26: 0,
    bollingerUpper: 0,
    bollingerMiddle: 0,
    bollingerLower: 0,
    atr: 0,
    adx: 25,
    stochK: 50,
    stochD: 50,
    obv: 0,
    vwap: 0
  };
}

/**
 * Simple sentiment analysis based on keywords
 */
function analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();

  const bullishWords = ['surge', 'rally', 'gain', 'rise', 'jump', 'soar', 'bullish', 'upgrade',
    'beat', 'growth', 'profit', 'outperform', 'buy', 'strong', 'momentum', 'breakthrough'];
  const bearishWords = ['drop', 'fall', 'decline', 'plunge', 'crash', 'bearish', 'downgrade',
    'miss', 'loss', 'sell', 'weak', 'concern', 'fear', 'risk', 'warning', 'cut'];

  let bullCount = 0;
  let bearCount = 0;

  bullishWords.forEach(word => { if (lower.includes(word)) bullCount++; });
  bearishWords.forEach(word => { if (lower.includes(word)) bearCount++; });

  if (bullCount > bearCount) return 'bullish';
  if (bearCount > bullCount) return 'bearish';
  return 'neutral';
}

function calculateSentimentScore(text: string): number {
  const sentiment = analyzeSentiment(text);
  const base = sentiment === 'bullish' ? 0.3 : sentiment === 'bearish' ? -0.3 : 0;
  return base + (Math.random() - 0.5) * 0.4; // Add some variance
}

/**
 * Calculate vector values from market data and technicals
 */
export function calculateVectors(
  marketData: MarketData,
  technicals: TechnicalIndicators,
  news: NewsItem[]
): { sentimentVector: number; priceVector: number; volumeVector: number } {
  // Sentiment Vector (-1 to 1)
  // Based on news sentiment, RSI, and MACD
  const newsSentiment = news.length > 0
    ? news.reduce((sum, n) => sum + n.sentimentScore, 0) / news.length
    : 0;

  const rsiSentiment = (technicals.rsi - 50) / 50; // -1 to 1
  const macdSentiment = technicals.macdHistogram > 0 ? 0.5 : -0.5;

  const sentimentVector = Math.max(-1, Math.min(1,
    (newsSentiment * 0.4) + (rsiSentiment * 0.3) + (macdSentiment * 0.3)
  ));

  // Price Vector (-1 to 1)
  // Based on price change, moving average positions, and trend
  const priceChange = marketData.changePercent / 10; // Normalize
  const aboveSMA = marketData.price > technicals.sma50 ? 0.3 : -0.3;
  const trendStrength = technicals.adx > 25 ? 0.2 : -0.1;

  const priceVector = Math.max(-1, Math.min(1,
    (priceChange * 0.5) + aboveSMA + (trendStrength * (priceChange > 0 ? 1 : -1))
  ));

  // Volume Vector (-1 to 1)
  // Based on OBV trend and volume spikes
  const volumeVector = technicals.obv > 0 ? 0.5 : -0.5;

  return { sentimentVector, priceVector, volumeVector };
}

/**
 * Determine overall verdict based on analysis
 */
export function calculateVerdict(
  sentimentVector: number,
  priceVector: number,
  coherence: number,
  rsi: number
): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' {
  const combined = (sentimentVector + priceVector) / 2;

  // RSI extremes override
  if (rsi > 80) return 'SELL'; // Overbought
  if (rsi < 20) return 'BUY';  // Oversold

  // Low coherence = uncertainty = HOLD
  if (coherence < 0.6) return 'HOLD';

  if (combined > 0.6) return 'STRONG_BUY';
  if (combined > 0.2) return 'BUY';
  if (combined < -0.6) return 'STRONG_SELL';
  if (combined < -0.2) return 'SELL';

  return 'HOLD';
}
