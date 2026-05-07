Prompt 3/3 – Monte Carlo repeat mode, configurability, UI, guardrails
Continue with the same project.
You now have a working single‑run engine: given mode, numHistorical, numFuture, seed, and strategy set, you can generate draws, analyse them, and evaluate strategies. Next, add Monte Carlo repeat mode, configurability, and guardrails.

9. Configurable draw counts
Instead of hard‑coding 1,000 historical and 500 future draws:

Expose numHistorical and numFuture as configurable parameters.

Provide sensible presets (e.g. 100, 500, 1,000, 5,000) and allow custom values.

Keep the conceptual separation:

Historical block used for analysis and initial model building.

Future block used only for evaluation.

10. Monte Carlo repeat runner
Implement a Monte Carlo runner that repeatedly executes the entire single‑run pipeline using different seeds. Monte Carlo = repeated random sampling to understand the distribution of outcomes, not just one realization.

10.1 API
Define something like:

ts
type MonteCarloConfig = {
  mode: ModeConfig;
  numHistorical: number;
  numFuture: number;
  numRuns: number;      // e.g. 10, 100, 1000
  baseSeed: number;
  strategies: PredictionStrategy[];
  evaluateFixed: boolean;
  evaluateRolling: boolean;
};

type MonteCarloStrategySummary = {
  strategyId: string;
  label: string;
  evaluationStyle: 'fixed' | 'rolling';
  meanHitRate?: number;           // Mode A
  hitRateStdDev?: number;
  hitRateCI95?: [number, number];

  meanAverageOverlap?: number;    // Modes B–F
  overlapStdDev?: number;
  overlapCI95?: [number, number];

  // Difference vs random baseline
  meanHitRateDeltaVsBaseline?: number;
  deltaStdDev?: number;
  deltaCI95?: [number, number];

  // How often this strategy "beats" random baseline
  fractionRunsBeatingBaseline?: number; // e.g. proportion of runs where hitRate > baseline hitRate
};

type MonteCarloResult = {
  config: MonteCarloConfig;
  strategySummaries: MonteCarloStrategySummary[];
};
10.2 Seeding scheme
Use baseSeed to generate deterministic per‑run seeds, e.g.:

seed_r = baseSeed + r * 1000 + modeOffset

For each Monte Carlo run:

Instantiate RNG with seed_r.

Execute the full single‑run pipeline (Stages 1–4).

Extract summary metrics for each strategy (fixed and rolling).

Do not share RNG state across runs.

10.3 Aggregation and confidence intervals
Across runs, for each strategy and evaluation style:

Collect per‑run hit rates (Mode A) and/or average overlaps (Modes B–F).

Compute:

Mean.

Standard deviation.

Approximate 95% confidence interval, e.g. using:

Empirical quantiles (2.5th, 97.5th percentiles), or

Mean ± 1.96 × SE, where SE = stdDev / sqrt(numRuns).

Compute per‑run difference vs random baseline:

deltaHitRate = strategyHitRate - baselineHitRate.

Aggregate mean, std, CI for deltas.

Compute fractionRunsBeatingBaseline = proportion of runs where deltaHitRate > 0.

The goal is to show that, under a fair RNG, hot/cold/overdue and similar strategies do not consistently beat random baseline beyond noise.

11. UI / UX expectations (high‑level)
You do not need to choose specific UI framework here, but structure the outputs so a frontend can provide:

11.1 Control panel
Mode selector (A–F).

Seed input.

numHistorical and numFuture selectors (presets + custom).

A toggle between:

“Single run” view.

“Monte Carlo” view (multi‑run).

Monte Carlo controls:

numRuns selector (e.g. 10, 100, 1000).

Toggles for including fixed and rolling variants.

11.2 Single‑run dashboard
Frequency and distribution tables/charts:

Per‑number frequencies with expected vs observed.

Sum, gaps, odd/even, low/high.

Chi‑square panel:

Chi‑square statistic and p‑value for uniformity.

Short text: “No evidence of bias at X% significance” vs “Unusual deviation” (without over‑claiming).

Strategy comparison:

Table per strategy with:

Hit counts, hit rates (Mode A).

Match distributions, average overlap (Modes B–F).

Theoretical baselines.

Toggle between fixed/rolling.

11.3 Monte Carlo dashboard
Strategy performance table:

For each strategy & evaluation style:

Mean hit rate ± CI.

Mean difference vs baseline ± CI.

Fraction of runs beating baseline.

Visuals (nice‑to‑have):

Chart showing observed strategy hit rates vs baseline band.

Maybe histogram or boxplot of deltaHitRate per strategy.

12. Export
Implement generic exporters:

CSV:

Per‑run strategy metrics for Monte Carlo.

Single‑run detailed results (e.g. per‑draw predictions and outcomes).

JSON:

Structured SingleRunResult.

Structured MonteCarloResult.

Make exporters independent of UI (pure functions that accept result objects and return serialised strings or blobs).

13. Guardrails and documentation
Implement the following guardrails and explanatory notes:

Never leak future draws into strategy construction.

Label all strategy results as benchmarks against chance, not as promises of an edge.

Make clear that:

Every valid combination in a fair lottery has equal single‑draw probability.

Frequency imbalances and streaks appear naturally in finite samples.

Better‑than‑baseline performance in a single run is not evidence of a real edge; performance must be seen across many runs (Monte Carlo) and is still bounded by the underlying fair odds.

Include a docs/methodology note that briefly explains:

Lottery independence.

Monte Carlo simulation as repeated random sampling.

Chi‑square testing as a way to check whether observed frequencies deviate from expected under a null model.

14. Acceptance criteria
The implementation should satisfy:

For each mode A–F:

Historical and future draws are generated correctly, without leakage between blocks.

Analysis outputs (frequency, distributions, chi‑square, overlaps, streaks) are available.

Required strategies are implemented and pluggable.

Fixed vs rolling evaluation both work and obey no‑leakage rules.

Monte Carlo repeat runner works for configurable numRuns and aggregates metrics.

CSV/JSON exports for both single‑run and Monte Carlo results.

Results are reproducible when seed configuration is fixed.

The overall codebase is modular, with clear separation:

generator/ – draw engine and RNG.

analysis/ – statistics and diagnostics.

strategies/ – prediction methods.

evaluation/ – scoring, metrics, Monte Carlo.

types/ – shared domain types.

ui/ – (or equivalent) dashboards and controls.

docs/ – methodology and caveats.
