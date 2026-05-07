/**
 * Overdue strategy — selects numbers that have not appeared for the longest time.
 * Higher overdue score = more overdue.
 */

import type {
  ModeConfig,
  Draw,
  StrategyContext,
  RollingContext,
  PredictionStrategy,
} from '../types/index.js';
import { ALL_MODE_IDS } from '../generator/modes.js';

interface OverdueModel {
  readonly modeConfig: ModeConfig;
  lastSeenIndex: Map<number, number>;
  totalDraws: number;
}

/** Compute last-seen index for each number. Numbers never seen get -1. */
const computeLastSeen = (
  modeConfig: ModeConfig,
  draws: readonly Draw[],
): Map<number, number> => {
  const lastSeen = new Map<number, number>();
  for (let n = modeConfig.minNumber; n <= modeConfig.maxNumber; n++) {
    lastSeen.set(n, -1);
  }
  for (const draw of draws) {
    for (const num of draw.numbers) {
      lastSeen.set(num, draw.index);
    }
  }
  return lastSeen;
};

/** Select top-k most overdue numbers (highest overdue score first). */
const selectTopKOverdue = (
  lastSeen: Map<number, number>,
  totalDraws: number,
  k: number,
): number[] => {
  const entries = [...lastSeen.entries()];
  // Overdue score = totalDraws - lastSeen - 1 (higher = more overdue)
  // Never seen (lastSeen = -1) gets highest score
  entries.sort((a, b) => {
    const scoreA = a[1] === -1 ? Infinity : totalDraws - a[1] - 1;
    const scoreB = b[1] === -1 ? Infinity : totalDraws - b[1] - 1;
    const diff = scoreB - scoreA;
    return diff !== 0 ? diff : a[0] - b[0];
  });
  return entries.slice(0, k).map((e) => e[0]).sort((a, b) => a - b);
};

export const overdueStrategy: PredictionStrategy = {
  id: 'overdue',
  label: 'Overdue',
  applicableModes: [...ALL_MODE_IDS],

  buildModel: (ctx: StrategyContext): OverdueModel => ({
    modeConfig: ctx.mode,
    lastSeenIndex: computeLastSeen(ctx.mode, ctx.historical),
    totalDraws: ctx.historical.length,
  }),

  predictNextFixed: (model: unknown): number[] => {
    const m = model as OverdueModel;
    return selectTopKOverdue(
      m.lastSeenIndex,
      m.totalDraws,
      m.modeConfig.numbersPerDraw,
    );
  },

  predictNextRolling: (model: unknown, rolling: RollingContext): number[] => {
    const m = model as OverdueModel;
    // Recompute last-seen including revealed future draws
    const combinedLastSeen = computeLastSeen(m.modeConfig, rolling.revealedFuture);
    // Merge: take the maximum last-seen index for each number
    for (const [num, idx] of m.lastSeenIndex) {
      const existing = combinedLastSeen.get(num) ?? -1;
      if (idx > existing) {
        combinedLastSeen.set(num, idx);
      }
    }
    const totalDraws = m.totalDraws + rolling.revealedFuture.length;
    return selectTopKOverdue(combinedLastSeen, totalDraws, m.modeConfig.numbersPerDraw);
  },

  updateModelAfterReveal: (model: unknown, revealedDraw: Draw): void => {
    const m = model as OverdueModel;
    for (const num of revealedDraw.numbers) {
      m.lastSeenIndex.set(num, revealedDraw.index);
    }
    m.totalDraws++;
  },
};