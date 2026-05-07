import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '../src/evaluation/monte-carlo.js';
import { ALL_STRATEGIES } from '../src/strategies/index.js';
import type { MonteCarloConfig } from '../types/index.js';

describe('runMonteCarlo', () => {
  it('returns MonteCarloResult with correct structure', () => {
    const config: MonteCarloConfig = {
      mode: 'A',
      numHistorical: 100,
      numFuture: 50,
      numRuns: 5,
      baseSeed: 42,
      strategies: ALL_STRATEGIES,
      evaluateFixed: true,
      evaluateRolling: false,
    };
    const result = runMonteCarlo(config);
    expect(result.config).toBe(config);
    expect(result.strategySummaries.length).toBeGreaterThan(0);
  });

  it('produces summaries for each strategy', () => {
    const config: MonteCarloConfig = {
      mode: 'A',
      numHistorical: 100,
      numFuture: 50,
      numRuns: 5,
      baseSeed: 42,
      strategies: ALL_STRATEGIES,
      evaluateFixed: true,
      evaluateRolling: false,
    };
    const result = runMonteCarlo(config);
    const strategyIds = result.strategySummaries.map((s) => s.strategyId);
    expect(strategyIds).toContain('randomBaseline');
    expect(strategyIds).toContain('mostFrequent');
    expect(strategyIds).toContain('leastFrequent');
  });

  it('produces both fixed and rolling summaries when both are enabled', () => {
    const config: MonteCarloConfig = {
      mode: 'A',
      numHistorical: 100,
      numFuture: 50,
      numRuns: 5,
      baseSeed: 42,
      strategies: ALL_STRATEGIES,
      evaluateFixed: true,
      evaluateRolling: true,
    };
    const result = runMonteCarlo(config);
    const fixedSummaries = result.strategySummaries.filter(
      (s) => s.evaluationStyle === 'fixed',
    );
    const rollingSummaries = result.strategySummaries.filter(
      (s) => s.evaluationStyle === 'rolling',
    );
    expect(fixedSummaries.length).toBe(6);
    expect(rollingSummaries.length).toBe(6);
  });

  it('Mode A: summaries include hitRate metrics', () => {
    const config: MonteCarloConfig = {
      mode: 'A',
      numHistorical: 100,
      numFuture: 50,
      numRuns: 5,
      baseSeed: 42,
      strategies: ALL_STRATEGIES,
      evaluateFixed: true,
      evaluateRolling: false,
    };
    const result = runMonteCarlo(config);
    for (const summary of result.strategySummaries) {
      expect(summary.meanHitRate).toBeDefined();
      expect(summary.meanHitRate!).toBeGreaterThanOrEqual(0);
      expect(summary.meanHitRate!).toBeLessThanOrEqual(1);
      expect(summary.hitRateStdDev).toBeDefined();
      expect(summary.hitRateCI95).toBeDefined();
      expect(summary.hitRateCI95![0]).toBeLessThanOrEqual(summary.hitRateCI95![1]);
    }
  });

  it('Mode F: summaries include overlap metrics', () => {
    const config: MonteCarloConfig = {
      mode: 'F',
      numHistorical: 100,
      numFuture: 50,
      numRuns: 5,
      baseSeed: 42,
      strategies: ALL_STRATEGIES,
      evaluateFixed: true,
      evaluateRolling: false,
    };
    const result = runMonteCarlo(config);
    for (const summary of result.strategySummaries) {
      expect(summary.meanAverageOverlap).toBeDefined();
      expect(summary.meanAverageOverlap!).toBeGreaterThanOrEqual(0);
    }
  });

  it('includes delta vs baseline metrics', () => {
    const config: MonteCarloConfig = {
      mode: 'A',
      numHistorical: 100,
      numFuture: 50,
      numRuns: 5,
      baseSeed: 42,
      strategies: ALL_STRATEGIES,
      evaluateFixed: true,
      evaluateRolling: false,
    };
    const result = runMonteCarlo(config);
    for (const summary of result.strategySummaries) {
      expect(summary.meanHitRateDeltaVsBaseline).toBeDefined();
      expect(summary.fractionRunsBeatingBaseline).toBeDefined();
      expect(summary.fractionRunsBeatingBaseline!).toBeGreaterThanOrEqual(0);
      expect(summary.fractionRunsBeatingBaseline!).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic: same config produces same results', () => {
    const config: MonteCarloConfig = {
      mode: 'A',
      numHistorical: 100,
      numFuture: 50,
      numRuns: 3,
      baseSeed: 42,
      strategies: ALL_STRATEGIES,
      evaluateFixed: true,
      evaluateRolling: false,
    };
    const result1 = runMonteCarlo(config);
    const result2 = runMonteCarlo(config);
    expect(result1.strategySummaries).toEqual(result2.strategySummaries);
  });

  it('different seeds produce different results', () => {
    const config1: MonteCarloConfig = {
      mode: 'A',
      numHistorical: 100,
      numFuture: 50,
      numRuns: 5,
      baseSeed: 1,
      strategies: ALL_STRATEGIES,
      evaluateFixed: true,
      evaluateRolling: false,
    };
    const config2: MonteCarloConfig = {
      ...config1,
      baseSeed: 999,
    };
    const result1 = runMonteCarlo(config1);
    const result2 = runMonteCarlo(config2);
    // At least one strategy should have different mean hit rates
    const different = result1.strategySummaries.some((s1, i) => {
      const s2 = result2.strategySummaries[i];
      return s1.meanHitRate !== s2.meanHitRate;
    });
    expect(different).toBe(true);
  });

  it('works with all modes A-F', () => {
    const modes: Array<'A' | 'B' | 'C' | 'D' | 'E' | 'F'> = [
      'A', 'B', 'C', 'D', 'E', 'F',
    ];
    for (const mode of modes) {
      const config: MonteCarloConfig = {
        mode,
        numHistorical: 50,
        numFuture: 20,
        numRuns: 3,
        baseSeed: 42,
        strategies: ALL_STRATEGIES,
        evaluateFixed: true,
        evaluateRolling: false,
      };
      const result = runMonteCarlo(config);
      expect(result.strategySummaries.length).toBeGreaterThan(0);
    }
  });
});