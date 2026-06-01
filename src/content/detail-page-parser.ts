/**
 * @module content/detail-page-parser
 *
 * Parses the seller-profile and engagement data that Facebook only renders on a
 * listing's **detail page** (not on the search grid). This is what lets the
 * Trust and Heat features light up: once a seller has been scored from a visited
 * detail page, grid listings from that same seller pick up the cached score.
 *
 * The DOM-reading functions are isolated here (using detail-page-specific
 * `data-testid` blocks) so they don't touch the health-monitored grid selectors
 * in `selectors.config.ts`. `buildSellerRecord` is pure and unit-tested.
 */

import { calculateTrustScore } from "@/core/analysis/seller-trust";
import type { SellerProfile as DomainSellerProfile } from "@/core/models/seller";
import type { SellerProfile as SellerRecord } from "@/data/db-schema";

/** Raw seller fields scraped from a detail page, before scoring. */
export interface ParsedSellerProfile {
  id: string;
  displayName: string;
  profileUrl: string;
  profileImageUrl: string | null;
  joinedDate: string | null;
  accountAgeDays: number | null;
  ratingOverall: number | null;
  ratingCount: number | null;
  responseText: string | null;
  location: string | null;
  activeListings: number | null;
}

/** First non-empty number found in a string, or null. */
function firstNumber(text: string): number | null {
  const m = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/**
 * Extract a seller profile from a detail page. Returns null if the seller-info
 * block is absent. `fallbackLocation` (the listing's location) is used for the
 * profile-completeness "has location" signal when the block omits it.
 */
export function extractSellerProfile(
  root: ParentNode,
  fallbackLocation: string | null = null,
): ParsedSellerProfile | null {
  const block =
    root.querySelector('[data-testid="marketplace-pdp-seller-info"]') ??
    root.querySelector('[data-testid*="seller-info"]');
  if (!block) return null;

  const link = block.querySelector<HTMLAnchorElement>('a[href*="/marketplace/profile/"]');
  const href = link?.getAttribute("href") ?? "";
  const idMatch = href.match(/\/marketplace\/profile\/(\d+)/);
  if (!idMatch) return null;
  const id = idMatch[1];
  const profileUrl = href.startsWith("http") ? href : `https://www.facebook.com${href}`;

  const img = block.querySelector<HTMLImageElement>("img");
  const profileImageUrl = img?.getAttribute("src") ?? null;

  const spans = Array.from(block.querySelectorAll("span")).map((s) => s.textContent?.trim() ?? "");
  const displayName =
    img?.getAttribute("alt")?.trim() || spans.find((t) => t.length > 0) || "Unknown seller";

  let joinedDate: string | null = null;
  let accountAgeDays: number | null = null;
  let ratingOverall: number | null = null;
  let ratingCount: number | null = null;
  let responseText: string | null = null;

  for (const text of spans) {
    const lower = text.toLowerCase();
    if (lower.includes("joined")) {
      joinedDate = text;
      const year = text.match(/(19|20)\d{2}/);
      if (year) {
        const years = new Date().getFullYear() - Number(year[0]);
        accountAgeDays = Math.max(0, years) * 365;
      }
    } else if (lower.includes("star") || lower.includes("review")) {
      const starMatch = text.match(/(\d+(\.\d+)?)\s*star/);
      if (starMatch) ratingOverall = Number(starMatch[1]);
      const reviewMatch = text.match(/(\d[\d,]*)\s*review/);
      if (reviewMatch) ratingCount = Number(reviewMatch[1].replace(/,/g, ""));
    } else if (lower.includes("responsive")) {
      responseText = text;
    }
  }

  return {
    id,
    displayName,
    profileUrl,
    profileImageUrl,
    joinedDate,
    accountAgeDays,
    ratingOverall,
    ratingCount,
    responseText,
    location: fallbackLocation,
    activeListings: null,
  };
}

/** Extract engagement counts from a detail page, or null if the block is absent. */
export function extractDetailEngagement(
  root: ParentNode,
): { saves: number | null; comments: number | null; views: number | null } | null {
  const block =
    root.querySelector('[data-testid="marketplace-pdp-engagement"]') ??
    root.querySelector('[data-testid*="engagement"]');
  if (!block) return null;

  let saves: number | null = null;
  let comments: number | null = null;
  let views: number | null = null;
  for (const span of Array.from(block.querySelectorAll("span"))) {
    const text = span.textContent?.trim() ?? "";
    const lower = text.toLowerCase();
    if (lower.includes("save")) saves = firstNumber(text);
    else if (lower.includes("comment")) comments = firstNumber(text);
    else if (lower.includes("view")) views = firstNumber(text);
  }
  if (saves === null && comments === null && views === null) return null;
  return { saves, comments, views };
}

/**
 * Compute a trust score for a parsed seller and return the persisted
 * (flat) {@link SellerRecord}. Pure -- unit-tested.
 */
export function buildSellerRecord(parsed: ParsedSellerProfile): SellerRecord {
  const domain: Partial<DomainSellerProfile> = {
    accountAgeDays: parsed.accountAgeDays,
    rating: {
      overall: parsed.ratingOverall,
      totalReviews: parsed.ratingCount,
      positiveCount: null,
      negativeCount: null,
    },
    profileImageUrl: parsed.profileImageUrl,
    location: parsed.location,
    activeListings: parsed.activeListings,
    responseDescription: parsed.responseText,
  };
  const trust = calculateTrustScore(domain);

  return {
    id: parsed.id,
    name: parsed.displayName,
    profileUrl: parsed.profileUrl,
    accountAge: parsed.joinedDate,
    accountAgeMonths: parsed.accountAgeDays != null ? Math.floor(parsed.accountAgeDays / 30) : null,
    rating: parsed.ratingOverall,
    ratingCount: parsed.ratingCount,
    responseRate: parsed.responseText,
    responseTime: null,
    hasProfilePhoto: parsed.profileImageUrl != null,
    hasCoverPhoto: false,
    hasLocation: parsed.location != null,
    hasBio: false,
    activeListingCount: parsed.activeListings,
    trustScore: trust.score,
    trustScoreBreakdown: { ...trust.breakdown },
    lastUpdated: new Date().toISOString(),
  };
}
