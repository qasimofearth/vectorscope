// Analysis state machine
export const AnalysisState = {
  IDLE: 'IDLE',
  SCANNING: 'SCANNING',
  ANALYZING: 'ANALYZING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR'
} as const;

export type AnalysisState = typeof AnalysisState[keyof typeof AnalysisState];

// Real-time market data from API
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  timestamp: number;
}

// Historical price data for analysis
export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Technical indicators
export interface TechnicalIndicators {
  rsi: number;           // Relative Strength Index (0-100)
  macd: number;          // MACD line value
  macdSignal: number;    // MACD signal line
  macdHistogram: number; // MACD histogram
  sma20: number;         // 20-day Simple Moving Average
  sma50: number;         // 50-day Simple Moving Average
  sma200: number;        // 200-day Simple Moving Average
  ema12: number;         // 12-day Exponential Moving Average
  ema26: number;         // 26-day Exponential Moving Average
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  atr: number;           // Average True Range (volatility)
  adx: number;           // Average Directional Index (trend strength)
  stochK: number;        // Stochastic %K
  stochD: number;        // Stochastic %D
  obv: number;           // On-Balance Volume
  vwap: number;          // Volume Weighted Average Price
}

// News sentiment data
export interface NewsItem {
  title: string;
  source: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1 to 1
  timestamp: string;
  url?: string;
}

// Bull/Bear case analysis
export interface CaseAnalysis {
  Score: number;           // 0-100 conviction score
  Argument: string;        // Main thesis
  MomentumKey?: string;    // Key bullish catalyst (for bull case)
  ResistanceKey?: string;  // Key bearish concern (for bear case)
  Catalysts: string[];     // Supporting factors
  Risks: string[];         // Counter-arguments
  TimeHorizon: string;     // Short/Medium/Long term
  Confidence: number;      // AI confidence in this analysis
}

// 72-Hour Prediction
export interface Prediction72H {
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  confidence: number;           // 0-100
  predictedChange: number;      // Percentage change expected
  priceTarget: number;          // Target price in 72h
  supportLevel: number;         // Key support
  resistanceLevel: number;      // Key resistance
  reasoning: string;            // AI explanation
  keyFactors: string[];         // Main factors driving prediction
  riskFactors: string[];        // What could invalidate this
  timeframe: {
    start: number;              // Timestamp
    end: number;                // 72h from now
  };
}

// Complete analysis result
export interface AnalysisResult {
  ticker: string;
  timestamp: number;

  // Vector values (-1 to 1 scale)
  SentimentVector: number;  // Aggregate sentiment (-1 bearish, 1 bullish)
  PriceVector: number;      // Price momentum (-1 downtrend, 1 uptrend)
  VolumeVector: number;     // Volume trend

  // Market data
  marketData: MarketData;
  historicalData: HistoricalData[];
  technicals: TechnicalIndicators;

  // Analysis
  BullCase: CaseAnalysis;
  BearCase: CaseAnalysis;

  // 72-Hour Prediction
  prediction: Prediction72H;

  // News & Sentiment
  news: NewsItem[];
  overallSentiment: number;

  // Meta
  coherence: number;       // Agreement between vectors
  volatilityIndex: number; // Current volatility level
  trendStrength: number;   // ADX-based trend strength

  // Oracle verdict
  verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidenceLevel: number;

  // Multi-signal analysis
  optionsFlow?: OptionsFlow;
  eventsCalendar?: EventsCalendar;
  socialSentiment?: SocialSentiment;
  multiSignal?: MultiSignalAnalysis;
}

// Market context for AI analysis
export interface MarketContext {
  ticker: string;
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  volume24h: number;
  volumeChange: number;
  technicals: TechnicalIndicators;
  recentNews: NewsItem[];
  historicalPrices: HistoricalData[];
  marketTrend: 'bullish' | 'bearish' | 'sideways';
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  // Enhanced signals
  optionsFlow?: OptionsFlow;
  eventsCalendar?: EventsCalendar;
  socialSentiment?: SocialSentiment;
}

// API response types
export interface AlphaVantageQuote {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

export interface AlphaVantageTimeSeries {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

// Finnhub API types
export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// Options Flow Data
export interface OptionsFlow {
  putCallRatio: number;        // < 0.7 bullish, > 1.3 bearish
  totalCallVolume: number;
  totalPutVolume: number;
  unusualActivity: UnusualOption[];
  impliedVolatility: number;   // Current IV
  ivPercentile: number;        // IV percentile (0-100)
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface UnusualOption {
  type: 'CALL' | 'PUT';
  strike: number;
  expiry: string;
  volume: number;
  openInterest: number;
  premium: number;             // Total premium in $
  sentiment: 'bullish' | 'bearish';
}

// Earnings & Events Calendar
export interface EarningsEvent {
  date: string;
  type: 'earnings' | 'dividend' | 'split' | 'conference' | 'fda' | 'other';
  title: string;
  estimate?: number;           // EPS estimate for earnings
  actual?: number;             // Actual EPS if reported
  surprise?: number;           // Beat/miss percentage
  impact: 'high' | 'medium' | 'low';
}

export interface EventsCalendar {
  upcomingEarnings: EarningsEvent | null;
  daysToEarnings: number | null;
  recentEarnings: EarningsEvent | null;
  upcomingEvents: EarningsEvent[];
  hasNearTermCatalyst: boolean;
}

// Social Sentiment
export interface SocialSentiment {
  overallScore: number;        // -1 to 1
  trendingScore: number;       // How much it's being discussed (0-100)
  bullishPosts: number;
  bearishPosts: number;
  totalMentions: number;
  sentimentChange24h: number;  // Change in sentiment vs 24h ago
  topKeywords: string[];
  platforms: {
    reddit: number;            // -1 to 1
    twitter: number;           // -1 to 1
    stocktwits: number;        // -1 to 1
  };
}

// Multi-Signal Prediction Score
export interface SignalScore {
  name: string;
  score: number;               // -100 to 100 (negative = bearish, positive = bullish)
  weight: number;              // 0 to 1
  confidence: number;          // 0 to 100
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}

export interface MultiSignalAnalysis {
  technicalScore: SignalScore;
  optionsScore: SignalScore;
  sentimentScore: SignalScore;
  socialScore: SignalScore;
  eventScore: SignalScore;
  combinedScore: number;       // Weighted average
  combinedConfidence: number;
  signalStrength: 'strong' | 'moderate' | 'weak';
}

// Component prop types
export interface HeaderProps {
  ticker?: string;
  isConnected: boolean;
}

export interface InputModuleProps {
  onScan: (ticker: string) => void;
  isLoading: boolean;
  statusMessage: string;
}

export interface VectorScopeProps {
  sentimentVector: number;
  priceVector: number;
  volumeVector?: number;
  isScanning: boolean;
  coherence: string;
}

export interface AgentCardProps {
  type: 'bull' | 'bear';
  score: number;
  thesis: string;
  keyword: string;
  catalysts?: string[];
  isActive: boolean;
}

export interface TelemetryPanelProps {
  data: AnalysisResult | null;
}

export interface OracleGateProps {
  isLocked: boolean;
  contextData: string;
  verdict?: string;
  confidence?: number;
}
