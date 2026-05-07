/**
 * Most Frequent strategy — selects the highest-frequency numbers from history.
 */

import type {
  ModeConfig,
  ModeId,
  Draw,
  StrategyContext,
  RollingContext,
  PredictionStrategy,
} from '../types/index.js';
import { ALL_MODE_IDS } from '../generator/modes.js';

interface FrequencyModel {
  readonly modeConfig: ModeConfig;
  frequency: Map<number, number>;
}

/** Build a frequency map from draws. */
const buildFrequencyMap = (
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

/** Select top-k numbers by frequency (ties broken by number ascending). */
const selectTopK = (
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

export const mostFrequentStrategy: PredictionStrategy = {
  id: 'mostFrequent',
  label: 'Most Frequent',
  applicableModes: [...ALL_MODE_IDS],

  buildModel: (ctx: StrategyContext): FrequencyModel => ({
    modeConfig: ctx.mode,
    frequency: buildFrequencyMap(ctx.mode, ctx.historical),
  }),

  predictNextFixed: (model: unknown): number[] => {
    const m = model as FrequencyModel;
    return selectTopK(m.frequency, m.modeConfig.numbersPerDraw, false);
  },

  predictNextRolling: (model: unknown, rolling: RollingContext): number[] => {
    const m = model as FrequencyModel;
    // Recompute frequencies including revealed future draws
    const combinedFreq = buildFrequencyMap(m.modeConfig, rolling.revealedFuture);
    // Merge with historical frequencies
    for (const [num, count] of m.frequency) {
      combinedFreq.set(num, (combinedFreq.get(num) ?? 0) + count);
    }
    return selectTopK(combinedFreq, m.modeConfig.numbersPerDraw, false);
  },

  updateModelAfterReveal: (model: unknown, revealedDraw: Draw): void => {
    const m = model as FrequencyModel;
    for (const num of revealedDraw.numbers) {
      m.frequency.set(num, (m.frequency.get(num) ?? 0) + 1);
    }
  },
};