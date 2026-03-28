/**
 * @module data/repositories/engagement
 *
 * CRUD repository for {@link EngagementSnapshot} objects stored in the
 * `engagement` IndexedDB object store.
 *
 * Provides methods for saving snapshots, retrieving engagement history
 * and the latest snapshot for a listing, and cleaning up old records.
 *
 * @example
 * ```ts
 * import { EngagementRepository } from "@/data/repositories/engagement.repository";
 *
 * const repo = new EngagementRepository(db);
 * await repo.save(snapshot);
 * const history = await repo.getHistory("12345");
 * ```
 */

import { IDBPDatabase } from "idb";
import { STORE_NAMES, EngagementSnapshot } from "@/data/db-schema";

/**
 * Repository for persisting and querying {@link EngagementSnapshot} objects.
 *
 * All methods are asynchronous and handle errors gracefully by logging
 * warnings and returning safe default values.
 *
 * @example
 * ```ts
 * const repo = new EngagementRepository(db);
 * await repo.save(snapshot);
 * const latest = await repo.getLatest("12345");
 * ```
 */
export class EngagementRepository {
  /** The IndexedDB database handle. */
  private readonly db: IDBPDatabase;

  /**
   * Create a new EngagementRepository.
   *
   * @param db - An open `IDBPDatabase` instance.
   *
   * @example
   * ```ts
   * const repo = new EngagementRepository(db);
   * ```
   */
  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  /**
   * Save an engagement snapshot to the database.
   *
   * If a record with the same `id` already exists, it will be overwritten.
   *
   * @param snapshot - The engagement snapshot to persist.
   * @returns A promise that resolves when the record is saved.
   *
   * @example
   * ```ts
   * await repo.save({
   *   id: "12345-2024-01-15T12:00:00.000Z",
   *   listingId: "12345",
   *   saves: 10,
   *   comments: 3,
   *   views: 200,
   *   searchPosition: 5,
   *   observedAt: "2024-01-15T12:00:00.000Z",
   * });
   * ```
   */
  async save(snapshot: EngagementSnapshot): Promise<void> {
    try {
      await this.db.put(STORE_NAMES.engagement, snapshot);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[EngagementRepository] Failed to save snapshot "${snapshot.id}": ${message}`,
      );
    }
  }

  /**
   * Retrieve the full engagement history for a listing.
   *
   * Returns all snapshots for the given listing, sorted by `observedAt`
   * in ascending order (oldest first).
   *
   * @param listingId - The listing ID to get history for.
   * @returns An array of engagement snapshots sorted chronologically.
   *
   * @example
   * ```ts
   * const history = await repo.getHistory("12345");
   * for (const snap of history) {
   *   console.log(`${snap.observedAt}: ${snap.saves} saves, ${snap.views} views`);
   * }
   * ```
   */
  async getHistory(listingId: string): Promise<EngagementSnapshot[]> {
    try {
      const records = await this.db.getAllFromIndex(
        STORE_NAMES.engagement,
        "listingId",
        listingId,
      );
      const typed = records as EngagementSnapshot[];
      typed.sort(
        (a, b) =>
          new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
      );
      return typed;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[EngagementRepository] Failed to get history for "${listingId}": ${message}`,
      );
      return [];
    }
  }

  /**
   * Retrieve the most recent engagement snapshot for a listing.
   *
   * @param listingId - The listing ID to get the latest snapshot for.
   * @returns The most recent engagement snapshot, or `null` if none exist.
   *
   * @example
   * ```ts
   * const latest = await repo.getLatest("12345");
   * if (latest) {
   *   console.log(`Current saves: ${latest.saves}`);
   * }
   * ```
   */
  async getLatest(listingId: string): Promise<EngagementSnapshot | null> {
    try {
      const history = await this.getHistory(listingId);
      if (history.length === 0) {
        return null;
      }
      return history[history.length - 1];
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[EngagementRepository] Failed to get latest for "${listingId}": ${message}`,
      );
      return null;
    }
  }

  /**
   * Delete all engagement snapshots observed before the given date.
   *
   * @param date - ISO 8601 date string. Records with `observedAt` before
   *   this date will be deleted.
   * @returns The number of records deleted.
   *
   * @example
   * ```ts
   * const deleted = await repo.deleteOlderThan("2024-01-01T00:00:00.000Z");
   * console.log(`Cleaned up ${deleted} old engagement snapshots`);
   * ```
   */
  async deleteOlderThan(date: string): Promise<number> {
    try {
      const cutoff = new Date(date).getTime();
      const tx = this.db.transaction(STORE_NAMES.engagement, "readwrite");
      const store = tx.objectStore(STORE_NAMES.engagement);
      const index = store.index("observedAt");
      let cursor = await index.openCursor();
      let deletedCount = 0;

      while (cursor) {
        const record = cursor.value as EngagementSnapshot;
        if (new Date(record.observedAt).getTime() < cutoff) {
          await cursor.delete();
          deletedCount++;
        } else {
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
        `[EngagementRepository] Failed to delete old snapshots: ${message}`,
      );
      return 0;
    }
  }
}
