Continue building the same lottery simulation research tool.
You now have a Dataset (historical + future draws) for a given mode and seed. Extend the system with analysis, prediction strategies, and evaluation for a single run (no Monte Carlo repetition yet).

6. Stage 2 — Analysis on historical draws
For each mode and historical block, compute:

Per‑number frequency table

Count occurrences of each number in [1, maxNumber].

For each number:

observedCount

expectedCount = total drawn positions / range size

relativeDeviation = (observedCount - expectedCount) / expectedCount

Distribution summaries

Sum of numbers in each draw → distribution of sums.

Gap distribution between consecutive numbers in each draw (for numbersPerDraw > 1).

Odd/even split per draw (e.g. count odds vs evens).

Low/high split per draw (e.g. low = first half of range; high = second half).

Combination and pair frequencies

Combination frequency table:

Optionally store only combinations that occurred more than once to keep size manageable.

Pair frequency table (for modes with numbersPerDraw >= 2):

Count unordered pairs across draws.

Useful to illustrate apparent “pair patterns” that arise from noise.

Streaks and overlaps

Consecutive‑number occurrence count:

Count draws containing at least one adjacent pair (e.g. 12,13).

Overlap with previous draw:

For each draw (except the first), count how many numbers are shared with the immediately previous draw.

Repeated full combinations:

Count how often the exact same combination appears more than once.

For Mode A, also compute simple runs/streaks for each number (e.g. how often a number appears in k consecutive draws).

Chi‑square style goodness‑of‑fit (per‑number)

For each mode and its historical block:

Use the per‑number counts and expected counts under uniform selection.

Compute a chi‑square statistic and p‑value for the null hypothesis “all numbers are equally likely”.

You may use standard approximations (no need for exact distributions).

Provide:

chiSquareValue

degreesOfFreedom

pValue

Simple independence diagnostics

For diagnostics only (not full hypothesis testing), compute:

Correlation between per‑number counts in first half vs second half of the historical block.

Basic checks for dependence between consecutive draws (e.g. compare distribution of numbers following a given number vs baseline).

Design the analysis API so it returns a structured “AnalysisResult” object that can be rendered in a dashboard.

7. Stage 3 — Prediction / selection strategies (single run)
Implement a pluggable strategy interface and the required strategies. The goal is to test strategies, not claim any edge.

7.1 Strategy interface
Define:

ts
type StrategyContext = {
  mode: ModeConfig;
  historical: Draw[];
};

type RollingContext = {
  revealedFuture: Draw[];  // future draws revealed so far
};

type PredictionStrategy = {
  id: string;
  label: string;
  applicableModes: ModeId[]; // or all modes

  // Build initial model from historical data (fixed model)
  buildModel: (ctx: StrategyContext) => StrategyModel;

  // Predict one combination for the next draw (using model only)
  predictNextFixed: (model: StrategyModel) => number[];

  // Predict one combination for the next draw with rolling updates
  // ctx.revealedFuture contains all actual future draws seen so far
  predictNextRolling?: (model: StrategyModel, rolling: RollingContext) => number[];

  // Optional: allow strategies to update internal state after each revealed draw
  updateModelAfterReveal?: (model: StrategyModel, revealedDraw: Draw) => void;
};
StrategyModel can be a generic type (e.g. unknown or generic template) – each strategy defines its own internal representation.

7.2 Required strategies
Implement at least:

randomBaseline – baseline random selection:

For each prediction, sample a valid combination uniformly at random for the mode (using RNG).

mostFrequent – uses historical per‑number frequencies, selects highest‑frequency numbers.

leastFrequent – selects lowest‑frequency numbers.

recencyWeighted – weights numbers by how recently they have appeared (more recent → higher weight).

overdue – “delay”/overdue selection (numbers that have not appeared for longest in history).

hybridWeighted – some simple combination of frequency and recency/overdue logic.

All strategies must respect:

They may use only:

Historical 1st block (historical) plus

For rolling mode: revealed future draws up to the current time step, never the true future draw.

They must not peek ahead at any unrevealed future draws.

They must produce exactly one full, valid combination per predicted draw.

8. Stage 4 — Evaluation (single run)
For the given Dataset and a set of strategies, implement evaluation in two styles:

Fixed model: build strategy model from historical once; do not update using future draws.

Rolling model: after each future draw is revealed, update model using all draws seen so far.

For each mode and strategy:

8.1 Single‑number mode (Mode A)
For the 500 (or configurable) future draws:

Exact hit count: number of predictions equal to the actual drawn number.

Exact hit rate: hitCount / numFuture.

Running hit rate curve: track cumulative hit rate over time.

Baseline comparison:

Compute theoretical single‑draw win probability 
p
=
1
/
m
a
x
N
u
m
b
e
r
p=1/maxNumber.

Display expected hit rate vs observed hit rate.

8.2 Multi‑number modes (B–F)
Per future draw, compute:

Exact full‑combination hits: predicted combination equals actual combination.

Partial matches: count overlap between predicted and actual draws:

kMatches = number of shared numbers, for k = 0..numbersPerDraw.

Match distribution:

For each k, count how many future draws had exactly k matches.

Average overlap:

Mean of kMatches across all future draws.

Because exact‑hit probabilities are extremely small, partial match distribution and average overlap will be the main statistics.

8.3 Metrics and baseline
For each strategy and evaluation style:

Compute:

hitCount / hitRate (Mode A).

Match distribution and average overlap (Modes B–F).

Record the same metrics for the random baseline strategy.

Compute:

Theoretical probability of at least one exact hit over n independent lines:
1
−
(
1
−
p
)
n
1−(1−p) 
n
 , where 
p
p is single‑line win probability for the target mode and prize and n is total predicted lines; this is the key theoretical baseline for “spread vs lump” questions.

The output API for a single run should be something like:

SingleRunResult:

dataset

analysis: AnalysisResult

strategyResults: StrategyResult[] (each with metrics, for fixed and rolling)

baselines: { theoreticalHitRate, theoreticalAtLeastOneHit } etc.

This completes the single‑run pipeline (Stage 1–4) for one seed.
