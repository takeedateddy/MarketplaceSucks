/**
 * @module data/db
 *
 * IndexedDB wrapper for the MarketplaceSucks Chrome extension.
 *
 * Provides the {@link IndexedDBAdapter} class that manages the lifecycle of the
 * IndexedDB connection, applies schema migrations, and exposes the underlying
 * `IDBPDatabase` for use by repository classes.
 *
 * Uses the `idb` library for a Promise-based IndexedDB API.
 *
 * @example
 * ```ts
 * import { IndexedDBAdapter } from "@/data/db";
 *
 * const adapter = new IndexedDBAdapter();
 * await adapter.init();
 * const db = adapter.getDB();
 * // pass `db` to repositories
 * adapter.close();
 * ```
 */

import { openDB, IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION } from "@/data/db-schema";
import { applyV1Migration } from "@/data/migrations/v1";

/**
 * IndexedDB adapter that manages database creation, migrations, and access.
 *
 * Implements a lazy-initialization pattern: call {@link init} once at startup,
 * then use {@link getDB} to obtain the database handle for repository
 * construction.
 *
 * @example
 * ```ts
 * const adapter = new IndexedDBAdapter();
 * await adapter.init();
 *
 * const db = adapter.getDB();
 * const listingRepo = new ListingRepository(db);
 *
 * // When shutting down:
 * adapter.close();
 * ```
 */
export class IndexedDBAdapter {
  /** The open database instance, or `null` if not yet initialized. */
  private db: IDBPDatabase | null = null;

  /**
   * Open the IndexedDB database and apply any pending migrations.
   *
   * This method is idempotent -- calling it multiple times returns the
   * same database instance without reopening.
   *
   * @returns A promise that resolves when the database is ready.
   * @throws {Error} If the database cannot be opened.
   *
   * @example
   * ```ts
   * const adapter = new IndexedDBAdapter();
   * await adapter.init();
   * ```
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          if (oldVersion < 1) {
            applyV1Migration(db as unknown as IDBDatabase);
          }
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown IndexedDB error";
      console.warn(`[MarketplaceSucks] Failed to open IndexedDB: ${message}`);
      throw new Error(`Failed to initialize IndexedDB: ${message}`);
    }
  }

  /**
   * Get the open database instance.
   *
   * @returns The `IDBPDatabase` handle.
   * @throws {Error} If {@link init} has not been called yet.
   *
   * @example
   * ```ts
   * const db = adapter.getDB();
   * const tx = db.transaction("listings", "readonly");
   * ```
   */
  getDB(): IDBPDatabase {
    if (!this.db) {
      throw new Error(
        "IndexedDBAdapter has not been initialized. Call init() first.",
      );
    }
    return this.db;
  }

  /**
   * Close the database connection and release resources.
   *
   * After calling this method, {@link getDB} will throw until {@link init}
   * is called again.
   *
   * @example
   * ```ts
   * adapter.close();
   * ```
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
