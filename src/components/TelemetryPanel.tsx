import React from 'react';
import { Activity, BarChart3, TrendingUp, TrendingDown, Gauge, Radio } from 'lucide-react';
import type { AnalysisResult } from '../types';

interface TelemetryPanelProps {
  data: AnalysisResult | null;
}

const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-gray-300 tracking-wider">TELEMETRY</h3>
        </div>
        <div className="text-center py-8 text-gray-600">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active scan data</p>
        </div>
      </div>
    );
  }

  const { marketData, technicals, coherence, volatilityIndex } = data;

  const getRSIColor = (rsi: number): string => {
    if (rsi > 70) return 'text-red-400';
    if (rsi < 30) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-gray-300 tracking-wider">TELEMETRY</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">
            Last update: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Price Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">PRICE</span>
            {getTrendIcon(marketData.change)}
          </div>
          <p className="text-xl font-bold text-white font-mono">
            ${marketData.price.toFixed(2)}
          </p>
          <p className={`text-xs mt-1 ${marketData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {marketData.change >= 0 ? '+' : ''}{marketData.change.toFixed(2)} ({marketData.changePercent.toFixed(2)}%)
          </p>
        </div>

        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">DAY RANGE</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-sm font-mono text-gray-300">
            ${marketData.low.toFixed(2)} - ${marketData.high.toFixed(2)}
          </p>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{
                width: `${((marketData.price - marketData.low) / (marketData.high - marketData.low)) * 100}%`
              }}
            />
          </div>
        </div>

        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">COHERENCE</span>
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <p className={`text-xl font-bold font-mono
            ${coherence > 0.7 ? 'text-green-400' : coherence > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
            {(coherence * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {coherence > 0.7 ? 'High alignment' : coherence > 0.4 ? 'Moderate' : 'Low alignment'}
          </p>
        </div>

        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">VOLATILITY</span>
            <Activity className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-xl font-bold text-orange-400 font-mono">
            {(volatilityIndex * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">ATR-based</p>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs text-gray-500 font-bold tracking-wider mb-4">TECHNICAL INDICATORS</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* RSI */}
          <div className="bg-black/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">RSI(14)</span>
              <span className={`text-xs font-bold ${getRSIColor(technicals.rsi)}`}>
                {technicals.rsi > 70 ? 'OVERBOUGHT' : technicals.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL'}
              </span>
            </div>
            <p className={`text-lg font-mono font-bold mt-1 ${getRSIColor(technicals.rsi)}`}>
              {technicals.rsi.toFixed(1)}
            </p>
          </div>

          {/* MACD */}
          <div className="bg-black/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">MACD</span>
              <span className={`text-xs font-bold ${technicals.macdHistogram > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {technicals.macdHistogram > 0 ? 'BULLISH' : 'BEARISH'}
              </span>
            </div>
            <p className={`text-lg font-mono font-bold mt-1 ${technicals.macd > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {technicals.macd.toFixed(3)}
            </p>
          </div>

          {/* SMA 50 */}
          <div className="bg-black/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">SMA 50</span>
              <span className={`text-xs font-bold ${marketData.price > technicals.sma50 ? 'text-green-400' : 'text-red-400'}`}>
                {marketData.price > technicals.sma50 ? 'ABOVE' : 'BELOW'}
              </span>
            </div>
            <p className="text-lg font-mono font-bold text-gray-300 mt-1">
              ${technicals.sma50.toFixed(2)}
            </p>
          </div>

          {/* SMA 200 */}
          <div className="bg-black/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">SMA 200</span>
              <span className={`text-xs font-bold ${marketData.price > technicals.sma200 ? 'text-green-400' : 'text-red-400'}`}>
                {marketData.price > technicals.sma200 ? 'ABOVE' : 'BELOW'}
              </span>
            </div>
            <p className="text-lg font-mono font-bold text-gray-300 mt-1">
              ${technicals.sma200.toFixed(2)}
            </p>
          </div>

          {/* ADX */}
          <div className="bg-black/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">ADX</span>
              <span className={`text-xs font-bold ${technicals.adx > 25 ? 'text-cyan-400' : 'text-gray-400'}`}>
                {technicals.adx > 25 ? 'TRENDING' : 'RANGING'}
              </span>
            </div>
            <p className={`text-lg font-mono font-bold mt-1 ${technicals.adx > 25 ? 'text-cyan-400' : 'text-gray-400'}`}>
              {technicals.adx.toFixed(1)}
            </p>
          </div>

          {/* Stochastic */}
          <div className="bg-black/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">STOCH</span>
              <span className={`text-xs font-bold ${
                technicals.stochK > 80 ? 'text-red-400' : technicals.stochK < 20 ? 'text-green-400' : 'text-gray-400'
              }`}>
                {technicals.stochK > 80 ? 'HIGH' : technicals.stochK < 20 ? 'LOW' : 'MID'}
              </span>
            </div>
            <p className={`text-lg font-mono font-bold mt-1 ${
              technicals.stochK > 80 ? 'text-red-400' : technicals.stochK < 20 ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {technicals.stochK.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Bollinger Bands visualization */}
      <div className="mt-4 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-bold tracking-wider">BOLLINGER BANDS</span>
          <span className="text-xs text-gray-400">
            Band Width: {((technicals.bollingerUpper - technicals.bollingerLower) / technicals.bollingerMiddle * 100).toFixed(1)}%
          </span>
        </div>
        <div className="relative h-8 bg-black/30 rounded-lg overflow-hidden">
          {/* Band range */}
          <div className="absolute inset-y-0 bg-purple-500/20"
            style={{
              left: '10%',
              right: '10%'
            }}
          />
          {/* Lower band */}
          <div className="absolute left-[10%] top-0 bottom-0 w-px bg-purple-500/50" />
          {/* Middle band */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-purple-400" />
          {/* Upper band */}
          <div className="absolute right-[10%] top-0 bottom-0 w-px bg-purple-500/50" />
          {/* Price position */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full border-2 border-white shadow-lg"
            style={{
              left: `${Math.max(5, Math.min(95,
                ((marketData.price - technicals.bollingerLower) /
                (technicals.bollingerUpper - technicals.bollingerLower)) * 80 + 10
              ))}%`
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>${technicals.bollingerLower.toFixed(2)}</span>
          <span>SMA: ${technicals.bollingerMiddle.toFixed(2)}</span>
          <span>${technicals.bollingerUpper.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;
