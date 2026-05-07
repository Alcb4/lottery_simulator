/**
 * React hooks for lottery simulation state management.
 *
 * Supports both random generation and preset historical data (e.g. UK National Lottery).
 */

import { useState, useCallback } from 'react';
import type { ModeId, ModeConfig, Draw, Dataset, AnalysisResult, StrategyResult, MonteCarloResult, MonteCarloConfig } from '../../types/index.js';
import { getModeConfig, ALL_MODE_IDS } from '../../generator/modes.js';
import { runSingleSimulation } from '../../generator/engine.js';
import { analyzeHistorical } from '../../analysis/analysis.js';
import { runSingleEvaluation } from '../../evaluation/single-run.js';
import { runMonteCarlo } from '../../evaluation/monte-carlo.js';
import { ALL_STRATEGIES } from '../../strategies/index.js';
import { UK_NATIONAL_LOTTERY, parseCSVDraws } from '../../data/uk-national-lottery.js';
import type { LotteryPreset } from '../../data/uk-national-lottery.js';

// ── Default configuration ──────────────────────────────────────────────────────

const DEFAULT_NUM_HISTORICAL = 1000;
const DEFAULT_NUM_FUTURE = 500;
const DEFAULT_SEED = 42;
const DEFAULT_NUM_RUNS = 100;

// ── Simulation state ──────────────────────────────────────────────────────────

export interface SimulationState {
  readonly mode: ModeId;
  readonly numHistorical: number;
  readonly numFuture: number;
  readonly seed: number;
  readonly view: 'single' | 'montecarlo';
  readonly evaluateFixed: boolean;
  readonly evaluateRolling: boolean;
  readonly numRuns: number;
  readonly presetId: string | null;
  readonly customDraws: number[][] | null;
}

export interface SimulationResults {
  readonly dataset: Dataset | null;
  readonly analysis: AnalysisResult | null;
  readonly strategyResults: readonly StrategyResult[];
  readonly baselines: readonly StrategyResult[];
  readonly monteCarloResult: MonteCarloResult | null;
  readonly isRunning: boolean;
  readonly error: string | null;
}

const INITIAL_STATE: SimulationState = {
  mode: 'A',
  numHistorical: DEFAULT_NUM_HISTORICAL,
  numFuture: DEFAULT_NUM_FUTURE,
  seed: DEFAULT_SEED,
  view: 'single',
  evaluateFixed: true,
  evaluateRolling: true,
  numRuns: DEFAULT_NUM_RUNS,
  presetId: null,
  customDraws: null,
};

const INITIAL_RESULTS: SimulationResults = {
  dataset: null,
  analysis: null,
  strategyResults: [],
  baselines: [],
  monteCarloResult: null,
  isRunning: false,
  error: null,
};

// ── Helper: convert raw number arrays to Draw objects ──────────────────────────

const rawDrawsToDraws = (rawDraws: readonly number[][], modeId: ModeId): Draw[] => {
  return rawDraws.map((nums, i) => ({
    mode: modeId,
    numbers: Object.freeze([...nums].sort((a, b) => a - b)),
    index: i,
  }));
};

// ── Main hook ──────────────────────────────────────────────────────────────────

export const useSimulation = () => {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [results, setResults] = useState<SimulationResults>(INITIAL_RESULTS);

  const runSingle = useCallback(() => {
    setResults((prev) => ({ ...prev, isRunning: true, error: null }));

    try {
      const modeConfig = getModeConfig(state.mode);
      let dataset: Dataset;

      if (state.customDraws && state.customDraws.length > 0) {
        // Use preset/custom historical data
        const historicalDraws = rawDrawsToDraws(state.customDraws, state.mode);
        // Generate future draws using RNG
        const rngDataset = runSingleSimulation({
          modeConfig,
          numHistorical: 1, // We'll replace this
          numFuture: state.numFuture,
          seed: state.seed,
        });
        dataset = {
          mode: state.mode,
          historical: Object.freeze(historicalDraws),
          future: Object.freeze(rngDataset.future.map((d, i) => ({
            ...d,
            index: historicalDraws.length + i,
          }))),
        };
      } else {
        dataset = runSingleSimulation({
          modeConfig,
          numHistorical: state.numHistorical,
          numFuture: state.numFuture,
          seed: state.seed,
        });
      }

      const analysis = analyzeHistorical(modeConfig, dataset.historical);
      const evalResult = runSingleEvaluation(
        dataset,
        ALL_STRATEGIES,
        state.evaluateFixed,
        state.evaluateRolling,
      );

      setResults({
        dataset,
        analysis,
        strategyResults: evalResult.strategyResults,
        baselines: evalResult.baselines,
        monteCarloResult: null,
        isRunning: false,
        error: null,
      });
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        isRunning: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [state]);

  const runMonteCarloSim = useCallback(() => {
    setResults((prev) => ({ ...prev, isRunning: true, error: null }));

    try {
      const config: MonteCarloConfig = {
        mode: state.mode,
        numHistorical: state.numHistorical,
        numFuture: state.numFuture,
        numRuns: state.numRuns,
        baseSeed: state.seed,
        strategies: ALL_STRATEGIES,
        evaluateFixed: state.evaluateFixed,
        evaluateRolling: state.evaluateRolling,
      };

      const mcResult = runMonteCarlo(config);

      setResults({
        dataset: null,
        analysis: null,
        strategyResults: [],
        baselines: [],
        monteCarloResult: mcResult,
        isRunning: false,
        error: null,
      });
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        isRunning: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [state]);

  const updateState = useCallback(
    (updates: Partial<SimulationState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const loadPreset = useCallback((preset: LotteryPreset) => {
    // Map custom modes to the closest standard mode
    // UK Lotto (6 from 59) maps to Mode F (6 from 60)
    const modeMap: Record<string, ModeId> = {
      'uk-lotto': 'F',
    };
    const modeId = modeMap[preset.id] || 'F';

    setState((prev) => ({
      ...prev,
      mode: modeId,
      presetId: preset.id,
      customDraws: [...preset.draws],
      numHistorical: preset.draws.length,
    }));
  }, []);

  const loadCSVData = useCallback((csvText: string, numbersPerDraw: number) => {
    const draws = parseCSVDraws(csvText, numbersPerDraw);
    if (draws.length === 0) {
      setResults((prev) => ({
        ...prev,
        error: 'No valid draws found in CSV data. Each line should have numbers separated by commas.',
      }));
      return;
    }

    // Map numbersPerDraw to closest mode
    const modeMap: Record<number, ModeId> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' };
    const modeId = modeMap[numbersPerDraw] || 'F';

    setState((prev) => ({
      ...prev,
      mode: modeId,
      presetId: 'csv-import',
      customDraws: draws,
      numHistorical: draws.length,
    }));
  }, []);

  const clearPreset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      presetId: null,
      customDraws: null,
      numHistorical: DEFAULT_NUM_HISTORICAL,
    }));
  }, []);

  return {
    state,
    results,
    updateState,
    runSingle,
    runMonteCarloSim,
    loadPreset,
    loadCSVData,
    clearPreset,
  };
};