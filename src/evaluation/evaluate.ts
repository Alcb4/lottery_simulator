/**
 * Strategy evaluation — fixed and rolling styles.
 *
 * Compares strategy predictions against actual future draws and computes
 * hit metrics (Mode A) or match distributions (Modes B–F).
 *
 * CRITICAL: Never leak future draws into strategy construction.
 */

import type {
  ModeConfig,
  ModeId,
  Draw,
  Dataset,
  PredictionStrategy,
  StrategyContext,
  RollingContext,
  HitMetrics,
  MatchDistribution,
  StrategyResult,
} from '../types/index.js';
import { getModeConfig } from '../generator/modes.js';
import {
  singleDrawWinProbability,
  hypergeometricMatchProbability,
  expectedAverageOverlap,
} from '../analysis/theoretical-baselines.js';

// ── Fixed model evaluation ────────────────────────────────────────────────────

/**
 * Evaluate a strategy using a fixed model (built once from historical data).
 * The model is never updated with future draws.
 */
export const evaluateFixed = (
  strategy: PredictionStrategy,
  modeConfig: ModeConfig,
  historical: readonly Draw[],
  future: readonly Draw[],
): StrategyResult => {
  const ctx: StrategyContext = { mode: modeConfig, historical };
  const model = strategy.buildModel(ctx);

  if (modeConfig.numbersPerDraw === 1) {
    return evaluateFixedModeA(strategy, model, modeConfig, future);
  }
  return evaluateFixedMultiNumber(strategy, model, modeConfig, future);
};

/** Fixed evaluation for Mode A (single number). */
const evaluateFixedModeA = (
  strategy: PredictionStrategy,
  model: unknown,
  modeConfig: ModeConfig,
  future: readonly Draw[],
): StrategyResult => {
  let hitCount = 0;
  const runningHitRate: number[] = [];

  for (let i = 0; i < future.length; i++) {
    const prediction = strategy.predictNextFixed(model);
    const actual = future[i].numbers[0];
    if (prediction[0] === actual) {
      hitCount++;
    }
    runningHitRate.push(hitCount / (i + 1));
  }

  const hitMetrics: HitMetrics = {
    hitCount,
    hitRate: future.length > 0 ? hitCount / future.length : 0,
    runningHitRate: Object.freeze(runningHitRate),
  };

  return {
    strategyId: strategy.id,
    label: strategy.label,
    evaluationStyle: 'fixed',
    hitMetrics,
  };
};

/** Fixed evaluation for Modes B–F (multi-number). */
const evaluateFixedMultiNumber = (
  strategy: PredictionStrategy,
  model: unknown,
  modeConfig: ModeConfig,
  future: readonly Draw[],
): StrategyResult => {
  const counts = new Map<number, number>();
  for (let k = 0; k <= modeConfig.numbersPerDraw; k++) {
    counts.set(k, 0);
  }

  let totalOverlap = 0;

  for (let i = 0; i < future.length; i++) {
    const prediction = strategy.predictNextFixed(model);
    const actual = new Set(future[i].numbers);
    const overlap = prediction.filter((n) => actual.has(n)).length;
    counts.set(overlap, (counts.get(overlap) ?? 0) + 1);
    totalOverlap += overlap;
  }

  const matchDistribution: MatchDistribution = {
    counts: new Map(counts),
    averageOverlap:
      future.length > 0 ? totalOverlap / future.length : 0,
  };

  return {
    strategyId: strategy.id,
    label: strategy.label,
    evaluationStyle: 'fixed',
    matchDistribution,
  };
};

// ── Rolling model evaluation ──────────────────────────────────────────────────

/**
 * Evaluate a strategy using a rolling model.
 * After each future draw is revealed, the model is updated.
 * CRITICAL: prediction for draw i only uses draws 0..i-1 from future.
 */
export const evaluateRolling = (
  strategy: PredictionStrategy,
  modeConfig: ModeConfig,
  historical: readonly Draw[],
  future: readonly Draw[],
): StrategyResult => {
  const ctx: StrategyContext = { mode: modeConfig, historical };
  const model = strategy.buildModel(ctx);

  if (modeConfig.numbersPerDraw === 1) {
    return evaluateRollingModeA(strategy, model, modeConfig, future);
  }
  return evaluateRollingMultiNumber(strategy, model, modeConfig, future);
};

/** Rolling evaluation for Mode A (single number). */
const evaluateRollingModeA = (
  strategy: PredictionStrategy,
  model: unknown,
  modeConfig: ModeConfig,
  future: readonly Draw[],
): StrategyResult => {
  let hitCount = 0;
  const runningHitRate: number[] = [];
  const revealedFuture: Draw[] = [];

  for (let i = 0; i < future.length; i++) {
    // Predict BEFORE revealing draw i
    let prediction: number[];
    if (strategy.predictNextRolling) {
      const rollingCtx: RollingContext = {
        revealedFuture: Object.freeze([...revealedFuture]),
      };
      prediction = strategy.predictNextRolling(model, rollingCtx);
    } else {
      prediction = strategy.predictNextFixed(model);
    }

    const actual = future[i].numbers[0];
    if (prediction[0] === actual) {
      hitCount++;
    }
    runningHitRate.push(hitCount / (i + 1));

    // Reveal draw i and update model
    revealedFuture.push(future[i]);
    if (strategy.updateModelAfterReveal) {
      strategy.updateModelAfterReveal(model, future[i]);
    }
  }

  const hitMetrics: HitMetrics = {
    hitCount,
    hitRate: future.length > 0 ? hitCount / future.length : 0,
    runningHitRate: Object.freeze(runningHitRate),
  };

  return {
    strategyId: strategy.id,
    label: strategy.label,
    evaluationStyle: 'rolling',
    hitMetrics,
  };
};

/** Rolling evaluation for Modes B–F (multi-number). */
const evaluateRollingMultiNumber = (
  strategy: PredictionStrategy,
  model: unknown,
  modeConfig: ModeConfig,
  future: readonly Draw[],
): StrategyResult => {
  const counts = new Map<number, number>();
  for (let k = 0; k <= modeConfig.numbersPerDraw; k++) {
    counts.set(k, 0);
  }

  let totalOverlap = 0;
  const revealedFuture: Draw[] = [];

  for (let i = 0; i < future.length; i++) {
    // Predict BEFORE revealing draw i
    let prediction: number[];
    if (strategy.predictNextRolling) {
      const rollingCtx: RollingContext = {
        revealedFuture: Object.freeze([...revealedFuture]),
      };
      prediction = strategy.predictNextRolling(model, rollingCtx);
    } else {
      prediction = strategy.predictNextFixed(model);
    }

    const actual = new Set(future[i].numbers);
    const overlap = prediction.filter((n) => actual.has(n)).length;
    counts.set(overlap, (counts.get(overlap) ?? 0) + 1);
    totalOverlap += overlap;

    // Reveal draw i and update model
    revealedFuture.push(future[i]);
    if (strategy.updateModelAfterReveal) {
      strategy.updateModelAfterReveal(model, future[i]);
    }
  }

  const matchDistribution: MatchDistribution = {
    counts: new Map(counts),
    averageOverlap:
      future.length > 0 ? totalOverlap / future.length : 0,
  };

  return {
    strategyId: strategy.id,
    label: strategy.label,
    evaluationStyle: 'rolling',
    matchDistribution,
  };
};

// ── Baseline computation ──────────────────────────────────────────────────────

/**
 * Compute theoretical baseline metrics for a given mode.
 * Returns a StrategyResult with theoretical values.
 */
export const computeBaselines = (
  modeConfig: ModeConfig,
  numFuture: number,
): StrategyResult => {
  if (modeConfig.numbersPerDraw === 1) {
    // Mode A: theoretical hit rate = 1/maxNumber
    const p = singleDrawWinProbability(modeConfig);
    const hitMetrics: HitMetrics = {
      hitCount: p * numFuture, // expected count (can be fractional)
      hitRate: p,
      runningHitRate: Object.freeze(
        Array.from({ length: numFuture }, (_, i) => p),
      ),
    };
    return {
      strategyId: 'theoreticalBaseline',
      label: 'Theoretical Baseline',
      evaluationStyle: 'fixed',
      hitMetrics,
    };
  }

  // Modes B–F: theoretical match distribution using hypergeometric probabilities
  const counts = new Map<number, number>();
  for (let k = 0; k <= modeConfig.numbersPerDraw; k++) {
    const prob = hypergeometricMatchProbability(modeConfig, k);
    counts.set(k, prob * numFuture);
  }

  const matchDistribution: MatchDistribution = {
    counts,
    averageOverlap: expectedAverageOverlap(modeConfig),
  };

  return {
    strategyId: 'theoreticalBaseline',
    label: 'Theoretical Baseline',
    evaluationStyle: 'fixed',
    matchDistribution,
  };
};