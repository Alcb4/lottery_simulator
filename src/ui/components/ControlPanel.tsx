/**
 * Control panel for simulation configuration.
 *
 * Supports random generation, preset historical data (e.g. UK National Lottery),
 * and CSV import of custom draw data.
 */

import React, { useState } from 'react';
import type { ModeId } from '../../types/index';
import type { SimulationState } from '../hooks/useSimulation';
import { ALL_MODE_IDS } from '../../generator/modes';
import { LOTTERY_PRESETS } from '../../data/uk-national-lottery';

interface ControlPanelProps {
  readonly state: SimulationState;
  readonly onUpdate: (updates: Partial<SimulationState>) => void;
  readonly onRunSingle: () => void;
  readonly onRunMonteCarlo: () => void;
  readonly onLoadPreset: (preset: typeof LOTTERY_PRESETS[number]) => void;
  readonly onLoadCSV: (csvText: string, numbersPerDraw: number) => void;
  readonly onClearPreset: () => void;
  readonly isRunning: boolean;
}

const HISTORICAL_PRESETS = [100, 500, 1000, 5000];
const FUTURE_PRESETS = [100, 500, 1000, 5000];
const RUN_PRESETS = [10, 100, 1000];

/** Helper to get mode config for display. */
function getModeConfig(id: ModeId) {
  const configs: Record<ModeId, { numbersPerDraw: number; maxNumber: number }> = {
    A: { numbersPerDraw: 1, maxNumber: 10 },
    B: { numbersPerDraw: 2, maxNumber: 20 },
    C: { numbersPerDraw: 3, maxNumber: 30 },
    D: { numbersPerDraw: 4, maxNumber: 40 },
    E: { numbersPerDraw: 5, maxNumber: 50 },
    F: { numbersPerDraw: 6, maxNumber: 60 },
  };
  return configs[id];
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  state,
  onUpdate,
  onRunSingle,
  onRunMonteCarlo,
  onLoadPreset,
  onLoadCSV,
  onClearPreset,
  isRunning,
}) => {
  const [csvText, setCsvText] = useState('');
  const [csvNumbersPerDraw, setCsvNumbersPerDraw] = useState(6);
  const [showCSV, setShowCSV] = useState(false);

  const isPresetActive = state.presetId !== null;

  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
      <h2>Simulation Controls</h2>

      {/* ── Data Source ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '15px' }}>Data Source</h3>

        {/* Preset selector */}
        <div style={{ marginBottom: '8px' }}>
          <label htmlFor="preset-select" style={{ fontWeight: 'bold', marginRight: '8px' }}>
            Preset:
          </label>
          <select
            id="preset-select"
            value={state.presetId || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                onClearPreset();
              } else {
                const preset = LOTTERY_PRESETS.find((p) => p.id === val);
                if (preset) onLoadPreset(preset);
              }
            }}
            disabled={isRunning}
            style={{ padding: '4px 8px' }}
          >
            <option value="">Random (generated)</option>
            {LOTTERY_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.draws.length} draws)
              </option>
            ))}
          </select>
          {isPresetActive && (
            <button
              onClick={onClearPreset}
              disabled={isRunning}
              style={{
                marginLeft: '8px',
                padding: '2px 8px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Preset info banner */}
        {isPresetActive && state.presetId !== 'csv-import' && (
          <div style={{ fontSize: '12px', color: '#495057', marginTop: '4px' }}>
            {(() => {
              const preset = LOTTERY_PRESETS.find((p) => p.id === state.presetId);
              return preset ? preset.description : '';
            })()}
          </div>
        )}

        {state.presetId === 'csv-import' && (
          <div style={{ fontSize: '12px', color: '#495057', marginTop: '4px' }}>
            Custom CSV data loaded — {state.customDraws?.length ?? 0} draws.
          </div>
        )}

        {/* CSV import toggle */}
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={() => setShowCSV((prev) => !prev)}
            disabled={isRunning}
            style={{
              padding: '4px 10px',
              background: showCSV ? '#6c757d' : '#e9ecef',
              color: showCSV ? 'white' : 'black',
              border: '1px solid #adb5bd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {showCSV ? 'Hide CSV Import' : 'Import CSV Data'}
          </button>
        </div>

        {/* CSV import area */}
        {showCSV && (
          <div style={{ marginTop: '8px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>
              Paste CSV draw data (one draw per line, numbers separated by commas):
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              disabled={isRunning}
              placeholder="1,5,32,38,52,58&#10;2,9,16,29,44,53&#10;3,11,22,34,47,56"
              style={{
                width: '100%',
                minHeight: '100px',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <label style={{ fontSize: '13px' }}>
                Numbers per draw:
                <input
                  type="number"
                  value={csvNumbersPerDraw}
                  onChange={(e) => setCsvNumbersPerDraw(Number(e.target.value))}
                  disabled={isRunning}
                  min={1}
                  max={10}
                  style={{ width: '50px', marginLeft: '6px', padding: '2px 4px' }}
                />
              </label>
              <button
                onClick={() => {
                  if (csvText.trim()) {
                    onLoadCSV(csvText, csvNumbersPerDraw);
                  }
                }}
                disabled={isRunning || !csvText.trim()}
                style={{
                  padding: '4px 12px',
                  background: csvText.trim() ? '#007bff' : '#ccc',
                  color: csvText.trim() ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: csvText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                }}
              >
                Load CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="mode-select" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Mode:
        </label>
        <select
          id="mode-select"
          value={state.mode}
          onChange={(e) => {
            onUpdate({ mode: e.target.value as ModeId });
            // Clear preset when manually changing mode
            if (isPresetActive) onClearPreset();
          }}
          disabled={isRunning}
        >
          {ALL_MODE_IDS.map((id) => (
            <option key={id} value={id}>
              Mode {id}: Pick {getModeConfig(id).numbersPerDraw} from {getModeConfig(id).maxNumber}
            </option>
          ))}
        </select>
      </div>

      {/* Seed input */}
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="seed-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Seed:
        </label>
        <input
          id="seed-input"
          type="number"
          value={state.seed}
          onChange={(e) => onUpdate({ seed: Number(e.target.value) })}
          disabled={isRunning}
          style={{ width: '120px' }}
        />
      </div>

      {/* numHistorical */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Historical draws:
          {isPresetActive && (
            <span style={{ fontWeight: 'normal', fontSize: '12px', color: '#6c757d', marginLeft: '8px' }}>
              (set by preset: {state.numHistorical})
            </span>
          )}
        </label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {HISTORICAL_PRESETS.map((n) => (
            <button
              key={n}
              onClick={() => onUpdate({ numHistorical: n })}
              disabled={isRunning || isPresetActive}
              style={{
                padding: '4px 8px',
                background: state.numHistorical === n ? '#007bff' : '#f0f0f0',
                color: state.numHistorical === n ? 'white' : 'black',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: isPresetActive ? 'not-allowed' : 'pointer',
                opacity: isPresetActive ? 0.5 : 1,
              }}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            value={state.numHistorical}
            onChange={(e) => onUpdate({ numHistorical: Number(e.target.value) })}
            disabled={isRunning || isPresetActive}
            style={{ width: '80px', opacity: isPresetActive ? 0.5 : 1 }}
            min={0}
          />
        </div>
      </div>

      {/* numFuture */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Future draws:
        </label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {FUTURE_PRESETS.map((n) => (
            <button
              key={n}
              onClick={() => onUpdate({ numFuture: n })}
              disabled={isRunning}
              style={{
                padding: '4px 8px',
                background: state.numFuture === n ? '#007bff' : '#f0f0f0',
                color: state.numFuture === n ? 'white' : 'black',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            value={state.numFuture}
            onChange={(e) => onUpdate({ numFuture: Number(e.target.value) })}
            disabled={isRunning}
            style={{ width: '80px' }}
            min={0}
          />
        </div>
      </div>

      {/* View toggle */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          View:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onUpdate({ view: 'single' })}
            disabled={isRunning}
            style={{
              padding: '6px 12px',
              background: state.view === 'single' ? '#007bff' : '#f0f0f0',
              color: state.view === 'single' ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Single Run
          </button>
          <button
            onClick={() => onUpdate({ view: 'montecarlo' })}
            disabled={isRunning}
            style={{
              padding: '6px 12px',
              background: state.view === 'montecarlo' ? '#007bff' : '#f0f0f0',
              color: state.view === 'montecarlo' ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Monte Carlo
          </button>
        </div>
      </div>

      {/* Evaluation style toggles */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Evaluation:
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label>
            <input
              type="checkbox"
              checked={state.evaluateFixed}
              onChange={(e) => onUpdate({ evaluateFixed: e.target.checked })}
              disabled={isRunning}
            />
            {' '}Fixed
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.evaluateRolling}
              onChange={(e) => onUpdate({ evaluateRolling: e.target.checked })}
              disabled={isRunning}
            />
            {' '}Rolling
          </label>
        </div>
      </div>

      {/* Monte Carlo controls */}
      {state.view === 'montecarlo' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
            Number of runs:
          </label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {RUN_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => onUpdate({ numRuns: n })}
                disabled={isRunning}
                style={{
                  padding: '4px 8px',
                  background: state.numRuns === n ? '#007bff' : '#f0f0f0',
                  color: state.numRuns === n ? 'white' : 'black',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              value={state.numRuns}
              onChange={(e) => onUpdate({ numRuns: Number(e.target.value) })}
              disabled={isRunning}
              style={{ width: '80px' }}
              min={1}
            />
          </div>
        </div>
      )}

      {/* Run button */}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={state.view === 'single' ? onRunSingle : onRunMonteCarlo}
          disabled={isRunning}
          style={{
            padding: '8px 24px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {isRunning ? 'Running...' : state.view === 'single' ? 'Run Single' : 'Run Monte Carlo'}
        </button>
      </div>

      {/* Guardrail disclaimer */}
      <div style={{ marginTop: '12px', padding: '8px', background: '#fff3cd', borderRadius: '4px', fontSize: '12px' }}>
        ⚠️ <strong>Disclaimer:</strong> This tool is for research and education only.
        Strategies are benchmarks against chance, not promises of an edge.
        Every valid combination in a fair lottery has equal probability.
      </div>
    </div>
  );
};