import { describe, it, expect } from 'vitest';
import { analyzeHistorical } from './analysis.js';
import { getModeConfig } from '../generator/modes.js';
import { runSingleSimulation } from '../generator/engine.js';
import type { Draw, ModeConfig } from '../types/index.js';

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

describe('analyzeHistorical', () => {
  describe('frequency table', () => {
    it('computes observed counts that sum to total positions', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 100,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      const totalObserved = result.frequencyTable.reduce(
        (sum, e) => sum + e.observedCount,
        0,
      );
      expect(totalObserved).toBe(100 * modeConfig.numbersPerDraw);
    });

    it('computes expected counts correctly', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 100,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      const expectedCount = (100 * 1) / 10; // 10
      for (const entry of result.frequencyTable) {
        expect(entry.expectedCount).toBeCloseTo(expectedCount, 10);
      }
    });

    it('computes relative deviation correctly', () => {
      const modeConfig = getModeConfig('A');
      const historical: Draw[] = [
        createTestDraw('A', [3], 0),
        createTestDraw('A', [3], 1),
        createTestDraw('A', [7], 2),
      ];
      const result = analyzeHistorical(modeConfig, historical);
      const entry3 = result.frequencyTable.find((e) => e.number === 3);
      const entry7 = result.frequencyTable.find((e) => e.number === 7);
      // expected = 3*1/10 = 0.3
      expect(entry3?.observedCount).toBe(2);
      expect(entry3?.relativeDeviation).toBeCloseTo((2 - 0.3) / 0.3, 5);
      expect(entry7?.observedCount).toBe(1);
    });
  });

  describe('sum distribution', () => {
    it('contains valid sums for each draw', () => {
      const modeConfig = getModeConfig('F');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 50,
        numFuture: 10,
        seed: 99,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      // All sums should be positive
      for (const [sum] of result.sumDistribution) {
        expect(sum).toBeGreaterThan(0);
      }
    });
  });

  describe('gap distribution', () => {
    it('contains positive gaps for multi-number modes', () => {
      const modeConfig = getModeConfig('B');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 50,
        numFuture: 10,
        seed: 77,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      for (const [gap] of result.gapDistribution) {
        expect(gap).toBeGreaterThan(0);
      }
    });
  });

  describe('odd/even distribution', () => {
    it('contains entries for each draw', () => {
      const modeConfig = getModeConfig('F');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 50,
        numFuture: 10,
        seed: 55,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      let totalDraws = 0;
      for (const count of result.oddEvenDistribution.values()) {
        totalDraws += count;
      }
      expect(totalDraws).toBe(50);
    });
  });

  describe('chi-square', () => {
    it('returns non-negative chi-square value', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 100,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      expect(result.chiSquare.chiSquareValue).toBeGreaterThanOrEqual(0);
    });

    it('returns p-value in [0, 1]', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 100,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      expect(result.chiSquare.pValue).toBeGreaterThanOrEqual(0);
      expect(result.chiSquare.pValue).toBeLessThanOrEqual(1);
    });

    it('returns correct degrees of freedom', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 100,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      expect(result.chiSquare.degreesOfFreedom).toBe(9); // 10 - 1
    });
  });

  describe('pair frequencies', () => {
    it('returns empty map for Mode A (numbersPerDraw < 2)', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      expect(result.pairFrequencies.size).toBe(0);
    });

    it('returns non-empty map for Mode B', () => {
      const modeConfig = getModeConfig('B');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      expect(result.pairFrequencies.size).toBeGreaterThan(0);
    });
  });

  describe('consecutive count', () => {
    it('returns a map with at least key 0', () => {
      const modeConfig = getModeConfig('F');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      expect(result.consecutiveCount.has(0)).toBe(true);
    });
  });

  describe('overlap distribution', () => {
    it('total draws equals historical length - 1', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      let total = 0;
      for (const count of result.overlapDistribution.values()) {
        total += count;
      }
      expect(total).toBe(49); // 50 - 1
    });
  });

  describe('independence diagnostics', () => {
    it('returns correlation in [-1, 1]', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 100,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      const diag = result.independenceDiagnostics as {
        firstHalfSecondHalfCorrelation: number;
        consecutiveDrawDependence: number;
      };
      expect(diag.firstHalfSecondHalfCorrelation).toBeGreaterThanOrEqual(-1);
      expect(diag.firstHalfSecondHalfCorrelation).toBeLessThanOrEqual(1);
    });
  });

  describe('returns all required fields', () => {
    it('has all AnalysisResult fields', () => {
      const modeConfig = getModeConfig('A');
      const dataset = runSingleSimulation({
        modeConfig,
        numHistorical: 50,
        numFuture: 10,
        seed: 42,
      });
      const result = analyzeHistorical(modeConfig, dataset.historical);
      expect(result).toHaveProperty('frequencyTable');
      expect(result).toHaveProperty('sumDistribution');
      expect(result).toHaveProperty('gapDistribution');
      expect(result).toHaveProperty('oddEvenDistribution');
      expect(result).toHaveProperty('lowHighDistribution');
      expect(result).toHaveProperty('combinationFrequencies');
      expect(result).toHaveProperty('pairFrequencies');
      expect(result).toHaveProperty('consecutiveCount');
      expect(result).toHaveProperty('overlapDistribution');
      expect(result).toHaveProperty('repeatedCombinations');
      expect(result).toHaveProperty('chiSquare');
      expect(result).toHaveProperty('independenceDiagnostics');
    });
  });
});