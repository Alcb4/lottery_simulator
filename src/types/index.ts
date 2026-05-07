// ---------------------------------------------------------------------------
// Lottery Simulation — Shared Domain Types
// ---------------------------------------------------------------------------
// All draws are independent, uniform, and without replacement within a draw.
// Arrays marked `readonly` enforce immutability at the type level.
// ---------------------------------------------------------------------------

// ── Mode ────────────────────────────────────────────────────────────────────

/** Identifier for each supported lottery mode. */
export type ModeId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Static configuration that defines the rules of a lottery mode. */
export interface ModeConfig {
  readonly id: ModeId;
  readonly name: string;
  readonly minNumber: number;
  readonly maxNumber: number;
  readonly numbersPerDraw: number;
}

// ── Draw & Dataset ─────────────────────────────────────────────────────────

/**
 * A single lottery draw.
 *
 * `numbers` must be sorted in ascending order with no duplicates.
 * This constraint is enforced at the generator level — the type system
 * cannot encode "sorted unique number[]" natively, so consumers must
 * trust the producer or validate at runtime.
 */
export interface Draw {
  readonly mode: ModeId;
  readonly numbers: readonly number[];
  readonly index: number;
}

/** A dataset splits draws into historical (known) and future (to predict). */
export interface Dataset {
  readonly mode: ModeId;
  readonly historical: readonly Draw[];
  readonly future: readonly Draw[];
}

// ── Strategy ────────────────────────────────────────────────────────────────

/** Context provided to a strategy so it can build its model. */
export interface StrategyContext {
  readonly mode: ModeConfig;
  readonly historical: readonly Draw[];
}

/** Incremental context available during rolling evaluation. */
export interface RollingContext {
  readonly revealedFuture: readonly Draw[];
}

/**
 * Interface every prediction strategy must implement.
 *
 * - `buildModel` trains on historical data and returns an opaque model.
 * - `predictNextFixed` produces a single fixed prediction from the model.
 * - `predictNextRolling` (optional) produces a prediction that may adapt
 *   to draws revealed so far during rolling evaluation.
 * - `updateModelAfterReveal` (optional) mutates the model in-place after
 *   a draw is revealed during rolling evaluation.
 */
export interface PredictionStrategy {
  readonly id: string;
  readonly label: string;
  readonly applicableModes: readonly ModeId[];
  buildModel: (ctx: StrategyContext) => unknown;
  predictNextFixed: (model: unknown) => number[];
  predictNextRolling?: (model: unknown, rolling: RollingContext) => number[];
  updateModelAfterReveal?: (model: unknown, revealedDraw: Draw) => void;
}

// ── Evaluation Metrics ──────────────────────────────────────────────────────

/** Hit-based metrics used for Mode A (binary hit / miss per number). */
export interface HitMetrics {
  readonly hitCount: number;
  readonly hitRate: number;
  readonly runningHitRate: readonly number[];
}

/** Match-count distribution used for Modes B–F (overlap per draw). */
export interface MatchDistribution {
  readonly counts: ReadonlyMap<number, number>;
  readonly averageOverlap: number;
}

/** Result for a single strategy on a single run. */
export interface StrategyResult {
  readonly strategyId: string;
  readonly label: string;
  readonly evaluationStyle: 'fixed' | 'rolling';
  readonly hitMetrics?: HitMetrics;
  readonly matchDistribution?: MatchDistribution;
}

/** Complete result of a single simulation run. */
export interface SingleRunResult {
  readonly dataset: Dataset;
  readonly analysis: unknown;
  readonly strategyResults: readonly StrategyResult[];
  readonly baselines: readonly StrategyResult[];
}

// ── Monte Carlo ─────────────────────────────────────────────────────────────

/** Configuration for a Monte Carlo experiment. */
export interface MonteCarloConfig {
  readonly mode: ModeId;
  readonly numHistorical: number;
  readonly numFuture: number;
  readonly numRuns: number;
  readonly baseSeed: number;
  readonly strategies: readonly PredictionStrategy[];
  readonly evaluateFixed: boolean;
  readonly evaluateRolling: boolean;
}

/** Aggregated summary for one strategy across many Monte Carlo runs. */
export interface MonteCarloStrategySummary {
  readonly strategyId: string;
  readonly label: string;
  readonly evaluationStyle: 'fixed' | 'rolling';
  readonly meanHitRate?: number;
  readonly hitRateStdDev?: number;
  readonly hitRateCI95?: readonly [number, number];
  readonly meanAverageOverlap?: number;
  readonly overlapStdDev?: number;
  readonly overlapCI95?: readonly [number, number];
  readonly meanHitRateDeltaVsBaseline?: number;
  readonly deltaStdDev?: number;
  readonly deltaCI95?: readonly [number, number];
  readonly fractionRunsBeatingBaseline?: number;
}

/** Top-level result of a Monte Carlo experiment. */
export interface MonteCarloResult {
  readonly config: MonteCarloConfig;
  readonly strategySummaries: readonly MonteCarloStrategySummary[];
}

// ── Analysis ────────────────────────────────────────────────────────────────

/** Entry in a frequency table for a single number. */
export interface FrequencyEntry {
  readonly number: number;
  readonly observedCount: number;
  readonly expectedCount: number;
  readonly relativeDeviation: number;
}

/** Chi-square goodness-of-fit test result. */
export interface ChiSquareResult {
  readonly chiSquareValue: number;
  readonly degreesOfFreedom: number;
  readonly pValue: number;
}

/** Complete statistical analysis of a draw sequence. */
export interface AnalysisResult {
  readonly frequencyTable: readonly FrequencyEntry[];
  readonly sumDistribution: ReadonlyMap<number, number>;
  readonly gapDistribution: ReadonlyMap<number, number>;
  readonly oddEvenDistribution: ReadonlyMap<string, number>;
  readonly lowHighDistribution: ReadonlyMap<string, number>;
  readonly combinationFrequencies: ReadonlyMap<string, number>;
  readonly pairFrequencies: ReadonlyMap<string, number>;
  readonly consecutiveCount: ReadonlyMap<number, number>;
  readonly overlapDistribution: ReadonlyMap<number, number>;
  readonly repeatedCombinations: ReadonlyMap<string, number>;
  readonly chiSquare: ChiSquareResult;
  readonly independenceDiagnostics: unknown;
}