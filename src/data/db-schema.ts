/**
 * @module data/db-schema
 *
 * Schema definitions for the MarketplaceSucks IndexedDB database.
 *
 * Exports all record interfaces used by the data layer, along with the
 * database name, version, and object store name constants.
 *
 * These interfaces represent the persisted shape of data in IndexedDB and
 * are intentionally separate from the domain models in `core/models/` --
 * the domain models are in-memory representations while these are the
 * storage-oriented records with ISO string dates and denormalized fields.
 *
 * @example
 * ```ts
 * import { DB_NAME, DB_VERSION, STORE_NAMES } from "@/data/db-schema";
 * import type { ListingRecord } from "@/data/db-schema";
 *
 * console.log(DB_NAME);       // "MarketplaceSucks"
 * console.log(DB_VERSION);    // 1
 * console.log(STORE_NAMES.listings); // "listings"
 * ```
 */

/** IndexedDB database name. */
export const DB_NAME = "MarketplaceSucks" as const;

/** Current database schema version. */
export const DB_VERSION = 1 as const;

/**
 * Mapping of logical store names to their IndexedDB object store identifiers.
 *
 * @example
 * ```ts
 * const tx = db.transaction(STORE_NAMES.listings, "readwrite");
 * ```
 */
export const STORE_NAMES = {
  listings: "listings",
  sellers: "sellers",
  imageHashes: "imageHashes",
  priceData: "priceData",
  engagement: "engagement",
  seenListings: "seenListings",
  savedSearches: "savedSearches",
} as const;

/**
 * A persisted listing record stored in the `listings` object store.
 *
 * @example
 * ```ts
 * const record: ListingRecord = {
 *   id: "12345",
 *   title: "Vintage Record Player",
 *   normalizedTitle: "vintage record player",
 *   titleTokens: ["vintage", "record", "player"],
 *   category: "Electronics",
 *   condition: "good",
 *   price: 120,
 *   currency: "USD",
 *   location: "Brooklyn, NY",
 *   distance: 5,
 *   sellerName: "Jane D.",
 *   sellerProfileUrl: "https://facebook.com/marketplace/profile/111",
 *   listingUrl: "https://facebook.com/marketplace/item/12345",
 *   imageUrls: ["https://scontent.xx.fbcdn.net/image1.jpg"],
 *   datePosted: "2 hours ago",
 *   firstObserved: "2024-01-15T10:00:00.000Z",
 *   lastObserved: "2024-01-15T12:00:00.000Z",
 *   disappeared: false,
 *   disappearedAt: null,
 * };
 * ```
 */
export interface ListingRecord {
  /** Facebook's unique identifier for this listing. */
  readonly id: string;

  /** The raw title as displayed on the listing card. */
  readonly title: string;

  /** Lowercased, whitespace-normalized version of the title. */
  readonly normalizedTitle: string;

  /** Individual tokens extracted from the normalized title. */
  readonly titleTokens: string[];

  /** Marketplace category (e.g. "Electronics", "Vehicles"). */
  readonly category: string | null;

  /** Seller-reported item condition. */
  readonly condition: string | null;

  /** Asking price in the listing's currency. `null` if "Free" or unparseable. */
  readonly price: number | null;

  /** ISO 4217 currency code. */
  readonly currency: string;

  /** Human-readable location string (e.g. "Brooklyn, NY"). */
  readonly location: string | null;

  /** Distance from the user in miles, if available. */
  readonly distance: number | null;

  /** Display name of the seller. */
  readonly sellerName: string | null;

  /** URL to the seller's Marketplace profile. */
  readonly sellerProfileUrl: string | null;

  /** Direct URL to this listing's detail page. */
  readonly listingUrl: string;

  /** URLs of all listing images. */
  readonly imageUrls: string[];

  /** The raw "posted" text from the listing card (e.g. "2 hours ago"). */
  readonly datePosted: string | null;

  /** ISO 8601 timestamp when the extension first saw this listing. */
  readonly firstObserved: string;

  /** ISO 8601 timestamp of the most recent observation. */
  readonly lastObserved: string;

  /** Whether this listing has disappeared from search results. */
  readonly disappeared: boolean;

  /** ISO 8601 timestamp when the listing was first observed missing, or `null`. */
  readonly disappearedAt: string | null;
}

/**
 * A persisted seller profile record stored in the `sellers` object store.
 *
 * @example
 * ```ts
 * const profile: SellerProfile = {
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
 *   trustScoreBreakdown: { accountAge: 20, rating: 25, completeness: 20, activity: 20 },
 *   lastUpdated: "2024-01-15T12:00:00.000Z",
 * };
 * ```
 */
export interface SellerProfile {
  /** Unique identifier for this seller. */
  readonly id: string;

  /** Display name shown on the seller's profile. */
  readonly name: string;

  /** URL to the seller's Marketplace profile page. */
  readonly profileUrl: string;

  /** Raw account age string (e.g. "Joined in 2018"). */
  readonly accountAge: string | null;

  /** Account age in months, if computable. */
  readonly accountAgeMonths: number | null;

  /** Overall star rating (0-5 scale). `null` if unavailable. */
  readonly rating: number | null;

  /** Total number of ratings/reviews. `null` if unavailable. */
  readonly ratingCount: number | null;

  /** Response rate description (e.g. "Very responsive"). */
  readonly responseRate: string | null;

  /** Response time description (e.g. "Replies within an hour"). */
  readonly responseTime: string | null;

  /** Whether the seller has a profile photo. */
  readonly hasProfilePhoto: boolean;

  /** Whether the seller has a cover photo. */
  readonly hasCoverPhoto: boolean;

  /** Whether the seller has a location on their profile. */
  readonly hasLocation: boolean;

  /** Whether the seller has a bio on their profile. */
  readonly hasBio: boolean;

  /** Number of currently active listings. `null` if unavailable. */
  readonly activeListingCount: number | null;

  /** Computed trust score (0-100). */
  readonly trustScore: number;

  /** Breakdown of the trust score by signal category. */
  readonly trustScoreBreakdown: Record<string, number>;

  /** ISO 8601 timestamp of the last profile update. */
  readonly lastUpdated: string;
}

/**
 * A perceptual hash of a listing image stored in the `imageHashes` object store.
 *
 * @example
 * ```ts
 * const imageHash: ImageHash = {
 *   hash: "a4e1f29c3b8d0e7a",
 *   listingId: "12345",
 *   imageUrl: "https://scontent.xx.fbcdn.net/image1.jpg",
 *   aiScore: 0.12,
 *   originalityScore: 0.95,
 *   flags: [],
 *   analyzedAt: "2024-01-15T12:00:00.000Z",
 * };
 * ```
 */
export interface ImageHash {
  /** The perceptual hash string. */
  readonly hash: string;

  /** The listing this image belongs to. */
  readonly listingId: string;

  /** URL of the source image. */
  readonly imageUrl: string;

  /** AI-generated image probability score (0-1). `null` if not analyzed. */
  readonly aiScore: number | null;

  /** Originality score (0-1). `null` if not analyzed. */
  readonly originalityScore: number | null;

  /** Flags raised during analysis (e.g. "stock_photo", "watermark"). */
  readonly flags: string[];

  /** ISO 8601 timestamp when the image was analyzed. */
  readonly analyzedAt: string;
}

/**
 * A price observation for market comparison, stored in the `priceData` object store.
 *
 * @example
 * ```ts
 * const point: PriceDataPoint = {
 *   id: "12345-2024-01-15T12:00:00.000Z",
 *   listingId: "12345",
 *   category: "Electronics",
 *   normalizedTitle: "vintage record player",
 *   condition: "good",
 *   price: 120,
 *   location: "Brooklyn, NY",
 *   observedAt: "2024-01-15T12:00:00.000Z",
 * };
 * ```
 */
export interface PriceDataPoint {
  /** Unique identifier for this data point (typically listingId + timestamp). */
  readonly id: string;

  /** The listing this observation belongs to. */
  readonly listingId: string;

  /** Marketplace category of the listing. */
  readonly category: string | null;

  /** Lowercased, whitespace-normalized title for grouping comparables. */
  readonly normalizedTitle: string;

  /** Seller-reported item condition. */
  readonly condition: string | null;

  /** The observed price. */
  readonly price: number;

  /** Listing location at time of observation. */
  readonly location: string | null;

  /** ISO 8601 timestamp of the observation. */
  readonly observedAt: string;
}

/**
 * A point-in-time snapshot of engagement metrics, stored in the `engagement` object store.
 *
 * @example
 * ```ts
 * const snapshot: EngagementSnapshot = {
 *   id: "12345-2024-01-15T12:00:00.000Z",
 *   listingId: "12345",
 *   saves: 10,
 *   comments: 3,
 *   views: 200,
 *   searchPosition: 5,
 *   observedAt: "2024-01-15T12:00:00.000Z",
 * };
 * ```
 */
export interface EngagementSnapshot {
  /** Unique identifier for this snapshot (typically listingId + timestamp). */
  readonly id: string;

  /** The listing this snapshot belongs to. */
  readonly listingId: string;

  /** Number of saves/bookmarks. `null` if unavailable. */
  readonly saves: number | null;

  /** Number of comments. `null` if unavailable. */
  readonly comments: number | null;

  /** Number of views. `null` if unavailable. */
  readonly views: number | null;

  /** Position in search results at time of observation. `null` if unavailable. */
  readonly searchPosition: number | null;

  /** ISO 8601 timestamp when the snapshot was taken. */
  readonly observedAt: string;
}

/**
 * A record of a listing the user has seen, stored in the `seenListings` object store.
 *
 * @example
 * ```ts
 * const seen: SeenListing = {
 *   listingId: "12345",
 *   firstSeen: "2024-01-15T10:00:00.000Z",
 *   priceAtFirstSeen: 120,
 *   currentPrice: 100,
 *   trustScoreAtFirstSeen: 85,
 * };
 * ```
 */
export interface SeenListing {
  /** The listing identifier. */
  readonly listingId: string;

  /** ISO 8601 timestamp when the listing was first seen. */
  readonly firstSeen: string;

  /** Price at the time the listing was first seen. */
  readonly priceAtFirstSeen: number;

  /** Current price of the listing. `null` if unknown or removed. */
  readonly currentPrice: number | null;

  /** Trust score of the seller at the time the listing was first seen. `null` if unavailable. */
  readonly trustScoreAtFirstSeen: number | null;
}

/**
 * A saved search configuration, stored in the `savedSearches` object store.
 *
 * @example
 * ```ts
 * const search: SavedSearch = {
 *   id: "search-1",
 *   name: "Cheap iPhones",
 *   filters: { maxPrice: 500, condition: "like_new" },
 *   sortOrder: "price_asc",
 *   keywords: "iphone",
 *   pinned: true,
 *   createdAt: "2024-01-15T10:00:00.000Z",
 *   lastUsedAt: "2024-01-15T12:00:00.000Z",
 * };
 * ```
 */
export interface SavedSearch {
  /** Unique identifier for this saved search. */
  readonly id: string;

  /** User-assigned name for the search. */
  readonly name: string;

  /** Filter configuration applied to this search. */
  readonly filters: Record<string, unknown>;

  /** Sort order identifier (e.g. "price_asc", "date_desc"). */
  readonly sortOrder: string | null;

  /** Search keywords. */
  readonly keywords: string | null;

  /** Whether this search is pinned to the top of the list. */
  readonly pinned: boolean;

  /** ISO 8601 timestamp when the search was created. */
  readonly createdAt: string;

  /** ISO 8601 timestamp when the search was last used. */
  readonly lastUsedAt: string;
}
