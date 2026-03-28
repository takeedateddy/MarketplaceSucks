/**
 * @module core/models/seller
 *
 * Defines the {@link SellerProfile} data model for representing a Facebook
 * Marketplace seller's reputation and activity metrics.
 *
 * Used by seller-related filters (e.g. minimum account age) and analyzers
 * (e.g. scam-likelihood scoring).
 *
 * @example
 * ```ts
 * import { createSellerProfile, validateSellerProfile } from "@/core/models/seller";
 *
 * const seller = createSellerProfile({
 *   id: "seller-42",
 *   displayName: "Jane D.",
 *   profileUrl: "https://facebook.com/marketplace/profile/42",
 * });
 * ```
 */

/**
 * Completeness rating for a seller's profile.
 *
 * - `"full"` -- all major profile sections are filled in.
 * - `"partial"` -- some information is missing.
 * - `"minimal"` -- only the bare minimum is present.
 * - `"unknown"` -- completeness could not be determined.
 */
export type ProfileCompleteness = "full" | "partial" | "minimal" | "unknown";

/**
 * A seller's marketplace-specific rating breakdown.
 *
 * @example
 * ```ts
 * const rating: SellerRating = {
 *   overall: 4.8,
 *   totalReviews: 23,
 *   positiveCount: 21,
 *   negativeCount: 2,
 * };
 * ```
 */
export interface SellerRating {
  /** Overall star rating (0-5 scale). `null` if unavailable. */
  readonly overall: number | null;

  /** Total number of reviews. `null` if unavailable. */
  readonly totalReviews: number | null;

  /** Count of positive reviews. `null` if unavailable. */
  readonly positiveCount: number | null;

  /** Count of negative reviews. `null` if unavailable. */
  readonly negativeCount: number | null;
}

/**
 * Data model for a Facebook Marketplace seller.
 *
 * All fields are readonly to encourage immutable data flow. Fields that may
 * not be available are typed as `T | null`.
 *
 * @example
 * ```ts
 * const seller: SellerProfile = {
 *   id: "seller-42",
 *   displayName: "Jane D.",
 *   profileUrl: "https://facebook.com/marketplace/profile/42",
 *   profileImageUrl: null,
 *   joinedDate: null,
 *   accountAgeDays: null,
 *   rating: { overall: null, totalReviews: null, positiveCount: null, negativeCount: null },
 *   responseRate: null,
 *   responseTime: null,
 *   profileCompleteness: "unknown",
 *   trustScore: null,
 *   totalListings: null,
 *   activeListings: null,
 *   isVerified: false,
 *   location: null,
 *   firstObserved: 1711612800000,
 *   lastObserved: 1711612800000,
 * };
 * ```
 */
export interface SellerProfile {
  /** Unique identifier for this seller (derived from Facebook profile). */
  readonly id: string;

  /** Display name shown on the seller's profile. */
  readonly displayName: string;

  /** URL to the seller's Marketplace profile page. */
  readonly profileUrl: string;

  /** URL to the seller's profile image. */
  readonly profileImageUrl: string | null;

  /**
   * The date the seller's Facebook account was created, as a raw string
   * (e.g. "Joined in 2018"). `null` if unavailable.
   */
  readonly joinedDate: string | null;

  /** Age of the account in days. `null` if unavailable. */
  readonly accountAgeDays: number | null;

  /** Seller rating breakdown. */
  readonly rating: SellerRating;

  /** Seller's response rate as a percentage (0-100). `null` if unavailable. */
  readonly responseRate: number | null;

  /**
   * Typical response time in minutes. `null` if unavailable.
   *
   * @example 30  // responds within 30 minutes
   */
  readonly responseTime: number | null;

  /** How complete the seller's profile is. */
  readonly profileCompleteness: ProfileCompleteness;

  /**
   * Computed trust score (0-100) based on all available signals.
   * `null` if not yet computed or insufficient data.
   */
  readonly trustScore: number | null;

  /** Total number of listings the seller has ever posted. `null` if unavailable. */
  readonly totalListings: number | null;

  /** Number of currently active listings. `null` if unavailable. */
  readonly activeListings: number | null;

  /** Whether the seller has a verified badge. */
  readonly isVerified: boolean;

  /** Seller's listed location. `null` if unavailable. */
  readonly location: string | null;

  /** Unix-epoch millisecond timestamp when the extension first saw this seller. */
  readonly firstObserved: number;

  /** Unix-epoch millisecond timestamp of the most recent observation. */
  readonly lastObserved: number;
}

/**
 * Fields accepted by {@link createSellerProfile}. Only `id`, `displayName`,
 * and `profileUrl` are required; everything else gets a sensible default.
 *
 * @example
 * ```ts
 * const input: SellerProfileInput = {
 *   id: "seller-42",
 *   displayName: "Jane D.",
 *   profileUrl: "https://facebook.com/marketplace/profile/42",
 *   accountAgeDays: 730,
 * };
 * ```
 */
export interface SellerProfileInput {
  /** @see SellerProfile.id */
  readonly id: string;

  /** @see SellerProfile.displayName */
  readonly displayName: string;

  /** @see SellerProfile.profileUrl */
  readonly profileUrl: string;

  /** @see SellerProfile.profileImageUrl */
  readonly profileImageUrl?: string | null;

  /** @see SellerProfile.joinedDate */
  readonly joinedDate?: string | null;

  /** @see SellerProfile.accountAgeDays */
  readonly accountAgeDays?: number | null;

  /** @see SellerProfile.rating */
  readonly rating?: Partial<SellerRating>;

  /** @see SellerProfile.responseRate */
  readonly responseRate?: number | null;

  /** @see SellerProfile.responseTime */
  readonly responseTime?: number | null;

  /** @see SellerProfile.profileCompleteness */
  readonly profileCompleteness?: ProfileCompleteness;

  /** @see SellerProfile.trustScore */
  readonly trustScore?: number | null;

  /** @see SellerProfile.totalListings */
  readonly totalListings?: number | null;

  /** @see SellerProfile.activeListings */
  readonly activeListings?: number | null;

  /** @see SellerProfile.isVerified */
  readonly isVerified?: boolean;

  /** @see SellerProfile.location */
  readonly location?: string | null;

  /** @see SellerProfile.firstObserved */
  readonly firstObserved?: number;

  /** @see SellerProfile.lastObserved */
  readonly lastObserved?: number;
}

/**
 * Factory function that creates a {@link SellerProfile} with sensible defaults
 * for any omitted fields.
 *
 * @param input - The partial seller data. At minimum, `id`, `displayName`,
 *   and `profileUrl` must be provided.
 * @returns A complete {@link SellerProfile} object.
 *
 * @example
 * ```ts
 * const seller = createSellerProfile({
 *   id: "seller-42",
 *   displayName: "Jane D.",
 *   profileUrl: "https://facebook.com/marketplace/profile/42",
 *   accountAgeDays: 730,
 *   isVerified: true,
 * });
 * ```
 */
export function createSellerProfile(input: SellerProfileInput): SellerProfile {
  const now = Date.now();

  return {
    id: input.id,
    displayName: input.displayName,
    profileUrl: input.profileUrl,
    profileImageUrl: input.profileImageUrl ?? null,
    joinedDate: input.joinedDate ?? null,
    accountAgeDays: input.accountAgeDays ?? null,
    rating: {
      overall: input.rating?.overall ?? null,
      totalReviews: input.rating?.totalReviews ?? null,
      positiveCount: input.rating?.positiveCount ?? null,
      negativeCount: input.rating?.negativeCount ?? null,
    },
    responseRate: input.responseRate ?? null,
    responseTime: input.responseTime ?? null,
    profileCompleteness: input.profileCompleteness ?? "unknown",
    trustScore: input.trustScore ?? null,
    totalListings: input.totalListings ?? null,
    activeListings: input.activeListings ?? null,
    isVerified: input.isVerified ?? false,
    location: input.location ?? null,
    firstObserved: input.firstObserved ?? now,
    lastObserved: input.lastObserved ?? now,
  };
}

/**
 * Runtime type guard that checks whether an unknown value conforms to the
 * {@link SellerProfile} interface.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a structurally valid {@link SellerProfile}.
 *
 * @example
 * ```ts
 * const raw: unknown = JSON.parse(stored);
 * if (validateSellerProfile(raw)) {
 *   console.log(raw.displayName);
 * }
 * ```
 */
export function validateSellerProfile(value: unknown): value is SellerProfile {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (typeof obj.id !== "string" || obj.id.length === 0) return false;
  if (typeof obj.displayName !== "string" || obj.displayName.length === 0) return false;
  if (typeof obj.profileUrl !== "string" || obj.profileUrl.length === 0) return false;
  if (typeof obj.isVerified !== "boolean") return false;

  const validCompleteness: readonly string[] = ["full", "partial", "minimal", "unknown"];
  if (
    typeof obj.profileCompleteness !== "string" ||
    !validCompleteness.includes(obj.profileCompleteness)
  ) {
    return false;
  }

  if (typeof obj.rating !== "object" || obj.rating === null) return false;

  if (typeof obj.firstObserved !== "number") return false;
  if (typeof obj.lastObserved !== "number") return false;

  return true;
}
