import { describe, it, expect } from 'vitest';
import {
  MODE_CONFIGS,
  getModeConfig,
  ALL_MODE_IDS,
  binomialCoefficient,
  totalCombinations,
  singleDrawProbability,
} from './modes.js';
import type { ModeId } from '../types/index.js';

describe('MODE_CONFIGS', () => {
  it('contains all six modes', () => {
    expect(Object.keys(MODE_CONFIGS)).toHaveLength(6);
    expect(Object.keys(MODE_CONFIGS)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('Mode A: pick 1 from 1–10', () => {
    const m = MODE_CONFIGS.A;
    expect(m.id).toBe('A');
    expect(m.name).toBe('Pick 1 from 10');
    expect(m.minNumber).toBe(1);
    expect(m.maxNumber).toBe(10);
    expect(m.numbersPerDraw).toBe(1);
  });

  it('Mode B: pick 2 from 1–20', () => {
    const m = MODE_CONFIGS.B;
    expect(m.id).toBe('B');
    expect(m.maxNumber).toBe(20);
    expect(m.numbersPerDraw).toBe(2);
  });

  it('Mode C: pick 3 from 1–30', () => {
    const m = MODE_CONFIGS.C;
    expect(m.maxNumber).toBe(30);
    expect(m.numbersPerDraw).toBe(3);
  });

  it('Mode D: pick 4 from 1–40', () => {
    const m = MODE_CONFIGS.D;
    expect(m.maxNumber).toBe(40);
    expect(m.numbersPerDraw).toBe(4);
  });

  it('Mode E: pick 5 from 1–50', () => {
    const m = MODE_CONFIGS.E;
    expect(m.maxNumber).toBe(50);
    expect(m.numbersPerDraw).toBe(5);
  });

  it('Mode F: pick 6 from 1–60', () => {
    const m = MODE_CONFIGS.F;
    expect(m.maxNumber).toBe(60);
    expect(m.numbersPerDraw).toBe(6);
  });
});

describe('getModeConfig', () => {
  it('returns correct config for each mode', () => {
    for (const id of ALL_MODE_IDS) {
      expect(getModeConfig(id)).toBe(MODE_CONFIGS[id]);
    }
  });
});

describe('ALL_MODE_IDS', () => {
  it('contains exactly A through F', () => {
    expect(ALL_MODE_IDS).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

describe('binomialCoefficient', () => {
  it('computes C(10, 1) = 10', () => {
    expect(binomialCoefficient(10, 1)).toBe(10);
  });

  it('computes C(20, 2) = 190', () => {
    expect(binomialCoefficient(20, 2)).toBe(190);
  });

  it('computes C(30, 3) = 4060', () => {
    expect(binomialCoefficient(30, 3)).toBe(4060);
  });

  it('computes C(40, 4) = 91390', () => {
    expect(binomialCoefficient(40, 4)).toBe(91390);
  });

  it('computes C(50, 5) = 2118760', () => {
    expect(binomialCoefficient(50, 5)).toBe(2118760);
  });

  it('computes C(60, 6) = 50063860', () => {
    expect(binomialCoefficient(60, 6)).toBe(50063860);
  });

  it('returns 1 for C(n, 0)', () => {
    expect(binomialCoefficient(10, 0)).toBe(1);
  });

  it('returns 1 for C(n, n)', () => {
    expect(binomialCoefficient(10, 10)).toBe(1);
  });

  it('returns 0 for k > n', () => {
    expect(binomialCoefficient(5, 10)).toBe(0);
  });
});

describe('totalCombinations', () => {
  const expected: Record<ModeId, number> = {
    A: 10,
    B: 190,
    C: 4060,
    D: 91390,
    E: 2118760,
    F: 50063860,
  };

  for (const id of ALL_MODE_IDS) {
    it(`Mode ${id}: totalCombinations = ${expected[id]}`, () => {
      expect(totalCombinations(getModeConfig(id))).toBe(expected[id]);
    });
  }
});

describe('singleDrawProbability', () => {
  it('returns 1 / totalCombinations for each mode', () => {
    for (const id of ALL_MODE_IDS) {
      const mode = getModeConfig(id);
      const prob = singleDrawProbability(mode);
      expect(prob).toBeCloseTo(1 / totalCombinations(mode), 15);
    }
  });

  it('Mode A probability is 0.1', () => {
    expect(singleDrawProbability(getModeConfig('A'))).toBeCloseTo(0.1, 10);
  });
});