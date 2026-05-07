/**
 * Least Frequent strategy — selects the lowest-frequency numbers from history.
 */

import type {
  ModeConfig,
  Draw,
  StrategyContext,
  RollingContext,
  PredictionStrategy,
} from '../types/index.js';
import { ALL_MODE_IDS } from '../generator/modes.js';
import { buildFrequencyMap, selectTopK } from './shared-frequency.js';

interface FrequencyModel {
  readonly modeConfig: ModeConfig;
  frequency: Map<number, number>;
}

export const leastFrequentStrategy: PredictionStrategy = {
  id: 'leastFrequent',
  label: 'Least Frequent',
  applicableModes: [...ALL_MODE_IDS],

  buildModel: (ctx: StrategyContext): FrequencyModel => ({
    modeConfig: ctx.mode,
    frequency: buildFrequencyMap(ctx.mode, ctx.historical),
  }),

  predictNextFixed: (model: unknown): number[] => {
    const m = model as FrequencyModel;
    // ascending=true selects lowest frequency first
    return selectTopK(m.frequency, m.modeConfig.numbersPerDraw, true);
  },

  predictNextRolling: (model: unknown, rolling: RollingContext): number[] => {
    const m = model as FrequencyModel;
    const combinedFreq = buildFrequencyMap(m.modeConfig, rolling.revealedFuture);
    for (const [num, count] of m.frequency) {
      combinedFreq.set(num, (combinedFreq.get(num) ?? 0) + count);
    }
    return selectTopK(combinedFreq, m.modeConfig.numbersPerDraw, true);
  },

  updateModelAfterReveal: (model: unknown, revealedDraw: Draw): void => {
    const m = model as FrequencyModel;
    for (const num of revealedDraw.numbers) {
      m.frequency.set(num, (m.frequency.get(num) ?? 0) + 1);
    }
  },
};