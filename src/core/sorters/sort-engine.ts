/**
 * Composable sort pipeline that applies the active sorter to a listing set.
 *
 * @module sort-engine
 */

import type { ISorter, SortDirection } from '@/core/interfaces/sorter.interface';
import type { Listing } from '@/core/models/listing';

/** Result of applying a sort */
export interface SortResult {
  /** Sorted listings */
  listings: Listing[];
  /** ID of the sorter used */
  sorterId: string;
  /** Direction applied */
  direction: SortDirection;
}

/**
 * Applies a sorter from the registry to a list of listings.
 *
 * @example
 * ```typescript
 * const engine = new SortEngine(sortRegistry);
 * const result = engine.apply(listings, 'price-low-to-high', 'asc');
 * ```
 */
export class SortEngine {
  constructor(private registry: { get(id: string): ISorter | undefined }) {}

  /**
   * Sort listings using the specified sorter.
   *
   * @param listings - Listings to sort
   * @param sorterId - ID of the sorter to use
   * @param direction - Sort direction
   * @returns SortResult with sorted listings
   */
  apply(listings: Listing[], sorterId: string, direction: SortDirection): SortResult {
    const sorter = this.registry.get(sorterId);
    if (!sorter) {
      return { listings: [...listings], sorterId, direction };
    }

    const sorted = [...listings].sort((a, b) => sorter.sort(a, b, direction));
    return { listings: sorted, sorterId, direction };
  }
}
