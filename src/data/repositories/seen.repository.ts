/**
 * @module data/repositories/seen
 *
 * CRUD repository for {@link SeenListing} records in the `seenListings`
 * IndexedDB object store, used to mark listings the user has already viewed
 * across sessions.
 *
 * @example
 * ```ts
 * const repo = new SeenListingRepository(db);
 * if (await repo.has("12345")) markCardAsSeen();
 * await repo.save({ listingId: "12345", firstSeen: iso, priceAtFirstSeen: 120, currentPrice: 120, trustScoreAtFirstSeen: null });
 * ```
 */

import { IDBPDatabase } from "idb";
import { STORE_NAMES, SeenListing } from "@/data/db-schema";

/** Repository for persisting and querying {@link SeenListing} records. */
export class SeenListingRepository {
  private readonly db: IDBPDatabase;

  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  /** Persist (or update) a seen-listing record (keyed by `listingId`). */
  async save(record: SeenListing): Promise<void> {
    try {
      await this.db.put(STORE_NAMES.seenListings, record);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`[SeenListingRepository] Failed to save: ${message}`);
    }
  }

  /** Return the seen record for a listing, or null if it hasn't been seen. */
  async getById(listingId: string): Promise<SeenListing | null> {
    try {
      const record = await this.db.get(STORE_NAMES.seenListings, listingId);
      return (record as SeenListing | undefined) ?? null;
    } catch {
      return null;
    }
  }

  /** Whether a listing has been seen before. */
  async has(listingId: string): Promise<boolean> {
    try {
      const key = await this.db.getKey(STORE_NAMES.seenListings, listingId);
      return key !== undefined;
    } catch {
      return false;
    }
  }
}
