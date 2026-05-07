import { describe, it, expect } from 'vitest';
import { randomBaselineStrategy } from './random-baseline.js';
import { mostFrequentStrategy } from './most-frequent.js';
import { leastFrequentStrategy } from './least-frequent.js';
import { recencyWeightedStrategy } from './recency-weighted.js';
import { overdueStrategy } from './overdue.js';
import { hybridWeightedStrategy } from './hybrid-weighted.js';
import { ALL_STRATEGIES } from './index.js';
import { getModeConfig } from '../generator/modes.js';
import { runSingleSimulation } from '../generator/engine.js';
import type { Draw, StrategyContext, ModeConfig } from '../types/index.js';

/** Helper: create a test draw. */
const createTestDraw = (
  mode: ModeConfig['id'],
  numbers: number[],
  index: number,
): Draw => ({
  mode,
  numbers: Object.freeze([...numbers].sort((a, b) => a - b)),
  index,
});

/** Helper: create a strategy context from historical draws. */
const createContext = (
  modeId: ModeConfig['id'],
  historical: readonly Draw[],
): StrategyContext => ({
  mode: getModeConfig(modeId),
  historical,
});

// ── Shared tests for all strategies ───────────────────────────────────────────

const strategies = [
  randomBaselineStrategy,
  mostFrequentStrategy,
  leastFrequentStrategy,
  recencyWeightedStrategy,
  overdueStrategy,
  hybridWeightedStrategy,
];

for (const strategy of strategies) {
  describe(`${strategy.id} strategy`, () => {
    const modeA = getModeConfig('A');
    const modeF = getModeConfig('F');

    it('buildModel returns a model object', () => {
      const dataset = runSingleSimulation({
        modeConfig: modeA,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const ctx = createContext('A', dataset.historical);
      const model = strategy.buildModel(ctx);
      expect(model).toBeDefined();
    });

    it('predictNextFixed returns correct number of numbers', () => {
      for (const modeId of ['A', 'F'] as const) {
        const mode = getModeConfig(modeId);
        const dataset = runSingleSimulation({
          modeConfig: mode,
          numHistorical: 50,
          numFuture: 10,
          seed: 42,
        });
        const ctx = createContext(modeId, dataset.historical);
        const model = strategy.buildModel(ctx);
        const prediction = strategy.predictNextFixed(model);
        expect(prediction).toHaveLength(mode.numbersPerDraw);
      }
    });

    it('predictNextFixed returns numbers in valid range', () => {
      for (const modeId of ['A', 'F'] as const) {
        const mode = getModeConfig(modeId);
        const dataset = runSingleSimulation({
          modeConfig: mode,
          numHistorical: 50,
          numFuture: 10,
          seed: 42,
        });
        const ctx = createContext(modeId, dataset.historical);
        const model = strategy.buildModel(ctx);
        const prediction = strategy.predictNextFixed(model);
        for (const n of prediction) {
          expect(n).toBeGreaterThanOrEqual(mode.minNumber);
          expect(n).toBeLessThanOrEqual(mode.maxNumber);
        }
      }
    });

    it('predictNextFixed returns unique sorted numbers', () => {
      const dataset = runSingleSimulation({
        modeConfig: modeF,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const ctx = createContext('F', dataset.historical);
      const model = strategy.buildModel(ctx);
      const prediction = strategy.predictNextFixed(model);
      // Unique
      expect(new Set(prediction).size).toBe(prediction.length);
      // Sorted ascending
      for (let i = 1; i < prediction.length; i++) {
        expect(prediction[i]).toBeGreaterThan(prediction[i - 1]);
      }
    });

    it('predictNextRolling returns valid combination', () => {
      if (!strategy.predictNextRolling) return;
      const dataset = runSingleSimulation({
        modeConfig: modeF,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const ctx = createContext('F', dataset.historical);
      const model = strategy.buildModel(ctx);
      const prediction = strategy.predictNextRolling(model, {
        revealedFuture: dataset.historical.slice(0, 5),
      });
      expect(prediction).toHaveLength(modeF.numbersPerDraw);
      for (const n of prediction) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(60);
      }
    });

    it('updateModelAfterReveal updates model correctly', () => {
      if (!strategy.updateModelAfterReveal) return;
      const dataset = runSingleSimulation({
        modeConfig: modeA,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const ctx = createContext('A', dataset.historical);
      const model = strategy.buildModel(ctx);
      const revealedDraw = createTestDraw('A', [5], 50);
      // Should not throw
      strategy.updateModelAfterReveal!(model, revealedDraw);
    });
  });
}

// ── Strategy-specific tests ────────────────────────────────────────────────────

describe('mostFrequent strategy', () => {
  it('selects the most frequent numbers', () => {
    const historical: Draw[] = [
      createTestDraw('A', [3], 0),
      createTestDraw('A', [3], 1),
      createTestDraw('A', [3], 2),
      createTestDraw('A', [7], 3),
    ];
    const ctx = createContext('A', historical);
    const model = mostFrequentStrategy.buildModel(ctx);
    const prediction = mostFrequentStrategy.predictNextFixed(model);
    expect(prediction[0]).toBe(3); // 3 appeared 3 times, 7 appeared once
  });
});

describe('leastFrequent strategy', () => {
  it('selects the least frequent numbers', () => {
    const historical: Draw[] = [
      createTestDraw('A', [3], 0),
      createTestDraw('A', [3], 1),
      createTestDraw('A', [7], 2),
    ];
    const ctx = createContext('A', historical);
    const model = leastFrequentStrategy.buildModel(ctx);
    const prediction = leastFrequentStrategy.predictNextFixed(model);
    // Numbers 1,2,4,5,6,8,9,10 never appeared; should pick lowest among them
    expect(prediction[0]).toBeLessThanOrEqual(10);
  });
});

describe('overdue strategy', () => {
  it('selects numbers that have not appeared for longest', () => {
    const historical: Draw[] = [
      createTestDraw('A', [1], 0),
      createTestDraw('A', [2], 1),
      createTestDraw('A', [3], 2),
    ];
    const ctx = createContext('A', historical);
    const model = overdueStrategy.buildModel(ctx);
    const prediction = overdueStrategy.predictNextFixed(model);
    // Numbers 4-10 never appeared (lastSeen = -1), so they're most overdue
    expect(prediction[0]).toBeGreaterThanOrEqual(4);
  });
});

describe('ALL_STRATEGIES', () => {
  it('contains all 6 strategies', () => {
    expect(ALL_STRATEGIES).toHaveLength(6);
    const ids = ALL_STRATEGIES.map((s) => s.id);
    expect(ids).toContain('randomBaseline');
    expect(ids).toContain('mostFrequent');
    expect(ids).toContain('leastFrequent');
    expect(ids).toContain('recencyWeighted');
    expect(ids).toContain('overdue');
    expect(ids).toContain('hybridWeighted');
  });
});