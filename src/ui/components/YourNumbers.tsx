/**
 * Manual number entry component — pick your own numbers or auto-fill from
 * strategy predictions, then evaluate against future draws.
 */

import React, { useState, useCallback } from 'react';
import type { ModeId, Draw, PredictionStrategy, StrategyContext } from '../../types/index';
import { ALL_STRATEGIES } from '../../strategies/index';
import { getModeConfig } from '../../generator/modes';

interface YourNumbersProps {
  readonly modeId: ModeId;
  readonly historicalDraws: readonly Draw[] | null;
  readonly futureDraws: readonly Draw[] | null;
}

export interface YourNumbersResult {
  readonly hitCount: number;
  readonly hitRate: number;
  readonly matchDistribution: ReadonlyMap<number, number>;
  readonly averageOverlap: number;
  readonly runningHitRate: readonly number[];
}

export const YourNumbers: React.FC<YourNumbersProps> = ({
  modeId,
  historicalDraws,
  futureDraws,
}) => {
  const modeConfig = getModeConfig(modeId);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [result, setResult] = useState<YourNumbersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUsedStrategy, setLastUsedStrategy] = useState<string | null>(null);

  const toggleNumber = useCallback((num: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      if (prev.length >= modeConfig.numbersPerDraw) {
        return prev;
      }
      return [...prev, num].sort((a, b) => a - b);
    });
    setResult(null);
    setError(null);
    setLastUsedStrategy(null);
  }, [modeConfig.numbersPerDraw]);

  const handleFillFromStrategy = useCallback((strategy: PredictionStrategy) => {
    if (!historicalDraws || historicalDraws.length === 0) {
      setError('No historical data available. Run a simulation first.');
      return;
    }
    const ctx: StrategyContext = { mode: modeConfig, historical: historicalDraws };
    const model = strategy.buildModel(ctx);
    const prediction = strategy.predictNextFixed(model);
    setSelectedNumbers(prediction);
    setResult(null);
    setError(null);
    setLastUsedStrategy(strategy.id);
  }, [modeConfig, historicalDraws]);

  const handleEvaluate = useCallback(() => {
    if (selectedNumbers.length !== modeConfig.numbersPerDraw) {
      setError(`Please select exactly ${modeConfig.numbersPerDraw} number${modeConfig.numbersPerDraw > 1 ? 's' : ''}.`);
      return;
    }
    if (!futureDraws || futureDraws.length === 0) {
      setError('No future draws available. Run a simulation first.');
      return;
    }
    const evalResult = evaluateYourNumbers(selectedNumbers, futureDraws, modeConfig.numbersPerDraw);
    setResult(evalResult);
    setError(null);
  }, [selectedNumbers, futureDraws, modeConfig.numbersPerDraw]);

  const handleClear = useCallback(() => {
    setSelectedNumbers([]);
    setResult(null);
    setError(null);
    setLastUsedStrategy(null);
  }, []);

  const isComplete = selectedNumbers.length === modeConfig.numbersPerDraw;
  const hasData = historicalDraws && historicalDraws.length > 0 && futureDraws && futureDraws.length > 0;

  return (
    <div style={{ marginBottom: '20px', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '16px' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>🎯 Your Numbers</h3>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px 0' }}>
        Pick {modeConfig.numbersPerDraw} number{modeConfig.numbersPerDraw > 1 ? 's' : ''} from 1–{modeConfig.maxNumber} and see how they perform against the {futureDraws?.length ?? 0} future draws.
        Use the quick-fill buttons below to auto-select each strategy's prediction.
      </p>

      {/* Quick-fill from strategies */}
      {hasData && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px', fontWeight: 'bold' }}>
            ⚡ Quick-fill from strategy prediction:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {ALL_STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => handleFillFromStrategy(strategy)}
                style={{
                  padding: '4px 10px',
                  background: lastUsedStrategy === strategy.id ? '#28a745' : '#f0f0f0',
                  color: lastUsedStrategy === strategy.id ? '#fff' : '#333',
                  border: lastUsedStrategy === strategy.id ? '2px solid #28a745' : '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.1s',
                }}
              >
                {strategy.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Number grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
        {Array.from({ length: modeConfig.maxNumber }, (_, i) => i + 1).map((num) => {
          const isSelected = selectedNumbers.includes(num);
          return (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              style={{
                width: '36px',
                height: '36px',
                border: isSelected ? '2px solid #28a745' : '1px solid #ccc',
                borderRadius: '4px',
                background: isSelected ? '#28a745' : '#fff',
                color: isSelected ? '#fff' : '#333',
                fontWeight: isSelected ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.1s',
              }}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* Selected numbers display */}
      <div style={{ marginBottom: '12px', fontSize: '14px' }}>
        <strong>Your pick: </strong>
        {selectedNumbers.length === 0 ? (
          <span style={{ color: '#999' }}>click numbers above or use a quick-fill button</span>
        ) : (
          <span style={{ fontFamily: 'monospace', fontSize: '16px', background: '#e8f5e9', padding: '2px 8px', borderRadius: '4px' }}>
            [{selectedNumbers.join(', ')}]
          </span>
        )}
        <span style={{ marginLeft: '8px', color: '#666', fontSize: '12px' }}>
          ({selectedNumbers.length}/{modeConfig.numbersPerDraw} selected)
        </span>
        {lastUsedStrategy && (
          <span style={{ marginLeft: '8px', color: '#28a745', fontSize: '12px', fontStyle: 'italic' }}>
            ← from {ALL_STRATEGIES.find(s => s.id === lastUsedStrategy)?.label ?? lastUsedStrategy}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={handleEvaluate}
          disabled={!isComplete || !hasData}
          style={{
            padding: '8px 16px',
            background: isComplete && hasData ? '#28a745' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isComplete && hasData ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Evaluate Against Future Draws
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '8px 16px',
            background: '#f0f0f0',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Clear
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '8px', background: '#f8d7da', borderRadius: '4px', fontSize: '13px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Your Results</h4>
          {modeConfig.numbersPerDraw === 1 ? (
            <table style={{ borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                <tr><td style={resLabelStyle}>Exact hits</td><td style={resValueStyle}><strong>{result.hitCount}</strong> out of {futureDraws?.length ?? 0} draws</td></tr>
                <tr><td style={resLabelStyle}>Hit rate</td><td style={resValueStyle}><strong>{(result.hitRate * 100).toFixed(2)}%</strong></td></tr>
                <tr><td style={resLabelStyle}>Expected (random)</td><td style={resValueStyle}>{(100 / modeConfig.maxNumber).toFixed(2)}%</td></tr>
                <tr>
                  <td style={resLabelStyle}>vs random</td>
                  <td style={{
                    ...resValueStyle,
                    color: result.hitRate > (1 / modeConfig.maxNumber) ? '#28a745' : result.hitRate < (1 / modeConfig.maxNumber) ? '#dc3545' : '#333',
                    fontWeight: 'bold',
                  }}>
                    {result.hitRate > (1 / modeConfig.maxNumber) ? '+' : ''}{((result.hitRate - (1 / modeConfig.maxNumber)) * 100).toFixed(2)}pp vs random baseline
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table style={{ borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                <tr><td style={resLabelStyle}>Average overlap</td><td style={resValueStyle}><strong>{result.averageOverlap.toFixed(4)}</strong></td></tr>
                <tr><td style={resLabelStyle}>Expected (random)</td><td style={resValueStyle}>{(modeConfig.numbersPerDraw * modeConfig.numbersPerDraw / modeConfig.maxNumber).toFixed(4)}</td></tr>
                <tr>
                  <td style={resLabelStyle}>Match distribution</td>
                  <td style={resValueStyle}>
                    {[...result.matchDistribution.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => {
                      const pct = futureDraws && futureDraws.length > 0 ? ((v as number) / futureDraws.length * 100).toFixed(1) : '0';
                      return `${k} match${k !== 1 ? 'es' : ''}: ${v} (${pct}%)`;
                    }).join(' · ')}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <div style={{ marginTop: '8px', padding: '8px', background: '#fff3cd', borderRadius: '4px', fontSize: '12px' }}>
            ⚠️ This is a <strong>single-run comparison</strong>. Any apparent advantage may be noise.
            Run Monte Carlo simulations to check statistical significance.
          </div>
        </div>
      )}
    </div>
  );
};

// ── Evaluation logic ──────────────────────────────────────────────────────────

const evaluateYourNumbers = (
  numbers: number[],
  futureDraws: readonly Draw[],
  numbersPerDraw: number,
): YourNumbersResult => {
  if (numbersPerDraw === 1) {
    let hitCount = 0;
    const runningHitRate: number[] = [];
    for (let i = 0; i < futureDraws.length; i++) {
      if (futureDraws[i].numbers[0] === numbers[0]) {
        hitCount++;
      }
      runningHitRate.push(hitCount / (i + 1));
    }
    return {
      hitCount,
      hitRate: futureDraws.length > 0 ? hitCount / futureDraws.length : 0,
      matchDistribution: new Map([[hitCount, futureDraws.length]]),
      averageOverlap: futureDraws.length > 0 ? hitCount / futureDraws.length : 0,
      runningHitRate: Object.freeze(runningHitRate),
    };
  }

  const counts = new Map<number, number>();
  for (let k = 0; k <= numbersPerDraw; k++) {
    counts.set(k, 0);
  }
  let totalOverlap = 0;

  for (const draw of futureDraws) {
    const actual = new Set(draw.numbers);
    const overlap = numbers.filter((n) => actual.has(n)).length;
    counts.set(overlap, (counts.get(overlap) ?? 0) + 1);
    totalOverlap += overlap;
  }

  return {
    hitCount: counts.get(numbersPerDraw) ?? 0,
    hitRate: futureDraws.length > 0 ? (counts.get(numbersPerDraw) ?? 0) / futureDraws.length : 0,
    matchDistribution: counts,
    averageOverlap: futureDraws.length > 0 ? totalOverlap / futureDraws.length : 0,
    runningHitRate: Object.freeze([]),
  };
};

// ── Styles ────────────────────────────────────────────────────────────────────

const resLabelStyle: React.CSSProperties = {
  padding: '4px 12px 4px 0',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
};

const resValueStyle: React.CSSProperties = {
  padding: '4px 0',
};