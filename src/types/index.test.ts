// ---------------------------------------------------------------------------
// Type-level tests for the shared domain types module.
// ---------------------------------------------------------------------------
// These tests verify that the types compile correctly and that objects
// conform to the expected shapes. They also document constraints that
// cannot be expressed in the type system (e.g. sorted unique numbers).
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import type {
  ModeId,
  ModeConfig,
  Draw,
  Dataset,
  StrategyContext,
  RollingContext,
  PredictionStrategy,
  HitMetrics,
  MatchDistribution,
  StrategyResult,
  SingleRunResult,
  MonteCarloConfig,
  MonteCarloStrategySummary,
  MonteCarloResult,
  FrequencyEntry,
  ChiSquareResult,
  AnalysisResult,
} from './index';

// ── ModeId ──────────────────────────────────────────────────────────────────

describe('ModeId', () => {
  it('accepts all valid mode identifiers', () => {
    const modes: ModeId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
    expect(modes).toHaveLength(6);
  });

  it('is a string union — each value is a valid ModeId', () => {
    const a: ModeId = 'A';
    const b: ModeId = 'B';
    const c: ModeId = 'C';
    const d: ModeId = 'D';
    const e: ModeId = 'E';
    const f: ModeId = 'F';
    expect([a, b, c, d, e, f]).toHaveLength(6);
  });
});

// ── ModeConfig ──────────────────────────────────────────────────────────────

describe('ModeConfig', () => {
  it('can be created with all required fields', () => {
    const config: ModeConfig = {
      id: 'A',
      name: '6/49',
      minNumber: 1,
      maxNumber: 49,
      numbersPerDraw: 6,
    };
    expect(config.id).toBe('A');
    expect(config.numbersPerDraw).toBe(6);
  });

  it('supports all mode identifiers', () => {
    const configs: ModeConfig[] = [
      { id: 'A', name: '6/49', minNumber: 1, maxNumber: 49, numbersPerDraw: 6 },
      { id: 'B', name: '5/90', minNumber: 1, maxNumber: 90, numbersPerDraw: 5 },
      { id: 'C', name: '7/47', minNumber: 1, maxNumber: 47, numbersPerDraw: 7 },
      { id: 'D', name: '6/42', minNumber: 1, maxNumber: 42, numbersPerDraw: 6 },
      { id: 'E', name: '5/35', minNumber: 1, maxNumber: 35, numbersPerDraw: 5 },
      { id: 'F', name: '4/24', minNumber: 1, maxNumber: 24, numbersPerDraw: 4 },
    ];
    expect(configs).toHaveLength(6);
  });
});

// ── Draw ────────────────────────────────────────────────────────────────────

describe('Draw', () => {
  it('can be created with sorted ascending unique numbers', () => {
    // NOTE: The `numbers` field must be sorted ascending with no duplicates.
    // This constraint is enforced at the generator level, not by the type
    // system. TypeScript cannot natively express "sorted unique number[]".
    const draw: Draw = {
      mode: 'A',
      numbers: [3, 12, 17, 24, 38, 45],
      index: 0,
    };
    expect(draw.numbers).toHaveLength(6);
    expect(draw.numbers).toEqual([...draw.numbers].sort((a, b) => a - b));
  });

  it('uses 0-based index for position in sequence', () => {
    const draw: Draw = {
      mode: 'B',
      numbers: [5, 23, 44, 67, 89],
      index: 42,
    };
    expect(draw.index).toBe(42);
  });
});

// ── Dataset ─────────────────────────────────────────────────────────────────

describe('Dataset', () => {
  it('splits draws into historical and future', () => {
    const historical: readonly Draw[] = [
      { mode: 'A', numbers: [1, 2, 3, 4, 5, 6], index: 0 },
      { mode: 'A', numbers: [7, 14, 21, 28, 35, 42], index: 1 },
    ];
    const future: readonly Draw[] = [
      { mode: 'A', numbers: [8, 15, 22, 29, 36, 43], index: 2 },
    ];
    const dataset: Dataset = { mode: 'A', historical, future };
    expect(dataset.historical).toHaveLength(2);
    expect(dataset.future).toHaveLength(1);
  });
});

// ── Strategy types ──────────────────────────────────────────────────────────

describe('StrategyContext', () => {
  it('bundles mode config with historical draws', () => {
    const ctx: StrategyContext = {
      mode: { id: 'A', name: '6/49', minNumber: 1, maxNumber: 49, numbersPerDraw: 6 },
      historical: [{ mode: 'A', numbers: [1, 2, 3, 4, 5, 6], index: 0 }],
    };
    expect(ctx.mode.id).toBe('A');
    expect(ctx.historical).toHaveLength(1);
  });
});

describe('RollingContext', () => {
  it('holds revealed future draws', () => {
    const ctx: RollingContext = {
      revealedFuture: [{ mode: 'A', numbers: [7, 14, 21, 28, 35, 42], index: 0 }],
    };
    expect(ctx.revealedFuture).toHaveLength(1);
  });
});

describe('PredictionStrategy', () => {
  it('implements the full strategy interface', () => {
    const strategy: PredictionStrategy = {
      id: 'frequency-top',
      label: 'Most Frequent Numbers',
      applicableModes: ['A', 'B', 'C'],
      buildModel: (_ctx) => ({ frequencies: new Map() }),
      predictNextFixed: (_model) => [1, 2, 3, 4, 5, 6],
      predictNextRolling: (_model, _rolling) => [1, 2, 3, 4, 5, 6],
      updateModelAfterReveal: (_model, _draw) => { /* no-op */ },
    };
    expect(strategy.id).toBe('frequency-top');
    expect(strategy.applicableModes).toContain('A');
  });

  it('allows optional rolling methods to be omitted', () => {
    const minimal: PredictionStrategy = {
      id: 'random',
      label: 'Random Baseline',
      applicableModes: ['A', 'B', 'C', 'D', 'E', 'F'],
      buildModel: () => null,
      predictNextFixed: () => [],
    };
    expect(minimal.predictNextRolling).toBeUndefined();
    expect(minimal.updateModelAfterReveal).toBeUndefined();
  });
});

// ── Evaluation metrics ──────────────────────────────────────────────────────

describe('HitMetrics', () => {
  it('tracks hit count, rate, and running rate', () => {
    const metrics: HitMetrics = {
      hitCount: 3,
      hitRate: 0.5,
      runningHitRate: [0.0, 0.5, 0.5],
    };
    expect(metrics.hitCount).toBe(3);
    expect(metrics.runningHitRate).toHaveLength(3);
  });
});

describe('MatchDistribution', () => {
  it('stores counts per k-match level and average overlap', () => {
    const dist: MatchDistribution = {
      counts: new Map([[0, 5], [1, 10], [2, 3]]),
      averageOverlap: 1.2,
    };
    expect(dist.counts.get(1)).toBe(10);
    expect(dist.averageOverlap).toBeCloseTo(1.2);
  });
});

describe('StrategyResult', () => {
  it('holds evaluation results for a strategy', () => {
    const result: StrategyResult = {
      strategyId: 'freq-top',
      label: 'Most Frequent',
      evaluationStyle: 'fixed',
      hitMetrics: { hitCount: 2, hitRate: 0.33, runningHitRate: [0, 0.5, 0.33] },
    };
    expect(result.evaluationStyle).toBe('fixed');
    expect(result.hitMetrics?.hitCount).toBe(2);
  });

  it('can carry matchDistribution for modes B–F', () => {
    const result: StrategyResult = {
      strategyId: 'freq-top',
      label: 'Most Frequent',
      evaluationStyle: 'rolling',
      matchDistribution: {
        counts: new Map([[0, 2], [1, 5]]),
        averageOverlap: 0.8,
      },
    };
    expect(result.matchDistribution?.averageOverlap).toBe(0.8);
  });
});

describe('SingleRunResult', () => {
  it('assembles dataset, analysis, strategies, and baselines', () => {
    const result: SingleRunResult = {
      dataset: {
        mode: 'A',
        historical: [],
        future: [],
      },
      analysis: null,
      strategyResults: [],
      baselines: [],
    };
    expect(result.dataset.mode).toBe('A');
  });
});

// ── Monte Carlo ─────────────────────────────────────────────────────────────

describe('MonteCarloConfig', () => {
  it('configures a full Monte Carlo experiment', () => {
    const config: MonteCarloConfig = {
      mode: 'A',
      numHistorical: 100,
      numFuture: 10,
      numRuns: 1000,
      baseSeed: 42,
      strategies: [],
      evaluateFixed: true,
      evaluateRolling: false,
    };
    expect(config.numRuns).toBe(1000);
    expect(config.evaluateFixed).toBe(true);
  });
});

describe('MonteCarloStrategySummary', () => {
  it('aggregates statistics across runs', () => {
    const summary: MonteCarloStrategySummary = {
      strategyId: 'freq-top',
      label: 'Most Frequent',
      evaluationStyle: 'fixed',
      meanHitRate: 0.35,
      hitRateStdDev: 0.08,
      hitRateCI95: [0.19, 0.51],
      meanHitRateDeltaVsBaseline: 0.02,
      deltaStdDev: 0.05,
      deltaCI95: [-0.08, 0.12],
      fractionRunsBeatingBaseline: 0.58,
    };
    expect(summary.hitRateCI95).toHaveLength(2);
    expect(summary.fractionRunsBeatingBaseline).toBeCloseTo(0.58);
  });
});

describe('MonteCarloResult', () => {
  it('pairs config with strategy summaries', () => {
    const result: MonteCarloResult = {
      config: {
        mode: 'A',
        numHistorical: 50,
        numFuture: 5,
        numRuns: 500,
        baseSeed: 1,
        strategies: [],
        evaluateFixed: true,
        evaluateRolling: true,
      },
      strategySummaries: [],
    };
    expect(result.config.mode).toBe('A');
    expect(result.strategySummaries).toHaveLength(0);
  });
});

// ── Analysis ────────────────────────────────────────────────────────────────

describe('FrequencyEntry', () => {
  it('records observed vs expected counts for a number', () => {
    const entry: FrequencyEntry = {
      number: 7,
      observedCount: 15,
      expectedCount: 12,
      relativeDeviation: 0.25,
    };
    expect(entry.relativeDeviation).toBeCloseTo(0.25);
  });
});

describe('ChiSquareResult', () => {
  it('holds chi-square test outputs', () => {
    const chi: ChiSquareResult = {
      chiSquareValue: 42.5,
      degreesOfFreedom: 48,
      pValue: 0.72,
    };
    expect(chi.pValue).toBeGreaterThan(0);
  });
});

describe('AnalysisResult', () => {
  it('assembles all analysis fields', () => {
    const analysis: AnalysisResult = {
      frequencyTable: [{ number: 1, observedCount: 10, expectedCount: 12, relativeDeviation: -0.17 }],
      sumDistribution: new Map([[150, 5]]),
      gapDistribution: new Map([[1, 20]]),
      oddEvenDistribution: new Map([['3odd-3even', 15]]),
      lowHighDistribution: new Map([['3low-3high', 12]]),
      combinationFrequencies: new Map([['1-2-3-4-5-6', 1]]),
      pairFrequencies: new Map([['1-2', 5]]),
      consecutiveCount: new Map([[0, 30]]),
      overlapDistribution: new Map([[2, 10]]),
      repeatedCombinations: new Map(),
      chiSquare: { chiSquareValue: 42, degreesOfFreedom: 48, pValue: 0.72 },
      independenceDiagnostics: null,
    };
    expect(analysis.frequencyTable).toHaveLength(1);
    expect(analysis.chiSquare.pValue).toBe(0.72);
  });
});