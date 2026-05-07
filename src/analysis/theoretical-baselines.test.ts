import { describe, it, expect } from 'vitest';
import {
  singleDrawWinProbability,
  atLeastOneHitProbability,
  expectedHitCount,
  expectedAverageOverlap,
  hypergeometricMatchProbability,
  combinatorial,
} from './theoretical-baselines.js';
import { getModeConfig } from '../generator/modes.js';
import { ALL_MODE_IDS } from '../generator/modes.js';

describe('combinatorial', () => {
  it('computes C(10, 1) = 10', () => {
    expect(combinatorial(10, 1)).toBe(10);
  });
  it('computes C(20, 2) = 190', () => {
    expect(combinatorial(20, 2)).toBe(190);
  });
  it('computes C(60, 6) = 50063860', () => {
    expect(combinatorial(60, 6)).toBe(50063860);
  });
  it('returns 1 for C(n, 0)', () => {
    expect(combinatorial(10, 0)).toBe(1);
  });
  it('returns 0 for k > n', () => {
    expect(combinatorial(5, 10)).toBe(0);
  });
});

describe('singleDrawWinProbability', () => {
  it('Mode A probability is 1/10 = 0.1', () => {
    expect(singleDrawWinProbability(getModeConfig('A'))).toBeCloseTo(0.1, 10);
  });
  it('Mode B probability is 1/190', () => {
    expect(singleDrawWinProbability(getModeConfig('B'))).toBeCloseTo(1 / 190, 10);
  });
  it('equals 1/totalCombinations for each mode', () => {
    for (const id of ALL_MODE_IDS) {
      const mode = getModeConfig(id);
      const prob = singleDrawWinProbability(mode);
      expect(prob).toBeCloseTo(1 / combinatorial(mode.maxNumber, mode.numbersPerDraw), 15);
    }
  });
});

describe('atLeastOneHitProbability', () => {
  it('p=0.1, n=1 → 0.1', () => {
    const mode = getModeConfig('A');
    expect(atLeastOneHitProbability(mode, 1)).toBeCloseTo(0.1, 10);
  });
  it('p=0.1, n=2 → 1 - 0.9^2 = 0.19', () => {
    const mode = getModeConfig('A');
    expect(atLeastOneHitProbability(mode, 2)).toBeCloseTo(0.19, 10);
  });
  it('p=0.1, n=10 → 1 - 0.9^10', () => {
    const mode = getModeConfig('A');
    const expected = 1 - Math.pow(0.9, 10);
    expect(atLeastOneHitProbability(mode, 10)).toBeCloseTo(expected, 10);
  });
  it('n=0 → 0', () => {
    const mode = getModeConfig('A');
    expect(atLeastOneHitProbability(mode, 0)).toBeCloseTo(0, 10);
  });
});

describe('expectedHitCount', () => {
  it('Mode A, 500 draws → 500 * 0.1 = 50', () => {
    const mode = getModeConfig('A');
    expect(expectedHitCount(mode, 500)).toBeCloseTo(50, 10);
  });
  it('Mode B, 100 draws → 100 / 190', () => {
    const mode = getModeConfig('B');
    expect(expectedHitCount(mode, 100)).toBeCloseTo(100 / 190, 10);
  });
});

describe('expectedAverageOverlap', () => {
  it('Mode A: 1 * (1/10) = 0.1', () => {
    expect(expectedAverageOverlap(getModeConfig('A'))).toBeCloseTo(0.1, 10);
  });
  it('Mode B: 2 * (2/20) = 0.2', () => {
    expect(expectedAverageOverlap(getModeConfig('B'))).toBeCloseTo(0.2, 10);
  });
  it('Mode F: 6 * (6/60) = 0.6', () => {
    expect(expectedAverageOverlap(getModeConfig('F'))).toBeCloseTo(0.6, 10);
  });
});

describe('hypergeometricMatchProbability', () => {
  it('probabilities sum to 1 for each mode', () => {
    for (const id of ALL_MODE_IDS) {
      const mode = getModeConfig(id);
      let total = 0;
      for (let k = 0; k <= mode.numbersPerDraw; k++) {
        total += hypergeometricMatchProbability(mode, k);
      }
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('Mode A: P(0) = 0.9, P(1) = 0.1', () => {
    const mode = getModeConfig('A');
    expect(hypergeometricMatchProbability(mode, 0)).toBeCloseTo(0.9, 10);
    expect(hypergeometricMatchProbability(mode, 1)).toBeCloseTo(0.1, 10);
  });

  it('returns 0 for k > numbersPerDraw', () => {
    const mode = getModeConfig('B');
    expect(hypergeometricMatchProbability(mode, 3)).toBe(0);
  });

  it('returns 0 for k < 0', () => {
    const mode = getModeConfig('B');
    expect(hypergeometricMatchProbability(mode, -1)).toBe(0);
  });
});