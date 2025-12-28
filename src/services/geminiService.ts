import type {
  MarketContext,
  AnalysisResult,
  CaseAnalysis,
  MarketData
} from '../types';
import {
  fetchRealTimeQuote,
  fetchHistoricalData,
  fetchNews,
  calculateTechnicalIndicators,
  calculateVectors,
  calculateVerdict
} from './marketService';

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Fetch complete market context for a ticker
 */
export async function fetchMarketContext(ticker: string): Promise<MarketContext> {
  // Fetch all data in parallel
  const [quote, historical, news] = await Promise.all([
    fetchRealTimeQuote(ticker),
    fetchHistoricalData(ticker),
    fetchNews(ticker)
  ]);

  const technicals = calculateTechnicalIndicators(historical);

  // Calculate price changes
  const prices = historical.map(h => h.close);
  const currentPrice = quote.price;
  const price7dAgo = prices[6] || currentPrice;
  const price30dAgo = prices[29] || currentPrice;

  // Determine market trend
  let marketTrend: 'bullish' | 'bearish' | 'sideways' = 'sideways';
  if (currentPrice > technicals.sma50 && technicals.macd > 0) {
    marketTrend = 'bullish';
  } else if (currentPrice < technicals.sma50 && technicals.macd < 0) {
    marketTrend = 'bearish';
  }

  // Determine volatility
  let volatility: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
  const atrPercent = (technicals.atr / currentPrice) * 100;
  if (atrPercent < 1) volatility = 'low';
  else if (atrPercent < 2) volatility = 'medium';
  else if (atrPercent < 4) volatility = 'high';
  else volatility = 'extreme';

  return {
    ticker: ticker.toUpperCase(),
    currentPrice,
    priceChange24h: quote.changePercent,
    priceChange7d: ((currentPrice - price7dAgo) / price7dAgo) * 100,
    priceChange30d: ((currentPrice - price30dAgo) / price30dAgo) * 100,
    volume24h: quote.volume,
    volumeChange: 0,
    technicals,
    recentNews: news,
    historicalPrices: historical,
    marketTrend,
    volatility
  };
}

/**
 * Generate AI-powered adversarial analysis using Gemini
 */
export async function performAdversarialAnalysis(
  ticker: string,
  context: MarketContext
): Promise<AnalysisResult> {
  const marketData: MarketData = {
    symbol: ticker.toUpperCase(),
    price: context.currentPrice,
    change: context.priceChange24h * context.currentPrice / 100,
    changePercent: context.priceChange24h,
    high: Math.max(...context.historicalPrices.slice(0, 5).map(h => h.high)),
    low: Math.min(...context.historicalPrices.slice(0, 5).map(h => h.low)),
    open: context.historicalPrices[0]?.open || context.currentPrice,
    previousClose: context.historicalPrices[1]?.close || context.currentPrice,
    volume: context.volume24h,
    timestamp: Date.now()
  };

  // Calculate vectors
  const { sentimentVector, priceVector, volumeVector } = calculateVectors(
    marketData,
    context.technicals,
    context.recentNews
  );

  // Calculate coherence (agreement between vectors)
  const vectorDiff = Math.abs(sentimentVector - priceVector);
  const coherence = 1 - (vectorDiff / 2);

  // Generate AI analysis if API key is available
  let bullCase: CaseAnalysis;
  let bearCase: CaseAnalysis;

  if (CLAUDE_API_KEY) {
    const aiAnalysis = await generateAIAnalysis(ticker, context, sentimentVector, priceVector);
    bullCase = aiAnalysis.bullCase;
    bearCase = aiAnalysis.bearCase;
  } else {
    // Generate analysis without AI (rule-based)
    bullCase = generateBullCase(context, sentimentVector, priceVector);
    bearCase = generateBearCase(context, sentimentVector, priceVector);
  }

  // Calculate verdict
  const verdict = calculateVerdict(
    sentimentVector,
    priceVector,
    coherence,
    context.technicals.rsi
  );

  return {
    ticker: ticker.toUpperCase(),
    timestamp: Date.now(),
    SentimentVector: parseFloat(sentimentVector.toFixed(3)),
    PriceVector: parseFloat(priceVector.toFixed(3)),
    VolumeVector: parseFloat(volumeVector.toFixed(3)),
    marketData,
    historicalData: context.historicalPrices,
    technicals: context.technicals,
    BullCase: bullCase,
    BearCase: bearCase,
    news: context.recentNews,
    overallSentiment: sentimentVector,
    coherence: parseFloat(coherence.toFixed(3)),
    volatilityIndex: context.technicals.atr / context.currentPrice,
    trendStrength: context.technicals.adx / 100,
    verdict,
    confidenceLevel: (coherence * 0.7) + (context.technicals.adx / 100 * 0.3)
  };
}

/**
 * Generate analysis using Claude AI
 */
async function generateAIAnalysis(
  ticker: string,
  context: MarketContext,
  sentimentVector: number,
  priceVector: number
): Promise<{ bullCase: CaseAnalysis; bearCase: CaseAnalysis }> {
  const prompt = buildAnalysisPrompt(ticker, context);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API failed: ${errorText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return parseAIResponse(text, context, sentimentVector, priceVector);
  } catch (error) {
    console.warn('AI analysis failed, using rule-based analysis:', error);
    return {
      bullCase: generateBullCase(context, sentimentVector, priceVector),
      bearCase: generateBearCase(context, sentimentVector, priceVector)
    };
  }
}

function buildAnalysisPrompt(ticker: string, context: MarketContext): string {
  const newsHeadlines = context.recentNews.slice(0, 5).map(n => `- ${n.title}`).join('\n');

  return `Analyze ${ticker} stock and provide BOTH a bull case and bear case analysis.

CURRENT MARKET DATA:
- Price: $${context.currentPrice.toFixed(2)}
- 24h Change: ${context.priceChange24h.toFixed(2)}%
- 7d Change: ${context.priceChange7d.toFixed(2)}%
- 30d Change: ${context.priceChange30d.toFixed(2)}%
- Market Trend: ${context.marketTrend}
- Volatility: ${context.volatility}

TECHNICAL INDICATORS:
- RSI(14): ${context.technicals.rsi.toFixed(1)}
- MACD: ${context.technicals.macd.toFixed(3)}
- Price vs SMA50: ${context.currentPrice > context.technicals.sma50 ? 'ABOVE' : 'BELOW'}
- Price vs SMA200: ${context.currentPrice > context.technicals.sma200 ? 'ABOVE' : 'BELOW'}
- ADX (Trend Strength): ${context.technicals.adx.toFixed(1)}
- Stochastic: ${context.technicals.stochK.toFixed(1)}

RECENT NEWS:
${newsHeadlines || 'No recent news available'}

Respond in this EXACT JSON format:
{
  "bullCase": {
    "argument": "One compelling sentence for the bull thesis",
    "momentumKey": "One key bullish catalyst (2-3 words)",
    "catalysts": ["catalyst 1", "catalyst 2", "catalyst 3"],
    "risks": ["risk to bull thesis"],
    "conviction": 75
  },
  "bearCase": {
    "argument": "One compelling sentence for the bear thesis",
    "resistanceKey": "One key bearish concern (2-3 words)",
    "catalysts": ["bear catalyst 1", "bear catalyst 2"],
    "risks": ["risk to bear thesis"],
    "conviction": 65
  }
}`;
}

function parseAIResponse(
  text: string,
  context: MarketContext,
  sentimentVector: number,
  priceVector: number
): { bullCase: CaseAnalysis; bearCase: CaseAnalysis } {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);

    const bullCase: CaseAnalysis = {
      Score: Math.min(100, Math.max(0, parsed.bullCase?.conviction || 70)),
      Argument: parsed.bullCase?.argument || 'Technical momentum suggests upside potential.',
      MomentumKey: parsed.bullCase?.momentumKey || 'MOMENTUM',
      Catalysts: parsed.bullCase?.catalysts || ['Technical breakout', 'Positive sentiment'],
      Risks: parsed.bullCase?.risks || ['Market volatility'],
      TimeHorizon: context.technicals.adx > 25 ? 'Short-term' : 'Medium-term',
      Confidence: parsed.bullCase?.conviction / 100 || 0.7
    };

    const bearCase: CaseAnalysis = {
      Score: Math.min(100, Math.max(0, parsed.bearCase?.conviction || 60)),
      Argument: parsed.bearCase?.argument || 'Overextended technicals suggest caution.',
      ResistanceKey: parsed.bearCase?.resistanceKey || 'RESISTANCE',
      Catalysts: parsed.bearCase?.catalysts || ['Overbought conditions', 'Profit taking'],
      Risks: parsed.bearCase?.risks || ['Unexpected catalyst'],
      TimeHorizon: 'Short-term',
      Confidence: parsed.bearCase?.conviction / 100 || 0.65
    };

    return { bullCase, bearCase };
  } catch {
    return {
      bullCase: generateBullCase(context, sentimentVector, priceVector),
      bearCase: generateBearCase(context, sentimentVector, priceVector)
    };
  }
}

/**
 * Rule-based bull case generation (fallback)
 */
function generateBullCase(
  context: MarketContext,
  sentimentVector: number,
  priceVector: number
): CaseAnalysis {
  const { technicals, marketTrend, currentPrice, priceChange30d } = context;

  let argument = '';
  let momentumKey = '';
  const catalysts: string[] = [];
  const risks: string[] = [];

  // Analyze trend
  if (marketTrend === 'bullish') {
    argument = `${context.ticker} maintains bullish structure with price above key moving averages and positive momentum.`;
    momentumKey = 'TREND INTACT';
    catalysts.push('Price above SMA50/200');
  } else if (priceChange30d > 0) {
    argument = `Despite consolidation, ${context.ticker} shows accumulation patterns and building momentum.`;
    momentumKey = 'ACCUMULATION';
    catalysts.push('30-day uptrend intact');
  } else {
    argument = `${context.ticker} at technical support levels presents potential reversal opportunity.`;
    momentumKey = 'OVERSOLD BOUNCE';
    catalysts.push('Near support levels');
  }

  // RSI analysis
  if (technicals.rsi < 30) {
    catalysts.push('Oversold RSI signals reversal potential');
  } else if (technicals.rsi < 50) {
    catalysts.push('RSI has room to expand');
  }

  // MACD analysis
  if (technicals.macd > 0 && technicals.macdHistogram > 0) {
    catalysts.push('MACD bullish crossover confirmed');
  }

  // Volume analysis
  if (technicals.obv > 0) {
    catalysts.push('Positive on-balance volume trend');
  }

  // Risks
  if (technicals.rsi > 70) risks.push('RSI overbought - potential pullback');
  if (currentPrice > technicals.bollingerUpper) risks.push('Trading above upper Bollinger Band');
  if (context.volatility === 'high' || context.volatility === 'extreme') risks.push('Elevated volatility');
  if (risks.length === 0) risks.push('General market risk');

  // Calculate conviction
  let score = 50;
  if (sentimentVector > 0) score += sentimentVector * 25;
  if (priceVector > 0) score += priceVector * 25;
  if (marketTrend === 'bullish') score += 10;
  if (technicals.rsi < 30) score += 10;
  score = Math.min(95, Math.max(20, score));

  return {
    Score: Math.round(score),
    Argument: argument,
    MomentumKey: momentumKey,
    Catalysts: catalysts.slice(0, 4),
    Risks: risks,
    TimeHorizon: technicals.adx > 30 ? 'Short-term (1-2 weeks)' : 'Medium-term (1-3 months)',
    Confidence: score / 100
  };
}

/**
 * Rule-based bear case generation (fallback)
 */
function generateBearCase(
  context: MarketContext,
  sentimentVector: number,
  priceVector: number
): CaseAnalysis {
  const { technicals, marketTrend, currentPrice, priceChange30d } = context;

  let argument = '';
  let resistanceKey = '';
  const catalysts: string[] = [];
  const risks: string[] = [];

  // Analyze trend
  if (marketTrend === 'bearish') {
    argument = `${context.ticker} remains in downtrend with price below key resistance and negative momentum.`;
    resistanceKey = 'TREND BREAK';
    catalysts.push('Price below SMA50/200');
  } else if (technicals.rsi > 70) {
    argument = `Overbought conditions in ${context.ticker} suggest mean reversion is likely.`;
    resistanceKey = 'OVERBOUGHT';
    catalysts.push('RSI signals exhaustion');
  } else if (priceChange30d > 15) {
    argument = `Extended rally in ${context.ticker} increases probability of profit-taking pullback.`;
    resistanceKey = 'EXTENDED RALLY';
    catalysts.push('30-day gains overextended');
  } else {
    argument = `${context.ticker} faces resistance at current levels with mixed technical signals.`;
    resistanceKey = 'RESISTANCE';
    catalysts.push('Approaching resistance zone');
  }

  // Technical concerns
  if (technicals.rsi > 70) {
    catalysts.push('Overbought RSI (>70)');
  }
  if (technicals.macd < 0 || technicals.macdHistogram < 0) {
    catalysts.push('MACD momentum weakening');
  }
  if (currentPrice > technicals.bollingerUpper) {
    catalysts.push('Price extended above Bollinger upper band');
  }
  if (technicals.stochK > 80) {
    catalysts.push('Stochastic overbought');
  }

  // Risks to bear case
  if (technicals.rsi < 30) risks.push('Oversold bounce possible');
  if (marketTrend === 'bullish') risks.push('Primary trend remains bullish');
  if (technicals.adx > 30) risks.push('Strong trend could continue');
  if (sentimentVector > 0.5) risks.push('Positive sentiment momentum');
  if (risks.length === 0) risks.push('Unexpected positive catalyst');

  // Calculate conviction
  let score = 50;
  if (sentimentVector < 0) score += Math.abs(sentimentVector) * 25;
  if (priceVector < 0) score += Math.abs(priceVector) * 25;
  if (marketTrend === 'bearish') score += 10;
  if (technicals.rsi > 70) score += 10;
  score = Math.min(90, Math.max(20, score));

  return {
    Score: Math.round(score),
    Argument: argument,
    ResistanceKey: resistanceKey,
    Catalysts: catalysts.slice(0, 4),
    Risks: risks,
    TimeHorizon: 'Short-term (1-4 weeks)',
    Confidence: score / 100
  };
}
