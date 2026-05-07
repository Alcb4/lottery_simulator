/**
 * Deterministic PRNG module using the mulberry32 algorithm.
 *
 * All randomness in the simulation flows through this seeded generator,
 * ensuring reproducible results given the same base seed.
 */

const UINT32_MAX = 0x100000000; // 2^32

export interface RNG {
  /** Uniform random float in (0, 1) — exclusive of both 0 and 1 */
  nextFloat(): number;
  /** Random integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Sample k unique integers from [min, max] without replacement, sorted ascending */
  sampleWithoutReplacement(k: number, min: number, max: number): number[];
  /** Return current internal state for debugging / reproducibility */
  getState(): number;
}

/**
 * Advance the mulberry32 PRNG state and return a 32-bit unsigned integer.
 * Pure function: given a state, returns [output, newState].
 */
function mulberry32Step(state: number): [number, number] {
  const nextState = (state + 0x6d2b79f5) | 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const output = (t ^ (t >>> 14)) >>> 0;
  return [output, nextState];
}

/**
 * Create an independent RNG instance from a numeric seed.
 * Same seed always produces the same sequence of outputs.
 * No shared global state — each instance is isolated.
 */
export function createRNG(seed: number): RNG {
  let state = seed | 0; // coerce to 32-bit integer

  /** Consume one mulberry32 output, returning a 32-bit unsigned integer. */
  function nextUint32(): number {
    const [output, nextState] = mulberry32Step(state);
    state = nextState;
    return output;
  }

  function nextFloat(): number {
    // Rejection-sample to guarantee result is in (0, 1), never exactly 0.
    // Probability of rejection is 1/2^32 ≈ 2.3e-10, so effectively never happens.
    let result: number;
    do {
      result = nextUint32() / UINT32_MAX;
    } while (result === 0);
    return result;
  }

  function nextInt(min: number, max: number): number {
    if (min > max) {
      throw new RangeError(`nextInt: min (${min}) must be <= max (${max})`);
    }
    return min + Math.floor(nextFloat() * (max - min + 1));
  }

  function sampleWithoutReplacement(
    k: number,
    min: number,
    max: number,
  ): number[] {
    if (k === 0) return [];
    if (min > max) {
      throw new RangeError(
        `sampleWithoutReplacement: min (${min}) must be <= max (${max})`,
      );
    }
    const range = max - min + 1;
    if (k > range) {
      throw new RangeError(
        `Cannot sample ${k} unique values from range of size ${range}`,
      );
    }

    // Build pool [min, min+1, ..., max]
    const pool = Array.from({ length: range }, (_, i) => min + i);

    // Partial Fisher-Yates: shuffle first k positions
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(nextFloat() * (range - i));
      const temp = pool[i];
      pool[i] = pool[j];
      pool[j] = temp;
    }

    // Return sampled elements sorted ascending
    return pool.slice(0, k).sort((a, b) => a - b);
  }

  function getState(): number {
    return state;
  }

  return Object.freeze({
    nextFloat,
    nextInt,
    sampleWithoutReplacement,
    getState,
  });
}