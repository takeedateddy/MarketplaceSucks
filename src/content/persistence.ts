/**
 * @module content/persistence
 *
 * Bridges parsed {@link Listing} objects into the IndexedDB persistence layer.
 *
 * Until this module existed, the entire `data/` layer (repositories, schema,
 * migrations) was dead code -- nothing in the running extension ever wrote to
 * or read from IndexedDB. This service is instantiated by the content-script
 * composition root (`content/index.ts`) and called whenever new listings are
 * parsed, so that:
 *
 *  - listings accumulate across page sessions (`listings` store),
 *  - a corpus of comparable prices is built up for the price rater
 *    (`priceData` store, which needs 5+ comparables to produce a rating),
 *  - engagement snapshots accumulate so the heat tracker can compute velocity
 *    from a *previous* snapshot (`engagement` store).
 *
 * The record-mapping helpers ({@link listingToRecord},
 * {@link listingToPricePoint}, {@link listingToEngagementSnapshot}) are pure
 * and exported so they can be unit-tested without a live IndexedDB.
 *
 * All IndexedDB access is wrapped in try/catch: persistence is best-effort and
 * must never break the filter/sort pipeline if the database is unavailable
 * (e.g. private browsing, storage disabled).
 */

import { IndexedDBAdapter } from "@/data/db";
import { ListingRepository } from "@/data/repositories/listing.repository";
import { PriceDataRepository } from "@/data/repositories/price-data.repository";
import { EngagementRepository } from "@/data/repositories/engagement.repository";
import { SellerRepository } from "@/data/repositories/seller.repository";
import { ImageHashRepository } from "@/data/repositories/image-hash.repository";
import type { Listing } from "@/core/models/listing";
import type {
  ListingRecord,
  PriceDataPoint,
  EngagementSnapshot,
} from "@/data/db-schema";

const LOG_PREFIX = "[MPS:persistence]";

/** Convert a Unix-epoch millisecond timestamp to an ISO 8601 string. */
function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Map an in-memory {@link Listing} to its persisted {@link ListingRecord}.
 *
 * Pure function (no I/O) -- exported for testing.
 */
export function listingToRecord(listing: Listing): ListingRecord {
  return {
    id: listing.id,
    title: listing.title,
    normalizedTitle: listing.normalizedTitle,
    titleTokens: [...listing.titleTokens],
    category: listing.category,
    condition: listing.condition === "unknown" ? null : listing.condition,
    price: listing.price,
    currency: listing.currency,
    location: listing.location,
    distance: listing.distance,
    sellerName: listing.sellerName,
    sellerProfileUrl: listing.sellerProfileUrl,
    listingUrl: listing.listingUrl,
    imageUrls: [...listing.imageUrls],
    datePosted: listing.datePosted,
    firstObserved: msToIso(listing.firstObserved),
    lastObserved: msToIso(listing.lastObserved),
    disappeared: false,
    disappearedAt: null,
  };
}

/**
 * Map a {@link Listing} to a {@link PriceDataPoint}, or `null` when the
 * listing has no usable price (free/unparseable listings are not comparables).
 *
 * Pure function -- exported for testing.
 */
export function listingToPricePoint(listing: Listing): PriceDataPoint | null {
  if (listing.price === null || listing.price <= 0) return null;
  const observedAt = msToIso(listing.lastObserved);
  return {
    id: `${listing.id}-${observedAt}`,
    listingId: listing.id,
    category: listing.category,
    normalizedTitle: listing.normalizedTitle,
    condition: listing.condition === "unknown" ? null : listing.condition,
    price: listing.price,
    location: listing.location,
    observedAt,
  };
}

/**
 * Map a {@link Listing} to an {@link EngagementSnapshot}, or `null` when the
 * listing carries no engagement data worth snapshotting.
 *
 * Pure function -- exported for testing.
 */
export function listingToEngagementSnapshot(
  listing: Listing,
): EngagementSnapshot | null {
  const { saves, comments, views } = listing.engagement;
  if (saves === null && comments === null && views === null) return null;
  const observedAt = msToIso(listing.lastObserved);
  return {
    id: `${listing.id}-${observedAt}`,
    listingId: listing.id,
    saves,
    comments,
    views,
    searchPosition: null,
    observedAt,
  };
}

/**
 * Read-only view of persisted data that the analysis runner depends on.
 * Implemented by {@link ContentPersistence}; mocked in tests.
 */
export interface AnalysisDataSource {
  /**
   * Return prices of comparable listings (same normalized title, falling back
   * to same category) for the price rater. Excludes the listing itself.
   */
  getComparablePrices(listing: Listing): Promise<number[]>;

  /** Return the most recent engagement snapshot recorded *before* this call. */
  getPreviousEngagement(listingId: string): Promise<EngagementSnapshot | null>;
}

/**
 * IndexedDB-backed persistence service for the content script.
 *
 * Construct, call {@link init} once, then call {@link persist} with each batch
 * of newly parsed listings. Also implements {@link AnalysisDataSource} so the
 * analysis runner can read comparables/engagement back out.
 */
export class ContentPersistence implements AnalysisDataSource {
  private adapter: IndexedDBAdapter | null = null;
  private listings: ListingRepository | null = null;
  private prices: PriceDataRepository | null = null;
  private engagement: EngagementRepository | null = null;
  private sellers: SellerRepository | null = null;
  private imageHashes: ImageHashRepository | null = null;

  /** Whether IndexedDB initialized successfully. */
  get ready(): boolean {
    return this.adapter !== null;
  }

  /** Expose the image-hash repository for the image-analysis pipeline. */
  get imageHashRepository(): ImageHashRepository | null {
    return this.imageHashes;
  }

  /**
   * Open the database and construct repositories. Resolves (without throwing)
   * even if IndexedDB is unavailable -- persistence simply becomes a no-op.
   */
  async init(): Promise<void> {
    try {
      const adapter = new IndexedDBAdapter();
      await adapter.init();
      const db = adapter.getDB();
      this.adapter = adapter;
      this.listings = new ListingRepository(db);
      this.prices = new PriceDataRepository(db);
      this.engagement = new EngagementRepository(db);
      this.sellers = new SellerRepository(db);
      this.imageHashes = new ImageHashRepository(db);
    } catch (err) {
      console.warn(`${LOG_PREFIX} IndexedDB unavailable; persistence disabled.`, err);
      this.adapter = null;
    }
  }

  /**
   * Persist a batch of newly parsed listings: upsert each listing record and
   * append a price data point when the listing has a usable price. Call this
   * *before* running analysis so a batch's siblings are available as price
   * comparables. Engagement snapshots are saved separately via
   * {@link saveEngagement} so the analysis runner can read the *previous*
   * snapshot first. Best-effort; never throws.
   */
  async saveListings(listings: Listing[]): Promise<void> {
    if (!this.ready) return;
    for (const listing of listings) {
      try {
        await this.listings?.save(listingToRecord(listing));
        const pricePoint = listingToPricePoint(listing);
        if (pricePoint) await this.prices?.save(pricePoint);
      } catch (err) {
        console.warn(`${LOG_PREFIX} Failed to persist listing ${listing.id}:`, err);
      }
    }
  }

  /**
   * Persist engagement snapshots for a batch. Call this *after* the analysis
   * runner has read previous snapshots (so heat velocity compares against the
   * prior observation, not the one being written now). Best-effort.
   */
  async saveEngagement(listings: Listing[]): Promise<void> {
    if (!this.ready) return;
    for (const listing of listings) {
      try {
        const snapshot = listingToEngagementSnapshot(listing);
        if (snapshot) await this.engagement?.save(snapshot);
      } catch (err) {
        console.warn(`${LOG_PREFIX} Failed to persist engagement for ${listing.id}:`, err);
      }
    }
  }

  /** @inheritdoc */
  async getComparablePrices(listing: Listing): Promise<number[]> {
    if (!this.ready || !this.prices) return [];
    try {
      let points = await this.prices.getByTitle(listing.normalizedTitle);
      // Fall back to category when there aren't enough same-title comparables.
      if (points.length < 5 && listing.category) {
        points = await this.prices.getByCategory(listing.category);
      }
      return points
        .filter((p) => p.listingId !== listing.id && p.price > 0)
        .map((p) => p.price);
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to read comparables for ${listing.id}:`, err);
      return [];
    }
  }

  /** @inheritdoc */
  async getPreviousEngagement(
    listingId: string,
  ): Promise<EngagementSnapshot | null> {
    if (!this.ready || !this.engagement) return null;
    try {
      return await this.engagement.getLatest(listingId);
    } catch {
      return null;
    }
  }

  /** Close the database connection. */
  close(): void {
    this.adapter?.close();
    this.adapter = null;
  }
}
