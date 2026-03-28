import { describe, it, expect } from 'vitest';
import { PriceFilter } from './price-filter';
import { buildListing } from '../test-helpers';

describe('PriceFilter', () => {
  const filter = new PriceFilter();

  it('keeps listing with null price (no data)', () => {
    const listing = buildListing({ price: null });
    const result = filter.apply(listing, { min: 10, max: 100 });
    expect(result.keep).toBe(true);
  });

  it('passes all when both bounds are null', () => {
    const listing = buildListing({ price: 999 });
    const result = filter.apply(listing, { min: null, max: null });
    expect(result.keep).toBe(true);
  });

  it('keeps listing at exact min boundary (inclusive)', () => {
    const listing = buildListing({ price: 10 });
    const result = filter.apply(listing, { min: 10, max: 100 });
    expect(result.keep).toBe(true);
  });

  it('keeps listing at exact max boundary (inclusive)', () => {
    const listing = buildListing({ price: 100 });
    const result = filter.apply(listing, { min: 10, max: 100 });
    expect(result.keep).toBe(true);
  });

  it('removes listing below min', () => {
    const listing = buildListing({ price: 5 });
    const result = filter.apply(listing, { min: 10, max: 100 });
    expect(result.keep).toBe(false);
    expect(result.reason).toContain('below');
  });

  it('removes listing above max', () => {
    const listing = buildListing({ price: 200 });
    const result = filter.apply(listing, { min: 10, max: 100 });
    expect(result.keep).toBe(false);
    expect(result.reason).toContain('above');
  });

  it('works with only min bound', () => {
    const listing = buildListing({ price: 50 });
    expect(filter.apply(listing, { min: 10, max: null }).keep).toBe(true);
    expect(filter.apply(listing, { min: 100, max: null }).keep).toBe(false);
  });

  it('works with only max bound', () => {
    const listing = buildListing({ price: 50 });
    expect(filter.apply(listing, { min: null, max: 100 }).keep).toBe(true);
    expect(filter.apply(listing, { min: null, max: 10 }).keep).toBe(false);
  });

  describe('validateConfig', () => {
    it('accepts valid configs', () => {
      expect(filter.validateConfig({ min: 0, max: 100 })).toBe(true);
      expect(filter.validateConfig({ min: null, max: null })).toBe(true);
    });

    it('rejects non-number min', () => {
      expect(filter.validateConfig({ min: 'abc', max: null })).toBe(false);
    });
  });
});
