/**
 * Central registry for all sorter implementations. Mirrors the FilterRegistry
 * pattern for pluggable, dynamically-discoverable sort options.
 *
 * @module sort-registry
 */

import type { ISorter } from '@/core/interfaces/sorter.interface';

/**
 * Registry that manages all available sorter implementations.
 *
 * @example
 * ```typescript
 * import { sortRegistry } from '@/core/sorters/sort-registry';
 * const allSorters = sortRegistry.getAll();
 * ```
 */
class SortRegistry {
  private sorters: Map<string, ISorter> = new Map();

  /**
   * Register a sorter implementation.
   *
   * @param sorter - The sorter to register
   */
  register(sorter: ISorter): void {
    if (this.sorters.has(sorter.id)) {
      console.warn(`[MPS] Sorter "${sorter.id}" is already registered. Overwriting.`);
    }
    this.sorters.set(sorter.id, sorter);
  }

  /**
   * Unregister a sorter by ID.
   *
   * @param id - The sorter ID to unregister
   */
  unregister(id: string): void {
    this.sorters.delete(id);
  }

  /**
   * Get all registered sorters.
   *
   * @returns Array of all registered sorters
   */
  getAll(): ISorter[] {
    return Array.from(this.sorters.values());
  }

  /**
   * Get a specific sorter by ID.
   *
   * @param id - The sorter ID
   * @returns The sorter, or undefined if not found
   */
  get(id: string): ISorter | undefined {
    return this.sorters.get(id);
  }

  /**
   * Check if a sorter is registered.
   *
   * @param id - The sorter ID
   */
  has(id: string): boolean {
    return this.sorters.has(id);
  }

  /** Number of registered sorters */
  get size(): number {
    return this.sorters.size;
  }
}

/** Global singleton sort registry */
export const sortRegistry = new SortRegistry();
