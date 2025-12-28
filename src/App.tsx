import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import InputModule from './components/InputModule';
import VectorScope from './components/VectorScope';
import AgentCard from './components/AgentCard';
import TelemetryPanel from './components/TelemetryPanel';
import PredictionPanel from './components/PredictionPanel';
import OracleGate from './components/OracleGate';
import type { AnalysisResult } from './types';
import { AnalysisState } from './types';
import { fetchMarketContext, performAdversarialAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>(AnalysisState.IDLE);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [contextSummary, setContextSummary] = useState<string>("");
  const [activeTicker, setActiveTicker] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Calculate coherence from sentiment and price vectors
  const coherence = useMemo(() => {
    if (!data) return "0.00";
    const diff = Math.abs(data.SentimentVector - data.PriceVector);
    return (1 - (diff / 2)).toFixed(2);
  }, [data]);

  const handleScan = async (ticker: string) => {
    setAnalysisState(AnalysisState.SCANNING);
    setStatusMsg("INITIATING MARKET SCAN...");
    setData(null);
    setContextSummary("");
    setActiveTicker(ticker.toUpperCase());

    try {
      // Phase 1: Fetch market context
      setStatusMsg("FETCHING REAL-TIME MARKET DATA...");
      const contextData = await fetchMarketContext(ticker);

      // Phase 2: Analyze sentiment
      setStatusMsg("ANALYZING MARKET SENTIMENT...");
      setAnalysisState(AnalysisState.ANALYZING);

      // Phase 3: Perform adversarial analysis
      setStatusMsg("GENERATING ADVERSARIAL ANALYSIS...");
      const result = await performAdversarialAnalysis(ticker, contextData);

      // Store result
      setData(result);

      // Build context summary for Oracle
      const summary = `${ticker.toUpperCase()} is trading at $${result.marketData.price.toFixed(2)} ` +
        `(${result.marketData.changePercent >= 0 ? '+' : ''}${result.marketData.changePercent.toFixed(2)}%). ` +
        `Bull Case (${result.BullCase.Score}/100): ${result.BullCase.Argument} ` +
        `Bear Case (${result.BearCase.Score}/100): ${result.BearCase.Argument} ` +
        `Technical outlook: RSI at ${result.technicals.rsi.toFixed(1)}, ` +
        `price ${result.marketData.price > result.technicals.sma50 ? 'above' : 'below'} SMA50. ` +
        `Vector coherence: ${(result.coherence * 100).toFixed(0)}%.`;

      setContextSummary(summary);
      setAnalysisState(AnalysisState.COMPLETE);
      setStatusMsg("ANALYSIS COMPLETE");
      setIsConnected(true);

    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisState(AnalysisState.ERROR);
      setStatusMsg(`ERROR: ${(error as Error).message}`);
      setIsConnected(false);
    }
  };

  const isProcessing = analysisState === AnalysisState.SCANNING || analysisState === AnalysisState.ANALYZING;
  const isComplete = analysisState === AnalysisState.COMPLETE;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 overflow-x-hidden">
      <Header ticker={activeTicker} isConnected={isConnected} />

      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 relative">
        {/* Center column - Input and VectorScope */}
        <div className="md:col-span-4 md:col-start-5 order-1 md:order-2 flex flex-col gap-6">
          <InputModule
            onScan={handleScan}
            isLoading={isProcessing}
            statusMessage={statusMsg}
          />

          <VectorScope
            sentimentVector={data ? data.SentimentVector : 0}
            priceVector={data ? data.PriceVector : 0}
            volumeVector={data ? data.VolumeVector : 0}
            isScanning={isProcessing}
            coherence={coherence}
          />
        </div>

        {/* Left column - Bull Agent */}
        <div className="md:col-span-4 md:col-start-1 order-2 md:order-1">
          <AgentCard
            type="bull"
            score={data ? data.BullCase.Score : 0}
            thesis={data ? data.BullCase.Argument : ""}
            keyword={data ? (data.BullCase.MomentumKey || "") : ""}
            catalysts={data ? data.BullCase.Catalysts : []}
            isActive={isComplete}
          />
        </div>

        {/* Right column - Bear Agent */}
        <div className="md:col-span-4 md:col-start-9 order-3">
          <AgentCard
            type="bear"
            score={data ? data.BearCase.Score : 0}
            thesis={data ? data.BearCase.Argument : ""}
            keyword={data ? (data.BearCase.ResistanceKey || "") : ""}
            catalysts={data ? data.BearCase.Catalysts : []}
            isActive={isComplete}
          />
        </div>

        {/* Full width - 72-Hour Prediction */}
        <div className="md:col-span-12 order-4">
          <PredictionPanel
            prediction={data?.prediction || null}
            currentPrice={data?.marketData.price || 0}
            ticker={activeTicker}
            isActive={isComplete}
          />
        </div>

        {/* Full width - Telemetry Panel */}
        <div className="md:col-span-12 order-5">
          <TelemetryPanel data={data} />
        </div>

        {/* Full width - Oracle Gate */}
        <div className="md:col-span-12 order-6">
          <OracleGate
            isLocked={parseFloat(coherence) <= 0.8}
            contextData={contextSummary}
            verdict={data?.verdict}
            confidence={data?.confidenceLevel}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 mb-4 text-center">
        <p className="text-xs text-gray-600">
          VectorScope Market Analysis Engine • Real-time data from Finnhub & Alpha Vantage
        </p>
        <p className="text-xs text-gray-700 mt-1">
          For informational purposes only • Not financial advice
        </p>
      </footer>
    </div>
  );
};

export default App;
