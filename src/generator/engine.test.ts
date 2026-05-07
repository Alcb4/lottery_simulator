import { describe, it, expect } from 'vitest';
import { runSingleSimulation } from './engine.js';
import { getModeConfig } from './modes.js';
import { createRNG } from './rng.js';
import type { SingleRunConfig } from './engine.js';

describe('runSingleSimulation', () => {
  const modeA = getModeConfig('A');
  const modeF = getModeConfig('F');

  it('generates the correct number of historical and future draws', () => {
    const config: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    };
    const dataset = runSingleSimulation(config);
    expect(dataset.historical).toHaveLength(100);
    expect(dataset.future).toHaveLength(50);
  });

  it('produces draws with correct mode id', () => {
    const config: SingleRunConfig = {
      modeConfig: modeF,
      numHistorical: 10,
      numFuture: 5,
      seed: 1,
    };
    const dataset = runSingleSimulation(config);
    for (const draw of dataset.historical) {
      expect(draw.mode).toBe('F');
    }
    for (const draw of dataset.future) {
      expect(draw.mode).toBe('F');
    }
  });

  it('produces draws with correct numbersPerDraw count', () => {
    const config: SingleRunConfig = {
      modeConfig: modeF,
      numHistorical: 20,
      numFuture: 10,
      seed: 99,
    };
    const dataset = runSingleSimulation(config);
    for (const draw of [...dataset.historical, ...dataset.future]) {
      expect(draw.numbers).toHaveLength(6);
    }
  });

  it('produces draws with numbers sorted ascending and unique', () => {
    const config: SingleRunConfig = {
      modeConfig: modeF,
      numHistorical: 50,
      numFuture: 50,
      seed: 123,
    };
    const dataset = runSingleSimulation(config);
    for (const draw of [...dataset.historical, ...dataset.future]) {
      // Sorted ascending
      for (let i = 1; i < draw.numbers.length; i++) {
        expect(draw.numbers[i]).toBeGreaterThan(draw.numbers[i - 1]);
      }
      // Unique
      expect(new Set(draw.numbers).size).toBe(draw.numbers.length);
    }
  });

  it('produces draws with numbers in valid range', () => {
    const config: SingleRunConfig = {
      modeConfig: modeF,
      numHistorical: 50,
      numFuture: 50,
      seed: 456,
    };
    const dataset = runSingleSimulation(config);
    for (const draw of [...dataset.historical, ...dataset.future]) {
      for (const n of draw.numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(60);
      }
    }
  });

  it('assigns sequential indices starting at 0 for historical', () => {
    const config: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 10,
      numFuture: 5,
      seed: 7,
    };
    const dataset = runSingleSimulation(config);
    for (let i = 0; i < dataset.historical.length; i++) {
      expect(dataset.historical[i].index).toBe(i);
    }
  });

  it('assigns sequential indices continuing from historical for future', () => {
    const config: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 10,
      numFuture: 5,
      seed: 7,
    };
    const dataset = runSingleSimulation(config);
    for (let i = 0; i < dataset.future.length; i++) {
      expect(dataset.future[i].index).toBe(10 + i);
    }
  });

  it('is deterministic: same seed produces same dataset', () => {
    const config: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 42,
    };
    const d1 = runSingleSimulation(config);
    const d2 = runSingleSimulation(config);
    expect(d1.historical).toEqual(d2.historical);
    expect(d1.future).toEqual(d2.future);
  });

  it('different seeds produce different datasets', () => {
    const config1: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 1,
    };
    const config2: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 100,
      numFuture: 50,
      seed: 2,
    };
    const d1 = runSingleSimulation(config1);
    const d2 = runSingleSimulation(config2);
    expect(d1.historical).not.toEqual(d2.historical);
  });

  it('does not share RNG state between runs', () => {
    const config: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 10,
      numFuture: 5,
      seed: 42,
    };
    // Run twice — should produce identical results (no shared state)
    const d1 = runSingleSimulation(config);
    const d2 = runSingleSimulation(config);
    expect(d1.historical).toEqual(d2.historical);
    expect(d1.future).toEqual(d2.future);
  });

  it('throws if numHistorical is negative', () => {
    expect(() =>
      runSingleSimulation({
        modeConfig: modeA,
        numHistorical: -1,
        numFuture: 10,
        seed: 1,
      }),
    ).toThrow(RangeError);
  });

  it('throws if numFuture is negative', () => {
    expect(() =>
      runSingleSimulation({
        modeConfig: modeA,
        numHistorical: 10,
        numFuture: -1,
        seed: 1,
      }),
    ).toThrow(RangeError);
  });

  it('works with zero historical draws', () => {
    const config: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 0,
      numFuture: 10,
      seed: 42,
    };
    const dataset = runSingleSimulation(config);
    expect(dataset.historical).toHaveLength(0);
    expect(dataset.future).toHaveLength(10);
    expect(dataset.future[0].index).toBe(0);
  });

  it('works with zero future draws', () => {
    const config: SingleRunConfig = {
      modeConfig: modeA,
      numHistorical: 10,
      numFuture: 0,
      seed: 42,
    };
    const dataset = runSingleSimulation(config);
    expect(dataset.historical).toHaveLength(10);
    expect(dataset.future).toHaveLength(0);
  });
});