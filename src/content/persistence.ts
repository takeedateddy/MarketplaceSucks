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
import { SeenListingRepository } from "@/data/repositories/seen.repository";
import type { Listing } from "@/core/models/listing";
import type {
  ListingRecord,
  PriceDataPoint,
  EngagementSnapshot,
  SellerProfile,
  ImageHash,
  SeenListing,
} from "@/data/db-schema";

const LOG_PREFIX = "[MPS:persistence]";

/** chrome.storage keys read by the background alert worker. */
const RECENT_LISTINGS_KEY = "mps-recent-listings";
const PRICE_HISTORY_KEY = "mps-price-history";

/** Maximum number of recent listings mirrored for saved-search matching. */
const RECENT_CAP = 300;

/**
 * Compact listing shape mirrored to `chrome.storage.local` so the background
 * service worker can match saved searches against newly seen listings.
 */
export interface RecentListingMirror {
  id: string;
  title: string;
  price: number | null;
  url: string;
  /** Unix-epoch milliseconds when first observed. */
  firstObserved: number;
}

/** A detected price drop mirrored for the background worker's drop alerts. */
export interface PriceHistoryMirror {
  listingId: string;
  title: string;
  url: string;
  previousPrice: number;
  currentPrice: number;
}

/** Project a listing into its compact recent-listing mirror. Pure. */
export function toRecentMirror(listing: Listing): RecentListingMirror {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    url: listing.listingUrl,
    firstObserved: listing.firstObserved,
  };
}

/**
 * Merge incoming recent-listing mirrors into the existing list, de-duplicating
 * by id (existing entries keep their original `firstObserved`) and capping to
 * the most recent `cap` entries. Pure.
 */
export function mergeRecent(
  existing: RecentListingMirror[],
  incoming: RecentListingMirror[],
  cap: number,
): RecentListingMirror[] {
  const byId = new Map<string, RecentListingMirror>();
  for (const r of existing) byId.set(r.id, r);
  for (const r of incoming) if (!byId.has(r.id)) byId.set(r.id, r);
  return Array.from(byId.values()).slice(-cap);
}

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

  /** Return a seller's cached trust score (from a visited detail page), or null. */
  getSellerTrustScore(sellerProfileUrl: string): Promise<number | null>;
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
  private seen: SeenListingRepository | null = null;

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
      this.seen = new SeenListingRepository(db);
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
    const drops: PriceHistoryMirror[] = [];
    for (const listing of listings) {
      try {
        // Detect a price drop by comparing against the previously stored record
        // *before* it is overwritten below.
        const previous = await this.listings?.getById(listing.id);
        if (
          previous &&
          previous.price !== null &&
          listing.price !== null &&
          listing.price < previous.price
        ) {
          drops.push({
            listingId: listing.id,
            title: listing.title,
            url: listing.listingUrl,
            previousPrice: previous.price,
            currentPrice: listing.price,
          });
        }

        await this.listings?.save(listingToRecord(listing));
        const pricePoint = listingToPricePoint(listing);
        if (pricePoint) await this.prices?.save(pricePoint);
      } catch (err) {
        console.warn(`${LOG_PREFIX} Failed to persist listing ${listing.id}:`, err);
      }
    }
    await this.mirrorForAlerts(listings, drops);
  }

  /**
   * Mirror the batch into `chrome.storage.local` so the background worker can
   * raise saved-search and price-drop notifications (the worker has no access
   * to the page DOM or IndexedDB). Best-effort; never throws.
   */
  private async mirrorForAlerts(
    listings: Listing[],
    drops: PriceHistoryMirror[],
  ): Promise<void> {
    try {
      // Imported lazily so the pure mapping helpers in this module can be unit
      // tested without loading the webextension polyfill (which throws outside
      // an extension context).
      const { browser } = await import("@/platform/browser");
      const stored = await browser.storage.local.get([
        RECENT_LISTINGS_KEY,
        PRICE_HISTORY_KEY,
      ]);
      const data = stored as Record<string, unknown>;

      const existingRecent = (data[RECENT_LISTINGS_KEY] ?? []) as RecentListingMirror[];
      const recent = mergeRecent(
        existingRecent,
        listings.map(toRecentMirror),
        RECENT_CAP,
      );

      const existingHistory = (data[PRICE_HISTORY_KEY] ?? []) as PriceHistoryMirror[];
      const history = drops.length > 0 ? [...existingHistory, ...drops] : existingHistory;

      await browser.storage.local.set({
        [RECENT_LISTINGS_KEY]: recent,
        [PRICE_HISTORY_KEY]: history,
      });
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to mirror alert storage:`, err);
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

  /** Persist a scored seller profile (parsed from a detail page). */
  async saveSeller(record: SellerProfile): Promise<void> {
    if (!this.ready || !this.sellers) return;
    try {
      await this.sellers.save(record);
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to persist seller ${record.id}:`, err);
    }
  }

  /** Persist an engagement snapshot for a single listing (detail-page data). */
  async saveDetailEngagement(
    listingId: string,
    engagement: { saves: number | null; comments: number | null; views: number | null },
  ): Promise<void> {
    if (!this.ready || !this.engagement) return;
    try {
      const observedAt = new Date().toISOString();
      await this.engagement.save({
        id: `${listingId}-${observedAt}`,
        listingId,
        saves: engagement.saves,
        comments: engagement.comments,
        views: engagement.views,
        searchPosition: null,
        observedAt,
      });
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to persist detail engagement for ${listingId}:`, err);
    }
  }

  /** Persist a computed image hash + analysis result. */
  async saveImageHash(record: ImageHash): Promise<void> {
    if (!this.ready || !this.imageHashes) return;
    try {
      await this.imageHashes.save(record);
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to persist image hash for ${record.listingId}:`, err);
    }
  }

  /** Return stored hashes within the duplicate threshold of the given hash. */
  async findImageDuplicates(hash: string): Promise<ImageHash[]> {
    if (!this.ready || !this.imageHashes) return [];
    try {
      return await this.imageHashes.findDuplicates(hash);
    } catch {
      return [];
    }
  }

  /** @inheritdoc */
  async getSellerTrustScore(sellerProfileUrl: string): Promise<number | null> {
    if (!this.ready || !this.sellers) return null;
    try {
      const seller = await this.sellers.getByUrl(sellerProfileUrl);
      return seller?.trustScore ?? null;
    } catch {
      return null;
    }
  }

  /** Whether a listing has been seen in a previous observation/session. */
  async isSeen(listingId: string): Promise<boolean> {
    if (!this.ready || !this.seen) return false;
    return this.seen.has(listingId);
  }

  /** Record a listing as seen (idempotent upsert keyed by listing id). */
  async recordSeen(listing: Listing): Promise<void> {
    if (!this.ready || !this.seen) return;
    const record: SeenListing = {
      listingId: listing.id,
      firstSeen: new Date(listing.firstObserved).toISOString(),
      priceAtFirstSeen: listing.price ?? 0,
      currentPrice: listing.price,
      trustScoreAtFirstSeen: null,
    };
    await this.seen.save(record);
  }

  /** Return the most recently observed listing records (for the history panel). */
  async getRecentListings(limit: number): Promise<ListingRecord[]> {
    if (!this.ready || !this.listings) return [];
    try {
      return await this.listings.getRecent(limit);
    } catch {
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

  /**
   * Delete persisted data older than the configured retention windows. Keeps
   * IndexedDB bounded so a heavy browsing history doesn't grow without limit.
   * Best-effort; never throws.
   */
  async cleanup(historyDays: number, priceDataDays: number): Promise<void> {
    if (!this.ready) return;
    const cutoff = (days: number): string =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    try {
      const historyCutoff = cutoff(historyDays);
      await this.listings?.deleteOlderThan(historyCutoff);
      await this.engagement?.deleteOlderThan(historyCutoff);
      await this.imageHashes?.deleteOlderThan(historyCutoff);
      await this.prices?.deleteOlderThan(cutoff(priceDataDays));
    } catch (err) {
      console.warn(`${LOG_PREFIX} Retention cleanup failed:`, err);
    }
  }

  /** Close the database connection. */
  close(): void {
    this.adapter?.close();
    this.adapter = null;
  }
}
