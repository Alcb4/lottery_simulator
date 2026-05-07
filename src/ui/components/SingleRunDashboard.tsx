/**
 * Single-run dashboard: expanded analytical views for pattern detection.
 *
 * All tables are sortable by clicking column headers.
 * No section scrollbars — the whole page scrolls.
 * Highlights best results for quick scanning.
 */

import React, { useState, useCallback } from 'react';
import type { AnalysisResult, StrategyResult, FrequencyEntry } from '../../types/index';

// ── Sort hook ─────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null;

function useSort<T>(initialKey: string, initialDir: SortDir = null) {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const toggle = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sort = useCallback((items: readonly T[], compareFn: (a: T, b: T) => number): T[] => {
    if (!sortDir) return [...items];
    const sorted = [...items].sort(compareFn);
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [sortDir]);

  return { sortKey, sortDir, toggle, sort };
}

// ── Sortable header component ──────────────────────────────────────────────────

const SortableHeader: React.FC<{
  readonly label: string;
  readonly sortKey: string;
  readonly currentKey: string;
  readonly currentDir: SortDir;
  readonly onSort: (key: string) => void;
  readonly style?: React.CSSProperties;
}> = ({ label, sortKey, currentKey, currentDir, onSort, style }) => {
  const isActive = currentKey === sortKey;
  const arrow = isActive ? (currentDir === 'asc' ? ' ↑' : currentDir === 'desc' ? ' ↓' : '') : '';
  return (
    <th
      style={{ ...thStyle, cursor: 'pointer', userSelect: 'none', ...(isActive ? { background: '#e3e3e3' } : {}) }}
      onClick={() => onSort(sortKey)}
    >
      {label}{arrow}
    </th>
  );
};

// ── Dashboard props ────────────────────────────────────────────────────────────

interface SingleRunDashboardProps {
  readonly analysis: AnalysisResult | null;
  readonly strategyResults: readonly StrategyResult[];
  readonly baselines: readonly StrategyResult[];
  readonly modeId: string;
  readonly numHistorical: number;
  readonly numFuture: number;
}

export const SingleRunDashboard: React.FC<SingleRunDashboardProps> = ({
  analysis,
  strategyResults,
  baselines,
  modeId,
  numHistorical,
  numFuture,
}) => {
  if (!analysis) {
    return <div style={{ padding: '16px', color: '#666' }}>Run a simulation to see results.</div>;
  }

  const isModeA = modeId === 'A';
  const modeConfig = getModeConfig(modeId);
  const bestStrategy = findBestStrategy(strategyResults, baselines, isModeA);

  return (
    <div>
      {/* Run summary */}
      <div style={{ marginBottom: '20px', padding: '14px', background: '#f8f9fa', borderRadius: '6px', fontSize: '14px' }}>
        <strong>Run Summary:</strong> Mode {modeId} (Pick {modeConfig.numbersPerDraw} from {modeConfig.maxNumber}),
        {' '}{numHistorical.toLocaleString()} historical draws, {numFuture.toLocaleString()} future draws,
        {' '}total positions = {(numHistorical * modeConfig.numbersPerDraw).toLocaleString()}
      </div>

      {/* Best result callout */}
      {bestStrategy && (
        <div style={{ marginBottom: '20px', padding: '14px', background: '#d4edda', borderRadius: '6px', border: '1px solid #28a745' }}>
          <strong>🏆 Best Result:</strong> {bestStrategy.label} ({bestStrategy.evaluationStyle}) —{' '}
          {isModeA
            ? `Hit rate ${bestStrategy.hitMetrics?.hitRate.toFixed(4)} vs baseline ${(baselines[0]?.hitMetrics?.hitRate ?? 0).toFixed(4)}`
            : `Avg overlap ${bestStrategy.matchDistribution?.averageOverlap.toFixed(4)} vs baseline ${(baselines[0]?.matchDistribution?.averageOverlap ?? 0).toFixed(4)}`
          }
          <span style={{ fontSize: '12px', color: '#555', marginLeft: '8px' }}>
            (This may be noise — see Monte Carlo for statistical significance)
          </span>
        </div>
      )}

      <FrequencyTablePanel frequencyTable={analysis.frequencyTable} />
      <DistributionSummaries analysis={analysis} isModeA={isModeA} />
      <StreakOverlapPanel analysis={analysis} isModeA={isModeA} />
      {!isModeA && <PairFrequencyPanel analysis={analysis} />}
      <RepeatedCombinationsPanel analysis={analysis} />
      <ChiSquarePanel chiSquare={analysis.chiSquare} />
      <IndependencePanel analysis={analysis} />
      <StrategyComparisonPanel
        strategyResults={strategyResults}
        baselines={baselines}
        isModeA={isModeA}
      />

      {/* Guardrail */}
      <div style={{ marginTop: '20px', padding: '12px', background: '#fff3cd', borderRadius: '6px', fontSize: '13px' }}>
        ⚠️ <strong>Disclaimer:</strong> Frequency imbalances and streaks appear naturally in finite samples.
        Better-than-baseline performance in a single run is <strong>not</strong> evidence of a real edge.
        Every valid combination in a fair lottery has equal probability.
        See Monte Carlo results for statistical significance across many runs.
      </div>
    </div>
  );
};

// ── Best strategy finder ──────────────────────────────────────────────────────

const findBestStrategy = (
  strategyResults: readonly StrategyResult[],
  baselines: readonly StrategyResult[],
  isModeA: boolean,
): StrategyResult | null => {
  if (strategyResults.length === 0) return null;
  const baseline = baselines[0];
  if (!baseline) return null;

  let best: StrategyResult | null = null;
  let bestDelta = -Infinity;

  for (const sr of strategyResults) {
    const delta = isModeA
      ? (sr.hitMetrics?.hitRate ?? 0) - (baseline.hitMetrics?.hitRate ?? 0)
      : (sr.matchDistribution?.averageOverlap ?? 0) - (baseline.matchDistribution?.averageOverlap ?? 0);
    if (delta > bestDelta) {
      bestDelta = delta;
      best = sr;
    }
  }
  return best;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const MODE_CONFIGS: Record<string, { numbersPerDraw: number; maxNumber: number }> = {
  A: { numbersPerDraw: 1, maxNumber: 10 },
  B: { numbersPerDraw: 2, maxNumber: 20 },
  C: { numbersPerDraw: 3, maxNumber: 30 },
  D: { numbersPerDraw: 4, maxNumber: 40 },
  E: { numbersPerDraw: 5, maxNumber: 50 },
  F: { numbersPerDraw: 6, maxNumber: 60 },
};

function getModeConfig(id: string) {
  return MODE_CONFIGS[id] ?? MODE_CONFIGS.A;
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #eee',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '20px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  padding: '16px',
};

// ── Frequency Table (sortable) ────────────────────────────────────────────────

const FrequencyTablePanel: React.FC<{
  readonly frequencyTable: readonly FrequencyEntry[];
}> = ({ frequencyTable }) => {
  const { sortKey, sortDir, toggle, sort } = useSort<FrequencyEntry>('number', null);

  const sorted = sort(frequencyTable, (a, b) => {
    switch (sortKey) {
      case 'number': return a.number - b.number;
      case 'observed': return a.observedCount - b.observedCount;
      case 'expected': return a.expectedCount - b.expectedCount;
      case 'deviation': return a.relativeDeviation - b.relativeDeviation;
      default: return a.number - b.number;
    }
  });

  const maxCount = Math.max(...frequencyTable.map((e) => e.observedCount));

  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: '0 0 8px 0' }}>📊 Per-Number Frequency</h3>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px 0' }}>
        Click column headers to sort. Green bars = above expected, gray = below. Red = deviation &gt;20%.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <SortableHeader label="#" sortKey="number" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
            <SortableHeader label="Observed" sortKey="observed" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
            <SortableHeader label="Expected" sortKey="expected" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
            <th style={{ ...thStyle, width: '40%' }}>Bar</th>
            <SortableHeader label="Deviation" sortKey="deviation" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => {
            const barWidth = maxCount > 0 ? (entry.observedCount / maxCount) * 100 : 0;
            const devColor = Math.abs(entry.relativeDeviation) > 0.2 ? '#dc3545' : '#333';
            const barColor = entry.observedCount > entry.expectedCount ? '#28a745' : '#6c757d';
            return (
              <tr key={entry.number}>
                <td style={tdStyle}><strong>{entry.number}</strong></td>
                <td style={tdStyle}>{entry.observedCount}</td>
                <td style={{ ...tdStyle, color: '#666' }}>{entry.expectedCount.toFixed(1)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: `${barWidth}%`, height: '14px', background: barColor, borderRadius: '2px', minWidth: '2px' }} />
                    <span style={{ fontSize: '11px', color: '#666' }}>{entry.observedCount}</span>
                  </div>
                </td>
                <td style={{ ...tdStyle, color: devColor, fontWeight: Math.abs(entry.relativeDeviation) > 0.2 ? 'bold' : 'normal' }}>
                  {entry.relativeDeviation >= 0 ? '+' : ''}{(entry.relativeDeviation * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ── Distribution Summaries ─────────────────────────────────────────────────────

const DistributionSummaries: React.FC<{
  readonly analysis: AnalysisResult;
  readonly isModeA: boolean;
}> = ({ analysis, isModeA }) => (
  <div style={sectionStyle}>
    <h3 style={{ margin: '0 0 8px 0' }}>📈 Distribution Summaries</h3>
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Sum of Numbers per Draw</h4>
      <SortableMapTable data={analysis.sumDistribution} sortByKey={true} />
    </div>
    {!isModeA && (
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Gap Distribution (consecutive number gaps)</h4>
        <SortableMapTable data={analysis.gapDistribution} sortByKey={true} />
      </div>
    )}
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Odd/Even Split per Draw</h4>
      <SortableMapTable data={analysis.oddEvenDistribution} sortByKey={false} />
    </div>
    <div>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Low/High Split per Draw</h4>
      <SortableMapTable data={analysis.lowHighDistribution} sortByKey={false} />
    </div>
  </div>
);

// ── Streak & Overlap Panel ────────────────────────────────────────────────────

const StreakOverlapPanel: React.FC<{
  readonly analysis: AnalysisResult;
  readonly isModeA: boolean;
}> = ({ analysis, isModeA }) => (
  <div style={sectionStyle}>
    <h3 style={{ margin: '0 0 8px 0' }}>🔗 Streaks & Overlaps</h3>
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Draws with Adjacent Pairs</h4>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px 0' }}>
        How many draws contain 0, 1, 2... adjacent number pairs (e.g. 12,13).
      </p>
      <SortableMapTable data={analysis.consecutiveCount} sortByKey={true} />
    </div>
    <div>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Overlap with Previous Draw</h4>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px 0' }}>
        How many numbers are shared between consecutive draws.
      </p>
      <SortableMapTable data={analysis.overlapDistribution} sortByKey={true} />
    </div>
  </div>
);

// ── Pair Frequency Panel (sortable) ───────────────────────────────────────────

const PairFrequencyPanel: React.FC<{
  readonly analysis: AnalysisResult;
}> = ({ analysis }) => {
  const entries = [...analysis.pairFrequencies.entries()].sort((a, b) => b[1] - a[1]);
  const { sortKey, sortDir, toggle, sort } = useSort<[string, number]>('count', 'desc');

  const sorted = sort(entries, (a, b) => {
    switch (sortKey) {
      case 'pair': return a[0].localeCompare(b[0]);
      case 'count': return a[1] - b[1];
      default: return b[1] - a[1];
    }
  });

  if (entries.length === 0) {
    return <div style={sectionStyle}><h3 style={{ margin: '0 0 8px 0' }}>🔢 Pair Frequencies</h3><p>No pair data (single-number mode).</p></div>;
  }

  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: '0 0 8px 0' }}>🔢 Pair Frequencies</h3>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
        Most frequently co-occurring number pairs across draws. Click headers to sort.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <SortableHeader label="Pair" sortKey="pair" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
            <SortableHeader label="Count" sortKey="count" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
          </tr>
        </thead>
        <tbody>
          {sorted.map(([pair, count]) => (
            <tr key={pair}>
              <td style={tdStyle}>{pair}</td>
              <td style={tdStyle}>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Repeated Combinations ─────────────────────────────────────────────────────

const RepeatedCombinationsPanel: React.FC<{
  readonly analysis: AnalysisResult;
}> = ({ analysis }) => {
  const entries = [...analysis.repeatedCombinations.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: '0 0 8px 0' }}>🔄 Repeated Combinations</h3>
      {entries.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#666' }}>
          No exact combination appeared more than once in the historical draws.
          (This is expected — in a fair lottery, repeats are rare.)
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={thStyle}>Combination</th>
              <th style={thStyle}>Times Seen</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([combo, count]) => (
              <tr key={combo}>
                <td style={tdStyle}>{combo}</td>
                <td style={tdStyle}>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ── Chi-Square Panel ──────────────────────────────────────────────────────────

const ChiSquarePanel: React.FC<{
  readonly chiSquare: { readonly chiSquareValue: number; readonly degreesOfFreedom: number; readonly pValue: number };
}> = ({ chiSquare }) => {
  const isSignificant = chiSquare.pValue < 0.05;
  const isMarginal = chiSquare.pValue >= 0.05 && chiSquare.pValue < 0.1;

  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: '0 0 8px 0' }}>📐 Chi-Square Goodness-of-Fit</h3>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
        Tests whether observed number frequencies deviate significantly from uniform selection.
      </p>
      <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          <tr><td style={tdStyle}><strong>χ² statistic</strong></td><td style={tdStyle}>{chiSquare.chiSquareValue.toFixed(2)}</td></tr>
          <tr><td style={tdStyle}><strong>Degrees of freedom</strong></td><td style={tdStyle}>{chiSquare.degreesOfFreedom}</td></tr>
          <tr><td style={tdStyle}><strong>p-value</strong></td><td style={tdStyle}>{chiSquare.pValue.toFixed(6)}</td></tr>
        </tbody>
      </table>
      <div style={{
        marginTop: '8px', padding: '8px',
        background: isSignificant ? '#f8d7da' : isMarginal ? '#fff3cd' : '#d4edda',
        borderRadius: '4px', fontSize: '13px',
      }}>
        {isSignificant
          ? '⚠️ Unusual deviation detected at 5% significance level. This can still arise from random variation — see Monte Carlo results.'
          : isMarginal
            ? '⚡ Marginal deviation (p between 0.05 and 0.1). Not statistically significant at 5% level.'
            : '✅ No evidence of bias at 5% significance level. Observed frequencies are consistent with uniform selection.'}
      </div>
    </div>
  );
};

// ── Independence Diagnostics ───────────────────────────────────────────────────

const IndependencePanel: React.FC<{
  readonly analysis: AnalysisResult;
}> = ({ analysis }) => {
  const diag = analysis.independenceDiagnostics as {
    readonly firstHalfSecondHalfCorrelation: number;
    readonly consecutiveDrawDependence: number;
  } | null;

  if (!diag) return null;

  const corrInterpretation = Math.abs(diag.firstHalfSecondHalfCorrelation) < 0.3
    ? 'weak' : Math.abs(diag.firstHalfSecondHalfCorrelation) < 0.6
    ? 'moderate' : 'strong';

  const depInterpretation = diag.consecutiveDrawDependence < 0.9
    ? 'below expected (negative dependence)'
    : diag.consecutiveDrawDependence > 1.1
    ? 'above expected (positive dependence)'
    : 'near expected (consistent with independence)';

  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: '0 0 8px 0' }}>🔍 Independence Diagnostics</h3>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
        Checks for dependence between draws. In a fair lottery, draws are independent.
      </p>
      <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          <tr>
            <td style={tdStyle}><strong>1st/2nd half correlation</strong></td>
            <td style={tdStyle}>{diag.firstHalfSecondHalfCorrelation.toFixed(4)}</td>
            <td style={{ ...tdStyle, color: '#666', fontSize: '12px' }}>({corrInterpretation} correlation)</td>
          </tr>
          <tr>
            <td style={tdStyle}><strong>Consecutive draw overlap ratio</strong></td>
            <td style={tdStyle}>{diag.consecutiveDrawDependence.toFixed(4)}</td>
            <td style={{ ...tdStyle, color: '#666', fontSize: '12px' }}>({depInterpretation})</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '8px', padding: '8px', background: '#e8f4fd', borderRadius: '4px', fontSize: '12px' }}>
        ℹ️ These are <strong>diagnostics</strong>, not hypothesis tests. Values near 0 correlation and overlap ratio near 1.0 are consistent with independence.
      </div>
    </div>
  );
};

// ── Strategy Comparison Panel (sortable) ──────────────────────────────────────

const StrategyComparisonPanel: React.FC<{
  readonly strategyResults: readonly StrategyResult[];
  readonly baselines: readonly StrategyResult[];
  readonly isModeA: boolean;
}> = ({ strategyResults, baselines, isModeA }) => {
  const { sortKey, sortDir, toggle, sort } = useSort<StrategyResult>('label', null);

  const sorted = sort([...strategyResults], (a, b) => {
    switch (sortKey) {
      case 'label': return a.label.localeCompare(b.label);
      case 'style': return a.evaluationStyle.localeCompare(b.evaluationStyle);
      case 'hitRate': return (a.hitMetrics?.hitRate ?? 0) - (b.hitMetrics?.hitRate ?? 0);
      case 'hitCount': return (a.hitMetrics?.hitCount ?? 0) - (b.hitMetrics?.hitCount ?? 0);
      case 'overlap': return (a.matchDistribution?.averageOverlap ?? 0) - (b.matchDistribution?.averageOverlap ?? 0);
      case 'delta': {
        const bl = baselines[0];
        const da = isModeA
          ? (a.hitMetrics?.hitRate ?? 0) - (bl?.hitMetrics?.hitRate ?? 0)
          : (a.matchDistribution?.averageOverlap ?? 0) - (bl?.matchDistribution?.averageOverlap ?? 0);
        const db = isModeA
          ? (b.hitMetrics?.hitRate ?? 0) - (bl?.hitMetrics?.hitRate ?? 0)
          : (b.matchDistribution?.averageOverlap ?? 0) - (bl?.matchDistribution?.averageOverlap ?? 0);
        return da - db;
      }
      default: return a.label.localeCompare(b.label);
    }
  });

  const bestStrategy = findBestStrategy(strategyResults, baselines, isModeA);
  const baseline = baselines[0];

  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: '0 0 8px 0' }}>⚔️ Strategy Comparison</h3>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>Click column headers to sort.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <SortableHeader label="Strategy" sortKey="label" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
            <SortableHeader label="Style" sortKey="style" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
            {isModeA ? (
              <>
                <SortableHeader label="Hit Count" sortKey="hitCount" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
                <SortableHeader label="Hit Rate" sortKey="hitRate" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
                <SortableHeader label="vs Baseline" sortKey="delta" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
              </>
            ) : (
              <>
                <SortableHeader label="Avg Overlap" sortKey="overlap" currentKey={sortKey} currentDir={sortDir} onSort={toggle} />
                <th style={thStyle}>Match Distribution</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((sr, i) => {
            const isBest = bestStrategy?.strategyId === sr.strategyId && bestStrategy?.evaluationStyle === sr.evaluationStyle;
            const delta = isModeA
              ? (sr.hitMetrics?.hitRate ?? 0) - (baseline?.hitMetrics?.hitRate ?? 0)
              : (sr.matchDistribution?.averageOverlap ?? 0) - (baseline?.matchDistribution?.averageOverlap ?? 0);
            return (
              <tr key={`${sr.strategyId}-${sr.evaluationStyle}-${i}`} style={isBest ? { background: '#d4edda' } : {}}>
                <td style={tdStyle}>{isBest ? '🏆 ' : ''}{sr.label}</td>
                <td style={tdStyle}>{sr.evaluationStyle}</td>
                {isModeA ? (
                  <>
                    <td style={tdStyle}>{sr.hitMetrics?.hitCount ?? '—'}</td>
                    <td style={tdStyle}>{sr.hitMetrics?.hitRate.toFixed(4) ?? '—'}</td>
                    <td style={{ ...tdStyle, color: delta > 0 ? '#28a745' : delta < 0 ? '#dc3545' : '#333', fontWeight: 'bold' }}>
                      {delta >= 0 ? '+' : ''}{delta.toFixed(4)}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={tdStyle}>{sr.matchDistribution?.averageOverlap.toFixed(4) ?? '—'}</td>
                    <td style={{ ...tdStyle, fontSize: '11px' }}>{formatMatchDistribution(sr.matchDistribution)}</td>
                  </>
                )}
              </tr>
            );
          })}
          {baselines.map((bl, i) => (
            <tr key={`baseline-${i}`} style={{ background: '#e8f4fd' }}>
              <td style={tdStyle}><em>{bl.label}</em></td>
              <td style={tdStyle}>{bl.evaluationStyle}</td>
              {isModeA ? (
                <>
                  <td style={tdStyle}><em>{typeof bl.hitMetrics?.hitCount === 'number' ? bl.hitMetrics.hitCount.toFixed(1) : '—'}</em></td>
                  <td style={tdStyle}><em>{bl.hitMetrics?.hitRate.toFixed(4) ?? '—'}</em></td>
                  <td style={tdStyle}><em>baseline</em></td>
                </>
              ) : (
                <>
                  <td style={tdStyle}><em>{bl.matchDistribution?.averageOverlap.toFixed(4) ?? '—'}</em></td>
                  <td style={{ ...tdStyle, fontSize: '11px' }}><em>{formatMatchDistribution(bl.matchDistribution)}</em></td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Sortable Map Table ─────────────────────────────────────────────────────────

const SortableMapTable: React.FC<{
  readonly data: ReadonlyMap<string, number> | ReadonlyMap<number, number>;
  readonly sortByKey: boolean;
}> = ({ data, sortByKey: initialSortByKey }) => {
  const { sortKey, sortDir, toggle, sort } = useSort<[string | number, number]>(
    initialSortByKey ? 'key' : 'count',
    initialSortByKey ? 'asc' : 'desc',
  );

  const entries = [...data.entries()];

  const sorted = sort(entries, (a, b) => {
    switch (sortKey) {
      case 'key': {
        const ak = typeof a[0] === 'number' ? a[0] as number : parseFloat(String(a[0]));
        const bk = typeof b[0] === 'number' ? b[0] as number : parseFloat(String(b[0]));
        return ak - bk;
      }
      case 'count': return (a[1] as number) - (b[1] as number);
      default: return (a[1] as number) - (b[1] as number);
    }
  });

  if (entries.length === 0) {
    return <p style={{ fontSize: '12px', color: '#999' }}>No data.</p>;
  }

  const maxVal = Math.max(...entries.map((e) => e[1] as number));

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          <SortableHeader label="Value" sortKey="key" currentKey={sortKey} currentDir={sortDir} onSort={toggle} style={{ width: '30%' }} />
          <SortableHeader label="Count" sortKey="count" currentKey={sortKey} currentDir={sortDir} onSort={toggle} style={{ width: '15%' }} />
          <th style={{ ...thStyle, width: '55%' }}>Bar</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(([key, count]) => {
          const barWidth = maxVal > 0 ? ((count as number) / maxVal) * 100 : 0;
          return (
            <tr key={String(key)}>
              <td style={tdStyle}>{String(key)}</td>
              <td style={tdStyle}>{String(count)}</td>
              <td style={tdStyle}>
                <div style={{ width: `${barWidth}%`, height: '10px', background: '#4dabf7', borderRadius: '2px', minWidth: '1px' }} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatMatchDistribution = (md: { readonly counts: ReadonlyMap<number, number>; readonly averageOverlap: number } | undefined): string => {
  if (!md) return '—';
  const entries = [...md.counts.entries()].sort((a, b) => a[0] - b[0]);
  return entries.map(([k, v]) => `${k}→${typeof v === 'number' ? v.toFixed(1) : v}`).join(', ');
};