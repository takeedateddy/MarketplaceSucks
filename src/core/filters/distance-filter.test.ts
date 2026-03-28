import { describe, it, expect } from 'vitest';
import { DistanceFilter } from './distance-filter';
import { buildListing } from '../test-helpers';

describe('DistanceFilter', () => {
  const filter = new DistanceFilter();

  it('passes all when maxDistance is null', () => {
    const listing = buildListing({ distance: 100 });
    const result = filter.apply(listing, { maxDistance: null });
    expect(result.keep).toBe(true);
  });

  it('keeps listing with null distance (no data)', () => {
    const listing = buildListing({ distance: null });
    const result = filter.apply(listing, { maxDistance: 10 });
    expect(result.keep).toBe(true);
  });

  it('keeps listing within range', () => {
    const listing = buildListing({ distance: 5 });
    const result = filter.apply(listing, { maxDistance: 10 });
    expect(result.keep).toBe(true);
  });

  it('keeps listing at exact boundary', () => {
    const listing = buildListing({ distance: 10 });
    const result = filter.apply(listing, { maxDistance: 10 });
    expect(result.keep).toBe(true);
  });

  it('removes listing beyond max distance', () => {
    const listing = buildListing({ distance: 15 });
    const result = filter.apply(listing, { maxDistance: 10 });
    expect(result.keep).toBe(false);
    expect(result.reason).toContain('exceeds');
  });
});
