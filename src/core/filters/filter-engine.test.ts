import { describe, it, expect } from 'vitest';
import { FilterEngine } from './filter-engine';
import type { IFilter } from '../interfaces/filter.interface';
import { PriceFilter } from './price-filter';
import { ConditionFilter } from './condition-filter';
import { buildListing } from '../test-helpers';

function buildRegistry() {
  const priceFilter = new PriceFilter() as unknown as IFilter;
  const conditionFilter = new ConditionFilter() as unknown as IFilter;
  const filters = new Map<string, IFilter>([
    [priceFilter.id, priceFilter],
    [conditionFilter.id, conditionFilter],
  ]);
  return { get: (id: string) => filters.get(id) };
}

describe('FilterEngine', () => {
  it('returns all listings when no active filters', () => {
    const engine = new FilterEngine(buildRegistry());
    const listings = [buildListing({ price: 50 }), buildListing({ price: 100 })];
    const result = engine.apply(listings, new Map());
    expect(result.listings).toHaveLength(2);
    expect(result.totalBefore).toBe(2);
    expect(result.totalAfter).toBe(2);
    expect(result.filtersApplied).toEqual([]);
    expect(result.breakdown).toEqual([]);
  });

  it('applies single filter', () => {
    const engine = new FilterEngine(buildRegistry());
    const listings = [
      buildListing({ id: '1', price: 50 }),
      buildListing({ id: '2', price: 200 }),
    ];
    const active = new Map([['price-range', { min: 0, max: 100 }]]);
    const result = engine.apply(listings, active);
    expect(result.listings).toHaveLength(1);
    expect(result.totalBefore).toBe(2);
    expect(result.totalAfter).toBe(1);
    expect(result.filtersApplied).toEqual(['price-range']);
  });

  it('applies filters sequentially (pipeline)', () => {
    const engine = new FilterEngine(buildRegistry());
    const listings = [
      buildListing({ id: '1', price: 50, condition: 'new' }),
      buildListing({ id: '2', price: 200, condition: 'new' }),
      buildListing({ id: '3', price: 50, condition: 'salvage' }),
    ];
    const active = new Map<string, Record<string, unknown>>([
      ['price-range', { min: 0, max: 100 }],
      ['condition', { conditions: ['new'] }],
    ]);
    const result = engine.apply(listings, active);
    expect(result.listings).toHaveLength(1); // only id=1 passes both
    expect(result.filtersApplied).toEqual(['price-range', 'condition']);
  });

  it('provides per-filter breakdown stats', () => {
    const engine = new FilterEngine(buildRegistry());
    const listings = [
      buildListing({ id: '1', price: 50 }),
      buildListing({ id: '2', price: 200 }),
      buildListing({ id: '3', price: 150 }),
    ];
    const active = new Map([['price-range', { min: 0, max: 100 }]]);
    const result = engine.apply(listings, active);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].filterId).toBe('price-range');
    expect(result.breakdown[0].inputCount).toBe(3);
    expect(result.breakdown[0].outputCount).toBe(1);
    expect(result.breakdown[0].removed).toBe(2);
  });

  it('skips unknown filter IDs', () => {
    const engine = new FilterEngine(buildRegistry());
    const listings = [buildListing({ price: 50 })];
    const active = new Map([['nonexistent-filter', { something: true }]]);
    const result = engine.apply(listings, active);
    expect(result.listings).toHaveLength(1);
    expect(result.filtersApplied).toEqual([]);
  });
});
