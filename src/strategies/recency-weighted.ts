/**
 * Recency Weighted strategy — weights numbers by how recently they appeared.
 * More recent appearances → higher weight.
 */

import type {
  ModeConfig,
  Draw,
  StrategyContext,
  RollingContext,
  PredictionStrategy,
} from '../types/index.js';
import { ALL_MODE_IDS } from '../generator/modes.js';

interface RecencyModel {
  readonly modeConfig: ModeConfig;
  recencyScore: Map<number, number>;
}

/** Compute recency scores: sum of (drawIndex + 1) for each appearance. */
const computeRecencyScores = (
  modeConfig: ModeConfig,
  draws: readonly Draw[],
): Map<number, number> => {
  const scores = new Map<number, number>();
  for (let n = modeConfig.minNumber; n <= modeConfig.maxNumber; n++) {
    scores.set(n, 0);
  }
  for (const draw of draws) {
    for (const num of draw.numbers) {
      // More recent draws have higher index → higher weight
      scores.set(num, (scores.get(num) ?? 0) + draw.index + 1);
    }
  }
  return scores;
};

/** Select top-k numbers by score (highest first, ties by number ascending). */
const selectTopKByScore = (
  scores: Map<number, number>,
  k: number,
): number[] => {
  const entries = [...scores.entries()];
  entries.sort((a, b) => {
    const diff = b[1] - a[1];
    return diff !== 0 ? diff : a[0] - b[0];
  });
  return entries.slice(0, k).map((e) => e[0]).sort((a, b) => a - b);
};

export const recencyWeightedStrategy: PredictionStrategy = {
  id: 'recencyWeighted',
  label: 'Recency Weighted',
  applicableModes: [...ALL_MODE_IDS],

  buildModel: (ctx: StrategyContext): RecencyModel => ({
    modeConfig: ctx.mode,
    recencyScore: computeRecencyScores(ctx.mode, ctx.historical),
  }),

  predictNextFixed: (model: unknown): number[] => {
    const m = model as RecencyModel;
    return selectTopKByScore(m.recencyScore, m.modeConfig.numbersPerDraw);
  },

  predictNextRolling: (model: unknown, rolling: RollingContext): number[] => {
    const m = model as RecencyModel;
    // Recompute recency scores including revealed future draws
    const combinedScores = computeRecencyScores(m.modeConfig, rolling.revealedFuture);
    // Merge with historical scores
    for (const [num, score] of m.recencyScore) {
      combinedScores.set(num, (combinedScores.get(num) ?? 0) + score);
    }
    return selectTopKByScore(combinedScores, m.modeConfig.numbersPerDraw);
  },

  updateModelAfterReveal: (model: unknown, revealedDraw: Draw): void => {
    const m = model as RecencyModel;
    for (const num of revealedDraw.numbers) {
      m.recencyScore.set(
        num,
        (m.recencyScore.get(num) ?? 0) + revealedDraw.index + 1,
      );
    }
  },
};