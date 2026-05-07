/**
 * Main application component — lottery simulation research tool.
 */

import React from 'react';
import { useSimulation } from './hooks/useSimulation';
import { ControlPanel } from './components/ControlPanel';
import { SingleRunDashboard } from './components/SingleRunDashboard';
import { MonteCarloDashboard } from './components/MonteCarloDashboard';
import { YourNumbers } from './components/YourNumbers';
import { ExportButtons } from './components/ExportButtons';
import type { SingleRunResult, MonteCarloResult } from '../types/index';

export const App: React.FC = () => {
  const { state, results, updateState, runSingle, runMonteCarloSim, loadPreset, loadCSVData, clearPreset } = useSimulation();

  // Build SingleRunResult for export if we have single-run data
  const singleRunResult: SingleRunResult | null = results.dataset
    ? {
        dataset: results.dataset,
        analysis: results.analysis,
        strategyResults: results.strategyResults,
        baselines: results.baselines,
      }
    : null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ marginBottom: '4px' }}>Lottery Simulation Research Tool</h1>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
        Statistical analysis and strategy evaluation for lottery-style random draws.
        For research and education only.
      </p>

      <ControlPanel
        state={state}
        onUpdate={updateState}
        onRunSingle={runSingle}
        onRunMonteCarlo={runMonteCarloSim}
        onLoadPreset={loadPreset}
        onLoadCSV={loadCSVData}
        onClearPreset={clearPreset}
        isRunning={results.isRunning}
      />

      {results.error && (
        <div style={{ padding: '12px', background: '#f8d7da', borderRadius: '4px', marginBottom: '16px' }}>
          <strong>Error:</strong> {results.error}
        </div>
      )}

      {state.view === 'single' && (
        <>
          {/* Your Numbers — test your own picks against future draws */}
          <YourNumbers
            modeId={state.mode}
            historicalDraws={results.dataset?.historical ?? null}
            futureDraws={results.dataset?.future ?? null}
          />

          <SingleRunDashboard
            analysis={results.analysis}
            strategyResults={results.strategyResults}
            baselines={results.baselines}
            modeId={state.mode}
            numHistorical={state.numHistorical}
            numFuture={state.numFuture}
          />
        </>
      )}

      {state.view === 'montecarlo' && results.monteCarloResult && (
        <MonteCarloDashboard
          summaries={results.monteCarloResult.strategySummaries}
          isModeA={state.mode === 'A'}
        />
      )}

      <ExportButtons
        singleRunResult={singleRunResult}
        monteCarloResult={results.monteCarloResult}
      />
    </div>
  );
};