/**
 * @module core/models/listing
 *
 * Defines the {@link Listing} data model -- the central domain object that
 * every filter, sorter, and analyzer operates on.
 *
 * A `Listing` is a fully-parsed, normalized representation of a single
 * Facebook Marketplace listing. Use {@link createListing} to build instances
 * with sensible defaults and {@link validateListing} to check structural
 * integrity at runtime.
 *
 * @example
 * ```ts
 * import { createListing, validateListing } from "@/core/models/listing";
 *
 * const listing = createListing({
 *   id: "123456",
 *   title: "Like New iPhone 14 Pro",
 *   price: 800,
 *   currency: "USD",
 * });
 *
 * if (validateListing(listing)) {
 *   // listing is structurally valid
 * }
 * ```
 */

/**
 * Item condition as reported by the seller.
 */
export type ListingCondition =
  | "new"
  | "like_new"
  | "good"
  | "fair"
  | "salvage"
  | "unknown";

/**
 * Engagement metrics snapshot for a listing at a point in time.
 *
 * All fields are optional because Facebook does not always expose them.
 *
 * @example
 * ```ts
 * const engagement: ListingEngagement = { saves: 12, comments: 3, views: 450 };
 * ```
 */
export interface ListingEngagement {
  /** Number of times the listing has been saved/bookmarked. */
  readonly saves: number | null;

  /** Number of comments on the listing. */
  readonly comments: number | null;

  /** Number of views the listing has received. */
  readonly views: number | null;
}

/**
 * Geographic coordinates for a listing's location.
 *
 * @example
 * ```ts
 * const coords: ListingCoordinates = { lat: 40.7128, lng: -74.006 };
 * ```
 */
export interface ListingCoordinates {
  /** Latitude in decimal degrees. */
  readonly lat: number;

  /** Longitude in decimal degrees. */
  readonly lng: number;
}

/**
 * The core data model for a single Facebook Marketplace listing.
 *
 * Every field is readonly to encourage immutable data flow. Fields that may
 * not be available from the DOM are typed as `T | null`.
 *
 * @example
 * ```ts
 * const listing: Listing = {
 *   id: "12345",
 *   title: "Vintage Record Player",
 *   normalizedTitle: "vintage record player",
 *   titleTokens: ["vintage", "record", "player"],
 *   category: "Electronics",
 *   condition: "good",
 *   price: 120,
 *   currency: "USD",
 *   location: "Brooklyn, NY",
 *   coordinates: null,
 *   distance: null,
 *   sellerName: "Jane D.",
 *   sellerProfileUrl: "https://facebook.com/marketplace/profile/111",
 *   listingUrl: "https://facebook.com/marketplace/item/12345",
 *   imageUrls: ["https://scontent.xx.fbcdn.net/image1.jpg"],
 *   datePosted: "2 hours ago",
 *   parsedDate: 1711612800000,
 *   shippingAvailable: false,
 *   engagement: { saves: 5, comments: 1, views: 80 },
 *   firstObserved: 1711612800000,
 *   lastObserved: 1711612800000,
 * };
 * ```
 */
export interface Listing {
  /** Facebook's unique identifier for this listing. */
  readonly id: string;

  /** The raw title as displayed on the listing card. */
  readonly title: string;

  /**
   * Lowercased, whitespace-normalized version of {@link title}.
   * Used for keyword matching.
   */
  readonly normalizedTitle: string;

  /**
   * Individual tokens extracted from {@link normalizedTitle}.
   * Used for keyword-based filtering and analysis.
   */
  readonly titleTokens: readonly string[];

  /** Marketplace category (e.g. "Electronics", "Vehicles"). */
  readonly category: string | null;

  /** Seller-reported item condition. */
  readonly condition: ListingCondition;

  /** Asking price in the listing's currency. `null` if "Free" or unparseable. */
  readonly price: number | null;

  /** ISO 4217 currency code. */
  readonly currency: string;

  /** Human-readable location string (e.g. "Brooklyn, NY"). */
  readonly location: string | null;

  /** Parsed geographic coordinates, if available. */
  readonly coordinates: ListingCoordinates | null;

  /** Distance from the user in miles, if available. */
  readonly distance: number | null;

  /** Display name of the seller. */
  readonly sellerName: string | null;

  /** URL to the seller's Marketplace profile. */
  readonly sellerProfileUrl: string | null;

  /** Direct URL to this listing's detail page. */
  readonly listingUrl: string;

  /** URLs of all listing images. */
  readonly imageUrls: readonly string[];

  /**
   * The raw "posted" text from the listing card (e.g. "2 hours ago").
   */
  readonly datePosted: string | null;

  /**
   * Unix-epoch millisecond timestamp parsed from {@link datePosted}.
   * `null` if parsing failed.
   */
  readonly parsedDate: number | null;

  /** Whether the seller offers shipping. */
  readonly shippingAvailable: boolean;

  /** Engagement metrics at the time of parsing. */
  readonly engagement: ListingEngagement;

  /**
   * Unix-epoch millisecond timestamp when the extension first saw this listing.
   */
  readonly firstObserved: number;

  /**
   * Unix-epoch millisecond timestamp of the most recent observation.
   */
  readonly lastObserved: number;
}

/**
 * Fields accepted by {@link createListing}. Only `id`, `title`, and
 * `listingUrl` are required; everything else gets a sensible default.
 *
 * @example
 * ```ts
 * const input: ListingInput = {
 *   id: "12345",
 *   title: "Vintage Record Player",
 *   listingUrl: "https://facebook.com/marketplace/item/12345",
 *   price: 120,
 * };
 * ```
 */
export interface ListingInput {
  /** @see Listing.id */
  readonly id: string;

  /** @see Listing.title */
  readonly title: string;

  /** @see Listing.listingUrl */
  readonly listingUrl: string;

  /** @see Listing.category */
  readonly category?: string | null;

  /** @see Listing.condition */
  readonly condition?: ListingCondition;

  /** @see Listing.price */
  readonly price?: number | null;

  /** @see Listing.currency */
  readonly currency?: string;

  /** @see Listing.location */
  readonly location?: string | null;

  /** @see Listing.coordinates */
  readonly coordinates?: ListingCoordinates | null;

  /** @see Listing.distance */
  readonly distance?: number | null;

  /** @see Listing.sellerName */
  readonly sellerName?: string | null;

  /** @see Listing.sellerProfileUrl */
  readonly sellerProfileUrl?: string | null;

  /** @see Listing.imageUrls */
  readonly imageUrls?: readonly string[];

  /** @see Listing.datePosted */
  readonly datePosted?: string | null;

  /** @see Listing.parsedDate */
  readonly parsedDate?: number | null;

  /** @see Listing.shippingAvailable */
  readonly shippingAvailable?: boolean;

  /** @see Listing.engagement */
  readonly engagement?: Partial<ListingEngagement>;

  /** @see Listing.firstObserved */
  readonly firstObserved?: number;

  /** @see Listing.lastObserved */
  readonly lastObserved?: number;
}

/**
 * Normalize and tokenize a listing title.
 *
 * @param title - The raw title string.
 * @returns A tuple of `[normalizedTitle, titleTokens]`.
 *
 * @example
 * ```ts
 * const [norm, tokens] = normalizeTitle("  Like NEW  iPhone 14 Pro!!! ");
 * // norm   => "like new iphone 14 pro!!!"
 * // tokens => ["like", "new", "iphone", "14", "pro!!!"]
 * ```
 */
function normalizeTitle(title: string): [string, readonly string[]] {
  const normalized = title.toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = normalized.split(" ").filter((t) => t.length > 0);
  return [normalized, tokens];
}

/**
 * Factory function that creates a {@link Listing} with sensible defaults
 * for any omitted fields.
 *
 * @param input - The partial listing data. At minimum, `id`, `title`, and
 *   `listingUrl` must be provided.
 * @returns A complete, frozen {@link Listing} object.
 *
 * @example
 * ```ts
 * const listing = createListing({
 *   id: "99",
 *   title: "Gaming PC - RTX 4090",
 *   listingUrl: "https://facebook.com/marketplace/item/99",
 *   price: 1800,
 *   condition: "like_new",
 * });
 * ```
 */
export function createListing(input: ListingInput): Listing {
  const now = Date.now();
  const [normalizedTitle, titleTokens] = normalizeTitle(input.title);

  return {
    id: input.id,
    title: input.title,
    normalizedTitle,
    titleTokens,
    category: input.category ?? null,
    condition: input.condition ?? "unknown",
    price: input.price ?? null,
    currency: input.currency ?? "USD",
    location: input.location ?? null,
    coordinates: input.coordinates ?? null,
    distance: input.distance ?? null,
    sellerName: input.sellerName ?? null,
    sellerProfileUrl: input.sellerProfileUrl ?? null,
    listingUrl: input.listingUrl,
    imageUrls: input.imageUrls ?? [],
    datePosted: input.datePosted ?? null,
    parsedDate: input.parsedDate ?? null,
    shippingAvailable: input.shippingAvailable ?? false,
    engagement: {
      saves: input.engagement?.saves ?? null,
      comments: input.engagement?.comments ?? null,
      views: input.engagement?.views ?? null,
    },
    firstObserved: input.firstObserved ?? now,
    lastObserved: input.lastObserved ?? now,
  };
}

/**
 * Runtime type guard that checks whether an unknown value conforms to the
 * {@link Listing} interface.
 *
 * Validates structural shape and key field types. Does **not** validate
 * semantic correctness (e.g. whether `price` is non-negative).
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a structurally valid {@link Listing}.
 *
 * @example
 * ```ts
 * const raw: unknown = JSON.parse(stored);
 * if (validateListing(raw)) {
 *   // raw is now typed as Listing
 *   console.log(raw.title);
 * }
 * ```
 */
export function validateListing(value: unknown): value is Listing {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required string fields
  if (typeof obj.id !== "string" || obj.id.length === 0) return false;
  if (typeof obj.title !== "string" || obj.title.length === 0) return false;
  if (typeof obj.normalizedTitle !== "string") return false;
  if (typeof obj.listingUrl !== "string" || obj.listingUrl.length === 0) return false;
  if (typeof obj.currency !== "string") return false;

  // titleTokens must be an array of strings
  if (!Array.isArray(obj.titleTokens)) return false;
  if (!obj.titleTokens.every((t: unknown) => typeof t === "string")) return false;

  // price: number or null
  if (obj.price !== null && typeof obj.price !== "number") return false;

  // condition must be a known value
  const validConditions: readonly string[] = [
    "new",
    "like_new",
    "good",
    "fair",
    "salvage",
    "unknown",
  ];
  if (typeof obj.condition !== "string" || !validConditions.includes(obj.condition)) {
    return false;
  }

  // imageUrls must be an array of strings
  if (!Array.isArray(obj.imageUrls)) return false;
  if (!obj.imageUrls.every((u: unknown) => typeof u === "string")) return false;

  // shippingAvailable must be boolean
  if (typeof obj.shippingAvailable !== "boolean") return false;

  // engagement must be an object with nullable number fields
  if (typeof obj.engagement !== "object" || obj.engagement === null) return false;
  const eng = obj.engagement as Record<string, unknown>;
  for (const field of ["saves", "comments", "views"]) {
    if (eng[field] !== null && typeof eng[field] !== "number") return false;
  }

  // Timestamps
  if (typeof obj.firstObserved !== "number") return false;
  if (typeof obj.lastObserved !== "number") return false;

  return true;
}

/**
 * Type guard that checks whether a {@link Listing} has a non-null price.
 *
 * Useful for narrowing the type in price-related filters and analyzers.
 *
 * @param listing - The listing to check.
 * @returns `true` if `listing.price` is a number.
 *
 * @example
 * ```ts
 * if (hasPrice(listing)) {
 *   // listing.price is narrowed to `number`
 *   const tax = listing.price * 0.08;
 * }
 * ```
 */
export function hasPrice(listing: Listing): listing is Listing & { readonly price: number } {
  return listing.price !== null;
}

/**
 * Type guard that checks whether a {@link Listing} has a parsed date.
 *
 * @param listing - The listing to check.
 * @returns `true` if `listing.parsedDate` is a number.
 *
 * @example
 * ```ts
 * if (hasParsedDate(listing)) {
 *   const age = Date.now() - listing.parsedDate;
 * }
 * ```
 */
export function hasParsedDate(
  listing: Listing,
): listing is Listing & { readonly parsedDate: number } {
  return listing.parsedDate !== null;
}

/**
 * Type guard that checks whether a {@link Listing} has location coordinates.
 *
 * @param listing - The listing to check.
 * @returns `true` if `listing.coordinates` is a {@link ListingCoordinates}.
 *
 * @example
 * ```ts
 * if (hasCoordinates(listing)) {
 *   const { lat, lng } = listing.coordinates;
 * }
 * ```
 */
export function hasCoordinates(
  listing: Listing,
): listing is Listing & { readonly coordinates: ListingCoordinates } {
  return listing.coordinates !== null;
}
