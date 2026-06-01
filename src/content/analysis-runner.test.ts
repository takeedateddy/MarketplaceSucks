import { describe, it, expect } from "vitest";
import { createListing } from "@/core/models/listing";
import type { Listing } from "@/core/models/listing";
import type { EngagementSnapshot } from "@/data/db-schema";
import type { AnalysisDataSource } from "@/content/persistence";
import { analyzeListing, analyzeListings } from "@/content/analysis-runner";

/** Build a configurable in-memory data source for the analysis runner. */
function fakeSource(opts: {
  comparables?: number[];
  previousEngagement?: EngagementSnapshot | null;
  sellerTrustScore?: number | null;
}): AnalysisDataSource {
  return {
    async getComparablePrices() {
      return opts.comparables ?? [];
    },
    async getPreviousEngagement() {
      return opts.previousEngagement ?? null;
    },
    async getSellerTrustScore() {
      return opts.sellerTrustScore ?? null;
    },
  };
}

function makeListing(over: Partial<Parameters<typeof createListing>[0]> = {}): Listing {
  return createListing({
    id: "1",
    title: "Vintage Record Player",
    listingUrl: "https://facebook.com/marketplace/item/1",
    category: "Electronics",
    ...over,
  });
}

describe("analyzeListing — price rating", () => {
  it("attaches a price rating tier and score when enough comparables exist", async () => {
    // median of [100,110,120,130,140] = 120; listing at 60 => 50% of median
    const listing = makeListing({ price: 60 });
    const source = fakeSource({ comparables: [100, 110, 120, 130, 140] });

    const result = await analyzeListing(listing, source);

    expect(result.priceRating).toBeDefined();
    expect(result.priceRatingScore).toBe(50);
  });

  it("does not attach a rating with fewer than 5 comparables", async () => {
    const listing = makeListing({ price: 60 });
    const source = fakeSource({ comparables: [100, 120, 140] });

    const result = await analyzeListing(listing, source);

    expect(result.priceRating).toBeUndefined();
    expect(result.priceRatingScore).toBeUndefined();
  });

  it("does not attach a rating when the listing has no price", async () => {
    const listing = makeListing({ price: null });
    const source = fakeSource({ comparables: [100, 110, 120, 130, 140] });

    const result = await analyzeListing(listing, source);

    expect(result.priceRating).toBeUndefined();
  });
});

describe("analyzeListing — heat", () => {
  it("attaches a heat score when the listing has engagement", async () => {
    const listing = makeListing({
      engagement: { saves: 20, comments: 5, views: 400 },
      parsedDate: Date.now(),
    });
    const source = fakeSource({});

    const result = await analyzeListing(listing, source);

    expect(result.heatScore).toBeGreaterThan(0);
  });

  it("does not attach a heat score when there is no engagement data", async () => {
    const listing = makeListing({ price: 100 });
    const source = fakeSource({ comparables: [90, 100, 110, 120, 130] });

    const result = await analyzeListing(listing, source);

    expect(result.heatScore).toBeUndefined();
  });
});

describe("analyzeListing — forecast", () => {
  it("attaches an estimated days-to-sell when comparables exist", async () => {
    const listing = makeListing({ price: 80 });
    const source = fakeSource({ comparables: [100, 110, 120, 130, 140] });

    const result = await analyzeListing(listing, source);

    expect(result.estimatedDaysToSell).toBeGreaterThan(0);
    expect(result.estimatedDaysToSell).toBeLessThanOrEqual(90);
  });
});

describe("analyzeListing — purity", () => {
  it("does not mutate the original listing", async () => {
    const listing = makeListing({ price: 60 });
    const source = fakeSource({ comparables: [100, 110, 120, 130, 140] });

    await analyzeListing(listing, source);

    expect("priceRating" in listing).toBe(false);
  });
});

describe("analyzeListings — batch", () => {
  it("analyzes every listing and preserves order", async () => {
    const listings = [
      makeListing({ id: "a", price: 60 }),
      makeListing({ id: "b", price: 200 }),
    ];
    const source = fakeSource({ comparables: [100, 110, 120, 130, 140] });

    const results = await analyzeListings(listings, source);

    expect(results.map((r) => r.id)).toEqual(["a", "b"]);
    expect(results[0].priceRating).toBeDefined();
    expect(results[1].priceRating).toBeDefined();
  });
});
