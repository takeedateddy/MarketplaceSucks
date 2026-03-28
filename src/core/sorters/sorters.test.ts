import { describe, it, expect } from 'vitest';
import {
  PriceSorter, DateSorter, DistanceSorter, AlphabeticalSorter,
  SellerTrustSorter, PriceRatingSorter, HeatSorter, SellingSpeedSorter,
} from './sorters';
import { buildListing, buildAnalyzedListing } from '../test-helpers';

describe('PriceSorter', () => {
  const sorter = new PriceSorter();

  it('sorts ascending (low to high)', () => {
    const a = buildListing({ price: 100 });
    const b = buildListing({ price: 50 });
    expect(sorter.sort(a, b, 'asc')).toBeGreaterThan(0); // a > b
  });

  it('sorts descending (high to low)', () => {
    const a = buildListing({ price: 100 });
    const b = buildListing({ price: 50 });
    expect(sorter.sort(a, b, 'desc')).toBeLessThan(0); // reversed
  });

  it('defaults null price to 0', () => {
    const a = buildListing({ price: null });
    const b = buildListing({ price: 50 });
    expect(sorter.sort(a, b, 'asc')).toBeLessThan(0); // 0 < 50
  });
});

describe('DateSorter', () => {
  const sorter = new DateSorter();

  it('sorts descending (newest first) by default direction', () => {
    expect(sorter.defaultDirection).toBe('desc');
  });

  it('defaults null parsedDate to 0', () => {
    const a = buildListing({ parsedDate: null });
    const b = buildListing({ parsedDate: 1000 });
    expect(sorter.sort(a, b, 'asc')).toBeLessThan(0); // 0 < 1000
  });
});

describe('DistanceSorter', () => {
  const sorter = new DistanceSorter();

  it('sorts ascending (nearest first)', () => {
    const a = buildListing({ distance: 5 });
    const b = buildListing({ distance: 10 });
    expect(sorter.sort(a, b, 'asc')).toBeLessThan(0);
  });

  it('defaults null distance to Infinity (pushed to end)', () => {
    const a = buildListing({ distance: null });
    const b = buildListing({ distance: 10 });
    expect(sorter.sort(a, b, 'asc')).toBeGreaterThan(0); // Infinity > 10
  });
});

describe('AlphabeticalSorter', () => {
  const sorter = new AlphabeticalSorter();

  it('sorts A-Z ascending', () => {
    const a = buildListing({ title: 'Apple' });
    const b = buildListing({ title: 'Banana' });
    expect(sorter.sort(a, b, 'asc')).toBeLessThan(0);
  });

  it('sorts Z-A descending', () => {
    const a = buildListing({ title: 'Apple' });
    const b = buildListing({ title: 'Banana' });
    expect(sorter.sort(a, b, 'desc')).toBeGreaterThan(0);
  });
});

describe('SellerTrustSorter', () => {
  const sorter = new SellerTrustSorter();

  it('defaults to descending (highest first)', () => {
    expect(sorter.defaultDirection).toBe('desc');
  });

  it('defaults null score to 50 (neutral)', () => {
    const a = buildAnalyzedListing({ sellerTrustScore: undefined });
    const b = buildAnalyzedListing({ sellerTrustScore: 80 });
    expect(sorter.sort(a, b, 'asc')).toBeLessThan(0); // 50 < 80
  });
});

describe('PriceRatingSorter', () => {
  const sorter = new PriceRatingSorter();

  it('defaults null score to 100 (worst deal)', () => {
    const a = buildAnalyzedListing({ priceRatingScore: undefined });
    const b = buildAnalyzedListing({ priceRatingScore: 30 });
    expect(sorter.sort(a, b, 'asc')).toBeGreaterThan(0); // 100 > 30
  });
});

describe('HeatSorter', () => {
  const sorter = new HeatSorter();

  it('defaults to descending (most popular first)', () => {
    expect(sorter.defaultDirection).toBe('desc');
  });

  it('defaults null score to 0', () => {
    const a = buildAnalyzedListing({ heatScore: undefined });
    const b = buildAnalyzedListing({ heatScore: 80 });
    expect(sorter.sort(a, b, 'asc')).toBeLessThan(0); // 0 < 80
  });
});

describe('SellingSpeedSorter', () => {
  const sorter = new SellingSpeedSorter();

  it('defaults null to Infinity (pushed to end)', () => {
    const a = buildAnalyzedListing({ estimatedDaysToSell: undefined });
    const b = buildAnalyzedListing({ estimatedDaysToSell: 3 });
    expect(sorter.sort(a, b, 'asc')).toBeGreaterThan(0); // Infinity > 3
  });

  it('sorts ascending (fastest first)', () => {
    const a = buildAnalyzedListing({ estimatedDaysToSell: 2 });
    const b = buildAnalyzedListing({ estimatedDaysToSell: 10 });
    expect(sorter.sort(a, b, 'asc')).toBeLessThan(0);
  });
});
