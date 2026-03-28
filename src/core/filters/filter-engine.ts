/**
 * Composable filter pipeline that applies all active filters to a listing set.
 * Reads from the FilterRegistry and applies filters in sequence, tracking
 * before/after counts for each filter.
 *
 * @module filter-engine
 */

import type { IFilter } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';

/** Result of applying the filter pipeline */
export interface FilterResult {
  /** Filtered listings */
  listings: Listing[];
  /** Total listings before filtering */
  totalBefore: number;
  /** Total listings after filtering */
  totalAfter: number;
  /** IDs of filters that were applied */
  filtersApplied: string[];
  /** Per-filter breakdown: how many each filter removed */
  breakdown: FilterBreakdownEntry[];
}

/** Stats for a single filter's effect */
export interface FilterBreakdownEntry {
  filterId: string;
  filterName: string;
  inputCount: number;
  outputCount: number;
  removed: number;
}

/**
 * Composes all active filters into a sequential pipeline.
 * Each filter receives the output of the previous filter.
 *
 * @example
 * ```typescript
 * const engine = new FilterEngine(filterRegistry);
 * const activeFilters = new Map([
 *   ['keyword-include', { keywords: 'dresser, nightstand' }],
 *   ['price-range', { min: 20, max: 200 }],
 * ]);
 * const result = engine.apply(allListings, activeFilters);
 * console.log(`${result.totalAfter} of ${result.totalBefore} shown`);
 * ```
 */
export class FilterEngine {
  constructor(private registry: { get(id: string): IFilter | undefined }) {}

  /**
   * Apply all active filters to a list of listings.
   *
   * @param listings - The full set of listings to filter
   * @param activeFilters - Map of filter ID to its configuration
   * @returns FilterResult with filtered listings and statistics
   */
  apply(listings: Listing[], activeFilters: Map<string, Record<string, unknown>>): FilterResult {
    let result = [...listings];
    const applied: string[] = [];
    const breakdown: FilterBreakdownEntry[] = [];

    for (const [filterId, config] of activeFilters) {
      const filter = this.registry.get(filterId);
      if (!filter) continue;

      const inputCount = result.length;
      result = result.filter((listing) => filter.apply(listing, config).keep);
      const outputCount = result.length;

      applied.push(filterId);
      breakdown.push({
        filterId,
        filterName: filter.displayName,
        inputCount,
        outputCount,
        removed: inputCount - outputCount,
      });
    }

    return {
      listings: result,
      totalBefore: listings.length,
      totalAfter: result.length,
      filtersApplied: applied,
      breakdown,
    };
  }
}
