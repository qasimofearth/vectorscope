import React from 'react';
import { TrendingUp, TrendingDown, Zap, Shield, ChevronRight } from 'lucide-react';

interface AgentCardProps {
  type: 'bull' | 'bear';
  score: number;
  thesis: string;
  keyword: string;
  catalysts?: string[];
  isActive: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
  type,
  score,
  thesis,
  keyword,
  catalysts = [],
  isActive
}) => {
  const isBull = type === 'bull';
  const Icon = isBull ? TrendingUp : TrendingDown;
  const KeywordIcon = isBull ? Zap : Shield;

  const colors = isBull
    ? {
        primary: 'text-green-400',
        bg: 'bg-green-500',
        border: 'border-green-500/30',
        glow: 'shadow-green-500/20',
        gradient: 'from-green-500/20 to-transparent'
      }
    : {
        primary: 'text-red-400',
        bg: 'bg-red-500',
        border: 'border-red-500/30',
        glow: 'shadow-red-500/20',
        gradient: 'from-red-500/20 to-transparent'
      };

  return (
    <div
      className={`glass-panel rounded-xl p-5 h-full relative overflow-hidden transition-all duration-500
        ${isActive ? `${colors.border} border shadow-lg ${colors.glow}` : 'border-gray-800/50 opacity-60'}`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-50`} />

      {/* Scan line effect when active */}
      {isActive && (
        <div className="absolute inset-0 data-stream opacity-30" />
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colors.bg}/20`}>
              <Icon className={`w-5 h-5 ${colors.primary}`} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${colors.primary} tracking-wider`}>
                {isBull ? 'BULL' : 'BEAR'} AGENT
              </h3>
              <p className="text-xs text-gray-500">
                {isBull ? 'Optimistic Analysis' : 'Risk Assessment'}
              </p>
            </div>
          </div>

          {/* Score gauge */}
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={isBull ? '#22c55e' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${isActive ? score : 0}, 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${colors.primary}`}>
                {isActive ? score : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Keyword badge */}
        {keyword && isActive && (
          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full
            ${colors.bg}/20 ${colors.primary} text-xs font-mono tracking-wider mb-3`}>
            <KeywordIcon className="w-3 h-3" />
            <span>{keyword}</span>
          </div>
        )}

        {/* Thesis */}
        <div className="mb-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            {isActive && thesis ? thesis : (
              <span className="text-gray-600 italic">Awaiting analysis...</span>
            )}
          </p>
        </div>

        {/* Catalysts */}
        {catalysts.length > 0 && isActive && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-bold tracking-wider">
              {isBull ? 'CATALYSTS' : 'CONCERNS'}
            </p>
            <div className="space-y-1">
              {catalysts.slice(0, 3).map((catalyst, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs text-gray-400"
                >
                  <ChevronRight className={`w-3 h-3 ${colors.primary}`} />
                  <span>{catalyst}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity indicator */}
        <div className="absolute bottom-4 right-4">
          <div className={`w-2 h-2 rounded-full ${isActive ? colors.bg : 'bg-gray-600'}
            ${isActive ? 'pulse-glow' : ''}`} />
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
