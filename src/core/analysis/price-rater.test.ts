import { describe, it, expect } from 'vitest';
import { rateListing, generatePriceRatingSummary } from './price-rater';

function makeInput(price: number, comparables: number[]) {
  return {
    price,
    condition: null,
    comparablePrices: comparables,
    category: 'Furniture',
    dataWindowDays: 30,
  };
}

describe('rateListing', () => {
  it('returns null for fewer than 5 comparables', () => {
    expect(rateListing(makeInput(50, [40, 60, 70, 80]))).toBeNull();
  });

  it('returns result for exactly 5 comparables', () => {
    const result = rateListing(makeInput(50, [40, 60, 70, 80, 90]));
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('low');
  });

  it('rates steal tier (<=40% of median)', () => {
    const result = rateListing(makeInput(20, [100, 100, 100, 100, 100]));
    expect(result!.tier).toBe('steal');
  });

  it('rates great-deal tier (<=70%)', () => {
    const result = rateListing(makeInput(60, [100, 100, 100, 100, 100]));
    expect(result!.tier).toBe('great-deal');
  });

  it('rates fair-price tier (~100%)', () => {
    const result = rateListing(makeInput(100, [90, 95, 100, 105, 110]));
    expect(result!.tier).toBe('fair-price');
  });

  it('rates overpriced tier (>160%)', () => {
    const result = rateListing(makeInput(200, [100, 100, 100, 100, 100]));
    expect(result!.tier).toBe('overpriced');
  });

  it('provides correct confidence levels', () => {
    const low = rateListing(makeInput(50, [40, 60, 70, 80, 90]));
    expect(low!.confidence).toBe('low');

    const med = rateListing(makeInput(50, Array(10).fill(50)));
    expect(med!.confidence).toBe('medium');

    const high = rateListing(makeInput(50, Array(20).fill(50)));
    expect(high!.confidence).toBe('high');
  });

  it('calculates stats correctly', () => {
    const result = rateListing(makeInput(50, [20, 40, 60, 80, 100]));
    expect(result!.stats.count).toBe(5);
    expect(result!.stats.min).toBe(20);
    expect(result!.stats.max).toBe(100);
    expect(result!.stats.median).toBe(60);
  });

  it('generates reasoning lines', () => {
    const result = rateListing(makeInput(50, [40, 60, 70, 80, 90]));
    expect(result!.reasoning.length).toBeGreaterThan(0);
    expect(result!.reasoning[0]).toContain('Furniture');
  });

  it('handles median of 0 (defaults to 100%)', () => {
    const result = rateListing(makeInput(0, [0, 0, 0, 0, 0]));
    expect(result!.percentOfMedian).toBe(100);
  });
});

describe('generatePriceRatingSummary', () => {
  it('returns formatted summary string', () => {
    const result = rateListing(makeInput(50, [100, 100, 100, 100, 100]))!;
    const summary = generatePriceRatingSummary(result, 50);
    expect(summary).toContain('$50');
    expect(summary).toContain('median');
    expect(summary).toContain('5 comparables');
  });
});
