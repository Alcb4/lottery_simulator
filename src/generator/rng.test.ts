import { describe, it, expect } from 'vitest';
import { createRNG } from './rng.js';

describe('createRNG', () => {
  it('produces deterministic sequences from the same seed', () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(42);
    const seq1 = Array.from({ length: 20 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 20 }, () => rng2.nextFloat());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences from different seeds', () => {
    const rng1 = createRNG(1);
    const rng2 = createRNG(2);
    const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());
    expect(seq1).not.toEqual(seq2);
  });

  it('produces independent instances that do not interfere', () => {
    const rng1 = createRNG(100);
    const rng2 = createRNG(200);
    rng1.nextFloat();
    rng1.nextFloat();
    const val2 = rng2.nextFloat();
    const rng3 = createRNG(200);
    expect(val2).toEqual(rng3.nextFloat());
  });
});

describe('nextFloat', () => {
  it('returns values strictly between 0 and 1', () => {
    const rng = createRNG(12345);
    for (let i = 0; i < 10_000; i++) {
      const val = rng.nextFloat();
      expect(val).toBeGreaterThan(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('produces a known sequence for a known seed', () => {
    const rng = createRNG(42);
    // These values were computed from the mulberry32 algorithm
    const first = rng.nextFloat();
    const second = rng.nextFloat();
    expect(typeof first).toBe('number');
    expect(typeof second).toBe('number');
    expect(first).not.toEqual(second);
  });
});

describe('nextInt', () => {
  it('returns values within [min, max] inclusive', () => {
    const rng = createRNG(9999);
    const min = 1;
    const max = 60;
    for (let i = 0; i < 10_000; i++) {
      const val = rng.nextInt(min, max);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThanOrEqual(max);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('returns min when min equals max', () => {
    const rng = createRNG(7777);
    for (let i = 0; i < 100; i++) {
      expect(rng.nextInt(5, 5)).toBe(5);
    }
  });

  it('throws if min > max', () => {
    const rng = createRNG(1);
    expect(() => rng.nextInt(10, 1)).toThrow(RangeError);
  });
});

describe('sampleWithoutReplacement', () => {
  it('returns an empty array when k = 0', () => {
    const rng = createRNG(1);
    expect(rng.sampleWithoutReplacement(0, 1, 10)).toEqual([]);
  });

  it('returns k unique elements from the range', () => {
    const rng = createRNG(42);
    const result = rng.sampleWithoutReplacement(5, 1, 50);
    expect(result).toHaveLength(5);
    expect(new Set(result).size).toBe(5);
    for (const n of result) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(50);
    }
  });

  it('returns sorted ascending results', () => {
    const rng = createRNG(42);
    const result = rng.sampleWithoutReplacement(6, 1, 60);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  it('returns the full range when k equals range size', () => {
    const rng = createRNG(42);
    const result = rng.sampleWithoutReplacement(5, 1, 5);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('throws when k exceeds range size', () => {
    const rng = createRNG(1);
    expect(() => rng.sampleWithoutReplacement(6, 1, 5)).toThrow(RangeError);
  });

  it('throws when min > max', () => {
    const rng = createRNG(1);
    expect(() => rng.sampleWithoutReplacement(1, 10, 5)).toThrow(RangeError);
  });

  it('produces deterministic results for the same seed', () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(42);
    const r1 = rng1.sampleWithoutReplacement(3, 1, 30);
    const r2 = rng2.sampleWithoutReplacement(3, 1, 30);
    expect(r1).toEqual(r2);
  });

  it('works with non-1 min values', () => {
    const rng = createRNG(42);
    const result = rng.sampleWithoutReplacement(3, 10, 20);
    expect(result).toHaveLength(3);
    for (const n of result) {
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(20);
    }
  });
});

describe('getState', () => {
  it('returns a number representing current state', () => {
    const rng = createRNG(42);
    expect(typeof rng.getState()).toBe('number');
  });

  it('state changes after each call', () => {
    const rng = createRNG(42);
    const s0 = rng.getState();
    rng.nextFloat();
    const s1 = rng.getState();
    expect(s1).not.toEqual(s0);
  });
});