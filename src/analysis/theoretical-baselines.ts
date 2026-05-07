/**
 * Theoretical baseline probability calculations.
 *
 * Centralised helper so evaluation and UI can call one place for the maths
 * instead of re-implementing combinatorial formulas.
 */

import type { ModeConfig } from '../types/index.js';
import { totalCombinations } from '../generator/modes.js';

// ── Binomial coefficient ─────────────────────────────────────────────────────

/** C(n, k) — binomial coefficient using the multiplicative formula. */
export const combinatorial = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  const kk = k > n - k ? n - k : k;
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
};

// ── Single-draw probability ──────────────────────────────────────────────────

/** Probability of hitting a specific single combination in one draw: 1 / C(n, k). */
export const singleDrawWinProbability = (mode: ModeConfig): number =>
  1 / totalCombinations(mode);

// ── At-least-one probability ──────────────────────────────────────────────────

/** Probability of at least one hit over n independent lines: 1 - (1 - p)^n. */
export const atLeastOneHitProbability = (
  mode: ModeConfig,
  numLines: number,
): number => {
  const p = singleDrawWinProbability(mode);
  return 1 - Math.pow(1 - p, numLines);
};

// ── Expected hit count ────────────────────────────────────────────────────────

/** Expected count of exact-combination hits over n draws: n * p. */
export const expectedHitCount = (mode: ModeConfig, numDraws: number): number =>
  numDraws * singleDrawWinProbability(mode);

// ── Expected average overlap (multi-number modes) ────────────────────────────

/**
 * Expected average overlap when randomly selecting k numbers from [1..n]
 * and comparing against another independent random selection of k numbers.
 *
 * For each of the k predicted numbers, the probability it matches one of the
 * k drawn numbers is k / n. By linearity of expectation:
 *   E[overlap] = k * (k / n)
 */
export const expectedAverageOverlap = (mode: ModeConfig): number =>
  mode.numbersPerDraw * (mode.numbersPerDraw / mode.maxNumber);

// ── Hypergeometric match probability ─────────────────────────────────────────

/**
 * Probability of exactly k matches when comparing two independent random
 * selections of `pick` numbers from [1..n].
 *
 * P(k) = C(pick, k) * C(n - pick, pick - k) / C(n, pick)
 */
export const hypergeometricMatchProbability = (
  mode: ModeConfig,
  k: number,
): number => {
  const { maxNumber: n, numbersPerDraw: pick } = mode;
  if (k < 0 || k > pick) return 0;

  const numerator =
    combinatorial(pick, k) * combinatorial(n - pick, pick - k);
  const denominator = combinatorial(n, pick);
  return numerator / denominator;
};