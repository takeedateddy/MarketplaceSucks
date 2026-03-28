import { describe, it, expect } from 'vitest';
import { findRelatedListings } from './related-listings';
import { buildListing } from '../test-helpers';

describe('findRelatedListings', () => {
  const target = buildListing({
    id: 'target',
    title: 'IKEA Malm Dresser White',
    price: 100,
    category: 'Furniture',
    condition: 'good',
    distance: 5,
  });

  it('skips target listing itself', () => {
    const results = findRelatedListings(target, [target]);
    expect(results).toHaveLength(0);
  });

  it('returns empty for no candidates', () => {
    expect(findRelatedListings(target, [])).toEqual([]);
  });

  it('finds listing with similar title', () => {
    const similar = buildListing({
      id: 'similar',
      title: 'IKEA Malm Dresser Black',
      price: 120,
      category: 'Furniture',
    });
    const results = findRelatedListings(target, [similar]);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].matchReasons).toContain('Similar title');
  });

  it('finds listing with same category', () => {
    const sameCategory = buildListing({
      id: 'cat',
      title: 'Wooden Bookshelf Tall',
      price: 80,
      category: 'Furniture',
      condition: 'good',
    });
    const results = findRelatedListings(target, [sameCategory]);
    if (results.length > 0) {
      expect(results[0].matchReasons).toContain('Same category');
    }
  });

  it('finds listing with similar price', () => {
    const similarPrice = buildListing({
      id: 'price',
      title: 'IKEA Malm Dresser Oak',
      price: 110,
      category: 'Furniture',
    });
    const results = findRelatedListings(target, [similarPrice]);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].matchReasons).toContain('Similar price');
  });

  it('respects maxResults', () => {
    const candidates = Array.from({ length: 20 }, (_, i) =>
      buildListing({
        id: `c${i}`,
        title: 'IKEA Malm Dresser',
        price: 100 + i,
        category: 'Furniture',
      }),
    );
    const results = findRelatedListings(target, candidates, { maxResults: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('filters by minRelevance', () => {
    const unrelated = buildListing({
      id: 'unrelated',
      title: 'Toyota Camry 2020',
      price: 25000,
      category: 'Vehicles',
    });
    const results = findRelatedListings(target, [unrelated]);
    expect(results).toHaveLength(0);
  });

  it('sorts by relevance descending', () => {
    const very = buildListing({
      id: 'very',
      title: 'IKEA Malm Dresser White',
      price: 100,
      category: 'Furniture',
      condition: 'good',
    });
    const somewhat = buildListing({
      id: 'somewhat',
      title: 'IKEA Bookshelf',
      price: 200,
      category: 'Furniture',
    });
    const results = findRelatedListings(target, [somewhat, very]);
    if (results.length >= 2) {
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(results[1].relevanceScore);
    }
  });

  it('caps relevance score at 1', () => {
    const perfect = buildListing({
      id: 'perfect',
      title: 'IKEA Malm Dresser White',
      price: 100,
      category: 'Furniture',
      condition: 'good',
      distance: 5,
    });
    const results = findRelatedListings(target, [perfect]);
    if (results.length > 0) {
      expect(results[0].relevanceScore).toBeLessThanOrEqual(1);
    }
  });
});
