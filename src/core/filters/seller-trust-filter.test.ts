import { describe, it, expect } from 'vitest';
import { SellerTrustFilter } from './seller-trust-filter';
import { buildListing, buildAnalyzedListing } from '../test-helpers';

describe('SellerTrustFilter', () => {
  const filter = new SellerTrustFilter();

  it('keeps listing with no trust score (undefined)', () => {
    const listing = buildListing({});
    const result = filter.apply(listing, { minTrustScore: 50 });
    expect(result.keep).toBe(true);
  });

  it('keeps listing with score at minimum (inclusive)', () => {
    const listing = buildAnalyzedListing({ sellerTrustScore: 50 });
    const result = filter.apply(listing, { minTrustScore: 50 });
    expect(result.keep).toBe(true);
  });

  it('keeps listing with score above minimum', () => {
    const listing = buildAnalyzedListing({ sellerTrustScore: 80 });
    const result = filter.apply(listing, { minTrustScore: 50 });
    expect(result.keep).toBe(true);
  });

  it('removes listing with score below minimum', () => {
    const listing = buildAnalyzedListing({ sellerTrustScore: 30 });
    const result = filter.apply(listing, { minTrustScore: 50 });
    expect(result.keep).toBe(false);
    expect(result.reason).toContain('below');
  });

  it('minTrustScore 0 effectively disables filter', () => {
    const listing = buildAnalyzedListing({ sellerTrustScore: 0 });
    const result = filter.apply(listing, { minTrustScore: 0 });
    expect(result.keep).toBe(true);
  });

  describe('validateConfig', () => {
    it('accepts valid range', () => {
      expect(filter.validateConfig({ minTrustScore: 50 })).toBe(true);
      expect(filter.validateConfig({ minTrustScore: 0 })).toBe(true);
      expect(filter.validateConfig({ minTrustScore: 100 })).toBe(true);
    });

    it('rejects out of range', () => {
      expect(filter.validateConfig({ minTrustScore: -1 })).toBe(false);
      expect(filter.validateConfig({ minTrustScore: 101 })).toBe(false);
    });

    it('rejects non-number', () => {
      expect(filter.validateConfig({ minTrustScore: 'high' })).toBe(false);
    });
  });
});
