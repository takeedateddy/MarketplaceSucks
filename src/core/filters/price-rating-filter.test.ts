import { describe, it, expect } from 'vitest';
import { PriceRatingFilter } from './price-rating-filter';
import { buildListing, buildAnalyzedListing } from '../test-helpers';

describe('PriceRatingFilter', () => {
  const filter = new PriceRatingFilter();

  it('keeps listing with no price rating (undefined)', () => {
    const listing = buildListing({});
    const result = filter.apply(listing, { minRating: 'fair', hideOverpriced: true });
    expect(result.keep).toBe(true);
  });

  describe('hideOverpriced', () => {
    it('removes "overpriced" listings', () => {
      const listing = buildAnalyzedListing({ priceRating: 'overpriced' });
      const result = filter.apply(listing, { minRating: null, hideOverpriced: true });
      expect(result.keep).toBe(false);
    });

    it('removes "ripoff" listings', () => {
      const listing = buildAnalyzedListing({ priceRating: 'ripoff' });
      const result = filter.apply(listing, { minRating: null, hideOverpriced: true });
      expect(result.keep).toBe(false);
    });

    it('keeps "fair" listings', () => {
      const listing = buildAnalyzedListing({ priceRating: 'fair' });
      const result = filter.apply(listing, { minRating: null, hideOverpriced: true });
      expect(result.keep).toBe(true);
    });
  });

  describe('minRating', () => {
    it('keeps listing at or better than minimum', () => {
      const listing = buildAnalyzedListing({ priceRating: 'steal' });
      const result = filter.apply(listing, { minRating: 'fair', hideOverpriced: false });
      expect(result.keep).toBe(true);
    });

    it('keeps listing exactly at minimum', () => {
      const listing = buildAnalyzedListing({ priceRating: 'fair' });
      const result = filter.apply(listing, { minRating: 'fair', hideOverpriced: false });
      expect(result.keep).toBe(true);
    });

    it('removes listing worse than minimum', () => {
      const listing = buildAnalyzedListing({ priceRating: 'overpriced' });
      const result = filter.apply(listing, { minRating: 'fair', hideOverpriced: false });
      expect(result.keep).toBe(false);
    });

    it('passes unknown ratings', () => {
      const listing = buildAnalyzedListing({ priceRating: 'custom_rating' });
      const result = filter.apply(listing, { minRating: 'fair', hideOverpriced: false });
      expect(result.keep).toBe(true);
    });

    it('passes when minRating is not in scale', () => {
      const listing = buildAnalyzedListing({ priceRating: 'overpriced' });
      const result = filter.apply(listing, { minRating: 'unknown_min', hideOverpriced: false });
      expect(result.keep).toBe(true);
    });
  });

  it('both filters work together (AND logic)', () => {
    // Overpriced + hideOverpriced = removed before minRating check
    const listing = buildAnalyzedListing({ priceRating: 'overpriced' });
    const result = filter.apply(listing, { minRating: 'fair', hideOverpriced: true });
    expect(result.keep).toBe(false);
  });

  it('all disabled = all pass', () => {
    const listing = buildAnalyzedListing({ priceRating: 'ripoff' });
    const result = filter.apply(listing, { minRating: null, hideOverpriced: false });
    expect(result.keep).toBe(true);
  });
});
