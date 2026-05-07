import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ControlPanel } from './ControlPanel.js';
import type { SimulationState } from '../hooks/useSimulation.js';

const defaultState: SimulationState = {
  mode: 'A',
  numHistorical: 1000,
  numFuture: 500,
  seed: 42,
  view: 'single',
  evaluateFixed: true,
  evaluateRolling: true,
  numRuns: 100,
  presetId: null,
  customDraws: null,
};

const noop = () => {};

describe('ControlPanel', () => {
  it('renders mode selector with all modes', () => {
    render(
      <ControlPanel
        state={defaultState}
        onUpdate={noop}
        onRunSingle={noop}
        onRunMonteCarlo={noop}
        onLoadPreset={noop}
        onLoadCSV={noop}
        onClearPreset={noop}
        isRunning={false}
      />,
    );
    const select = document.getElementById('mode-select') as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.options.length).toBe(6);
  });

  it('renders seed input with default value', () => {
    render(
      <ControlPanel
        state={defaultState}
        onUpdate={noop}
        onRunSingle={noop}
        onRunMonteCarlo={noop}
        onLoadPreset={noop}
        onLoadCSV={noop}
        onClearPreset={noop}
        isRunning={false}
      />,
    );
    const input = document.getElementById('seed-input') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('42');
  });

  it('renders run button', () => {
    render(
      <ControlPanel
        state={defaultState}
        onUpdate={noop}
        onRunSingle={noop}
        onRunMonteCarlo={noop}
        onLoadPreset={noop}
        onLoadCSV={noop}
        onClearPreset={noop}
        isRunning={false}
      />,
    );
    expect(screen.getByText('Run Single')).toBeDefined();
  });

  it('shows disclaimer text', () => {
    render(
      <ControlPanel
        state={defaultState}
        onUpdate={noop}
        onRunSingle={noop}
        onRunMonteCarlo={noop}
        onLoadPreset={noop}
        onLoadCSV={noop}
        onClearPreset={noop}
        isRunning={false}
      />,
    );
    expect(screen.getByText(/research and education only/i)).toBeDefined();
  });

  it('shows Monte Carlo controls when view is montecarlo', () => {
    const mcState: SimulationState = { ...defaultState, view: 'montecarlo' };
    render(
      <ControlPanel
        state={mcState}
        onUpdate={noop}
        onRunSingle={noop}
        onRunMonteCarlo={noop}
        onLoadPreset={noop}
        onLoadCSV={noop}
        onClearPreset={noop}
        isRunning={false}
      />,
    );
    expect(screen.getByText(/number of runs/i)).toBeDefined();
  });

  it('renders data source section with preset selector', () => {
    render(
      <ControlPanel
        state={defaultState}
        onUpdate={noop}
        onRunSingle={noop}
        onRunMonteCarlo={noop}
        onLoadPreset={noop}
        onLoadCSV={noop}
        onClearPreset={noop}
        isRunning={false}
      />,
    );
    const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
    expect(presetSelect).toBeDefined();
    // Should have "Random (generated)" option plus any presets
    expect(presetSelect.options.length).toBeGreaterThanOrEqual(1);
  });

  it('renders CSV import button', () => {
    render(
      <ControlPanel
        state={defaultState}
        onUpdate={noop}
        onRunSingle={noop}
        onRunMonteCarlo={noop}
        onLoadPreset={noop}
        onLoadCSV={noop}
        onClearPreset={noop}
        isRunning={false}
      />,
    );
    expect(screen.getByText('Import CSV Data')).toBeDefined();
  });
});