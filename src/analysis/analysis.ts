/**
 * Statistical analysis of historical lottery draws.
 *
 * Computes frequency tables, distribution summaries, chi-square tests,
 * streak/overlap diagnostics, and independence checks.
 */

import type {
  ModeConfig,
  Draw,
  FrequencyEntry,
  ChiSquareResult,
  AnalysisResult,
} from '../types/index.js';

// ── Frequency table ───────────────────────────────────────────────────────────

/** Per-number frequency table with expected counts and relative deviation. */
const computeFrequencyTable = (
  modeConfig: ModeConfig,
  historical: readonly Draw[],
): FrequencyEntry[] => {
  const { minNumber, maxNumber, numbersPerDraw } = modeConfig;
  const rangeSize = maxNumber - minNumber + 1;
  const totalPositions = historical.length * numbersPerDraw;
  const expectedCount = totalPositions / rangeSize;

  const counts = new Map<number, number>();
  for (let n = minNumber; n <= maxNumber; n++) {
    counts.set(n, 0);
  }

  for (const draw of historical) {
    for (const num of draw.numbers) {
      counts.set(num, (counts.get(num) ?? 0) + 1);
    }
  }

  const entries: FrequencyEntry[] = [];
  for (let n = minNumber; n <= maxNumber; n++) {
    const observed: number = counts.get(n) ?? 0;
    entries.push({
      number: n,
      observedCount: observed,
      expectedCount,
      relativeDeviation:
        expectedCount > 0 ? (observed - expectedCount) / expectedCount : 0,
    });
  }
  return entries;
};

// ── Sum distribution ─────────────────────────────────────────────────────────

/** Distribution of sums of numbers in each draw. */
const computeSumDistribution = (
  historical: readonly Draw[],
): ReadonlyMap<number, number> => {
  const dist = new Map<number, number>();
  for (const draw of historical) {
    const sum = draw.numbers.reduce((a, b) => a + b, 0);
    dist.set(sum, (dist.get(sum) ?? 0) + 1);
  }
  return dist;
};

// ── Gap distribution ─────────────────────────────────────────────────────────

/** Distribution of gaps between consecutive numbers in each draw. */
const computeGapDistribution = (
  historical: readonly Draw[],
): ReadonlyMap<number, number> => {
  const dist = new Map<number, number>();
  for (const draw of historical) {
    for (let i = 1; i < draw.numbers.length; i++) {
      const gap = draw.numbers[i] - draw.numbers[i - 1];
      dist.set(gap, (dist.get(gap) ?? 0) + 1);
    }
  }
  return dist;
};

// ── Odd/even split ────────────────────────────────────────────────────────────

/** Distribution of odd/even splits per draw (e.g. "2odd,3even"). */
const computeOddEvenDistribution = (
  historical: readonly Draw[],
): ReadonlyMap<string, number> => {
  const dist = new Map<string, number>();
  for (const draw of historical) {
    const oddCount = draw.numbers.filter((n) => n % 2 !== 0).length;
    const evenCount = draw.numbers.length - oddCount;
    const key = `${oddCount}odd,${evenCount}even`;
    dist.set(key, (dist.get(key) ?? 0) + 1);
  }
  return dist;
};

// ── Low/high split ────────────────────────────────────────────────────────────

/** Distribution of low/high splits per draw. Low = first half of range. */
const computeLowHighDistribution = (
  modeConfig: ModeConfig,
  historical: readonly Draw[],
): ReadonlyMap<string, number> => {
  const midpoint = modeConfig.maxNumber / 2;
  const dist = new Map<string, number>();
  for (const draw of historical) {
    const lowCount = draw.numbers.filter((n) => n <= midpoint).length;
    const highCount = draw.numbers.length - lowCount;
    const key = `${lowCount}low,${highCount}high`;
    dist.set(key, (dist.get(key) ?? 0) + 1);
  }
  return dist;
};

// ── Combination frequencies ──────────────────────────────────────────────────

/** Count of exact combinations that appeared more than once. */
const computeCombinationFrequencies = (
  historical: readonly Draw[],
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const draw of historical) {
    const key = draw.numbers.join('-');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Only keep combinations that appeared more than once
  const result = new Map<string, number>();
  for (const [key, count] of counts) {
    if (count > 1) {
      result.set(key, count);
    }
  }
  return result;
};

// ── Pair frequencies ──────────────────────────────────────────────────────────

/** Count of unordered pairs across draws (for modes with numbersPerDraw >= 2). */
const computePairFrequencies = (
  modeConfig: ModeConfig,
  historical: readonly Draw[],
): ReadonlyMap<string, number> => {
  if (modeConfig.numbersPerDraw < 2) return new Map();

  const counts = new Map<string, number>();
  for (const draw of historical) {
    for (let i = 0; i < draw.numbers.length; i++) {
      for (let j = i + 1; j < draw.numbers.length; j++) {
        const key = `${draw.numbers[i]}-${draw.numbers[j]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
};

// ── Consecutive number occurrence ─────────────────────────────────────────────

/** Count of draws containing adjacent-number pairs. Maps count of adjacent pairs → number of draws. */
const computeConsecutiveCount = (
  historical: readonly Draw[],
): ReadonlyMap<number, number> => {
  const dist = new Map<number, number>();
  for (const draw of historical) {
    let adjCount = 0;
    for (let i = 1; i < draw.numbers.length; i++) {
      if (draw.numbers[i] === draw.numbers[i - 1] + 1) {
        adjCount++;
      }
    }
    dist.set(adjCount, (dist.get(adjCount) ?? 0) + 1);
  }
  return dist;
};

// ── Overlap with previous draw ────────────────────────────────────────────────

/** Distribution of overlap counts between consecutive draws. */
const computeOverlapDistribution = (
  historical: readonly Draw[],
): ReadonlyMap<number, number> => {
  const dist = new Map<number, number>();
  for (let i = 1; i < historical.length; i++) {
    const prev = new Set(historical[i - 1].numbers);
    const overlap = historical[i].numbers.filter((n) => prev.has(n)).length;
    dist.set(overlap, (dist.get(overlap) ?? 0) + 1);
  }
  return dist;
};

// ── Repeated full combinations ────────────────────────────────────────────────

/** Combinations that appeared more than once. Maps combination key → count. */
const computeRepeatedCombinations = (
  historical: readonly Draw[],
): ReadonlyMap<string, number> => {
  // Same as combinationFrequencies — kept as separate field per spec
  return computeCombinationFrequencies(historical);
};

// ── Chi-square goodness-of-fit ────────────────────────────────────────────────

/** Chi-square test for uniform distribution of per-number frequencies. */
const computeChiSquare = (
  modeConfig: ModeConfig,
  historical: readonly Draw[],
): ChiSquareResult => {
  const { minNumber, maxNumber } = modeConfig;
  const rangeSize = maxNumber - minNumber + 1;
  const totalPositions = historical.length * modeConfig.numbersPerDraw;
  const expected = totalPositions / rangeSize;

  // Count observed frequencies
  const observed = new Map<number, number>();
  for (let n = minNumber; n <= maxNumber; n++) {
    observed.set(n, 0);
  }
  for (const draw of historical) {
    for (const num of draw.numbers) {
      observed.set(num, (observed.get(num) ?? 0) + 1);
    }
  }

  // Chi-square statistic
  let chiSquareValue = 0;
  for (let n = minNumber; n <= maxNumber; n++) {
    const obs = observed.get(n) ?? 0;
    chiSquareValue += Math.pow(obs - expected, 2) / expected;
  }

  const degreesOfFreedom = rangeSize - 1;
  const pValue = chiSquarePValue(chiSquareValue, degreesOfFreedom);

  return { chiSquareValue, degreesOfFreedom, pValue };
};

// ── Chi-square p-value approximation ──────────────────────────────────────────

/**
 * Compute the survival function (upper tail) of the chi-square distribution
 * using the regularized incomplete gamma function.
 *
 * P(X > x | df) = regularizedGamma(df/2, x/2, lower=false)
 */
const chiSquarePValue = (x: number, df: number): number => {
  if (x <= 0) return 1;
  if (df <= 0) return 0;
  return regularizedGammaUpper(df / 2, x / 2);
};

/**
 * Upper regularized incomplete gamma function Q(a, x) = 1 - P(a, x).
 * Uses series expansion for P(a, x) and subtracts from 1.
 */
const regularizedGammaUpper = (a: number, x: number): number => {
  if (x < a + 1) {
    // Use series expansion for P(a, x), then Q = 1 - P
    return 1 - regularizedGammaLower(a, x);
  }
  // Use continued fraction for Q directly
  return regularizedGammaUpperCF(a, x);
};

/**
 * Lower regularized incomplete gamma function P(a, x) via series expansion.
 */
const regularizedGammaLower = (a: number, x: number): number => {
  const MAX_ITER = 200;
  const EPS = 1e-12;

  if (x === 0) return 0;

  let term = 1 / a;
  let sum = term;
  for (let n = 1; n < MAX_ITER; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * EPS) break;
  }

  const logGammaA = logGamma(a);
  const logFactor = a * Math.log(x) - x - logGammaA;
  return Math.exp(logFactor) * sum;
};

/**
 * Upper regularized incomplete gamma function via continued fraction (Lentz's method).
 */
const regularizedGammaUpperCF = (a: number, x: number): number => {
  const MAX_ITER = 200;
  const EPS = 1e-12;

  const logGammaA = logGamma(a);
  const logFactor = a * Math.log(x) - x - logGammaA;

  // Modified Lentz's method for continued fraction
  const f = x + 1 - a;
  let C = f === 0 ? 1e-30 : 1 / f;
  let D = 0;
  let result = C;

  for (let i = 1; i <= MAX_ITER; i++) {
    const an = i * (a - i);
    const bn = x + 2 * i + 1 - a;
    D = bn + an * D;
    if (Math.abs(D) < 1e-30) D = 1e-30;
    C = bn + an / C;
    if (Math.abs(C) < 1e-30) C = 1e-30;
    D = 1 / D;
    const delta = C * D;
    result *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }

  return Math.exp(logFactor) * result;
};

/**
 * Log of the gamma function using Lanczos approximation.
 */
const logGamma = (x: number): number => {
  const COF = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  const STIR = 2.5066282746310005;
  let ser = 1.000000000190015;
  let tmp = x + 5.5;
  tmp = (x + 0.5) * Math.log(tmp) - tmp;
  for (let j = 0; j < 6; j++) {
    ser += COF[j] / (x + j + 1);
  }
  return tmp + Math.log(STIR * ser / x);
};

// ── Independence diagnostics ──────────────────────────────────────────────────

interface IndependenceDiagnostics {
  readonly firstHalfSecondHalfCorrelation: number;
  readonly consecutiveDrawDependence: number;
}

/**
 * Compute simple independence diagnostics:
 * 1. Correlation between per-number counts in first half vs second half of historical block.
 * 2. Basic check for dependence between consecutive draws.
 */
const computeIndependenceDiagnostics = (
  modeConfig: ModeConfig,
  historical: readonly Draw[],
): IndependenceDiagnostics => {
  const { minNumber, maxNumber } = modeConfig;
  const rangeSize = maxNumber - minNumber + 1;
  const midpoint = Math.floor(historical.length / 2);

  // Per-number counts for first and second halves
  const firstHalf = new Map<number, number>();
  const secondHalf = new Map<number, number>();
  for (let n = minNumber; n <= maxNumber; n++) {
    firstHalf.set(n, 0);
    secondHalf.set(n, 0);
  }

  for (let i = 0; i < historical.length; i++) {
    const target = i < midpoint ? firstHalf : secondHalf;
    for (const num of historical[i].numbers) {
      target.set(num, (target.get(num) ?? 0) + 1);
    }
  }

  // Pearson correlation between first and second half counts
  const firstValues: number[] = [];
  const secondValues: number[] = [];
  for (let n = minNumber; n <= maxNumber; n++) {
    firstValues.push(firstHalf.get(n) ?? 0);
    secondValues.push(secondHalf.get(n) ?? 0);
  }

  const firstHalfSecondHalfCorrelation = pearsonCorrelation(
    firstValues,
    secondValues,
  );

  // Consecutive draw dependence: compare distribution of numbers following
  // a given number vs baseline distribution
  // Simple metric: average overlap between consecutive draws vs expected overlap
  let totalOverlap = 0;
  for (let i = 1; i < historical.length; i++) {
    const prev = new Set(historical[i - 1].numbers);
    const overlap = historical[i].numbers.filter((n) => prev.has(n)).length;
    totalOverlap += overlap;
  }
  const avgOverlap =
    historical.length > 1 ? totalOverlap / (historical.length - 1) : 0;
  const expectedOverlap =
    modeConfig.numbersPerDraw * (modeConfig.numbersPerDraw / rangeSize);
  // Ratio > 1 suggests positive dependence, < 1 suggests negative
  const consecutiveDrawDependence =
    expectedOverlap > 0 ? avgOverlap / expectedOverlap : 0;

  return { firstHalfSecondHalfCorrelation, consecutiveDrawDependence };
};

/** Pearson correlation coefficient between two arrays. */
const pearsonCorrelation = (x: number[], y: number[]): number => {
  const n = x.length;
  if (n === 0) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
};

// ── Mode A: runs/streaks ─────────────────────────────────────────────────────

/** For Mode A, compute streak lengths for each number. */
const computeStreaks = (
  modeConfig: ModeConfig,
  historical: readonly Draw[],
): ReadonlyMap<string, number> => {
  if (modeConfig.numbersPerDraw !== 1) return new Map();

  const streakDist = new Map<string, number>();

  for (let n = modeConfig.minNumber; n <= modeConfig.maxNumber; n++) {
    let currentStreak = 0;
    for (const draw of historical) {
      if (draw.numbers[0] === n) {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          const key = `num${n}_len${currentStreak}`;
          streakDist.set(key, (streakDist.get(key) ?? 0) + 1);
          currentStreak = 0;
        }
      }
    }
    // Final streak
    if (currentStreak > 0) {
      const key = `num${n}_len${currentStreak}`;
      streakDist.set(key, (streakDist.get(key) ?? 0) + 1);
    }
  }

  return streakDist;
};

// ── Main analysis function ───────────────────────────────────────────────────

/**
 * Perform complete statistical analysis on historical draws.
 *
 * @param modeConfig - The lottery mode configuration
 * @param historical - Array of historical draws
 * @returns AnalysisResult with all computed statistics
 */
export const analyzeHistorical = (
  modeConfig: ModeConfig,
  historical: readonly Draw[],
): AnalysisResult => {
  const frequencyTable = computeFrequencyTable(modeConfig, historical);
  const sumDistribution = computeSumDistribution(historical);
  const gapDistribution = computeGapDistribution(historical);
  const oddEvenDistribution = computeOddEvenDistribution(historical);
  const lowHighDistribution = computeLowHighDistribution(modeConfig, historical);
  const combinationFrequencies = computeCombinationFrequencies(historical);
  const pairFrequencies = computePairFrequencies(modeConfig, historical);
  const consecutiveCount = computeConsecutiveCount(historical);
  const overlapDistribution = computeOverlapDistribution(historical);
  const repeatedCombinations = computeRepeatedCombinations(historical);
  const chiSquare = computeChiSquare(modeConfig, historical);
  const independenceDiagnostics = computeIndependenceDiagnostics(
    modeConfig,
    historical,
  );

  return {
    frequencyTable,
    sumDistribution,
    gapDistribution,
    oddEvenDistribution,
    lowHighDistribution,
    combinationFrequencies,
    pairFrequencies,
    consecutiveCount,
    overlapDistribution,
    repeatedCombinations,
    chiSquare,
    independenceDiagnostics,
  };
};