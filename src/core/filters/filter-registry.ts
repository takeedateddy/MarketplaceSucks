/**
 * Central registry for all filter implementations. Filters are registered at
 * startup and the UI reads from the registry to dynamically build filter panels.
 * Adding a new filter requires only implementing IFilter and registering it here.
 *
 * @module filter-registry
 */

import type { IFilter } from '@/core/interfaces/filter.interface';

/**
 * Registry that manages all available filter implementations.
 * Follows the registry pattern to enable pluggable, dynamically-discoverable filters.
 *
 * @example
 * ```typescript
 * import { filterRegistry } from '@/core/filters/filter-registry';
 * import { KeywordFilter } from '@/core/filters/keyword-filter';
 *
 * filterRegistry.register(new KeywordFilter());
 * const allFilters = filterRegistry.getAll();
 * const keywordFilters = filterRegistry.getByCategory('keyword');
 * ```
 */
class FilterRegistry {
  private filters: Map<string, IFilter> = new Map();

  /**
   * Register a filter implementation.
   *
   * @param filter - The filter to register
   */
  register(filter: IFilter): void {
    if (this.filters.has(filter.id)) {
      console.warn(`[MPS] Filter "${filter.id}" is already registered. Overwriting.`);
    }
    this.filters.set(filter.id, filter);
  }

  /**
   * Unregister a filter by ID.
   *
   * @param id - The filter ID to unregister
   */
  unregister(id: string): void {
    this.filters.delete(id);
  }

  /**
   * Get all registered filters.
   *
   * @returns Array of all registered filters
   */
  getAll(): IFilter[] {
    return Array.from(this.filters.values());
  }

  /**
   * Get all filters in a specific category.
   *
   * @param category - The filter category to filter by
   * @returns Array of filters in the category
   */
  getByCategory(category: string): IFilter[] {
    return this.getAll().filter((f) => f.category === category);
  }

  /**
   * Get a specific filter by ID.
   *
   * @param id - The filter ID
   * @returns The filter, or undefined if not found
   */
  get(id: string): IFilter | undefined {
    return this.filters.get(id);
  }

  /**
   * Check if a filter is registered.
   *
   * @param id - The filter ID
   * @returns Whether the filter exists in the registry
   */
  has(id: string): boolean {
    return this.filters.has(id);
  }

  /**
   * Get the number of registered filters.
   */
  get size(): number {
    return this.filters.size;
  }
}

/** Global singleton filter registry */
export const filterRegistry = new FilterRegistry();
