import { describe, it, expect } from 'vitest';
import { evaluateFixed, evaluateRolling, computeBaselines } from './evaluate.js';
import { runSingleEvaluation } from './single-run.js';
import { ALL_STRATEGIES } from '../strategies/index.js';
import { getModeConfig } from '../generator/modes.js';
import { runSingleSimulation } from '../generator/engine.js';
import type { ModeConfig } from '../types/index.js';

describe('evaluateFixed', () => {
  const modeA = getModeConfig('A');
  const modeF = getModeConfig('F');

  it('returns StrategyResult with correct strategyId and label', () => {
    const dataset = runSingleSimulation({
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    });
    const strategy = ALL_STRATEGIES[0]; // randomBaseline
    const result = evaluateFixed(strategy, modeA, dataset.historical, dataset.future);
    expect(result.strategyId).toBe('randomBaseline');
    expect(result.label).toBe('Random Baseline');
    expect(result.evaluationStyle).toBe('fixed');
  });

  it('Mode A: returns hitMetrics with correct structure', () => {
    const dataset = runSingleSimulation({
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    });
    const strategy = ALL_STRATEGIES[0];
    const result = evaluateFixed(strategy, modeA, dataset.historical, dataset.future);
    expect(result.hitMetrics).toBeDefined();
    expect(result.hitMetrics!.hitCount).toBeGreaterThanOrEqual(0);
    expect(result.hitMetrics!.hitCount).toBeLessThanOrEqual(50);
    expect(result.hitMetrics!.hitRate).toBeGreaterThanOrEqual(0);
    expect(result.hitMetrics!.hitRate).toBeLessThanOrEqual(1);
    expect(result.hitMetrics!.runningHitRate).toHaveLength(50);
  });

  it('Mode F: returns matchDistribution with correct structure', () => {
    const dataset = runSingleSimulation({
      modeConfig: modeF,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    });
    const strategy = ALL_STRATEGIES[0];
    const result = evaluateFixed(strategy, modeF, dataset.historical, dataset.future);
    expect(result.matchDistribution).toBeDefined();
    expect(result.matchDistribution!.averageOverlap).toBeGreaterThanOrEqual(0);
    // Counts should sum to numFuture
    let total = 0;
    for (const count of result.matchDistribution!.counts.values()) {
      total += count;
    }
    expect(total).toBe(50);
  });
});

describe('evaluateRolling', () => {
  const modeA = getModeConfig('A');

  it('returns StrategyResult with evaluationStyle=rolling', () => {
    const dataset = runSingleSimulation({
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    });
    const strategy = ALL_STRATEGIES[1]; // mostFrequent
    const result = evaluateRolling(strategy, modeA, dataset.historical, dataset.future);
    expect(result.evaluationStyle).toBe('rolling');
  });

  it('Mode A: returns hitMetrics', () => {
    const dataset = runSingleSimulation({
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    });
    const strategy = ALL_STRATEGIES[1];
    const result = evaluateRolling(strategy, modeA, dataset.historical, dataset.future);
    expect(result.hitMetrics).toBeDefined();
    expect(result.hitMetrics!.runningHitRate).toHaveLength(50);
  });
});

describe('computeBaselines', () => {
  it('Mode A: theoretical hit rate = 0.1', () => {
    const modeA = getModeConfig('A');
    const baseline = computeBaselines(modeA, 500);
    expect(baseline.hitMetrics!.hitRate).toBeCloseTo(0.1, 10);
  });

  it('Mode B: match distribution probabilities sum to ~1', () => {
    const modeB = getModeConfig('B');
    const baseline = computeBaselines(modeB, 500);
    let totalProb = 0;
    for (const count of baseline.matchDistribution!.counts.values()) {
      totalProb += count / 500;
    }
    expect(totalProb).toBeCloseTo(1, 5);
  });

  it('Mode F: average overlap = 0.6', () => {
    const modeF = getModeConfig('F');
    const baseline = computeBaselines(modeF, 500);
    expect(baseline.matchDistribution!.averageOverlap).toBeCloseTo(0.6, 10);
  });
});

describe('runSingleEvaluation', () => {
  it('returns SingleRunResult with all strategy results', () => {
    const modeA = getModeConfig('A');
    const dataset = runSingleSimulation({
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    });
    const result = runSingleEvaluation(
      dataset,
      ALL_STRATEGIES,
      true, // evaluateFixed
      true, // evaluateRolling
    );
    // 6 strategies * 2 styles = 12 results
    expect(result.strategyResults).toHaveLength(12);
    expect(result.baselines).toHaveLength(1);
    expect(result.dataset).toBe(dataset);
  });

  it('can evaluate only fixed mode', () => {
    const modeA = getModeConfig('A');
    const dataset = runSingleSimulation({
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    });
    const result = runSingleEvaluation(
      dataset,
      ALL_STRATEGIES,
      true, // evaluateFixed
      false, // evaluateRolling
    );
    // 6 strategies * 1 style = 6 results
    expect(result.strategyResults).toHaveLength(6);
    expect(result.strategyResults.every((r) => r.evaluationStyle === 'fixed')).toBe(true);
  });
});