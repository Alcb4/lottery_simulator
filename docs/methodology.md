# Methodology

## Lottery Independence

Every draw in this simulation is an **independent trial**. The random number generator produces each draw without any memory of or dependence on previous outcomes. This mirrors the fundamental property of fair lottery systems: past results do not influence future results.

**Key implication**: No strategy based on historical patterns (frequency, recency, overdue numbers) can achieve a true edge over random selection. Any apparent advantage in a single run is consistent with random variation.

## Monte Carlo Simulation

Monte Carlo simulation is a method of **repeated random sampling** to understand the distribution of outcomes, not just a single realization.

### How it works

1. A single run generates historical and future draws using a seeded RNG, then evaluates strategies.
2. The Monte Carlo runner repeats this process many times (e.g., 100 or 1000 runs) with different seeds.
3. Across runs, we aggregate metrics (mean hit rate, standard deviation, confidence intervals) for each strategy.
4. We compare each strategy's performance against the random baseline.

### What it tells us

- **Mean performance**: The average hit rate or overlap across many runs.
- **Confidence intervals**: The range within which the true mean likely falls (95% CI).
- **Fraction beating baseline**: How often a strategy outperforms random selection in individual runs.

### What it does NOT tell us

- Monte Carlo cannot reveal a "winning strategy" because the underlying draws are fair and independent.
- A strategy that beats the baseline in 55% of runs is **not** evidence of a real edge — this is expected from random variation.

## Chi-Square Goodness-of-Fit

The chi-square test checks whether observed number frequencies deviate significantly from the uniform (equal-probability) null hypothesis.

### How it works

1. Count how often each number appears across all historical draws.
2. Compute the expected count under uniform selection: `totalPositions / rangeSize`.
3. Calculate the chi-square statistic: `Σ (observed - expected)² / expected`.
4. Compute a p-value from the chi-square distribution with `rangeSize - 1` degrees of freedom.

### Interpretation

- **High p-value (> 0.05)**: No evidence of bias. Observed frequencies are consistent with uniform selection.
- **Low p-value (< 0.05)**: The deviation is statistically unusual, but this does NOT mean the lottery is unfair. With large sample sizes, even tiny deviations become "significant" without being practically meaningful.

**Important**: In a fair lottery, we expect some runs to show low p-values by chance alone. This is the nature of hypothesis testing.

## Theoretical Baselines

### Single-draw probability

For a mode that picks `k` numbers from `1..n`, every valid combination has probability:

```
p = 1 / C(n, k)
```

where `C(n, k)` is the binomial coefficient.

### At-least-one probability

If you play `n` independent lines, the probability of at least one exact match is:

```
P(at least one) = 1 - (1 - p)^n
```

### Expected overlap (multi-number modes)

When comparing two independent random selections of `k` numbers from `1..n`, the expected number of matching positions is:

```
E[overlap] = k × (k / n)
```

This is derived from linearity of expectation: each predicted number has probability `k/n` of matching one of the drawn numbers.

## Caveats

1. **This tool is for research and education only.** It does not and cannot predict real lottery outcomes.
2. **Every valid combination has equal probability.** Frequency imbalances and streaks appear naturally in finite samples — they are not predictive.
3. **Better-than-baseline performance in a single run is not evidence of a real edge.** Performance must be evaluated across many Monte Carlo runs, and even then, any apparent advantage is bounded by the underlying fair odds.
4. **Strategies are benchmarks against chance, not promises of an edge.** The random baseline is the correct comparison point.
5. **No future information is used in strategy construction.** Strategies only use historical data and (for rolling evaluation) draws that have already been revealed. This strict separation ensures fair evaluation.