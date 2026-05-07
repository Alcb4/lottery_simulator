/**
 * Export buttons for CSV and JSON downloads.
 */

import React from 'react';
import type { SingleRunResult, MonteCarloResult } from '../../types/index.js';
import {
  exportSingleRunJSON,
  exportMonteCarloJSON,
  exportSingleRunSummaryCSV,
  exportMonteCarloCSV,
} from '../../export/export.js';

interface ExportButtonsProps {
  readonly singleRunResult: SingleRunResult | null;
  readonly monteCarloResult: MonteCarloResult | null;
}

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  singleRunResult,
  monteCarloResult,
}) => {
  const handleExportSingleJSON = () => {
    if (!singleRunResult) return;
    downloadFile(exportSingleRunJSON(singleRunResult), 'single-run.json', 'application/json');
  };

  const handleExportSingleCSV = () => {
    if (!singleRunResult) return;
    downloadFile(exportSingleRunSummaryCSV(singleRunResult), 'single-run-summary.csv', 'text/csv');
  };

  const handleExportMCJSON = () => {
    if (!monteCarloResult) return;
    downloadFile(exportMonteCarloJSON(monteCarloResult), 'monte-carlo.json', 'application/json');
  };

  const handleExportMCCSV = () => {
    if (!monteCarloResult) return;
    downloadFile(exportMonteCarloCSV(monteCarloResult), 'monte-carlo.csv', 'text/csv');
  };

  return (
    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {singleRunResult && (
        <>
          <button onClick={handleExportSingleJSON} style={btnStyle}>
            📥 Export Single Run (JSON)
          </button>
          <button onClick={handleExportSingleCSV} style={btnStyle}>
            📥 Export Single Run (CSV)
          </button>
        </>
      )}
      {monteCarloResult && (
        <>
          <button onClick={handleExportMCJSON} style={btnStyle}>
            📥 Export Monte Carlo (JSON)
          </button>
          <button onClick={handleExportMCCSV} style={btnStyle}>
            📥 Export Monte Carlo (CSV)
          </button>
        </>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: '#6c757d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};