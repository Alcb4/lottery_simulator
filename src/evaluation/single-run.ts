/**
 * Single-run evaluation orchestration.
 *
 * Runs all strategies against a dataset and collects results.
 */

import type {
  Dataset,
  PredictionStrategy,
  StrategyResult,
  SingleRunResult,
} from '../types/index.js';
import { getModeConfig } from '../generator/modes.js';
import { evaluateFixed, evaluateRolling, computeBaselines } from './evaluate.js';

/**
 * Run a complete single-run evaluation.
 *
 * @param dataset - The dataset containing historical and future draws
 * @param strategies - Array of strategies to evaluate
 * @param evaluateFixedFlag - Whether to evaluate in fixed mode
 * @param evaluateRollingFlag - Whether to evaluate in rolling mode
 * @returns SingleRunResult with all strategy results and baselines
 */
export const runSingleEvaluation = (
  dataset: Dataset,
  strategies: readonly PredictionStrategy[],
  evaluateFixedFlag: boolean,
  evaluateRollingFlag: boolean,
): SingleRunResult => {
  const modeConfig = getModeConfig(dataset.mode);
  const { historical, future } = dataset;

  const strategyResults: StrategyResult[] = [];

  for (const strategy of strategies) {
    if (evaluateFixedFlag) {
      const fixedResult = evaluateFixed(strategy, modeConfig, historical, future);
      strategyResults.push(fixedResult);
    }
    if (evaluateRollingFlag) {
      const rollingResult = evaluateRolling(strategy, modeConfig, historical, future);
      strategyResults.push(rollingResult);
    }
  }

  const baselines = [computeBaselines(modeConfig, future.length)];

  return {
    dataset,
    analysis: null, // Placeholder — will be filled by analysis module
    strategyResults: Object.freeze(strategyResults),
    baselines: Object.freeze(baselines),
  };
};