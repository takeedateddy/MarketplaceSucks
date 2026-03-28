/**
 * In-memory listing cache with LRU eviction policy.
 *
 * Wraps the generic LRU cache with listing-specific convenience methods
 * and a configurable memory cap. Prevents unbounded memory growth when
 * users scroll through thousands of listings in a session.
 *
 * @module listing-cache
 */

import type { Listing } from '@/core/models/listing';
import { LRUCache } from '@/core/utils/perf-utils';

/** Default maximum number of listings to keep in memory */
const DEFAULT_MAX_LISTINGS = 1000;

/**
 * A listing-specific LRU cache that evicts oldest entries when
 * the capacity is exceeded.
 */
export class ListingCache {
  private readonly cache: LRUCache<string, Listing>;
  private readonly maxSize: number;

  constructor(maxSize: number = DEFAULT_MAX_LISTINGS) {
    this.maxSize = maxSize;
    this.cache = new LRUCache<string, Listing>(maxSize);
  }

  /** Add or update a listing in the cache. */
  set(listing: Listing): void {
    this.cache.set(listing.id, listing);
  }

  /** Retrieve a listing by ID. Returns undefined if not cached. */
  get(id: string): Listing | undefined {
    return this.cache.get(id);
  }

  /** Add multiple listings at once. */
  addAll(listings: Listing[]): void {
    for (const listing of listings) {
      this.cache.set(listing.id, listing);
    }
  }

  /** Get all cached listings (oldest to newest). */
  getAll(): Listing[] {
    return this.cache.keys().map((key) => this.cache.get(key)!).filter(Boolean);
  }

  /** Check if a listing is cached. */
  has(id: string): boolean {
    return this.cache.has(id);
  }

  /** Remove a listing from the cache. */
  remove(id: string): void {
    this.cache.delete(id);
  }

  /** Clear all cached listings. */
  clear(): void {
    this.cache.clear();
  }

  /** Number of listings currently cached. */
  get size(): number {
    return this.cache.size;
  }

  /** Maximum number of listings this cache will hold. */
  get capacity(): number {
    return this.maxSize;
  }

  /** Whether the cache is at capacity. */
  get isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }
}
