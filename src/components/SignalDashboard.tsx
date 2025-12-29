import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  BarChart3,
  MessageSquare,
  Users,
  Calendar,
  Zap
} from 'lucide-react';
import type { MultiSignalAnalysis, SignalScore, OptionsFlow, EventsCalendar, SocialSentiment } from '../types';

interface SignalDashboardProps {
  multiSignal: MultiSignalAnalysis | undefined;
  optionsFlow: OptionsFlow | undefined;
  eventsCalendar: EventsCalendar | undefined;
  socialSentiment: SocialSentiment | undefined;
  isActive: boolean;
}

const SignalDashboard: React.FC<SignalDashboardProps> = ({
  multiSignal,
  optionsFlow,
  eventsCalendar,
  socialSentiment,
  isActive
}) => {
  if (!isActive || !multiSignal) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-bold text-gray-300 tracking-wider">MULTI-SIGNAL ANALYSIS</h3>
        </div>
        <div className="text-center py-8 text-gray-600">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Run analysis to see signal breakdown</p>
        </div>
      </div>
    );
  }

  const { technicalScore, optionsScore, sentimentScore, socialScore, eventScore, combinedScore, combinedConfidence, signalStrength } = multiSignal;

  const getScoreColor = (score: number) => {
    if (score > 30) return 'text-green-400';
    if (score > 10) return 'text-green-300';
    if (score < -30) return 'text-red-400';
    if (score < -10) return 'text-red-300';
    return 'text-yellow-400';
  };

  const getScoreBg = (score: number) => {
    if (score > 30) return 'bg-green-500/20';
    if (score > 10) return 'bg-green-500/10';
    if (score < -30) return 'bg-red-500/20';
    if (score < -10) return 'bg-red-500/10';
    return 'bg-yellow-500/10';
  };

  const getSignalIcon = (signal: SignalScore['signal']) => {
    if (signal === 'strong_buy' || signal === 'buy') return TrendingUp;
    if (signal === 'strong_sell' || signal === 'sell') return TrendingDown;
    return Minus;
  };

  const getStrengthColor = () => {
    if (signalStrength === 'strong') return 'text-green-400 bg-green-500/20';
    if (signalStrength === 'moderate') return 'text-yellow-400 bg-yellow-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  const renderSignalBar = (score: SignalScore, icon: React.ElementType) => {
    const Icon = icon;
    const SignalIcon = getSignalIcon(score.signal);
    const barWidth = Math.min(100, Math.abs(score.score));
    const isPositive = score.score >= 0;

    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">{score.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold ${getScoreColor(score.score)}`}>
              {score.score > 0 ? '+' : ''}{score.score.toFixed(0)}
            </span>
            <SignalIcon className={`w-3 h-3 ${getScoreColor(score.score)}`} />
          </div>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 border-r border-gray-700" />
            <div className="w-1/2" />
          </div>
          <div
            className={`absolute h-full transition-all duration-500 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
            style={{
              width: `${barWidth / 2}%`,
              left: isPositive ? '50%' : `${50 - barWidth / 2}%`
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-600">Confidence: {score.confidence}%</span>
          <span className="text-[10px] text-gray-600">Weight: {(score.weight * 100).toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-bold text-gray-300 tracking-wider">MULTI-SIGNAL ANALYSIS</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStrengthColor()}`}>
          {signalStrength.toUpperCase()} SIGNAL
        </div>
      </div>

      {/* Combined Score */}
      <div className={`rounded-xl p-4 mb-6 ${getScoreBg(combinedScore)} border border-gray-700`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">COMBINED SCORE</p>
            <p className={`text-3xl font-bold font-mono ${getScoreColor(combinedScore)}`}>
              {combinedScore > 0 ? '+' : ''}{combinedScore.toFixed(1)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">CONFIDENCE</p>
            <p className="text-2xl font-bold font-mono text-cyan-400">{combinedConfidence.toFixed(0)}%</p>
          </div>
        </div>
        <div className="mt-3 h-3 bg-gray-800 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 border-r border-gray-600" />
            <div className="w-1/2" />
          </div>
          <div
            className={`absolute h-full transition-all duration-700 rounded-full ${combinedScore >= 0 ? 'bg-gradient-to-r from-yellow-500 to-green-500' : 'bg-gradient-to-r from-red-500 to-yellow-500'}`}
            style={{
              width: `${Math.min(100, Math.abs(combinedScore)) / 2}%`,
              left: combinedScore >= 0 ? '50%' : `${50 - Math.min(100, Math.abs(combinedScore)) / 2}%`
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>BEARISH</span>
          <span>NEUTRAL</span>
          <span>BULLISH</span>
        </div>
      </div>

      {/* Signal Breakdown */}
      <div className="space-y-1">
        {renderSignalBar(technicalScore, Activity)}
        {renderSignalBar(optionsScore, BarChart3)}
        {renderSignalBar(sentimentScore, MessageSquare)}
        {renderSignalBar(socialScore, Users)}
        {renderSignalBar(eventScore, Calendar)}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        {/* Options Flow */}
        {optionsFlow && (
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 mb-1">PUT/CALL RATIO</p>
            <p className={`text-lg font-bold font-mono ${
              optionsFlow.putCallRatio < 0.8 ? 'text-green-400' :
              optionsFlow.putCallRatio > 1.2 ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {optionsFlow.putCallRatio.toFixed(2)}
            </p>
            <p className={`text-[10px] ${
              optionsFlow.sentiment === 'bullish' ? 'text-green-400' :
              optionsFlow.sentiment === 'bearish' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {optionsFlow.sentiment.toUpperCase()}
            </p>
          </div>
        )}

        {/* Social Sentiment */}
        {socialSentiment && (
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 mb-1">SOCIAL SCORE</p>
            <p className={`text-lg font-bold font-mono ${
              socialSentiment.overallScore > 0.2 ? 'text-green-400' :
              socialSentiment.overallScore < -0.2 ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {(socialSentiment.overallScore * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-gray-400">
              {socialSentiment.totalMentions} mentions
            </p>
          </div>
        )}

        {/* Events */}
        {eventsCalendar && (
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 mb-1">NEXT EARNINGS</p>
            {eventsCalendar.daysToEarnings !== null ? (
              <>
                <p className={`text-lg font-bold font-mono ${
                  eventsCalendar.daysToEarnings <= 7 ? 'text-orange-400' :
                  eventsCalendar.daysToEarnings <= 14 ? 'text-yellow-400' : 'text-gray-300'
                }`}>
                  {eventsCalendar.daysToEarnings}d
                </p>
                <p className="text-[10px] text-gray-400">
                  {eventsCalendar.hasNearTermCatalyst ? 'CATALYST' : 'away'}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold font-mono text-gray-500">--</p>
                <p className="text-[10px] text-gray-500">No date</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Unusual Options Activity */}
      {optionsFlow && optionsFlow.unusualActivity.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 font-bold mb-2">UNUSUAL OPTIONS ACTIVITY</p>
          <div className="space-y-1">
            {optionsFlow.unusualActivity.slice(0, 3).map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-black/20 rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activity.type === 'CALL' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {activity.type}
                  </span>
                  <span className="text-gray-400">${activity.strike}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-300">{activity.volume.toLocaleString()} vol</span>
                  <span className="text-gray-600 ml-2">${(activity.premium / 1000000).toFixed(1)}M</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalDashboard;
