import { describe, it, expect, vi } from 'vitest';
import { LRUCache, timeExecution, benchmark, debounce, processBatched } from './perf-utils';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(5);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts oldest entries when over capacity', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.size).toBe(3);
  });

  it('accessing a key moves it to most-recently-used', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // touch 'a', so 'b' becomes oldest
    cache.set('d', 4); // should evict 'b'
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  it('overwrites existing keys without increasing size', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10); // overwrite
    expect(cache.get('a')).toBe(10);
    expect(cache.size).toBe(2);
  });

  it('has() checks existence without affecting LRU order', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(false);
  });

  it('delete() removes entries', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('a', 1);
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('clear() removes all entries', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('keys() returns keys oldest to newest', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.keys()).toEqual(['a', 'b', 'c']);
  });
});

describe('timeExecution', () => {
  it('returns result and timing info', () => {
    const { result, durationMs, withinBudget } = timeExecution(() => 42, 100);
    expect(result).toBe(42);
    expect(typeof durationMs).toBe('number');
    expect(durationMs).toBeGreaterThanOrEqual(0);
    expect(withinBudget).toBe(true);
  });

  it('reports withinBudget=false for slow operations', () => {
    const { withinBudget } = timeExecution(() => {
      // Busy wait ~5ms
      const start = performance.now();
      while (performance.now() - start < 5) { /* spin */ }
    }, 1);
    expect(withinBudget).toBe(false);
  });
});

describe('benchmark', () => {
  it('runs the specified number of iterations', () => {
    let count = 0;
    const result = benchmark('test', () => { count++; }, 5, 100);
    expect(count).toBe(5);
    expect(result.iterations).toBe(5);
    expect(result.name).toBe('test');
  });

  it('reports min/avg/max timing', () => {
    const result = benchmark('fast', () => {}, 3, 100);
    expect(result.avgMs).toBeGreaterThanOrEqual(0);
    expect(result.minMs).toBeLessThanOrEqual(result.avgMs);
    expect(result.maxMs).toBeGreaterThanOrEqual(result.avgMs);
  });

  it('passes when within budget', () => {
    const result = benchmark('fast', () => {}, 3, 1000);
    expect(result.passed).toBe(true);
  });
});

describe('debounce', () => {
  it('delays execution', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('coalesces rapid calls', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('cancel() prevents execution', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();

    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

describe('processBatched', () => {
  it('processes all items', async () => {
    const items = [1, 2, 3, 4, 5];
    const processed: number[] = [];
    await processBatched(items, (item) => processed.push(item), 2);
    expect(processed).toEqual([1, 2, 3, 4, 5]);
  });

  it('works with batch size larger than items', async () => {
    const items = [1, 2, 3];
    const processed: number[] = [];
    await processBatched(items, (item) => processed.push(item), 100);
    expect(processed).toEqual([1, 2, 3]);
  });

  it('handles empty array', async () => {
    const processed: number[] = [];
    await processBatched([], (item: number) => processed.push(item));
    expect(processed).toEqual([]);
  });
});
