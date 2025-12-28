import type {
  MarketContext,
  AnalysisResult,
  CaseAnalysis,
  MarketData,
  Prediction72H
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

  // Generate 72-hour prediction
  let prediction: Prediction72H;

  if (CLAUDE_API_KEY) {
    const aiAnalysis = await generateAIAnalysis(ticker, context, sentimentVector, priceVector);
    bullCase = aiAnalysis.bullCase;
    bearCase = aiAnalysis.bearCase;
    prediction = aiAnalysis.prediction;
  } else {
    // Generate analysis without AI (rule-based)
    bullCase = generateBullCase(context, sentimentVector, priceVector);
    bearCase = generateBearCase(context, sentimentVector, priceVector);
    prediction = generatePrediction(context, sentimentVector, priceVector, bullCase, bearCase);
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
    prediction,
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
): Promise<{ bullCase: CaseAnalysis; bearCase: CaseAnalysis; prediction: Prediction72H }> {
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
        max_tokens: 2048,
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
    const bullCase = generateBullCase(context, sentimentVector, priceVector);
    const bearCase = generateBearCase(context, sentimentVector, priceVector);
    return {
      bullCase,
      bearCase,
      prediction: generatePrediction(context, sentimentVector, priceVector, bullCase, bearCase)
    };
  }
}

function buildAnalysisPrompt(ticker: string, context: MarketContext): string {
  const newsHeadlines = context.recentNews.slice(0, 5).map(n => `- ${n.title}`).join('\n');

  return `You are an expert quantitative analyst. Analyze ${ticker} and provide a bull case, bear case, AND a 72-HOUR PRICE PREDICTION.

CURRENT MARKET DATA:
- Current Price: $${context.currentPrice.toFixed(2)}
- 24h Change: ${context.priceChange24h.toFixed(2)}%
- 7d Change: ${context.priceChange7d.toFixed(2)}%
- 30d Change: ${context.priceChange30d.toFixed(2)}%
- Market Trend: ${context.marketTrend}
- Volatility: ${context.volatility}

TECHNICAL INDICATORS:
- RSI(14): ${context.technicals.rsi.toFixed(1)} ${context.technicals.rsi > 70 ? '(OVERBOUGHT)' : context.technicals.rsi < 30 ? '(OVERSOLD)' : ''}
- MACD: ${context.technicals.macd.toFixed(3)} (${context.technicals.macdHistogram > 0 ? 'BULLISH' : 'BEARISH'} histogram)
- Price vs SMA50 ($${context.technicals.sma50.toFixed(2)}): ${context.currentPrice > context.technicals.sma50 ? 'ABOVE' : 'BELOW'}
- Price vs SMA200 ($${context.technicals.sma200.toFixed(2)}): ${context.currentPrice > context.technicals.sma200 ? 'ABOVE' : 'BELOW'}
- Bollinger: Lower $${context.technicals.bollingerLower.toFixed(2)} | Mid $${context.technicals.bollingerMiddle.toFixed(2)} | Upper $${context.technicals.bollingerUpper.toFixed(2)}
- ADX (Trend Strength): ${context.technicals.adx.toFixed(1)} ${context.technicals.adx > 25 ? '(TRENDING)' : '(RANGING)'}
- Stochastic %K: ${context.technicals.stochK.toFixed(1)}

RECENT NEWS:
${newsHeadlines || 'No recent news available'}

Based on technical analysis, momentum, and market conditions, predict where ${ticker} will be in 72 hours.

Respond in this EXACT JSON format (no markdown, just JSON):
{
  "bullCase": {
    "argument": "One compelling sentence for the bull thesis",
    "momentumKey": "Key bullish catalyst (2-3 words)",
    "catalysts": ["catalyst 1", "catalyst 2", "catalyst 3"],
    "risks": ["risk to bull thesis"],
    "conviction": 75
  },
  "bearCase": {
    "argument": "One compelling sentence for the bear thesis",
    "resistanceKey": "Key bearish concern (2-3 words)",
    "catalysts": ["bear catalyst 1", "bear catalyst 2"],
    "risks": ["risk to bear thesis"],
    "conviction": 65
  },
  "prediction72h": {
    "direction": "UP or DOWN or SIDEWAYS",
    "confidence": 70,
    "predictedChangePercent": 2.5,
    "priceTarget": ${(context.currentPrice * 1.02).toFixed(2)},
    "supportLevel": ${(context.currentPrice * 0.97).toFixed(2)},
    "resistanceLevel": ${(context.currentPrice * 1.05).toFixed(2)},
    "reasoning": "Brief explanation of why price will move this direction",
    "keyFactors": ["factor 1", "factor 2"],
    "riskFactors": ["what could invalidate this prediction"]
  }
}`;
}

function parseAIResponse(
  text: string,
  context: MarketContext,
  sentimentVector: number,
  priceVector: number
): { bullCase: CaseAnalysis; bearCase: CaseAnalysis; prediction: Prediction72H } {
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

    // Parse 72h prediction
    const pred = parsed.prediction72h;
    const now = Date.now();
    const prediction: Prediction72H = {
      direction: (pred?.direction === 'UP' || pred?.direction === 'DOWN' || pred?.direction === 'SIDEWAYS')
        ? pred.direction
        : (sentimentVector + priceVector > 0.2 ? 'UP' : sentimentVector + priceVector < -0.2 ? 'DOWN' : 'SIDEWAYS'),
      confidence: Math.min(95, Math.max(30, pred?.confidence || 65)),
      predictedChange: pred?.predictedChangePercent || (sentimentVector + priceVector) * 3,
      priceTarget: pred?.priceTarget || context.currentPrice * (1 + (sentimentVector + priceVector) * 0.03),
      supportLevel: pred?.supportLevel || context.technicals.bollingerLower,
      resistanceLevel: pred?.resistanceLevel || context.technicals.bollingerUpper,
      reasoning: pred?.reasoning || 'Based on technical indicator alignment and momentum analysis.',
      keyFactors: pred?.keyFactors || ['Technical momentum', 'Market sentiment'],
      riskFactors: pred?.riskFactors || ['Market volatility', 'Unexpected news'],
      timeframe: {
        start: now,
        end: now + (72 * 60 * 60 * 1000)
      }
    };

    return { bullCase, bearCase, prediction };
  } catch {
    const bullCase = generateBullCase(context, sentimentVector, priceVector);
    const bearCase = generateBearCase(context, sentimentVector, priceVector);
    return {
      bullCase,
      bearCase,
      prediction: generatePrediction(context, sentimentVector, priceVector, bullCase, bearCase)
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

/**
 * Rule-based 72-hour prediction (fallback)
 */
function generatePrediction(
  context: MarketContext,
  sentimentVector: number,
  priceVector: number,
  bullCase: CaseAnalysis,
  bearCase: CaseAnalysis
): Prediction72H {
  const { technicals, currentPrice, marketTrend } = context;
  const now = Date.now();

  // Determine direction based on multiple factors
  const combinedVector = (sentimentVector + priceVector) / 2;
  const bullStrength = bullCase.Score;
  const bearStrength = bearCase.Score;

  let direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  let confidence: number;
  let predictedChange: number;

  // Strong signals
  if (combinedVector > 0.3 && bullStrength > bearStrength + 10) {
    direction = 'UP';
    confidence = Math.min(85, 50 + combinedVector * 30 + (bullStrength - bearStrength) / 2);
    predictedChange = 1.5 + combinedVector * 3;
  } else if (combinedVector < -0.3 && bearStrength > bullStrength + 10) {
    direction = 'DOWN';
    confidence = Math.min(85, 50 + Math.abs(combinedVector) * 30 + (bearStrength - bullStrength) / 2);
    predictedChange = -(1.5 + Math.abs(combinedVector) * 3);
  } else if (Math.abs(combinedVector) < 0.15 || Math.abs(bullStrength - bearStrength) < 10) {
    direction = 'SIDEWAYS';
    confidence = 60 + (20 - Math.abs(bullStrength - bearStrength)) / 2;
    predictedChange = combinedVector * 1.5;
  } else if (combinedVector > 0) {
    direction = 'UP';
    confidence = 55 + combinedVector * 20;
    predictedChange = 0.5 + combinedVector * 2;
  } else {
    direction = 'DOWN';
    confidence = 55 + Math.abs(combinedVector) * 20;
    predictedChange = -(0.5 + Math.abs(combinedVector) * 2);
  }

  // RSI adjustments
  if (technicals.rsi > 75 && direction === 'UP') {
    confidence -= 15;
    predictedChange *= 0.5;
  } else if (technicals.rsi < 25 && direction === 'DOWN') {
    confidence -= 15;
    predictedChange *= 0.5;
  }

  // Trend alignment bonus
  if ((marketTrend === 'bullish' && direction === 'UP') ||
      (marketTrend === 'bearish' && direction === 'DOWN')) {
    confidence += 10;
  }

  confidence = Math.min(90, Math.max(35, confidence));

  // Calculate price target
  const priceTarget = currentPrice * (1 + predictedChange / 100);

  // Support and resistance levels
  const supportLevel = Math.min(technicals.bollingerLower, technicals.sma50 * 0.98);
  const resistanceLevel = Math.max(technicals.bollingerUpper, technicals.sma50 * 1.02);

  // Generate reasoning
  let reasoning = '';
  const keyFactors: string[] = [];
  const riskFactors: string[] = [];

  if (direction === 'UP') {
    reasoning = `Technical indicators suggest bullish momentum with ${marketTrend} market structure. `;
    if (technicals.macdHistogram > 0) {
      reasoning += 'MACD histogram is positive indicating buying pressure. ';
      keyFactors.push('Positive MACD momentum');
    }
    if (currentPrice > technicals.sma50) {
      reasoning += 'Price holding above SMA50 confirms uptrend. ';
      keyFactors.push('Above key moving average');
    }
    if (technicals.rsi < 70) {
      keyFactors.push('RSI not yet overbought');
    }
    riskFactors.push('Unexpected negative news');
    if (technicals.rsi > 60) riskFactors.push('Approaching overbought territory');
  } else if (direction === 'DOWN') {
    reasoning = `Technical weakness detected with ${marketTrend} bias. `;
    if (technicals.macdHistogram < 0) {
      reasoning += 'MACD histogram negative showing selling pressure. ';
      keyFactors.push('Negative MACD momentum');
    }
    if (currentPrice < technicals.sma50) {
      reasoning += 'Price below SMA50 signals weakness. ';
      keyFactors.push('Below key moving average');
    }
    if (technicals.rsi > 50) {
      keyFactors.push('RSI has room to fall');
    }
    riskFactors.push('Unexpected positive catalyst');
    if (technicals.rsi < 40) riskFactors.push('Approaching oversold territory');
  } else {
    reasoning = 'Mixed signals suggest consolidation likely. Bull and bear cases are balanced with no clear directional bias. Range-bound trading expected.';
    keyFactors.push('Balanced bull/bear sentiment');
    keyFactors.push('Low directional conviction');
    riskFactors.push('Breakout in either direction');
    riskFactors.push('Catalyst-driven move');
  }

  if (keyFactors.length === 0) keyFactors.push('Technical momentum alignment');
  if (riskFactors.length === 0) riskFactors.push('General market volatility');

  return {
    direction,
    confidence: Math.round(confidence),
    predictedChange: parseFloat(predictedChange.toFixed(2)),
    priceTarget: parseFloat(priceTarget.toFixed(2)),
    supportLevel: parseFloat(supportLevel.toFixed(2)),
    resistanceLevel: parseFloat(resistanceLevel.toFixed(2)),
    reasoning: reasoning.trim(),
    keyFactors,
    riskFactors,
    timeframe: {
      start: now,
      end: now + (72 * 60 * 60 * 1000)
    }
  };
}
