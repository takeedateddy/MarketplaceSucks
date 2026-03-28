import { describe, it, expect } from 'vitest';
import { median, mean, standardDeviation, percentileRank, percentile, clamp, lerp } from './math-utils';

describe('median', () => {
  it('returns 0 for empty array', () => {
    expect(median([])).toBe(0);
  });

  it('returns the single element for length-1 array', () => {
    expect(median([42])).toBe(42);
  });

  it('returns middle value for odd-length array', () => {
    expect(median([1, 3, 5, 7, 9])).toBe(5);
  });

  it('returns average of two middle values for even-length array', () => {
    expect(median([1, 3, 5, 7])).toBe(4);
  });

  it('handles unsorted input', () => {
    expect(median([9, 1, 5, 3, 7])).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(median([-5, -1, 0, 3, 10])).toBe(0);
  });

  it('does not mutate original array', () => {
    const arr = [3, 1, 2];
    median(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});

describe('mean', () => {
  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('returns the single element for length-1 array', () => {
    expect(mean([7])).toBe(7);
  });

  it('calculates average correctly', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it('handles negative numbers', () => {
    expect(mean([-10, 10])).toBe(0);
  });
});

describe('standardDeviation', () => {
  it('returns 0 for empty array', () => {
    expect(standardDeviation([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(standardDeviation([5])).toBe(0);
  });

  it('returns 0 for identical values', () => {
    expect(standardDeviation([3, 3, 3, 3])).toBe(0);
  });

  it('calculates correctly for known dataset', () => {
    const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.0, 1);
  });
});

describe('percentileRank', () => {
  it('returns 0 for empty dataset', () => {
    expect(percentileRank(5, [])).toBe(0);
  });

  it('returns 0 when value is below all data', () => {
    expect(percentileRank(0, [10, 20, 30])).toBe(0);
  });

  it('returns 100 when value is above all data', () => {
    expect(percentileRank(100, [10, 20, 30])).toBe(100);
  });

  it('calculates correctly for value in middle', () => {
    expect(percentileRank(45, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toBe(40);
  });
});

describe('percentile', () => {
  it('returns 0 for empty dataset', () => {
    expect(percentile([], 50)).toBe(0);
  });

  it('returns min at 0th percentile', () => {
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
  });

  it('returns max at 100th percentile', () => {
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
  });

  it('returns median at 50th percentile', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it('interpolates for fractional indices', () => {
    const result = percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 75);
    expect(result).toBeCloseTo(7.75, 2);
  });

  it('handles unsorted input', () => {
    expect(percentile([5, 3, 1, 4, 2], 50)).toBe(3);
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('clamps to min when below', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('clamps to max when above', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('clamps t to 0 when negative', () => {
    expect(lerp(10, 20, -1)).toBe(10);
  });

  it('clamps t to 1 when above 1', () => {
    expect(lerp(10, 20, 2)).toBe(20);
  });
});
