/**
 * @module data/repositories/image-hash
 *
 * CRUD repository for {@link ImageHash} objects stored in the
 * `imageHashes` IndexedDB object store.
 *
 * Provides methods for saving, querying by hash or listing ID, detecting
 * duplicate images across listings, and cleaning up old records.
 *
 * @example
 * ```ts
 * import { ImageHashRepository } from "@/data/repositories/image-hash.repository";
 *
 * const repo = new ImageHashRepository(db);
 * await repo.save(imageHash);
 * const duplicates = await repo.findDuplicates("a4e1f29c3b8d0e7a");
 * ```
 */

import { IDBPDatabase } from "idb";
import { STORE_NAMES, ImageHash } from "@/data/db-schema";

/**
 * Repository for persisting and querying {@link ImageHash} objects.
 *
 * All methods are asynchronous and handle errors gracefully by logging
 * warnings and returning safe default values.
 *
 * @example
 * ```ts
 * const repo = new ImageHashRepository(db);
 * await repo.save(hash);
 * const matches = await repo.findDuplicates("a4e1f29c3b8d0e7a");
 * ```
 */
export class ImageHashRepository {
  /** The IndexedDB database handle. */
  private readonly db: IDBPDatabase;

  /**
   * Create a new ImageHashRepository.
   *
   * @param db - An open `IDBPDatabase` instance.
   *
   * @example
   * ```ts
   * const repo = new ImageHashRepository(db);
   * ```
   */
  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  /**
   * Save an image hash record to the database.
   *
   * Uses `put` so that records with the same auto-incremented key are
   * overwritten. For new records, the key is assigned automatically.
   *
   * @param hash - The image hash record to persist.
   * @returns A promise that resolves when the record is saved.
   *
   * @example
   * ```ts
   * await repo.save({
   *   hash: "a4e1f29c3b8d0e7a",
   *   listingId: "12345",
   *   imageUrl: "https://scontent.xx.fbcdn.net/image1.jpg",
   *   aiScore: 0.12,
   *   originalityScore: 0.95,
   *   flags: [],
   *   analyzedAt: "2024-01-15T12:00:00.000Z",
   * });
   * ```
   */
  async save(hash: ImageHash): Promise<void> {
    try {
      await this.db.put(STORE_NAMES.imageHashes, hash);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ImageHashRepository] Failed to save image hash: ${message}`,
      );
    }
  }

  /**
   * Retrieve all image hash records matching a specific hash value.
   *
   * Uses the `hash` index for efficient lookup. Multiple records may
   * share the same hash if the same image appears in different listings.
   *
   * @param hash - The perceptual hash value to look up.
   * @returns An array of matching image hash records.
   *
   * @example
   * ```ts
   * const matches = await repo.getByHash("a4e1f29c3b8d0e7a");
   * ```
   */
  async getByHash(hash: string): Promise<ImageHash[]> {
    try {
      const records = await this.db.getAllFromIndex(
        STORE_NAMES.imageHashes,
        "hash",
        hash,
      );
      return records as ImageHash[];
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ImageHashRepository] Failed to get by hash "${hash}": ${message}`,
      );
      return [];
    }
  }

  /**
   * Retrieve all image hash records for a specific listing.
   *
   * Uses the `listingId` index for efficient lookup.
   *
   * @param listingId - The listing ID to look up.
   * @returns An array of image hash records for the listing.
   *
   * @example
   * ```ts
   * const hashes = await repo.getByListingId("12345");
   * console.log(`Listing has ${hashes.length} analyzed images`);
   * ```
   */
  async getByListingId(listingId: string): Promise<ImageHash[]> {
    try {
      const records = await this.db.getAllFromIndex(
        STORE_NAMES.imageHashes,
        "listingId",
        listingId,
      );
      return records as ImageHash[];
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[ImageHashRepository] Failed to get by listing "${listingId}": ${message}`,
      );
      return [];
    }
  }

  /**
   * Find duplicate images across listings by looking up a hash value.
   *
   * Returns all image hash records that share the given hash, which
   * indicates visually identical or near-identical images being used
   * in multiple listings (a potential scam signal).
   *
   * @param hash - The perceptual hash to search for duplicates.
   * @returns An array of image hash records sharing the hash.
   *
   * @example
   * ```ts
   * const duplicates = await repo.findDuplicates("a4e1f29c3b8d0e7a");
   * if (duplicates.length > 1) {
   *   console.warn("Same image used in multiple listings!");
   * }
   * ```
   */
  async findDuplicates(hash: string): Promise<ImageHash[]> {
    return this.getByHash(hash);
  }

  /**
   * Delete all image hash records analyzed before the given date.
   *
   * @param date - ISO 8601 date string. Records with `analyzedAt` before
   *   this date will be deleted.
   * @returns The number of records deleted.
   *
   * @example
   * ```ts
   * const deleted = await repo.deleteOlderThan("2024-01-01T00:00:00.000Z");
   * console.log(`Cleaned up ${deleted} old image hashes`);
   * ```
   */
  async deleteOlderThan(date: string): Promise<number> {
    try {
      const cutoff = new Date(date).getTime();
      const tx = this.db.transaction(STORE_NAMES.imageHashes, "readwrite");
      const store = tx.objectStore(STORE_NAMES.imageHashes);
      let cursor = await store.openCursor();
      let deletedCount = 0;

      while (cursor) {
        const record = cursor.value as ImageHash;
        if (new Date(record.analyzedAt).getTime() < cutoff) {
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
        `[ImageHashRepository] Failed to delete old image hashes: ${message}`,
      );
      return 0;
    }
  }
}
