/**
 * @module data/migrations/v1
 *
 * Initial schema migration for the MarketplaceSucks IndexedDB database.
 *
 * Creates all object stores and their indexes for database version 1.
 * This migration is invoked during the `onupgradeneeded` callback when the
 * database is first created or when upgrading from a version below 1.
 *
 * @example
 * ```ts
 * import { applyV1Migration } from "@/data/migrations/v1";
 *
 * const request = indexedDB.open("MarketplaceSucks", 1);
 * request.onupgradeneeded = (event) => {
 *   const db = (event.target as IDBOpenDBRequest).result;
 *   applyV1Migration(db);
 * };
 * ```
 */

import { STORE_NAMES } from "@/data/db-schema";

/**
 * Apply the version 1 database schema migration.
 *
 * Creates all object stores with their key paths and indexes:
 *
 * - **listings** -- keyed by `id`, indexed on `normalizedTitle`, `category`,
 *   `price`, `sellerProfileUrl`
 * - **sellers** -- keyed by `id`, indexed on `profileUrl`
 * - **imageHashes** -- keyed by auto-increment, indexed on `hash`, `listingId`
 * - **priceData** -- keyed by `id`, indexed on `listingId`, `category`,
 *   `normalizedTitle`, `observedAt`, compound `[listingId, observedAt]`
 * - **engagement** -- keyed by `id`, indexed on `listingId`, `observedAt`,
 *   compound `[listingId, observedAt]`
 * - **seenListings** -- keyed by `listingId`
 * - **savedSearches** -- keyed by `id`
 *
 * @param db - The raw `IDBDatabase` instance from the upgrade event.
 *
 * @example
 * ```ts
 * import { applyV1Migration } from "@/data/migrations/v1";
 *
 * // Inside an idb upgrade callback:
 * applyV1Migration(db);
 * ```
 */
export function applyV1Migration(db: IDBDatabase): void {
  // -- listings --
  const listings = db.createObjectStore(STORE_NAMES.listings, { keyPath: "id" });
  listings.createIndex("normalizedTitle", "normalizedTitle", { unique: false });
  listings.createIndex("category", "category", { unique: false });
  listings.createIndex("price", "price", { unique: false });
  listings.createIndex("sellerProfileUrl", "sellerProfileUrl", { unique: false });

  // -- sellers --
  const sellers = db.createObjectStore(STORE_NAMES.sellers, { keyPath: "id" });
  sellers.createIndex("profileUrl", "profileUrl", { unique: true });

  // -- imageHashes --
  const imageHashes = db.createObjectStore(STORE_NAMES.imageHashes, {
    keyPath: "id",
    autoIncrement: true,
  });
  imageHashes.createIndex("hash", "hash", { unique: false });
  imageHashes.createIndex("listingId", "listingId", { unique: false });

  // -- priceData --
  const priceData = db.createObjectStore(STORE_NAMES.priceData, { keyPath: "id" });
  priceData.createIndex("listingId", "listingId", { unique: false });
  priceData.createIndex("category", "category", { unique: false });
  priceData.createIndex("normalizedTitle", "normalizedTitle", { unique: false });
  priceData.createIndex("observedAt", "observedAt", { unique: false });
  priceData.createIndex("listingId_observedAt", ["listingId", "observedAt"], {
    unique: false,
  });

  // -- engagement --
  const engagement = db.createObjectStore(STORE_NAMES.engagement, { keyPath: "id" });
  engagement.createIndex("listingId", "listingId", { unique: false });
  engagement.createIndex("observedAt", "observedAt", { unique: false });
  engagement.createIndex("listingId_observedAt", ["listingId", "observedAt"], {
    unique: false,
  });

  // -- seenListings --
  db.createObjectStore(STORE_NAMES.seenListings, { keyPath: "listingId" });

  // -- savedSearches --
  db.createObjectStore(STORE_NAMES.savedSearches, { keyPath: "id" });
}
