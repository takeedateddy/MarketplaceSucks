/**
 * @module data/repositories/price-data
 *
 * CRUD repository for {@link PriceDataPoint} objects stored in the
 * `priceData` IndexedDB object store.
 *
 * Provides methods for saving individual and batch price observations,
 * querying by category or title, finding comparable listings, and
 * cleaning up old data.
 *
 * @example
 * ```ts
 * import { PriceDataRepository } from "@/data/repositories/price-data.repository";
 *
 * const repo = new PriceDataRepository(db);
 * await repo.save(dataPoint);
 * const comparables = await repo.getComparables("iphone 14 pro", "Electronics", "like_new");
 * ```
 */

import { IDBPDatabase } from "idb";
import { STORE_NAMES, PriceDataPoint } from "@/data/db-schema";

/**
 * Repository for persisting and querying {@link PriceDataPoint} objects.
 *
 * All methods are asynchronous and handle errors gracefully by logging
 * warnings and returning safe default values.
 *
 * @example
 * ```ts
 * const repo = new PriceDataRepository(db);
 * await repo.saveBatch(dataPoints);
 * const electronics = await repo.getByCategory("Electronics");
 * ```
 */
export class PriceDataRepository {
  /** The IndexedDB database handle. */
  private readonly db: IDBPDatabase;

  /**
   * Create a new PriceDataRepository.
   *
   * @param db - An open `IDBPDatabase` instance.
   *
   * @example
   * ```ts
   * const repo = new PriceDataRepository(db);
   * ```
   */
  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  /**
   * Save a single price data point to the database.
   *
   * If a record with the same `id` already exists, it will be overwritten.
   *
   * @param dataPoint - The price data point to persist.
   * @returns A promise that resolves when the record is saved.
   *
   * @example
   * ```ts
   * await repo.save({
   *   id: "12345-2024-01-15T12:00:00.000Z",
   *   listingId: "12345",
   *   category: "Electronics",
   *   normalizedTitle: "vintage record player",
   *   condition: "good",
   *   price: 120,
   *   location: "Brooklyn, NY",
   *   observedAt: "2024-01-15T12:00:00.000Z",
   * });
   * ```
   */
  async save(dataPoint: PriceDataPoint): Promise<void> {
    try {
      await this.db.put(STORE_NAMES.priceData, dataPoint);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[PriceDataRepository] Failed to save data point "${dataPoint.id}": ${message}`,
      );
    }
  }

  /**
   * Save multiple price data points in a single transaction.
   *
   * More efficient than calling {@link save} in a loop because all writes
   * share one transaction.
   *
   * @param dataPoints - The price data points to persist.
   * @returns A promise that resolves when all records are saved.
   *
   * @example
   * ```ts
   * await repo.saveBatch([dataPoint1, dataPoint2, dataPoint3]);
   * ```
   */
  async saveBatch(dataPoints: PriceDataPoint[]): Promise<void> {
    try {
      const tx = this.db.transaction(STORE_NAMES.priceData, "readwrite");
      const store = tx.objectStore(STORE_NAMES.priceData);

      for (const dataPoint of dataPoints) {
        await store.put(dataPoint);
      }

      await tx.done;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[PriceDataRepository] Failed to save batch of ${dataPoints.length} data points: ${message}`,
      );
    }
  }

  /**
   * Retrieve all price data points for a given category.
   *
   * Uses the `category` index for efficient lookup.
   *
   * @param category - The marketplace category to filter by.
   * @returns An array of matching price data points.
   *
   * @example
   * ```ts
   * const electronics = await repo.getByCategory("Electronics");
   * ```
   */
  async getByCategory(category: string): Promise<PriceDataPoint[]> {
    try {
      const records = await this.db.getAllFromIndex(
        STORE_NAMES.priceData,
        "category",
        category,
      );
      return records as PriceDataPoint[];
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[PriceDataRepository] Failed to get data by category "${category}": ${message}`,
      );
      return [];
    }
  }

  /**
   * Retrieve all price data points matching a normalized title.
   *
   * Uses the `normalizedTitle` index for efficient lookup.
   *
   * @param normalizedTitle - The normalized title to search for.
   * @returns An array of matching price data points.
   *
   * @example
   * ```ts
   * const points = await repo.getByTitle("iphone 14 pro");
   * ```
   */
  async getByTitle(normalizedTitle: string): Promise<PriceDataPoint[]> {
    try {
      const records = await this.db.getAllFromIndex(
        STORE_NAMES.priceData,
        "normalizedTitle",
        normalizedTitle,
      );
      return records as PriceDataPoint[];
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[PriceDataRepository] Failed to get data by title "${normalizedTitle}": ${message}`,
      );
      return [];
    }
  }

  /**
   * Find comparable price data points by matching title, category, and condition.
   *
   * Retrieves data points that share the same category as the target, then
   * filters by condition match and normalized title similarity (substring match).
   *
   * @param title - The normalized title to find comparables for.
   * @param category - The marketplace category to match.
   * @param condition - The item condition to match.
   * @returns An array of comparable price data points.
   *
   * @example
   * ```ts
   * const comparables = await repo.getComparables(
   *   "iphone 14 pro",
   *   "Electronics",
   *   "like_new",
   * );
   * const avgPrice = comparables.reduce((sum, p) => sum + p.price, 0) / comparables.length;
   * ```
   */
  async getComparables(
    title: string,
    category: string,
    condition: string,
  ): Promise<PriceDataPoint[]> {
    try {
      const categoryRecords = await this.getByCategory(category);
      const normalizedQuery = title.toLowerCase().trim();

      return categoryRecords.filter(
        (record) =>
          record.condition === condition &&
          record.normalizedTitle.includes(normalizedQuery),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[PriceDataRepository] Failed to get comparables for "${title}": ${message}`,
      );
      return [];
    }
  }

  /**
   * Delete all price data points observed before the given date.
   *
   * @param date - ISO 8601 date string. Records with `observedAt` before
   *   this date will be deleted.
   * @returns The number of records deleted.
   *
   * @example
   * ```ts
   * const deleted = await repo.deleteOlderThan("2024-01-01T00:00:00.000Z");
   * console.log(`Cleaned up ${deleted} old price data points`);
   * ```
   */
  async deleteOlderThan(date: string): Promise<number> {
    try {
      const cutoff = new Date(date).getTime();
      const tx = this.db.transaction(STORE_NAMES.priceData, "readwrite");
      const store = tx.objectStore(STORE_NAMES.priceData);
      const index = store.index("observedAt");
      let cursor = await index.openCursor();
      let deletedCount = 0;

      while (cursor) {
        const record = cursor.value as PriceDataPoint;
        if (new Date(record.observedAt).getTime() < cutoff) {
          await cursor.delete();
          deletedCount++;
        } else {
          // Index is sorted, so once we pass the cutoff we can stop
          break;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      return deletedCount;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[PriceDataRepository] Failed to delete old data points: ${message}`,
      );
      return 0;
    }
  }
}
