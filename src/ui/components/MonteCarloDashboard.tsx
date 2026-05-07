/**
 * Monte Carlo dashboard: strategy performance table, confidence intervals,
 * baseline comparison.
 */

import React from 'react';
import type { MonteCarloStrategySummary } from '../../types/index.js';

interface MonteCarloDashboardProps {
  readonly summaries: readonly MonteCarloStrategySummary[];
  readonly isModeA: boolean;
}

export const MonteCarloDashboard: React.FC<MonteCarloDashboardProps> = ({
  summaries,
  isModeA,
}) => {
  if (summaries.length === 0) {
    return <div style={{ padding: '16px', color: '#666' }}>Run a Monte Carlo simulation to see results.</div>;
  }

  // Separate fixed and rolling
  const fixedSummaries = summaries.filter((s) => s.evaluationStyle === 'fixed');
  const rollingSummaries = summaries.filter((s) => s.evaluationStyle === 'rolling');

  return (
    <div>
      {fixedSummaries.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3>Fixed Model Evaluation</h3>
          <SummaryTable summaries={fixedSummaries} isModeA={isModeA} />
        </div>
      )}

      {rollingSummaries.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3>Rolling Model Evaluation</h3>
          <SummaryTable summaries={rollingSummaries} isModeA={isModeA} />
        </div>
      )}

      {/* Guardrail */}
      <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '4px', fontSize: '13px' }}>
        <strong>⚠️ Important:</strong> Under a fair RNG, hot/cold/overdue and similar strategies
        do <strong>not</strong> consistently beat random baseline beyond noise. A fraction beating
        baseline near 0.5 is expected. Results near 0.5 confirm the null hypothesis of no real edge.
      </div>
    </div>
  );
};

// ── Summary Table ──────────────────────────────────────────────────────────────

const SummaryTable: React.FC<{
  readonly summaries: readonly MonteCarloStrategySummary[];
  readonly isModeA: boolean;
}> = ({ summaries, isModeA }) => (
  <div style={{ overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          <th style={thStyle}>Strategy</th>
          {isModeA ? (
            <>
              <th style={thStyle}>Mean Hit Rate</th>
              <th style={thStyle}>Std Dev</th>
              <th style={thStyle}>95% CI</th>
            </>
          ) : (
            <>
              <th style={thStyle}>Mean Avg Overlap</th>
              <th style={thStyle}>Std Dev</th>
              <th style={thStyle}>95% CI</th>
            </>
          )}
          <th style={thStyle}>Δ vs Baseline</th>
          <th style={thStyle}>Δ CI</th>
          <th style={thStyle}>Beat Baseline %</th>
        </tr>
      </thead>
      <tbody>
        {summaries.map((s) => (
          <tr key={`${s.strategyId}-${s.evaluationStyle}`}>
            <td style={tdStyle}>{s.label}</td>
            {isModeA ? (
              <>
                <td style={tdStyle}>{s.meanHitRate?.toFixed(4) ?? '—'}</td>
                <td style={tdStyle}>{s.hitRateStdDev?.toFixed(4) ?? '—'}</td>
                <td style={tdStyle}>{formatCI(s.hitRateCI95)}</td>
              </>
            ) : (
              <>
                <td style={tdStyle}>{s.meanAverageOverlap?.toFixed(4) ?? '—'}</td>
                <td style={tdStyle}>{s.overlapStdDev?.toFixed(4) ?? '—'}</td>
                <td style={tdStyle}>{formatCI(s.overlapCI95)}</td>
              </>
            )}
            <td style={{
              ...tdStyle,
              color: (s.meanHitRateDeltaVsBaseline ?? 0) > 0 ? '#28a745' : '#dc3545',
            }}>
              {s.meanHitRateDeltaVsBaseline !== undefined
                ? (s.meanHitRateDeltaVsBaseline >= 0 ? '+' : '') + s.meanHitRateDeltaVsBaseline.toFixed(4)
                : '—'}
            </td>
            <td style={tdStyle}>{formatCI(s.deltaCI95)}</td>
            <td style={tdStyle}>
              {s.fractionRunsBeatingBaseline !== undefined
                ? `${(s.fractionRunsBeatingBaseline * 100).toFixed(1)}%`
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCI = (ci: readonly [number, number] | undefined): string => {
  if (!ci) return '—';
  return `[${ci[0].toFixed(4)}, ${ci[1].toFixed(4)}]`;
};

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #eee',
};