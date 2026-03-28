/**
 * @module data/repositories/listing
 *
 * CRUD repository for {@link ListingRecord} objects stored in the
 * `listings` IndexedDB object store.
 *
 * Provides methods for saving, retrieving, searching, and managing the
 * lifecycle of marketplace listing records.
 *
 * @example
 * ```ts
 * import { ListingRepository } from "@/data/repositories/listing.repository";
 *
 * const repo = new ListingRepository(db);
 * await repo.save(listingRecord);
 * const listing = await repo.getById("12345");
 * ```
 */

import { IDBPDatabase } from "idb";
import { STORE_NAMES, ListingRecord } from "@/data/db-schema";

/**
 * Repository for persisting and querying {@link ListingRecord} objects.
 *
 * All methods are asynchronous and handle errors gracefully by logging
 * warnings and returning safe default values.
 *
 * @example
 * ```ts
 * const repo = new ListingRepository(db);
 * await repo.save(record);
 * const results = await repo.search("iphone");
 * ```
 */
export class ListingRepository {
  /** The IndexedDB database handle. */
  private readonly db: IDBPDatabase;

  /**
   * Create a new ListingRepository.
   *
   * @param db - An open `IDBPDatabase` instance.
   *
   * @example
   * ```ts
   * const repo = new ListingRepository(db);
   * ```
   */
  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  /**
   * Save a listing record to the database.
   *
   * If a record with the same `id` already exists, it will be overwritten.
   *
   * @param listing - The listing record to persist.
   * @returns A promise that resolves when the record is saved.
   *
   * @example
   * ```ts
   * await repo.save({
   *   id: "12345",
   *   title: "Vintage Record Player",
   *   normalizedTitle: "vintage record player",
   *   titleTokens: ["vintage", "record", "player"],
   *   category: "Electronics",
   *   condition: "good",
   *   price: 120,
   *   currency: "USD",
   *   location: "Brooklyn, NY",
   *   distance: 5,
   *   sellerName: "Jane D.",
   *   sellerProfileUrl: "https://facebook.com/marketplace/profile/111",
   *   listingUrl: "https://facebook.com/marketplace/item/12345",
   *   imageUrls: [],
   *   datePosted: "2 hours ago",
   *   firstObserved: "2024-01-15T10:00:00.000Z",
   *   lastObserved: "2024-01-15T12:00:00.000Z",
   *   disappeared: false,
   *   disappearedAt: null,
   * });
   * ```
   */
  async save(listing: ListingRecord): Promise<void> {
    try {
      await this.db.put(STORE_NAMES.listings, listing);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ListingRepository] Failed to save listing "${listing.id}": ${message}`,
      );
    }
  }

  /**
   * Retrieve a listing record by its unique identifier.
   *
   * @param id - The listing ID to look up.
   * @returns The listing record, or `null` if not found.
   *
   * @example
   * ```ts
   * const listing = await repo.getById("12345");
   * if (listing) {
   *   console.log(listing.title);
   * }
   * ```
   */
  async getById(id: string): Promise<ListingRecord | null> {
    try {
      const record = await this.db.get(STORE_NAMES.listings, id);
      return (record as ListingRecord | undefined) ?? null;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ListingRepository] Failed to get listing "${id}": ${message}`,
      );
      return null;
    }
  }

  /**
   * Retrieve all listing records from the database.
   *
   * @returns An array of all stored listing records.
   *
   * @example
   * ```ts
   * const allListings = await repo.getAll();
   * console.log(`Total listings: ${allListings.length}`);
   * ```
   */
  async getAll(): Promise<ListingRecord[]> {
    try {
      const records = await this.db.getAll(STORE_NAMES.listings);
      return records as ListingRecord[];
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ListingRepository] Failed to get all listings: ${message}`,
      );
      return [];
    }
  }

  /**
   * Search listings by matching a query string against normalized titles.
   *
   * Performs a full scan of the listings store and returns records whose
   * `normalizedTitle` contains the lowercased query string.
   *
   * @param query - The search query to match against normalized titles.
   * @returns An array of matching listing records.
   *
   * @example
   * ```ts
   * const results = await repo.search("iphone 14");
   * // Returns listings with "iphone 14" in their normalized title
   * ```
   */
  async search(query: string): Promise<ListingRecord[]> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      if (normalizedQuery.length === 0) {
        return [];
      }

      const allRecords = await this.db.getAll(STORE_NAMES.listings);
      return (allRecords as ListingRecord[]).filter((record) =>
        record.normalizedTitle.includes(normalizedQuery),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ListingRepository] Failed to search listings for "${query}": ${message}`,
      );
      return [];
    }
  }

  /**
   * Mark a listing as having disappeared from search results.
   *
   * Sets the `disappeared` flag to `true` and records the current timestamp
   * in `disappearedAt`.
   *
   * @param id - The listing ID to mark as disappeared.
   * @returns A promise that resolves when the update is complete.
   *
   * @example
   * ```ts
   * await repo.markDisappeared("12345");
   * ```
   */
  async markDisappeared(id: string): Promise<void> {
    try {
      const record = await this.db.get(STORE_NAMES.listings, id);
      if (!record) {
        console.warn(
          `[ListingRepository] Cannot mark disappeared: listing "${id}" not found`,
        );
        return;
      }

      const updated: ListingRecord = {
        ...(record as ListingRecord),
        disappeared: true,
        disappearedAt: new Date().toISOString(),
      };
      await this.db.put(STORE_NAMES.listings, updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ListingRepository] Failed to mark listing "${id}" as disappeared: ${message}`,
      );
    }
  }

  /**
   * Retrieve the most recently observed listings.
   *
   * Results are sorted by `lastObserved` in descending order (newest first).
   *
   * @param limit - Maximum number of records to return.
   * @returns An array of the most recent listing records.
   *
   * @example
   * ```ts
   * const recent = await repo.getRecent(20);
   * ```
   */
  async getRecent(limit: number): Promise<ListingRecord[]> {
    try {
      const allRecords = await this.db.getAll(STORE_NAMES.listings);
      const typed = allRecords as ListingRecord[];
      typed.sort(
        (a, b) =>
          new Date(b.lastObserved).getTime() -
          new Date(a.lastObserved).getTime(),
      );
      return typed.slice(0, limit);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ListingRepository] Failed to get recent listings: ${message}`,
      );
      return [];
    }
  }

  /**
   * Delete all listings that were last observed before the given date.
   *
   * @param date - ISO 8601 date string. Records with `lastObserved` before
   *   this date will be deleted.
   * @returns The number of records deleted.
   *
   * @example
   * ```ts
   * const deleted = await repo.deleteOlderThan("2024-01-01T00:00:00.000Z");
   * console.log(`Cleaned up ${deleted} old listings`);
   * ```
   */
  async deleteOlderThan(date: string): Promise<number> {
    try {
      const cutoff = new Date(date).getTime();
      const tx = this.db.transaction(STORE_NAMES.listings, "readwrite");
      const store = tx.objectStore(STORE_NAMES.listings);
      let cursor = await store.openCursor();
      let deletedCount = 0;

      while (cursor) {
        const record = cursor.value as ListingRecord;
        if (new Date(record.lastObserved).getTime() < cutoff) {
          await cursor.delete();
          deletedCount++;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      return deletedCount;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ListingRepository] Failed to delete old listings: ${message}`,
      );
      return 0;
    }
  }
}
