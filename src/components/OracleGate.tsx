import React, { useState } from 'react';
import { Lock, Eye, Sparkles, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface OracleGateProps {
  isLocked: boolean;
  contextData: string;
  verdict?: string;
  confidence?: number;
}

const OracleGate: React.FC<OracleGateProps> = ({
  isLocked,
  contextData,
  verdict = 'HOLD',
  confidence = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getVerdictColor = (v: string): string => {
    switch (v) {
      case 'STRONG_BUY': return 'text-green-400';
      case 'BUY': return 'text-green-300';
      case 'HOLD': return 'text-yellow-400';
      case 'SELL': return 'text-red-300';
      case 'STRONG_SELL': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getVerdictBg = (v: string): string => {
    switch (v) {
      case 'STRONG_BUY': return 'bg-green-500/20 border-green-500/30';
      case 'BUY': return 'bg-green-400/20 border-green-400/30';
      case 'HOLD': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'SELL': return 'bg-red-400/20 border-red-400/30';
      case 'STRONG_SELL': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getVerdictDescription = (v: string): string => {
    switch (v) {
      case 'STRONG_BUY': return 'High-conviction bullish signal. Multiple indicators align favorably.';
      case 'BUY': return 'Moderate bullish signal. Technical and sentiment factors lean positive.';
      case 'HOLD': return 'Neutral stance. Mixed signals suggest waiting for clearer direction.';
      case 'SELL': return 'Moderate bearish signal. Risk factors outweigh potential upside.';
      case 'STRONG_SELL': return 'High-conviction bearish signal. Multiple warning indicators present.';
      default: return 'Analyzing...';
    }
  };

  return (
    <div className={`glass-panel rounded-xl overflow-hidden transition-all duration-500
      ${isLocked ? 'border-gray-700' : `border ${getVerdictBg(verdict).split(' ')[1]}`}`}>

      {/* Header */}
      <div
        className={`p-6 cursor-pointer transition-colors ${!isLocked ? 'hover:bg-white/5' : ''}`}
        onClick={() => !isLocked && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isLocked ? 'bg-gray-800' : 'bg-purple-500/20'}`}>
              {isLocked ? (
                <Lock className="w-6 h-6 text-gray-500" />
              ) : (
                <Eye className="w-6 h-6 text-purple-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                ORACLE GATE
                <Sparkles className={`w-4 h-4 ${isLocked ? 'text-gray-600' : 'text-purple-400'}`} />
              </h3>
              <p className="text-xs text-gray-500">
                {isLocked ? 'Requires coherence > 0.80 to unlock' : 'AI-synthesized market verdict'}
              </p>
            </div>
          </div>

          {!isLocked && (
            <div className="flex items-center gap-4">
              {/* Verdict badge */}
              <div className={`px-4 py-2 rounded-lg border ${getVerdictBg(verdict)} ${getVerdictColor(verdict)} font-bold tracking-wider`}>
                {verdict.replace('_', ' ')}
              </div>

              {/* Expand toggle */}
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          )}

          {isLocked && (
            <div className="flex items-center gap-2 text-gray-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">LOCKED</span>
            </div>
          )}
        </div>

        {/* Confidence bar (always visible when unlocked) */}
        {!isLocked && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">CONFIDENCE LEVEL</span>
              <span className={getVerdictColor(verdict)}>{(confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  verdict.includes('BUY') ? 'bg-gradient-to-r from-green-600 to-green-400' :
                  verdict.includes('SELL') ? 'bg-gradient-to-r from-red-600 to-red-400' :
                  'bg-gradient-to-r from-yellow-600 to-yellow-400'
                }`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Locked state overlay */}
      {isLocked && (
        <div className="px-6 pb-6">
          <div className="bg-black/30 rounded-lg p-4 border border-dashed border-gray-700">
            <div className="flex items-center gap-3 text-gray-600">
              <Lock className="w-5 h-5" />
              <div>
                <p className="text-sm">Oracle synthesis requires high vector coherence</p>
                <p className="text-xs mt-1">
                  Current state suggests conflicting signals between sentiment and price action.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {!isLocked && isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-800/50">
          <div className="pt-4 space-y-4">
            {/* Verdict description */}
            <div className={`p-4 rounded-lg ${getVerdictBg(verdict)}`}>
              <p className={`text-sm ${getVerdictColor(verdict)}`}>
                {getVerdictDescription(verdict)}
              </p>
            </div>

            {/* Analysis summary */}
            {contextData && (
              <div>
                <h4 className="text-xs text-gray-500 font-bold tracking-wider mb-2">ANALYSIS SUMMARY</h4>
                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300 leading-relaxed">{contextData}</p>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2 text-xs text-gray-600 bg-black/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                This analysis is for informational purposes only and should not be considered financial advice.
                Always conduct your own research and consult with qualified professionals before making investment decisions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OracleGate;
