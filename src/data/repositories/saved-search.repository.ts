/**
 * @module data/repositories/saved-search
 *
 * CRUD repository for {@link SavedSearch} objects stored in the
 * `savedSearches` IndexedDB object store.
 *
 * Provides methods for saving, retrieving, deleting, and managing
 * user-saved search configurations.
 *
 * @example
 * ```ts
 * import { SavedSearchRepository } from "@/data/repositories/saved-search.repository";
 *
 * const repo = new SavedSearchRepository(db);
 * await repo.save(search);
 * const pinned = await repo.getPinned();
 * ```
 */

import { IDBPDatabase } from "idb";
import { STORE_NAMES, SavedSearch } from "@/data/db-schema";

/**
 * Repository for persisting and querying {@link SavedSearch} objects.
 *
 * All methods are asynchronous and handle errors gracefully by logging
 * warnings and returning safe default values.
 *
 * @example
 * ```ts
 * const repo = new SavedSearchRepository(db);
 * await repo.save(search);
 * const all = await repo.getAll();
 * ```
 */
export class SavedSearchRepository {
  /** The IndexedDB database handle. */
  private readonly db: IDBPDatabase;

  /**
   * Create a new SavedSearchRepository.
   *
   * @param db - An open `IDBPDatabase` instance.
   *
   * @example
   * ```ts
   * const repo = new SavedSearchRepository(db);
   * ```
   */
  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  /**
   * Save a saved search to the database.
   *
   * If a record with the same `id` already exists, it will be overwritten.
   *
   * @param search - The saved search to persist.
   * @returns A promise that resolves when the record is saved.
   *
   * @example
   * ```ts
   * await repo.save({
   *   id: "search-1",
   *   name: "Cheap iPhones",
   *   filters: { maxPrice: 500, condition: "like_new" },
   *   sortOrder: "price_asc",
   *   keywords: "iphone",
   *   pinned: true,
   *   createdAt: "2024-01-15T10:00:00.000Z",
   *   lastUsedAt: "2024-01-15T12:00:00.000Z",
   * });
   * ```
   */
  async save(search: SavedSearch): Promise<void> {
    try {
      await this.db.put(STORE_NAMES.savedSearches, search);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SavedSearchRepository] Failed to save search "${search.id}": ${message}`,
      );
    }
  }

  /**
   * Retrieve a saved search by its unique identifier.
   *
   * @param id - The saved search ID to look up.
   * @returns The saved search, or `null` if not found.
   *
   * @example
   * ```ts
   * const search = await repo.getById("search-1");
   * if (search) {
   *   console.log(search.name);
   * }
   * ```
   */
  async getById(id: string): Promise<SavedSearch | null> {
    try {
      const record = await this.db.get(STORE_NAMES.savedSearches, id);
      return (record as SavedSearch | undefined) ?? null;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SavedSearchRepository] Failed to get search "${id}": ${message}`,
      );
      return null;
    }
  }

  /**
   * Retrieve all saved searches from the database.
   *
   * @returns An array of all stored saved searches.
   *
   * @example
   * ```ts
   * const allSearches = await repo.getAll();
   * console.log(`Total saved searches: ${allSearches.length}`);
   * ```
   */
  async getAll(): Promise<SavedSearch[]> {
    try {
      const records = await this.db.getAll(STORE_NAMES.savedSearches);
      return records as SavedSearch[];
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SavedSearchRepository] Failed to get all searches: ${message}`,
      );
      return [];
    }
  }

  /**
   * Retrieve all pinned saved searches.
   *
   * Performs a full scan and filters for records where `pinned` is `true`.
   *
   * @returns An array of pinned saved searches.
   *
   * @example
   * ```ts
   * const pinned = await repo.getPinned();
   * console.log(`${pinned.length} pinned searches`);
   * ```
   */
  async getPinned(): Promise<SavedSearch[]> {
    try {
      const allRecords = await this.db.getAll(STORE_NAMES.savedSearches);
      return (allRecords as SavedSearch[]).filter((search) => search.pinned);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SavedSearchRepository] Failed to get pinned searches: ${message}`,
      );
      return [];
    }
  }

  /**
   * Delete a saved search by its unique identifier.
   *
   * No-op if the record does not exist.
   *
   * @param id - The saved search ID to delete.
   * @returns A promise that resolves when the record is deleted.
   *
   * @example
   * ```ts
   * await repo.delete("search-1");
   * ```
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(STORE_NAMES.savedSearches, id);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SavedSearchRepository] Failed to delete search "${id}": ${message}`,
      );
    }
  }

  /**
   * Update the `lastUsedAt` timestamp for a saved search to the current time.
   *
   * @param id - The saved search ID to update.
   * @returns A promise that resolves when the update is complete.
   *
   * @example
   * ```ts
   * await repo.updateLastUsed("search-1");
   * ```
   */
  async updateLastUsed(id: string): Promise<void> {
    try {
      const record = await this.db.get(STORE_NAMES.savedSearches, id);
      if (!record) {
        console.warn(
          `[SavedSearchRepository] Cannot update lastUsedAt: search "${id}" not found`,
        );
        return;
      }

      const updated: SavedSearch = {
        ...(record as SavedSearch),
        lastUsedAt: new Date().toISOString(),
      };
      await this.db.put(STORE_NAMES.savedSearches, updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SavedSearchRepository] Failed to update lastUsedAt for "${id}": ${message}`,
      );
    }
  }
}
