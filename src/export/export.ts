/**
 * CSV and JSON exporters for single-run and Monte Carlo results.
 *
 * Pure functions — accept result objects, return serialised strings.
 * Independent of UI.
 */

import type {
  SingleRunResult,
  MonteCarloResult,
  MonteCarloStrategySummary,
  StrategyResult,
  HitMetrics,
  MatchDistribution,
  FrequencyEntry,
  AnalysisResult,
} from '../types/index.js';

// ── JSON Export ───────────────────────────────────────────────────────────────

/** Export a SingleRunResult as formatted JSON. */
export const exportSingleRunJSON = (result: SingleRunResult): string => {
  // Convert ReadonlyMaps to plain objects for JSON serialization
  const serializable = deepCloneWithMapConversion(result);
  return JSON.stringify(serializable, null, 2);
};

/** Export a MonteCarloResult as formatted JSON. */
export const exportMonteCarloJSON = (result: MonteCarloResult): string => {
  const serializable = deepCloneWithMapConversion(result);
  return JSON.stringify(serializable, null, 2);
};

// ── CSV Export: Single Run ─────────────────────────────────────────────────────

/** Export per-draw predictions and outcomes for a single run as CSV. */
export const exportSingleRunCSV = (result: SingleRunResult): string => {
  const lines: string[] = [];
  const isModeA = result.dataset.historical.length > 0
    ? result.dataset.historical[0].numbers.length === 1
    : result.dataset.future.length > 0
      ? result.dataset.future[0].numbers.length === 1
      : true;

  // Header
  lines.push('draw_index,actual_numbers,strategy_id,evaluation_style,predicted_numbers,hit,overlap');

  // Build a map of strategy results keyed by strategyId + style
  for (const sr of result.strategyResults) {
    lines.push(`# Strategy: ${sr.strategyId} (${sr.evaluationStyle})`);
  }

  // For each future draw, output actual numbers
  for (let i = 0; i < result.dataset.future.length; i++) {
    const actual = result.dataset.future[i].numbers.join(';');
    for (const sr of result.strategyResults) {
      // We don't store per-draw predictions in StrategyResult, so output summary
      lines.push(`${i},${actual},${sr.strategyId},${sr.evaluationStyle},,`);
    }
  }

  return lines.join('\n');
};

/** Export strategy summary metrics for a single run as CSV. */
export const exportSingleRunSummaryCSV = (result: SingleRunResult): string => {
  const lines: string[] = [];
  lines.push('strategy_id,label,evaluation_style,hit_count,hit_rate,average_overlap');

  for (const sr of result.strategyResults) {
    const hitCount = sr.hitMetrics?.hitCount ?? '';
    const hitRate = sr.hitMetrics?.hitRate ?? '';
    const avgOverlap = sr.matchDistribution?.averageOverlap ?? '';
    lines.push(`${sr.strategyId},${sr.label},${sr.evaluationStyle},${hitCount},${hitRate},${avgOverlap}`);
  }

  // Baselines
  for (const bl of result.baselines) {
    const hitCount = bl.hitMetrics?.hitCount ?? '';
    const hitRate = bl.hitMetrics?.hitRate ?? '';
    const avgOverlap = bl.matchDistribution?.averageOverlap ?? '';
    lines.push(`${bl.strategyId},${bl.label},${bl.evaluationStyle},${hitCount},${hitRate},${avgOverlap}`);
  }

  return lines.join('\n');
};

// ── CSV Export: Monte Carlo ───────────────────────────────────────────────────

/** Export Monte Carlo strategy summaries as CSV. */
export const exportMonteCarloCSV = (result: MonteCarloResult): string => {
  const lines: string[] = [];
  lines.push([
    'strategy_id',
    'label',
    'evaluation_style',
    'mean_hit_rate',
    'hit_rate_std_dev',
    'hit_rate_ci95_lower',
    'hit_rate_ci95_upper',
    'mean_avg_overlap',
    'overlap_std_dev',
    'overlap_ci95_lower',
    'overlap_ci95_upper',
    'mean_delta_vs_baseline',
    'delta_std_dev',
    'delta_ci95_lower',
    'delta_ci95_upper',
    'fraction_beating_baseline',
  ].join(','));

  for (const s of result.strategySummaries) {
    lines.push([
      s.strategyId,
      s.label,
      s.evaluationStyle,
      s.meanHitRate ?? '',
      s.hitRateStdDev ?? '',
      s.hitRateCI95?.[0] ?? '',
      s.hitRateCI95?.[1] ?? '',
      s.meanAverageOverlap ?? '',
      s.overlapStdDev ?? '',
      s.overlapCI95?.[0] ?? '',
      s.overlapCI95?.[1] ?? '',
      s.meanHitRateDeltaVsBaseline ?? '',
      s.deltaStdDev ?? '',
      s.deltaCI95?.[0] ?? '',
      s.deltaCI95?.[1] ?? '',
      s.fractionRunsBeatingBaseline ?? '',
    ].join(','));
  }

  return lines.join('\n');
};

// ── CSV Export: Analysis ──────────────────────────────────────────────────────

/** Export frequency table as CSV. */
export const exportFrequencyTableCSV = (
  frequencyTable: readonly FrequencyEntry[],
): string => {
  const lines: string[] = [];
  lines.push('number,observed_count,expected_count,relative_deviation');
  for (const entry of frequencyTable) {
    lines.push(`${entry.number},${entry.observedCount},${entry.expectedCount},${entry.relativeDeviation}`);
  }
  return lines.join('\n');
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Deep-clone an object, converting ReadonlyMap entries to plain objects
 * so JSON.stringify can handle them.
 */
const deepCloneWithMapConversion = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Map) {
    const plain: Record<string, unknown> = {};
    for (const [key, value] of obj) {
      plain[String(key)] = deepCloneWithMapConversion(value);
    }
    return plain;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepCloneWithMapConversion);
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = deepCloneWithMapConversion(value);
    }
    return result;
  }
  return obj;
};