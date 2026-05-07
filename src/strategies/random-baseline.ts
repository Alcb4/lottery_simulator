/**
 * Random baseline strategy — uniformly random selection for each prediction.
 *
 * Uses a seeded RNG for reproducibility. Does not benefit from rolling updates.
 */

import type {
  ModeConfig,
  ModeId,
  Draw,
  StrategyContext,
  RollingContext,
  PredictionStrategy,
} from '../types/index.js';
import { createRNG } from '../generator/rng.js';
import { ALL_MODE_IDS } from '../generator/modes.js';

interface RandomBaselineModel {
  readonly modeConfig: ModeConfig;
  rng: ReturnType<typeof createRNG>;
}

export const randomBaselineStrategy: PredictionStrategy = {
  id: 'randomBaseline',
  label: 'Random Baseline',
  applicableModes: [...ALL_MODE_IDS],

  buildModel: (ctx: StrategyContext): RandomBaselineModel => {
    // Seed derived from historical length for deterministic but varied results
    const seed = ctx.historical.length * 31337 + 42;
    return {
      modeConfig: ctx.mode,
      rng: createRNG(seed),
    };
  },

  predictNextFixed: (model: unknown): number[] => {
    const m = model as RandomBaselineModel;
    return m.rng.sampleWithoutReplacement(
      m.modeConfig.numbersPerDraw,
      m.modeConfig.minNumber,
      m.modeConfig.maxNumber,
    );
  },

  predictNextRolling: (model: unknown, _rolling: RollingContext): number[] => {
    // Random baseline doesn't benefit from rolling updates
    const m = model as RandomBaselineModel;
    return m.rng.sampleWithoutReplacement(
      m.modeConfig.numbersPerDraw,
      m.modeConfig.minNumber,
      m.modeConfig.maxNumber,
    );
  },

  // No updateModelAfterReveal — random baseline doesn't learn
};