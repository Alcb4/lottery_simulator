/**
 * Mode configurations for the lottery simulation.
 *
 * Each mode defines the range and count of numbers drawn.
 * The module also provides combinatorial helpers for theoretical probability.
 */

import type { ModeId, ModeConfig } from '../types/index.js';

// ── Mode Definitions ────────────────────────────────────────────────────────

const MODE_A: ModeConfig = {
  id: 'A',
  name: 'Pick 1 from 10',
  minNumber: 1,
  maxNumber: 10,
  numbersPerDraw: 1,
} as const;

const MODE_B: ModeConfig = {
  id: 'B',
  name: 'Pick 2 from 20',
  minNumber: 1,
  maxNumber: 20,
  numbersPerDraw: 2,
} as const;

const MODE_C: ModeConfig = {
  id: 'C',
  name: 'Pick 3 from 30',
  minNumber: 1,
  maxNumber: 30,
  numbersPerDraw: 3,
} as const;

const MODE_D: ModeConfig = {
  id: 'D',
  name: 'Pick 4 from 40',
  minNumber: 1,
  maxNumber: 40,
  numbersPerDraw: 4,
} as const;

const MODE_E: ModeConfig = {
  id: 'E',
  name: 'Pick 5 from 50',
  minNumber: 1,
  maxNumber: 50,
  numbersPerDraw: 5,
} as const;

const MODE_F: ModeConfig = {
  id: 'F',
  name: 'Pick 6 from 60',
  minNumber: 1,
  maxNumber: 60,
  numbersPerDraw: 6,
} as const;

/** All mode configurations keyed by ModeId. */
export const MODE_CONFIGS: Readonly<Record<ModeId, ModeConfig>> = {
  A: MODE_A,
  B: MODE_B,
  C: MODE_C,
  D: MODE_D,
  E: MODE_E,
  F: MODE_F,
};

/** Ordered list of all mode identifiers. */
export const ALL_MODE_IDS: readonly ModeId[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Retrieve the configuration for a specific mode. */
export const getModeConfig = (id: ModeId): ModeConfig => MODE_CONFIGS[id];

// ── Combinatorial Helpers ────────────────────────────────────────────────────

/**
 * Compute the binomial coefficient C(n, k) = n! / (k! * (n-k)!)
 * using the multiplicative formula to avoid large intermediate factorials.
 */
export const binomialCoefficient = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  // Use the smaller of k and n-k for efficiency
  const kk = k > n - k ? n - k : k;
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
};

/** Total number of possible combinations for a given mode. */
export const totalCombinations = (mode: ModeConfig): number =>
  binomialCoefficient(mode.maxNumber, mode.numbersPerDraw);

/** Probability of any single specific combination being drawn (1 / totalCombinations). */
export const singleDrawProbability = (mode: ModeConfig): number =>
  1 / totalCombinations(mode);