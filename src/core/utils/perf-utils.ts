/**
 * Performance monitoring and optimization utilities.
 *
 * Provides an LRU cache for in-memory listing data, debounced batch
 * execution for filter/sort pipelines, and timing utilities for
 * benchmarking operations against target budgets.
 *
 * @module perf-utils
 */

/**
 * A generic Least Recently Used (LRU) cache with a fixed capacity.
 * Evicts the oldest entries when the cache exceeds maxSize.
 *
 * @typeParam K - Key type
 * @typeParam V - Value type
 */
export class LRUCache<K, V> {
  private readonly cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * Get a value from the cache. Moves the entry to most-recently-used.
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recent) by re-inserting
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Set a value in the cache. Evicts oldest entries if over capacity.
   */
  set(key: K, value: V): void {
    // If key exists, delete first so re-insert moves it to end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);

    // Evict oldest entries if over capacity
    while (this.cache.size > this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
  }

  /**
   * Check if a key exists in the cache (does not affect LRU order).
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove a key from the cache.
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Current number of entries in the cache.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Return all keys in order from oldest to newest.
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }
}

/** Result of a timed operation */
export interface TimingResult<T> {
  /** The return value of the operation */
  readonly result: T;
  /** Execution duration in milliseconds */
  readonly durationMs: number;
  /** Whether the operation met the budget target */
  readonly withinBudget: boolean;
}

/**
 * Execute a function and measure its duration against a budget.
 *
 * @param fn - The function to time
 * @param budgetMs - Target duration in milliseconds
 * @returns The result and timing information
 */
export function timeExecution<T>(
  fn: () => T,
  budgetMs: number,
): TimingResult<T> {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;

  return {
    result,
    durationMs: Math.round(durationMs * 100) / 100,
    withinBudget: durationMs <= budgetMs,
  };
}

/** Performance benchmark result */
export interface BenchmarkResult {
  /** Name of the benchmark */
  readonly name: string;
  /** Number of iterations run */
  readonly iterations: number;
  /** Average duration per iteration in milliseconds */
  readonly avgMs: number;
  /** Minimum duration in milliseconds */
  readonly minMs: number;
  /** Maximum duration in milliseconds */
  readonly maxMs: number;
  /** Target budget in milliseconds */
  readonly budgetMs: number;
  /** Whether average was within budget */
  readonly passed: boolean;
}

/**
 * Run a benchmark: execute a function multiple times and report statistics.
 *
 * @param name - Human-readable benchmark name
 * @param fn - The function to benchmark
 * @param iterations - Number of times to run (default 10)
 * @param budgetMs - Target average duration (default 50ms)
 * @returns Benchmark statistics
 */
export function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 10,
  budgetMs: number = 50,
): BenchmarkResult {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);

  return {
    name,
    iterations,
    avgMs: Math.round(avgMs * 100) / 100,
    minMs: Math.round(minMs * 100) / 100,
    maxMs: Math.round(maxMs * 100) / 100,
    budgetMs,
    passed: avgMs <= budgetMs,
  };
}

/**
 * Create a debounced version of a function that batches rapid calls.
 * The function is invoked after `delayMs` of inactivity.
 *
 * @param fn - Function to debounce
 * @param delayMs - Delay in milliseconds
 * @returns Debounced function with a cancel method
 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
): T & { cancel(): void } {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timerId !== null) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      fn(...args);
    }, delayMs);
  }) as T & { cancel(): void };

  debounced.cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}

/**
 * Process items in batches to avoid blocking the main thread.
 * Yields control back to the event loop between batches.
 *
 * @param items - Array of items to process
 * @param processFn - Function to call for each item
 * @param batchSize - Number of items per batch (default 50)
 * @returns Promise that resolves when all items are processed
 */
export async function processBatched<T>(
  items: T[],
  processFn: (item: T) => void,
  batchSize: number = 50,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    for (const item of batch) {
      processFn(item);
    }
    // Yield to event loop between batches
    if (i + batchSize < items.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
}
