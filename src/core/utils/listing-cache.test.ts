import { describe, it, expect } from 'vitest';
import { ListingCache } from './listing-cache';
import { buildListing } from '../test-helpers';

describe('ListingCache', () => {
  it('stores and retrieves listings by ID', () => {
    const cache = new ListingCache(10);
    const listing = buildListing({ id: 'abc' });
    cache.set(listing);
    expect(cache.get('abc')).toBe(listing);
  });

  it('returns undefined for missing listings', () => {
    const cache = new ListingCache(10);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts oldest listings when over capacity', () => {
    const cache = new ListingCache(3);
    cache.set(buildListing({ id: '1', title: 'A' }));
    cache.set(buildListing({ id: '2', title: 'B' }));
    cache.set(buildListing({ id: '3', title: 'C' }));
    cache.set(buildListing({ id: '4', title: 'D' })); // evicts '1'
    expect(cache.get('1')).toBeUndefined();
    expect(cache.get('2')).toBeDefined();
    expect(cache.size).toBe(3);
  });

  it('addAll adds multiple listings', () => {
    const cache = new ListingCache(10);
    const listings = [
      buildListing({ id: 'a' }),
      buildListing({ id: 'b' }),
      buildListing({ id: 'c' }),
    ];
    cache.addAll(listings);
    expect(cache.size).toBe(3);
    expect(cache.has('b')).toBe(true);
  });

  it('getAll returns all listings', () => {
    const cache = new ListingCache(10);
    cache.set(buildListing({ id: 'x' }));
    cache.set(buildListing({ id: 'y' }));
    const all = cache.getAll();
    expect(all).toHaveLength(2);
  });

  it('remove deletes a listing', () => {
    const cache = new ListingCache(10);
    cache.set(buildListing({ id: 'r' }));
    cache.remove('r');
    expect(cache.has('r')).toBe(false);
    expect(cache.size).toBe(0);
  });

  it('clear empties the cache', () => {
    const cache = new ListingCache(10);
    cache.set(buildListing({ id: 'a' }));
    cache.set(buildListing({ id: 'b' }));
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('isFull reflects capacity', () => {
    const cache = new ListingCache(2);
    expect(cache.isFull).toBe(false);
    cache.set(buildListing({ id: '1' }));
    cache.set(buildListing({ id: '2' }));
    expect(cache.isFull).toBe(true);
  });

  it('capacity returns max size', () => {
    const cache = new ListingCache(500);
    expect(cache.capacity).toBe(500);
  });

  it('defaults to 1000 max size', () => {
    const cache = new ListingCache();
    expect(cache.capacity).toBe(1000);
  });
});
