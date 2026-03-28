/**
 * All built-in sorter implementations. Each sorter implements ISorter
 * and is registered in the SortRegistry at startup.
 *
 * @module sorters
 */

import type { ISorter, SortDirection } from '@/core/interfaces/sorter.interface';
import type { Listing } from '@/core/models/listing';

/** Helper to apply direction to a comparison result */
function directed(cmp: number, direction: SortDirection): number {
  return direction === 'asc' ? cmp : -cmp;
}

/**
 * Sort by price (ascending = low to high).
 */
export class PriceSorter implements ISorter {
  readonly id = 'price';
  readonly displayName = 'Price';
  readonly defaultDirection: SortDirection = 'asc';

  sort(a: Listing, b: Listing, direction: SortDirection): number {
    return directed(a.price - b.price, direction);
  }
}

/**
 * Sort by date posted (ascending = oldest first, descending = newest first).
 */
export class DateSorter implements ISorter {
  readonly id = 'date';
  readonly displayName = 'Date Posted';
  readonly defaultDirection: SortDirection = 'desc';

  sort(a: Listing, b: Listing, direction: SortDirection): number {
    const dateA = a.parsedDate?.getTime() ?? 0;
    const dateB = b.parsedDate?.getTime() ?? 0;
    return directed(dateA - dateB, direction);
  }
}

/**
 * Sort by distance (ascending = nearest first).
 */
export class DistanceSorter implements ISorter {
  readonly id = 'distance';
  readonly displayName = 'Distance';
  readonly defaultDirection: SortDirection = 'asc';

  sort(a: Listing, b: Listing, direction: SortDirection): number {
    const distA = a.distance ?? Infinity;
    const distB = b.distance ?? Infinity;
    return directed(distA - distB, direction);
  }
}

/**
 * Sort alphabetically by title.
 */
export class AlphabeticalSorter implements ISorter {
  readonly id = 'alphabetical';
  readonly displayName = 'Alphabetical';
  readonly defaultDirection: SortDirection = 'asc';

  sort(a: Listing, b: Listing, direction: SortDirection): number {
    return directed(a.title.localeCompare(b.title), direction);
  }
}

/**
 * Sort by seller trust score (descending = highest first).
 */
export class SellerTrustSorter implements ISorter {
  readonly id = 'seller-trust';
  readonly displayName = 'Seller Trust';
  readonly defaultDirection: SortDirection = 'desc';

  sort(a: Listing, b: Listing, direction: SortDirection): number {
    const trustA = a.sellerTrustScore ?? 50;
    const trustB = b.sellerTrustScore ?? 50;
    return directed(trustA - trustB, direction);
  }
}

/**
 * Sort by price rating (descending = best deals first).
 * Uses priceRatingScore where lower = better deal.
 */
export class PriceRatingSorter implements ISorter {
  readonly id = 'price-rating';
  readonly displayName = 'Price Rating (Best Deals)';
  readonly defaultDirection: SortDirection = 'asc';

  sort(a: Listing, b: Listing, direction: SortDirection): number {
    const ratingA = a.priceRatingScore ?? 100;
    const ratingB = b.priceRatingScore ?? 100;
    return directed(ratingA - ratingB, direction);
  }
}

/**
 * Sort by heat score (descending = most popular first).
 */
export class HeatSorter implements ISorter {
  readonly id = 'heat';
  readonly displayName = 'Popularity (Heat)';
  readonly defaultDirection: SortDirection = 'desc';

  sort(a: Listing, b: Listing, direction: SortDirection): number {
    const heatA = a.heatScore ?? 0;
    const heatB = b.heatScore ?? 0;
    return directed(heatA - heatB, direction);
  }
}

/**
 * Sort by estimated selling speed (ascending = fastest selling first).
 */
export class SellingSpeedSorter implements ISorter {
  readonly id = 'selling-speed';
  readonly displayName = 'Selling Speed';
  readonly defaultDirection: SortDirection = 'asc';

  sort(a: Listing, b: Listing, direction: SortDirection): number {
    const speedA = a.estimatedDaysToSell ?? Infinity;
    const speedB = b.estimatedDaysToSell ?? Infinity;
    return directed(speedA - speedB, direction);
  }
}

/** All built-in sorters for registration */
export const ALL_SORTERS: ISorter[] = [
  new PriceSorter(),
  new DateSorter(),
  new DistanceSorter(),
  new AlphabeticalSorter(),
  new SellerTrustSorter(),
  new PriceRatingSorter(),
  new HeatSorter(),
  new SellingSpeedSorter(),
];
