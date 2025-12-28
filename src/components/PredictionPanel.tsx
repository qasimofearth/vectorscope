import React from 'react';
import { TrendingUp, TrendingDown, Minus, Clock, Target, Shield, AlertTriangle, Zap } from 'lucide-react';
import type { Prediction72H } from '../types';

interface PredictionPanelProps {
  prediction: Prediction72H | null;
  currentPrice: number;
  ticker: string;
  isActive: boolean;
}

const PredictionPanel: React.FC<PredictionPanelProps> = ({
  prediction,
  currentPrice,
  ticker,
  isActive
}) => {
  if (!prediction || !isActive) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-gray-300 tracking-wider">72-HOUR PREDICTION</h3>
        </div>
        <div className="text-center py-8 text-gray-600">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Run analysis to generate prediction</p>
        </div>
      </div>
    );
  }

  const { direction, confidence, predictedChange, priceTarget, supportLevel, resistanceLevel, reasoning, keyFactors, riskFactors, timeframe } = prediction;

  const DirectionIcon = direction === 'UP' ? TrendingUp : direction === 'DOWN' ? TrendingDown : Minus;

  const getDirectionColor = () => {
    if (direction === 'UP') return 'text-green-400';
    if (direction === 'DOWN') return 'text-red-400';
    return 'text-yellow-400';
  };

  const getDirectionBg = () => {
    if (direction === 'UP') return 'bg-green-500/20 border-green-500/30';
    if (direction === 'DOWN') return 'bg-red-500/20 border-red-500/30';
    return 'bg-yellow-500/20 border-yellow-500/30';
  };

  const getConfidenceColor = () => {
    if (confidence >= 75) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const endDate = new Date(timeframe.end);
  const hoursRemaining = Math.max(0, Math.floor((timeframe.end - Date.now()) / (1000 * 60 * 60)));

  return (
    <div className={`glass-panel rounded-xl p-6 border ${getDirectionBg()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${getDirectionBg()}`}>
            <Clock className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wider">72-HOUR FORECAST</h3>
            <p className="text-xs text-gray-500">AI-powered price prediction for {ticker}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Expires</p>
          <p className="text-sm font-mono text-gray-300">
            {endDate.toLocaleDateString()} {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-purple-400">{hoursRemaining}h remaining</p>
        </div>
      </div>

      {/* Main Prediction */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Direction */}
        <div className={`rounded-xl p-4 border ${getDirectionBg()} text-center`}>
          <DirectionIcon className={`w-12 h-12 mx-auto mb-2 ${getDirectionColor()}`} />
          <p className={`text-2xl font-bold ${getDirectionColor()}`}>{direction}</p>
          <p className="text-xs text-gray-500 mt-1">Predicted Direction</p>
        </div>

        {/* Price Target */}
        <div className="bg-black/30 rounded-xl p-4 text-center">
          <Target className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
          <p className="text-2xl font-bold text-white font-mono">${priceTarget.toFixed(2)}</p>
          <p className={`text-sm font-mono ${predictedChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {predictedChange >= 0 ? '+' : ''}{predictedChange.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Target Price</p>
        </div>

        {/* Confidence */}
        <div className="bg-black/30 rounded-xl p-4 text-center">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={confidence >= 75 ? '#22c55e' : confidence >= 60 ? '#eab308' : '#f97316'}
                strokeWidth="3"
                strokeDasharray={`${confidence}, 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${getConfidenceColor()}`}>{confidence}%</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Confidence Level</p>
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Support</span>
          <span>Current</span>
          <span>Resistance</span>
        </div>
        <div className="relative h-8 bg-black/30 rounded-lg overflow-hidden">
          {/* Support zone */}
          <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-red-500/20" />
          {/* Resistance zone */}
          <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-green-500/20" />

          {/* Current price marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full border-2 border-white shadow-lg z-10"
            style={{
              left: `${Math.max(5, Math.min(95, ((currentPrice - supportLevel) / (resistanceLevel - supportLevel)) * 100))}%`
            }}
          />

          {/* Target price marker */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg ${
              direction === 'UP' ? 'bg-green-400' : direction === 'DOWN' ? 'bg-red-400' : 'bg-yellow-400'
            }`}
            style={{
              left: `${Math.max(5, Math.min(95, ((priceTarget - supportLevel) / (resistanceLevel - supportLevel)) * 100))}%`
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-mono mt-1">
          <span className="text-red-400">${supportLevel.toFixed(2)}</span>
          <span className="text-cyan-400">${currentPrice.toFixed(2)}</span>
          <span className="text-green-400">${resistanceLevel.toFixed(2)}</span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-4">
        <h4 className="text-xs text-gray-500 font-bold tracking-wider mb-2">ANALYSIS</h4>
        <p className="text-sm text-gray-300 leading-relaxed bg-black/20 rounded-lg p-3">
          {reasoning}
        </p>
      </div>

      {/* Factors Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Key Factors */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-green-400" />
            <h4 className="text-xs text-gray-500 font-bold tracking-wider">KEY FACTORS</h4>
          </div>
          <div className="space-y-1">
            {keyFactors.map((factor, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-gray-400 bg-black/20 rounded px-2 py-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                {factor}
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h4 className="text-xs text-gray-500 font-bold tracking-wider">RISK FACTORS</h4>
          </div>
          <div className="space-y-1">
            {riskFactors.map((factor, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-gray-400 bg-black/20 rounded px-2 py-1">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                {factor}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-600 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Predictions are based on technical analysis and AI modeling. Not financial advice. Past performance doesn't guarantee future results.
        </p>
      </div>
    </div>
  );
};

export default PredictionPanel;
