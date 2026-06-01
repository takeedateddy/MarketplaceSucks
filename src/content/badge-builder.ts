/**
 * @module content/badge-builder
 *
 * Pure mapping from an {@link AnalyzedListing} to the {@link BadgeDescriptor}s
 * rendered on its Facebook listing card by {@link DomInjector.injectBadge}.
 *
 * Kept side-effect-free (no DOM access) so it can be unit-tested directly. The
 * CSS classes referenced here (`mps-badge-<type>-<level>`) are defined in
 * `content/styles.css`.
 *
 * Only fields backed by real analysis data produce a badge; an un-analyzed
 * listing yields an empty array, so cards stay clean until data is available.
 */

import type { AnalyzedListing } from "@/core/models/analyzed-listing";
import type { BadgeDescriptor } from "@/content/dom-injector";
import { PRICE_RATING_INFO } from "@/core/analysis/price-rater";
import type { PriceRatingTier } from "@/core/analysis/price-rater";

/** Map a 0-100 trust score to its badge level (matches CSS class suffixes). */
function trustLevel(score: number): string {
  if (score >= 80) return "high";
  if (score >= 60) return "moderate";
  if (score >= 40) return "caution";
  return "low";
}

/** Map a 0-100 heat score to its badge level, or `null` below the warm cutoff. */
function heatLevel(score: number): "warm" | "hot" | "fire" | null {
  if (score >= 80) return "fire";
  if (score >= 60) return "hot";
  if (score >= 30) return "warm";
  return null;
}

/** Map an estimated days-to-sell to an urgency badge level. */
function forecastLevel(days: number): "fast" | "moderate" | "slow" {
  if (days <= 2) return "fast";
  if (days <= 7) return "moderate";
  return "slow";
}

/**
 * Build the list of badges to render on a listing card from its analysis
 * results. Order: price, trust, heat, forecast, image.
 */
export function buildBadges(listing: AnalyzedListing): BadgeDescriptor[] {
  const badges: BadgeDescriptor[] = [];

  // Price rating
  if (listing.priceRating) {
    const info = PRICE_RATING_INFO[listing.priceRating as PriceRatingTier];
    if (info) {
      const pct = listing.priceRatingScore;
      badges.push({
        type: "price",
        level: info.color.replace("price-", ""),
        label: `${info.emoji} ${info.label}`.trim(),
        tooltip:
          pct !== undefined
            ? `${info.description} (${pct}% of median)`
            : info.description,
      });
    }
  }

  // Seller trust
  if (listing.sellerTrustScore !== undefined) {
    const score = Math.round(listing.sellerTrustScore);
    badges.push({
      type: "trust",
      level: trustLevel(score),
      label: `Trust ${score}`,
      tooltip: `Seller trust score ${score}/100`,
    });
  }

  // Heat (only warm and above)
  if (listing.heatScore !== undefined) {
    const level = heatLevel(listing.heatScore);
    if (level) {
      const label =
        level === "fire" ? "On Fire" : level === "hot" ? "Hot" : "Warm";
      badges.push({
        type: "heat",
        level,
        label: `\u{1F525} ${label}`,
        tooltip: `Heat score ${Math.round(listing.heatScore)}/100`,
      });
    }
  }

  // Sales forecast
  if (listing.estimatedDaysToSell !== undefined) {
    const days = listing.estimatedDaysToSell;
    badges.push({
      type: "forecast",
      level: forecastLevel(days),
      label: days < 1 ? "Sells <1d" : `Sells ~${Math.round(days)}d`,
      tooltip: `Estimated ${days.toFixed(1)} days to sell`,
    });
  }

  // Image flags (populated once image analysis runs)
  if (listing.imageFlags && listing.imageFlags.length > 0) {
    badges.push({
      type: "image",
      level: "low",
      label: "⚠ Image",
      tooltip: listing.imageFlags.join(", "),
    });
  }

  return badges;
}
