# Lottery Simulation Research Tool

A statistical analysis and strategy evaluation tool for lottery-style random draws. Generates simulated draws (or loads real ones), runs six prediction strategies against them, and measures whether any strategy beats random chance. Spoiler: they don't.

**For research and education only.** Every valid combination in a fair lottery has equal probability. Past draws do not influence future draws.

## Features

- **6 lottery modes** — Pick 1 from 10 through Pick 6 from 60
- **Deterministic RNG** — Seeded mulberry32 PRNG for fully reproducible runs
- **Statistical analysis** — Frequency tables, chi-square goodness-of-fit, streak/gap distributions, pair frequencies, independence diagnostics
- **6 prediction strategies** — Random baseline, most frequent, least frequent, recency-weighted, overdue, hybrid weighted
- **Fixed & rolling evaluation** — Test strategies that never adapt (fixed) and strategies that update after each draw (rolling)
- **Monte Carlo simulation** — Run hundreds of iterations with confidence intervals and baseline deltas
- **UK National Lottery preset** — 200 real Lotto draws (6 from 59) built in
- **CSV import** — Load your own historical draw data
- **Your Numbers** — Pick your own numbers and test them against future draws
- **Export** — Download results as CSV or JSON

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone https://github.com/Alcb4/lottery_simulator.git
cd lottery_simulator
npm install
```

### Run

```bash
# Start dev server (opens at http://localhost:5173)
npm run dev

# Run all tests
npm test

# Production build
npm run build:ui
```

## How It Works

1. **Choose a data source** — Use randomly generated draws, the built-in UK Lotto preset, or import your own CSV data
2. **Select a mode** — Pick how many numbers are drawn from what range (e.g. 6 from 59 for UK Lotto)
3. **Run a single simulation** — Generates historical + future draws, analyzes the historical data, and evaluates all strategies against the future draws
4. **Or run Monte Carlo** — Repeats the experiment hundreds of times and aggregates the results with 95% confidence intervals
5. **Compare strategies** — Every strategy is measured against the theoretical baseline (random chance). The result: none consistently beat it.

### Fixed vs Rolling Evaluation

- **Fixed** — The strategy builds its model once from historical data and uses the same prediction for every future draw. This is how real lottery play works: you pick your numbers and stick with them.
- **Rolling** — The strategy adapts after each future draw is revealed, updating its model and making a new prediction each time. This gives strategies every possible advantage — and they still don't beat the baseline.

## Project Structure

```
src/
├── generator/        # RNG, modes, draw engine
├── analysis/         # Statistical analysis + theoretical baselines
├── strategies/       # 6 prediction strategies
├── evaluation/       # Fixed/rolling evaluation + Monte Carlo
├── data/             # UK National Lottery preset data
├── export/           # CSV/JSON export
├── types/            # Shared domain types
└── ui/               # React dashboard
    ├── components/   # ControlPanel, dashboards, YourNumbers, ExportButtons
    └── hooks/        # useSimulation state hook
```

## Tech Stack

- TypeScript, Node.js
- React 19 + Recharts for the dashboard
- Vitest for testing
- Vite for bundling

## License

MIT