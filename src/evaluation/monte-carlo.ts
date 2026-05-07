/**
 * Monte Carlo repeat runner.
 *
 * Executes the single-run pipeline multiple times with different seeds,
 * then aggregates metrics across runs to produce confidence intervals
 * and baseline comparisons.
 */

import type {
  ModeId,
  ModeConfig,
  PredictionStrategy,
  MonteCarloConfig,
  MonteCarloStrategySummary,
  MonteCarloResult,
  StrategyResult,
} from '../types/index.js';
import { getModeConfig } from '../generator/modes.js';
import { runSingleSimulation } from '../generator/engine.js';
import { evaluateFixed, evaluateRolling, computeBaselines } from './evaluate.js';
import { analyzeHistorical } from '../analysis/analysis.js';

// ── Seeding scheme ────────────────────────────────────────────────────────────

/**
 * Generate a deterministic per-run seed from the base seed and run index.
 * seed_r = baseSeed + r * 1000 + modeOffset
 * modeOffset ensures different modes with the same baseSeed produce different draws.
 */
const computeRunSeed = (baseSeed: number, runIndex: number, modeOffset: number): number =>
  baseSeed + runIndex * 1000 + modeOffset;

/** Mode-specific offset to avoid seed collisions across modes. */
const MODE_OFFSET: Record<ModeId, number> = {
  A: 0,
  B: 100,
  C: 200,
  D: 300,
  E: 400,
  F: 500,
};

// ── Single Monte Carlo run ────────────────────────────────────────────────────

interface PerRunMetrics {
  readonly strategyId: string;
  readonly label: string;
  readonly evaluationStyle: 'fixed' | 'rolling';
  readonly hitRate?: number;
  readonly averageOverlap?: number;
}

/**
 * Execute a single Monte Carlo run with the given seed.
 * Returns per-strategy metrics for both fixed and rolling evaluation.
 */
const executeSingleRun = (
  modeConfig: ModeConfig,
  numHistorical: number,
  numFuture: number,
  seed: number,
  strategies: readonly PredictionStrategy[],
  evaluateFixedFlag: boolean,
  evaluateRollingFlag: boolean,
): PerRunMetrics[] => {
  const dataset = runSingleSimulation({
    modeConfig,
    numHistorical,
    numFuture,
    seed,
  });

  const metrics: PerRunMetrics[] = [];

  for (const strategy of strategies) {
    if (evaluateFixedFlag) {
      const result = evaluateFixed(strategy, modeConfig, dataset.historical, dataset.future);
      metrics.push({
        strategyId: result.strategyId,
        label: result.label,
        evaluationStyle: 'fixed',
        hitRate: result.hitMetrics?.hitRate,
        averageOverlap: result.matchDistribution?.averageOverlap,
      });
    }
    if (evaluateRollingFlag) {
      const result = evaluateRolling(strategy, modeConfig, dataset.historical, dataset.future);
      metrics.push({
        strategyId: result.strategyId,
        label: result.label,
        evaluationStyle: 'rolling',
        hitRate: result.hitMetrics?.hitRate,
        averageOverlap: result.matchDistribution?.averageOverlap,
      });
    }
  }

  return metrics;
};

// ── Aggregation helpers ───────────────────────────────────────────────────────

/** Compute mean of an array of numbers. */
const mean = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

/** Compute standard deviation (sample) of an array of numbers. */
const stdDev = (values: readonly number[]): number => {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

/** Compute 95% confidence interval using empirical quantiles. */
const empiricalCI95 = (values: readonly number[]): [number, number] => {
  if (values.length < 2) return [values[0] ?? 0, values[0] ?? 0];
  const sorted = [...values].sort((a, b) => a - b);
  const lowerIdx = Math.floor(0.025 * sorted.length);
  const upperIdx = Math.ceil(0.975 * sorted.length) - 1;
  return [sorted[lowerIdx], sorted[upperIdx]];
};

/** Compute 95% CI using mean ± 1.96 * SE. */
const normalCI95 = (values: readonly number[]): [number, number] => {
  if (values.length < 2) return [values[0] ?? 0, values[0] ?? 0];
  const m = mean(values);
  const se = stdDev(values) / Math.sqrt(values.length);
  return [m - 1.96 * se, m + 1.96 * se];
};

// ── Monte Carlo runner ────────────────────────────────────────────────────────

/**
 * Execute a Monte Carlo experiment.
 *
 * Runs the single-run pipeline multiple times with different seeds,
 * aggregates metrics, and computes confidence intervals.
 */
export const runMonteCarlo = (config: MonteCarloConfig): MonteCarloResult => {
  const modeConfig = getModeConfig(config.mode);
  const modeOffset = MODE_OFFSET[config.mode];

  // Collect per-run metrics
  const allRunMetrics: PerRunMetrics[][] = [];

  for (let r = 0; r < config.numRuns; r++) {
    const seed = computeRunSeed(config.baseSeed, r, modeOffset);
    const runMetrics = executeSingleRun(
      modeConfig,
      config.numHistorical,
      config.numFuture,
      seed,
      config.strategies,
      config.evaluateFixed,
      config.evaluateRolling,
    );
    allRunMetrics.push(runMetrics);
  }

  // Also compute baseline metrics for each run
  const baselineHitRates: number[] = [];
  const baselineOverlaps: number[] = [];

  for (let r = 0; r < config.numRuns; r++) {
    const seed = computeRunSeed(config.baseSeed, r, modeOffset);
    const dataset = runSingleSimulation({
      modeConfig,
      numHistorical: config.numHistorical,
      numFuture: config.numFuture,
      seed,
    });
    const baseline = computeBaselines(modeConfig, config.numFuture);
    if (baseline.hitMetrics) {
      baselineHitRates.push(baseline.hitMetrics.hitRate);
    }
    if (baseline.matchDistribution) {
      baselineOverlaps.push(baseline.matchDistribution.averageOverlap);
    }
  }

  // Aggregate per strategy + evaluation style
  const strategyKeys = new Set<string>();
  for (const runMetrics of allRunMetrics) {
    for (const m of runMetrics) {
      strategyKeys.add(`${m.strategyId}|${m.evaluationStyle}`);
    }
  }

  const summaries: MonteCarloStrategySummary[] = [];

  for (const key of strategyKeys) {
    const [strategyId, evaluationStyle] = key.split('|') as [string, 'fixed' | 'rolling'];

    // Collect per-run values for this strategy+style
    const hitRates: number[] = [];
    const overlaps: number[] = [];
    let label = strategyId;

    for (const runMetrics of allRunMetrics) {
      const m = runMetrics.find(
        (x) => x.strategyId === strategyId && x.evaluationStyle === evaluationStyle,
      );
      if (m) {
        label = m.label;
        if (m.hitRate !== undefined) hitRates.push(m.hitRate);
        if (m.averageOverlap !== undefined) overlaps.push(m.averageOverlap);
      }
    }

    // Compute deltas vs baseline
    const isModeA = modeConfig.numbersPerDraw === 1;
    const baselineValues = isModeA ? baselineHitRates : baselineOverlaps;
    const strategyValues = isModeA ? hitRates : overlaps;
    const deltas: number[] = [];
    for (let i = 0; i < Math.min(strategyValues.length, baselineValues.length); i++) {
      deltas.push(strategyValues[i] - baselineValues[i]);
    }

    const fractionBeatingBaseline =
      deltas.length > 0 ? deltas.filter((d) => d > 0).length / deltas.length : 0;

    const summary: MonteCarloStrategySummary = {
      strategyId,
      label,
      evaluationStyle,
      ...(hitRates.length > 0
        ? {
            meanHitRate: mean(hitRates),
            hitRateStdDev: stdDev(hitRates),
            hitRateCI95: normalCI95(hitRates) as [number, number],
          }
        : {}),
      ...(overlaps.length > 0
        ? {
            meanAverageOverlap: mean(overlaps),
            overlapStdDev: stdDev(overlaps),
            overlapCI95: normalCI95(overlaps) as [number, number],
          }
        : {}),
      ...(deltas.length > 0
        ? {
            meanHitRateDeltaVsBaseline: mean(deltas),
            deltaStdDev: stdDev(deltas),
            deltaCI95: normalCI95(deltas) as [number, number],
            fractionRunsBeatingBaseline: fractionBeatingBaseline,
          }
        : {}),
    };

    summaries.push(summary);
  }

  return {
    config,
    strategySummaries: Object.freeze(summaries),
  };
};