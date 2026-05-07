/**
 * Hybrid Weighted strategy — combines frequency and overdue scores.
 * hybridScore = 0.5 * normalizedFrequency + 0.5 * normalizedOverdue
 */

import type {
  ModeConfig,
  Draw,
  StrategyContext,
  RollingContext,
  PredictionStrategy,
} from '../types/index.js';
import { ALL_MODE_IDS } from '../generator/modes.js';
import { buildFrequencyMap } from './shared-frequency.js';

interface HybridModel {
  readonly modeConfig: ModeConfig;
  frequency: Map<number, number>;
  lastSeenIndex: Map<number, number>;
  totalDraws: number;
}

/** Compute last-seen index for each number. */
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

/** Min-max normalize a map of scores to [0, 1]. */
const normalizeScores = (scores: Map<number, number>): Map<number, number> => {
  const values = [...scores.values()];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const normalized = new Map<number, number>();
  for (const [key, val] of scores) {
    normalized.set(key, range === 0 ? 0.5 : (val - min) / range);
  }
  return normalized;
};

/** Compute hybrid scores and select top-k. */
const selectTopKHybrid = (
  frequency: Map<number, number>,
  lastSeen: Map<number, number>,
  totalDraws: number,
  k: number,
): number[] => {
  // Compute overdue scores
  const overdueScores = new Map<number, number>();
  for (const [num, idx] of lastSeen) {
    overdueScores.set(num, idx === -1 ? Infinity : totalDraws - idx - 1);
  }

  // Handle Infinity in overdue: replace with a large finite value for normalization
  const maxFiniteOverdue = Math.max(
    ...[...overdueScores.values()].filter((v) => v !== Infinity),
  );
  const overdueScoresFinite = new Map<number, number>();
  for (const [num, score] of overdueScores) {
    overdueScoresFinite.set(num, score === Infinity ? maxFiniteOverdue + 1 : score);
  }

  // Normalize both to [0, 1]
  const normFreq = normalizeScores(frequency);
  const normOverdue = normalizeScores(overdueScoresFinite);

  // Combine: hybridScore = 0.5 * normFreq + 0.5 * normOverdue
  const hybridScores = new Map<number, number>();
  for (const num of frequency.keys()) {
    hybridScores.set(
      num,
      0.5 * (normFreq.get(num) ?? 0) + 0.5 * (normOverdue.get(num) ?? 0),
    );
  }

  // Select top-k by hybrid score
  const entries = [...hybridScores.entries()];
  entries.sort((a, b) => {
    const diff = b[1] - a[1];
    return diff !== 0 ? diff : a[0] - b[0];
  });
  return entries.slice(0, k).map((e) => e[0]).sort((a, b) => a - b);
};

export const hybridWeightedStrategy: PredictionStrategy = {
  id: 'hybridWeighted',
  label: 'Hybrid Weighted',
  applicableModes: [...ALL_MODE_IDS],

  buildModel: (ctx: StrategyContext): HybridModel => ({
    modeConfig: ctx.mode,
    frequency: buildFrequencyMap(ctx.mode, ctx.historical),
    lastSeenIndex: computeLastSeen(ctx.mode, ctx.historical),
    totalDraws: ctx.historical.length,
  }),

  predictNextFixed: (model: unknown): number[] => {
    const m = model as HybridModel;
    return selectTopKHybrid(
      m.frequency,
      m.lastSeenIndex,
      m.totalDraws,
      m.modeConfig.numbersPerDraw,
    );
  },

  predictNextRolling: (model: unknown, rolling: RollingContext): number[] => {
    const m = model as HybridModel;
    // Recompute frequency and last-seen including revealed future draws
    const combinedFreq = buildFrequencyMap(m.modeConfig, rolling.revealedFuture);
    for (const [num, count] of m.frequency) {
      combinedFreq.set(num, (combinedFreq.get(num) ?? 0) + count);
    }

    const combinedLastSeen = computeLastSeen(m.modeConfig, rolling.revealedFuture);
    for (const [num, idx] of m.lastSeenIndex) {
      const existing = combinedLastSeen.get(num) ?? -1;
      if (idx > existing) {
        combinedLastSeen.set(num, idx);
      }
    }

    const totalDraws = m.totalDraws + rolling.revealedFuture.length;
    return selectTopKHybrid(
      combinedFreq,
      combinedLastSeen,
      totalDraws,
      m.modeConfig.numbersPerDraw,
    );
  },

  updateModelAfterReveal: (model: unknown, revealedDraw: Draw): void => {
    const m = model as HybridModel;
    for (const num of revealedDraw.numbers) {
      m.frequency.set(num, (m.frequency.get(num) ?? 0) + 1);
      m.lastSeenIndex.set(num, revealedDraw.index);
    }
    m.totalDraws++;
  },
};