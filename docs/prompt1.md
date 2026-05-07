You are a development agent building a lottery simulation research tool.
Your goal is to implement a clean, modular codebase that simulates lottery‑style random draws, analyses them statistically, and evaluates simple prediction strategies against a random baseline. The tool is for research and education, not for “beating” real lotteries.

1. Core principles
Implement the system under these assumptions:

Each draw is an independent trial from a specified lottery mode (no memory; no dependence on past outcomes).

Within a single draw, numbers are sampled without replacement.

All valid combinations for a mode are equally likely (uniform over combinations).

Draws are independent across time.

Random generation uses a configurable, deterministic RNG seed for reproducibility.

Results must be exportable (CSV/JSON) for offline analysis.

Do not build any generator logic that uses previous outputs to influence the next output.

2. Modes (A–F)
Implement a general “mode” abstraction plus the following concrete modes:

Mode A: pick 1 number from 1–10

Mode B: pick 2 unique numbers from 1–20

Mode C: pick 3 unique numbers from 1–30

Mode D: pick 4 unique numbers from 1–40

Mode E: pick 5 unique numbers from 1–50

Mode F: pick 6 unique numbers from 1–60

For each mode:

Draws are combinations of unique integers in [1, maxNumber].

Draws must be sorted ascending before storage (to simplify combination and gap analysis).

The abstraction should make it easy to add new modes later.

3. RNG and reproducibility
Create a dedicated RNG module:

Wrap a deterministic PRNG (e.g. seedable mulberry32, xoshiro, or language‑native seedable generator).

API should allow:

Initialising from a single numeric seed.

Generating:

Uniform random floats in (0,1).

Random integers in [min, max].

Sampling k unique integers from [1, max] without replacement.

For reproducibility:

All draw generation and strategy randomness must go through this RNG.

Different runs and modes should be deterministically reproducible given a base seed and a known seeding scheme (we’ll layer Monte Carlo run seeding later).

4. Data types / domain model
Define clear shared types (adjust syntax to your language):

ModeId – 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

ModeConfig:

id: ModeId

name: string

minNumber: number (typically 1)

maxNumber: number

numbersPerDraw: number

Draw:

mode: ModeId

numbers: number[] (sorted, unique)

index: number (0‑based position in its sequence)

Dataset:

mode: ModeId

historical: Draw[]

future: Draw[]

You will later add:

Strategy types (PredictionStrategy, StrategyModel).

Evaluation metrics types (HitMetrics, MatchDistribution, MonteCarloSummary).

5. Simulation – core engine (single run)
Implement a “single‑run” simulation engine for a given ModeConfig and RNG seed:

Inputs:

modeConfig: ModeConfig

numHistorical: number

numFuture: number

seed: number

Outputs:

dataset: Dataset containing:

historical: Draw[] of length numHistorical

future: Draw[] of length numFuture

Rules:

Use one RNG instance per run, seeded with the given seed.

Generate historical draws first, then future draws.

Keep historical and future arrays strictly disjoint (no overlap of indices).

Do not let any later analysis or prediction logic alter these draws.

This “single‑run” engine is the foundation; in later prompts you will add analysis, strategies, evaluation, and Monte Carlo repeat mode on top.
