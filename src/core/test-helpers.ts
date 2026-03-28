import { createListing, type ListingInput, type Listing } from './models/listing';
import { type AnalyzedListing } from './models/analyzed-listing';
import { createSellerProfile, type SellerProfileInput, type SellerProfile } from './models/seller';
import {
  createEngagementSnapshot,
  type EngagementSnapshotInput,
  type EngagementSnapshot,
} from './models/engagement';

const DEFAULTS = {
  listing: {
    id: 'test-listing-1',
    title: 'Test Listing',
    listingUrl: 'https://facebook.com/marketplace/item/1',
  } satisfies ListingInput,

  seller: {
    id: 'test-seller-1',
    displayName: 'Test Seller',
    profileUrl: 'https://facebook.com/marketplace/profile/1',
  } satisfies SellerProfileInput,

  engagement: {
    listingId: 'test-listing-1',
  } satisfies EngagementSnapshotInput,
};

export function buildListing(overrides?: Partial<ListingInput>): Listing {
  return createListing({ ...DEFAULTS.listing, ...overrides });
}

export function buildAnalyzedListing(
  overrides?: Partial<ListingInput> & Partial<Omit<AnalyzedListing, keyof Listing>>,
): AnalyzedListing {
  const { sellerTrustScore, priceRating, priceRatingScore, heatScore, estimatedDaysToSell, imageFlags, aiImageScore, originalityScore, ...listingOverrides } = overrides ?? {};
  const base = createListing({ ...DEFAULTS.listing, ...listingOverrides });
  return {
    ...base,
    sellerTrustScore,
    priceRating,
    priceRatingScore,
    heatScore,
    estimatedDaysToSell,
    imageFlags,
    aiImageScore,
    originalityScore,
  };
}

export function buildSeller(overrides?: Partial<SellerProfileInput>): SellerProfile {
  return createSellerProfile({ ...DEFAULTS.seller, ...overrides });
}

export function buildEngagement(overrides?: Partial<EngagementSnapshotInput>): EngagementSnapshot {
  return createEngagementSnapshot({ ...DEFAULTS.engagement, ...overrides });
}
