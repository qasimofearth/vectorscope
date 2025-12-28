import React from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  ticker?: string;
  isConnected: boolean;
}

const Header: React.FC<HeaderProps> = ({ ticker, isConnected }) => {
  return (
    <header className="w-full max-w-5xl mb-8">
      <div className="glass-panel rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Activity className="w-8 h-8 text-cyan-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full pulse-glow" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-wider text-white font-[Orbitron]">
              VECTOR<span className="text-cyan-400">SCOPE</span>
            </h1>
            <p className="text-xs text-gray-500 tracking-widest">
              ADVERSARIAL MARKET ANALYSIS ENGINE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {ticker && (
            <div className="hidden md:block text-right">
              <p className="text-xs text-gray-500">ACTIVE SCAN</p>
              <p className="text-lg font-bold text-cyan-400 font-mono">{ticker}</p>
            </div>
          )}

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono
            ${isConnected
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="w-2 h-2 bg-cyan-500/50 rounded-full" />
          <span>Real-time market data</span>
          <span className="mx-2">|</span>
          <span className="w-2 h-2 bg-purple-500/50 rounded-full" />
          <span>AI-powered analysis</span>
          <span className="mx-2">|</span>
          <span className="w-2 h-2 bg-green-500/50 rounded-full" />
          <span>Adversarial scoring</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
