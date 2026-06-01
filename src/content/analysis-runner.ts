/**
 * @module content/analysis-runner
 *
 * Turns plain parsed {@link Listing}s into {@link AnalyzedListing}s by invoking
 * the (previously orphaned) analysis modules with data read back from the
 * persistence layer.
 *
 * This is the seam that connects `core/analysis/*` to the running extension.
 * Each analyzer is fed exactly the inputs it documents:
 *
 *  - **Price rating** compares the listing price against comparable prices
 *    accumulated in IndexedDB (needs 5+ comparables, else no rating).
 *  - **Heat** compares current engagement against the previous snapshot.
 *  - **Sales forecast** combines the price ratio + heat into a days-to-sell
 *    estimate once enough comparable data exists.
 *  - **Seller trust** is computed when seller-profile data is available
 *    (typically only on the detail page, not the search grid).
 *
 * The runner depends only on an {@link AnalysisDataSource}, so it is fully
 * unit-testable with an in-memory fake -- no IndexedDB required.
 */

import type { Listing } from "@/core/models/listing";
import type { AnalyzedListing } from "@/core/models/analyzed-listing";
import type { SellerProfile } from "@/core/models/seller";
import type { EngagementSnapshot } from "@/data/db-schema";
import type { AnalysisDataSource } from "@/content/persistence";
import { calculateTrustScore } from "@/core/analysis/seller-trust";
import { rateListing } from "@/core/analysis/price-rater";
import { calculateHeatScore } from "@/core/analysis/heat-tracker";
import { forecastSale } from "@/core/analysis/sales-forecaster";

/** Mutable accumulator for analysis fields before freezing into AnalyzedListing. */
type AnalysisFields = {
  sellerTrustScore?: number;
  priceRating?: string;
  priceRatingScore?: number;
  heatScore?: number;
  estimatedDaysToSell?: number;
};

/** Does this listing carry any engagement signal worth scoring for heat? */
function hasEngagement(listing: Listing): boolean {
  const { saves, comments, views } = listing.engagement;
  return saves !== null || comments !== null || views !== null;
}

/** Map a persisted snapshot to the heat tracker's previous-engagement shape. */
function toPreviousEngagement(
  snapshot: EngagementSnapshot | null,
): { saves: number | null; comments: number | null; views: number | null; observedAt: string } | undefined {
  if (!snapshot) return undefined;
  return {
    saves: snapshot.saves,
    comments: snapshot.comments,
    views: snapshot.views,
    observedAt: snapshot.observedAt,
  };
}

/**
 * Analyze a single listing, returning a new {@link AnalyzedListing}. The
 * original listing is never mutated; only fields backed by real data are
 * attached (so sorters/filters correctly treat the rest as "no data").
 */
export async function analyzeListing(
  listing: Listing,
  dataSource: AnalysisDataSource,
  sellerProfile?: Partial<SellerProfile>,
): Promise<AnalyzedListing> {
  const fields: AnalysisFields = {};

  // --- Seller trust ---
  // Detail-page flow: a full profile was passed -> score it fresh.
  // Grid flow: look up the trust score cached when the seller's detail page
  // was last visited (keyed by profile URL).
  if (sellerProfile) {
    const trust = calculateTrustScore(sellerProfile);
    if (trust.confidence !== "insufficient") {
      fields.sellerTrustScore = trust.score;
    }
  } else if (listing.sellerProfileUrl) {
    const cached = await dataSource.getSellerTrustScore(listing.sellerProfileUrl);
    if (cached !== null) {
      fields.sellerTrustScore = cached;
    }
  }

  // --- Price rating (the grid's primary working signal) ---
  let median: number | null = null;
  if (listing.price !== null && listing.price > 0) {
    const comparablePrices = await dataSource.getComparablePrices(listing);
    const rating = rateListing({
      price: listing.price,
      condition: listing.condition === "unknown" ? null : listing.condition,
      comparablePrices,
      category: listing.category,
      dataWindowDays: 30,
    });
    if (rating) {
      fields.priceRating = rating.tier;
      fields.priceRatingScore = rating.percentOfMedian;
      median = rating.stats.median;
    }
  }

  // --- Heat (needs engagement; velocity needs a previous snapshot) ---
  // Grid cards rarely expose engagement, but if the listing's detail page was
  // visited we have a persisted snapshot to fall back on.
  let heatScore: number | null = null;
  let engagement = {
    saves: listing.engagement.saves,
    comments: listing.engagement.comments,
    views: listing.engagement.views,
  };
  let previous = hasEngagement(listing)
    ? toPreviousEngagement(await dataSource.getPreviousEngagement(listing.id))
    : undefined;
  if (!hasEngagement(listing)) {
    const stored = await dataSource.getPreviousEngagement(listing.id);
    if (stored && (stored.saves !== null || stored.comments !== null || stored.views !== null)) {
      engagement = { saves: stored.saves, comments: stored.comments, views: stored.views };
      previous = undefined; // single snapshot -> no velocity baseline
    }
  }
  if (engagement.saves !== null || engagement.comments !== null || engagement.views !== null) {
    const heat = calculateHeatScore({
      engagement,
      previousEngagement: previous,
      searchPosition: null,
      postedDate: listing.parsedDate !== null ? new Date(listing.parsedDate) : null,
    });
    heatScore = heat.score;
    fields.heatScore = heat.score;
  }

  // --- Sales forecast (reuses the price-rating comparables + heat) ---
  if (listing.price !== null && listing.price > 0 && median !== null) {
    // We don't track sell-through times, so the category data points are the
    // price comparables and the base falls back to the forecaster's default.
    const comparablePrices = await dataSource.getComparablePrices(listing);
    const forecast = forecastSale({
      categoryAvgDays: null,
      categoryDataPoints: comparablePrices.length,
      priceRatio: median > 0 ? listing.price / median : null,
      heatScore,
      condition: listing.condition === "unknown" ? null : listing.condition,
      price: listing.price,
      isWeekendListing: isWeekend(listing.parsedDate),
      isResponsiveSeller: false,
    });
    if (forecast) {
      fields.estimatedDaysToSell = forecast.estimatedDays;
    }
  }

  return { ...listing, ...fields };
}

/** Whether a posted-date timestamp falls on a weekend. */
function isWeekend(parsedDate: number | null): boolean {
  if (parsedDate === null) return false;
  const day = new Date(parsedDate).getDay();
  return day === 0 || day === 6;
}

/**
 * Analyze a batch of listings. Returns a new array of {@link AnalyzedListing}s
 * in the same order. Best-effort: a failure on one listing yields the
 * un-enriched listing rather than dropping it.
 */
export async function analyzeListings(
  listings: Listing[],
  dataSource: AnalysisDataSource,
): Promise<AnalyzedListing[]> {
  return Promise.all(
    listings.map(async (listing) => {
      try {
        return await analyzeListing(listing, dataSource);
      } catch {
        return listing as AnalyzedListing;
      }
    }),
  );
}
