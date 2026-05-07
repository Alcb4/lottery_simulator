/**
 * Shared frequency helpers used by most-frequent and least-frequent strategies.
 */

import type { ModeConfig, Draw } from '../types/index.js';

/** Build a frequency map from draws, initialising all numbers to 0. */
export const buildFrequencyMap = (
  modeConfig: ModeConfig,
  draws: readonly Draw[],
): Map<number, number> => {
  const freq = new Map<number, number>();
  for (let n = modeConfig.minNumber; n <= modeConfig.maxNumber; n++) {
    freq.set(n, 0);
  }
  for (const draw of draws) {
    for (const num of draw.numbers) {
      freq.set(num, (freq.get(num) ?? 0) + 1);
    }
  }
  return freq;
};

/**
 * Select top-k numbers by frequency.
 * ascending=false → highest frequency first (most frequent)
 * ascending=true  → lowest frequency first (least frequent)
 * Ties broken by number value ascending.
 */
export const selectTopK = (
  freq: Map<number, number>,
  k: number,
  ascending: boolean,
): number[] => {
  const entries = [...freq.entries()];
  entries.sort((a, b) => {
    const freqDiff = ascending ? a[1] - b[1] : b[1] - a[1];
    return freqDiff !== 0 ? freqDiff : a[0] - b[0];
  });
  return entries.slice(0, k).map((e) => e[0]).sort((a, b) => a - b);
};