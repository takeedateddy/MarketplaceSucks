/**
 * @module data/repositories/seller
 *
 * CRUD repository for {@link SellerProfile} objects stored in the
 * `sellers` IndexedDB object store.
 *
 * Provides methods for saving, retrieving by ID or profile URL, and
 * checking data staleness for seller profiles.
 *
 * @example
 * ```ts
 * import { SellerRepository } from "@/data/repositories/seller.repository";
 *
 * const repo = new SellerRepository(db);
 * await repo.save(sellerProfile);
 * const seller = await repo.getByUrl("https://facebook.com/marketplace/profile/42");
 * ```
 */

import { IDBPDatabase } from "idb";
import { STORE_NAMES, SellerProfile } from "@/data/db-schema";

/**
 * Repository for persisting and querying {@link SellerProfile} objects.
 *
 * All methods are asynchronous and handle errors gracefully by logging
 * warnings and returning safe default values.
 *
 * @example
 * ```ts
 * const repo = new SellerRepository(db);
 * await repo.save(profile);
 * const stale = await repo.isStale("seller-42", 7);
 * ```
 */
export class SellerRepository {
  /** The IndexedDB database handle. */
  private readonly db: IDBPDatabase;

  /**
   * Create a new SellerRepository.
   *
   * @param db - An open `IDBPDatabase` instance.
   *
   * @example
   * ```ts
   * const repo = new SellerRepository(db);
   * ```
   */
  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  /**
   * Save a seller profile to the database.
   *
   * If a profile with the same `id` already exists, it will be overwritten.
   *
   * @param seller - The seller profile to persist.
   * @returns A promise that resolves when the record is saved.
   *
   * @example
   * ```ts
   * await repo.save({
   *   id: "seller-42",
   *   name: "Jane D.",
   *   profileUrl: "https://facebook.com/marketplace/profile/42",
   *   accountAge: "Joined in 2018",
   *   accountAgeMonths: 72,
   *   rating: 4.8,
   *   ratingCount: 23,
   *   responseRate: "Very responsive",
   *   responseTime: "Replies within an hour",
   *   hasProfilePhoto: true,
   *   hasCoverPhoto: false,
   *   hasLocation: true,
   *   hasBio: true,
   *   activeListingCount: 5,
   *   trustScore: 85,
   *   trustScoreBreakdown: { accountAge: 20, rating: 25 },
   *   lastUpdated: "2024-01-15T12:00:00.000Z",
   * });
   * ```
   */
  async save(seller: SellerProfile): Promise<void> {
    try {
      await this.db.put(STORE_NAMES.sellers, seller);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SellerRepository] Failed to save seller "${seller.id}": ${message}`,
      );
    }
  }

  /**
   * Retrieve a seller profile by its unique identifier.
   *
   * @param id - The seller ID to look up.
   * @returns The seller profile, or `null` if not found.
   *
   * @example
   * ```ts
   * const seller = await repo.getById("seller-42");
   * if (seller) {
   *   console.log(seller.name);
   * }
   * ```
   */
  async getById(id: string): Promise<SellerProfile | null> {
    try {
      const record = await this.db.get(STORE_NAMES.sellers, id);
      return (record as SellerProfile | undefined) ?? null;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SellerRepository] Failed to get seller "${id}": ${message}`,
      );
      return null;
    }
  }

  /**
   * Retrieve a seller profile by their Marketplace profile URL.
   *
   * Uses the `profileUrl` index for efficient lookup.
   *
   * @param profileUrl - The seller's profile URL.
   * @returns The seller profile, or `null` if not found.
   *
   * @example
   * ```ts
   * const seller = await repo.getByUrl("https://facebook.com/marketplace/profile/42");
   * ```
   */
  async getByUrl(profileUrl: string): Promise<SellerProfile | null> {
    try {
      const record = await this.db.getFromIndex(
        STORE_NAMES.sellers,
        "profileUrl",
        profileUrl,
      );
      return (record as SellerProfile | undefined) ?? null;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SellerRepository] Failed to get seller by URL "${profileUrl}": ${message}`,
      );
      return null;
    }
  }

  /**
   * Check whether a seller profile is stale and should be refreshed.
   *
   * A profile is considered stale if its `lastUpdated` timestamp is older
   * than the specified number of days from now.
   *
   * @param id - The seller ID to check.
   * @param maxAgeDays - Maximum allowed age in days before the profile
   *   is considered stale.
   * @returns `true` if the profile is stale or does not exist, `false` if fresh.
   *
   * @example
   * ```ts
   * if (await repo.isStale("seller-42", 7)) {
   *   // Re-fetch seller data from Facebook
   * }
   * ```
   */
  async isStale(id: string, maxAgeDays: number): Promise<boolean> {
    try {
      const seller = await this.getById(id);
      if (!seller) {
        return true;
      }

      const lastUpdated = new Date(seller.lastUpdated).getTime();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      return Date.now() - lastUpdated > maxAgeMs;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[SellerRepository] Failed to check staleness for "${id}": ${message}`,
      );
      return true;
    }
  }
}
