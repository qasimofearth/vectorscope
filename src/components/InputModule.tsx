import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, TrendingUp } from 'lucide-react';

interface InputModuleProps {
  onScan: (ticker: string) => void;
  isLoading: boolean;
  statusMessage: string;
}

const POPULAR_TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'META', 'AMZN', 'AMD'];

const InputModule: React.FC<InputModuleProps> = ({ onScan, isLoading, statusMessage }) => {
  const [ticker, setTicker] = useState('');
  const [recentScans, setRecentScans] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('vectorscope_recent');
    if (saved) {
      setRecentScans(JSON.parse(saved));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim() && !isLoading) {
      const symbol = ticker.toUpperCase().trim();
      onScan(symbol);

      // Save to recent scans
      const updated = [symbol, ...recentScans.filter(s => s !== symbol)].slice(0, 5);
      setRecentScans(updated);
      localStorage.setItem('vectorscope_recent', JSON.stringify(updated));
    }
  };

  const handleQuickScan = (symbol: string) => {
    if (!isLoading) {
      setTicker(symbol);
      onScan(symbol);

      const updated = [symbol, ...recentScans.filter(s => s !== symbol)].slice(0, 5);
      setRecentScans(updated);
      localStorage.setItem('vectorscope_recent', JSON.stringify(updated));
    }
  };

  return (
    <div className="glass-panel rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-cyan-400" />
        <h2 className="text-sm font-bold text-gray-300 tracking-wider">TARGET ACQUISITION</h2>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="ENTER TICKER SYMBOL"
          disabled={isLoading}
          className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 pr-12
                     text-white font-mono text-lg tracking-wider
                     placeholder:text-gray-600 placeholder:text-sm
                     focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
          maxLength={5}
        />
        <button
          type="submit"
          disabled={isLoading || !ticker.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2
                     p-2 rounded-lg bg-cyan-500/20 text-cyan-400
                     hover:bg-cyan-500/30 hover:text-cyan-300
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </form>

      {/* Status message */}
      {statusMessage && (
        <div className={`mt-3 flex items-center gap-2 text-xs font-mono
          ${statusMessage.includes('ERROR')
            ? 'text-red-400'
            : statusMessage.includes('COMPLETE')
              ? 'text-green-400'
              : 'text-cyan-400'
          }`}>
          {statusMessage.includes('ERROR') ? (
            <AlertCircle className="w-3 h-3" />
          ) : isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <span className="w-2 h-2 bg-current rounded-full pulse-glow" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Quick access tickers */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2">POPULAR</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TICKERS.map((symbol) => (
            <button
              key={symbol}
              onClick={() => handleQuickScan(symbol)}
              disabled={isLoading}
              className="px-2 py-1 text-xs font-mono rounded
                         bg-gray-800/50 text-gray-400
                         hover:bg-cyan-500/20 hover:text-cyan-400
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Recent scans */}
      {recentScans.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">RECENT</p>
          <div className="flex flex-wrap gap-2">
            {recentScans.map((symbol) => (
              <button
                key={symbol}
                onClick={() => handleQuickScan(symbol)}
                disabled={isLoading}
                className="px-2 py-1 text-xs font-mono rounded
                           bg-purple-500/10 text-purple-400
                           hover:bg-purple-500/20
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InputModule;
