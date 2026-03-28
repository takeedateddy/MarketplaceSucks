import { describe, it, expect } from 'vitest';
import { SortEngine } from './sort-engine';
import { PriceSorter } from './sorters';
import { buildListing } from '../test-helpers';

function buildRegistry() {
  const priceSorter = new PriceSorter();
  const sorters = new Map([[priceSorter.id, priceSorter]]);
  return { get: (id: string) => sorters.get(id) };
}

describe('SortEngine', () => {
  it('sorts listings with known sorter', () => {
    const engine = new SortEngine(buildRegistry());
    const listings = [
      buildListing({ id: '1', title: 'A', price: 200 }),
      buildListing({ id: '2', title: 'B', price: 50 }),
      buildListing({ id: '3', title: 'C', price: 100 }),
    ];
    const result = engine.apply(listings, 'price', 'asc');
    expect(result.listings[0].price).toBe(50);
    expect(result.listings[1].price).toBe(100);
    expect(result.listings[2].price).toBe(200);
    expect(result.sorterId).toBe('price');
    expect(result.direction).toBe('asc');
  });

  it('returns unsorted copy for unknown sorter', () => {
    const engine = new SortEngine(buildRegistry());
    const listings = [
      buildListing({ id: '1', price: 200 }),
      buildListing({ id: '2', price: 50 }),
    ];
    const result = engine.apply(listings, 'nonexistent', 'asc');
    expect(result.listings).toHaveLength(2);
    expect(result.listings[0].price).toBe(200); // order preserved
  });

  it('does not mutate original array', () => {
    const engine = new SortEngine(buildRegistry());
    const listings = [
      buildListing({ id: '1', price: 200 }),
      buildListing({ id: '2', price: 50 }),
    ];
    const original = [...listings];
    engine.apply(listings, 'price', 'asc');
    expect(listings[0]).toBe(original[0]); // original unchanged
  });
});
