/**
 * @module core/interfaces/sorter
 *
 * Defines the {@link ISorter} contract that every listing sorter must implement.
 *
 * Sorters reorder filtered listing results according to a specific criterion
 * (e.g. price, date posted, distance). Each sorter declares a default
 * direction and exposes a pure comparison function.
 *
 * @example
 * ```ts
 * import type { ISorter, SortDirection } from "@/core/interfaces/sorter.interface";
 *
 * const priceSorter: ISorter = {
 *   id: "price",
 *   displayName: "Price",
 *   defaultDirection: "asc",
 *   sort(a, b, direction) {
 *     const diff = (a.price ?? 0) - (b.price ?? 0);
 *     return direction === "asc" ? diff : -diff;
 *   },
 * };
 * ```
 */

import type { Listing } from "@/core/models/listing";

/**
 * Sort direction: ascending or descending.
 */
export type SortDirection = "asc" | "desc";

/**
 * Contract that every listing sorter must satisfy.
 *
 * Sorters are stateless comparison functions. The extension pipeline calls
 * {@link ISorter.sort} with the user's chosen direction and uses the result
 * with `Array.prototype.sort`.
 *
 * @example
 * ```ts
 * const sorted = listings.slice().sort((a, b) => sorter.sort(a, b, "desc"));
 * ```
 */
export interface ISorter {
  /**
   * Unique, stable identifier for this sorter.
   *
   * Must be a kebab-case string that never changes across versions so that
   * persisted user preferences remain valid.
   *
   * @example "price"
   */
  readonly id: string;

  /**
   * Human-readable name shown in the extension UI.
   *
   * @example "Price"
   */
  readonly displayName: string;

  /**
   * The default sort direction when the user first selects this sorter.
   *
   * @example "asc"
   */
  readonly defaultDirection: SortDirection;

  /**
   * Compare two listings according to this sorter's criterion.
   *
   * Must return a negative number if `a` should come before `b`, a positive
   * number if `a` should come after `b`, or zero if they are equivalent.
   *
   * @param a         - The first listing to compare.
   * @param b         - The second listing to compare.
   * @param direction - The sort direction requested by the user.
   * @returns A comparison value compatible with `Array.prototype.sort`.
   *
   * @example
   * ```ts
   * const result = sorter.sort(listingA, listingB, "desc");
   * ```
   */
  sort(a: Listing, b: Listing, direction: SortDirection): number;
}
