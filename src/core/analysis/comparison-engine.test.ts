import { describe, it, expect } from 'vitest';
import { compareListings } from './comparison-engine';
import { buildAnalyzedListing } from '../test-helpers';

describe('compareListings', () => {
  it('returns empty dimensions for < 2 listings', () => {
    const result = compareListings([buildAnalyzedListing({ id: 'a' })]);
    expect(result.dimensions).toEqual([]);
    expect(result.summary).toContain('at least 2');
    expect(result.recommendedId).toBeNull();
  });

  it('compares 2 listings across all dimensions', () => {
    const a = buildAnalyzedListing({ id: 'a', price: 50, distance: 5, sellerTrustScore: 80 });
    const b = buildAnalyzedListing({ id: 'b', price: 100, distance: 10, sellerTrustScore: 60 });
    const result = compareListings([a, b]);

    expect(result.listingIds).toEqual(['a', 'b']);
    expect(result.dimensions.length).toBe(7);

    // Price: a is cheaper
    const priceDim = result.dimensions.find(d => d.label === 'Price')!;
    expect(priceDim.bestId).toBe('a');

    // Distance: a is closer
    const distDim = result.dimensions.find(d => d.label === 'Distance')!;
    expect(distDim.bestId).toBe('a');

    // Trust: a has higher trust
    const trustDim = result.dimensions.find(d => d.label === 'Seller Trust')!;
    expect(trustDim.bestId).toBe('a');
  });

  it('recommends listing with most wins', () => {
    const a = buildAnalyzedListing({ id: 'a', price: 50, distance: 5, sellerTrustScore: 90, heatScore: 80 });
    const b = buildAnalyzedListing({ id: 'b', price: 100, distance: 10, sellerTrustScore: 60, heatScore: 40 });
    const result = compareListings([a, b]);
    expect(result.recommendedId).toBe('a');
  });

  it('handles missing values as N/A', () => {
    const a = buildAnalyzedListing({ id: 'a', price: null });
    const b = buildAnalyzedListing({ id: 'b', price: 50 });
    const result = compareListings([a, b]);
    const priceDim = result.dimensions.find(d => d.label === 'Price')!;
    expect(priceDim.values['a']).toBe('N/A');
  });

  it('generates summary text', () => {
    const a = buildAnalyzedListing({ id: 'a', price: 50, sellerTrustScore: 90 });
    const b = buildAnalyzedListing({ id: 'b', price: 100, sellerTrustScore: 30 });
    const result = compareListings([a, b]);
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('handles all null values gracefully', () => {
    const a = buildAnalyzedListing({ id: 'a', price: null, distance: null });
    const b = buildAnalyzedListing({ id: 'b', price: null, distance: null });
    const result = compareListings([a, b]);
    expect(result.dimensions.length).toBe(7);
  });
});
