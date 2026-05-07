/**
 * Barrel export for all prediction strategies.
 */

export { randomBaselineStrategy } from './random-baseline.js';
export { mostFrequentStrategy } from './most-frequent.js';
export { leastFrequentStrategy } from './least-frequent.js';
export { recencyWeightedStrategy } from './recency-weighted.js';
export { overdueStrategy } from './overdue.js';
export { hybridWeightedStrategy } from './hybrid-weighted.js';

import type { PredictionStrategy } from '../types/index.js';
import { randomBaselineStrategy } from './random-baseline.js';
import { mostFrequentStrategy } from './most-frequent.js';
import { leastFrequentStrategy } from './least-frequent.js';
import { recencyWeightedStrategy } from './recency-weighted.js';
import { overdueStrategy } from './overdue.js';
import { hybridWeightedStrategy } from './hybrid-weighted.js';

/** All available prediction strategies. */
export const ALL_STRATEGIES: readonly PredictionStrategy[] = [
  randomBaselineStrategy,
  mostFrequentStrategy,
  leastFrequentStrategy,
  recencyWeightedStrategy,
  overdueStrategy,
  hybridWeightedStrategy,
];