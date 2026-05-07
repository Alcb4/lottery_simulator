/**
 * Single-run simulation engine.
 *
 * Generates a Dataset (historical + future draws) for a given ModeConfig and seed.
 * Historical and future draws are strictly disjoint — no overlap of indices.
 * All randomness flows through the seeded RNG for reproducibility.
 */

import type { ModeConfig, Draw, Dataset } from '../types/index.js';
import { createRNG } from './rng.js';
import type { RNG } from './rng.js';

/** Configuration for a single simulation run. */
export interface SingleRunConfig {
  readonly modeConfig: ModeConfig;
  readonly numHistorical: number;
  readonly numFuture: number;
  readonly seed: number;
}

/**
 * Generate a single draw using the provided RNG.
 * Returns a Draw with numbers sorted ascending.
 */
const generateDraw = (
  rng: RNG,
  modeConfig: ModeConfig,
  index: number,
): Draw => {
  const numbers = rng.sampleWithoutReplacement(
    modeConfig.numbersPerDraw,
    modeConfig.minNumber,
    modeConfig.maxNumber,
  );
  return Object.freeze({
    mode: modeConfig.id,
    numbers: Object.freeze(numbers),
    index,
  });
};

/**
 * Generate a sequence of draws using the provided RNG.
 * Each draw gets a sequential 0-based index.
 */
const generateDrawSequence = (
  rng: RNG,
  modeConfig: ModeConfig,
  count: number,
  startIndex: number,
): Draw[] => {
  const draws: Draw[] = [];
  for (let i = 0; i < count; i++) {
    draws.push(generateDraw(rng, modeConfig, startIndex + i));
  }
  return draws;
};

/**
 * Execute a single simulation run.
 *
 * Uses one RNG instance seeded with the given seed.
 * Generates historical draws first, then future draws.
 * Historical and future arrays are strictly disjoint (no overlap of indices).
 *
 * @param config - Configuration for the run
 * @returns A Dataset containing historical and future draws
 */
export const runSingleSimulation = (config: SingleRunConfig): Dataset => {
  const { modeConfig, numHistorical, numFuture, seed } = config;

  if (numHistorical < 0) {
    throw new RangeError('numHistorical must be >= 0');
  }
  if (numFuture < 0) {
    throw new RangeError('numFuture must be >= 0');
  }

  const rng = createRNG(seed);

  const historical = generateDrawSequence(rng, modeConfig, numHistorical, 0);
  const future = generateDrawSequence(rng, modeConfig, numFuture, numHistorical);

  return Object.freeze({
    mode: modeConfig.id,
    historical: Object.freeze(historical),
    future: Object.freeze(future),
  });
};