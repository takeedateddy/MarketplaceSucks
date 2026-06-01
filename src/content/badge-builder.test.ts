import { describe, it, expect } from "vitest";
import { createListing } from "@/core/models/listing";
import type { AnalyzedListing } from "@/core/models/analyzed-listing";
import { buildBadges } from "@/content/badge-builder";

function analyzed(fields: Partial<AnalyzedListing>): AnalyzedListing {
  const base = createListing({
    id: "1",
    title: "Item",
    listingUrl: "https://facebook.com/marketplace/item/1",
  });
  return { ...base, ...fields };
}

describe("buildBadges", () => {
  it("returns no badges for an un-analyzed listing", () => {
    expect(buildBadges(analyzed({}))).toEqual([]);
  });

  it("builds a price badge mapped to the correct CSS level", () => {
    const badges = buildBadges(analyzed({ priceRating: "great-deal", priceRatingScore: 60 }));
    const price = badges.find((b) => b.type === "price");
    expect(price?.level).toBe("great");
    expect(price?.label).toContain("Great Deal");
    expect(price?.tooltip).toContain("60% of median");
  });

  it("builds a trust badge with the right tier level", () => {
    expect(buildBadges(analyzed({ sellerTrustScore: 85 }))[0]).toMatchObject({
      type: "trust",
      level: "high",
    });
    expect(buildBadges(analyzed({ sellerTrustScore: 30 }))[0].level).toBe("low");
  });

  it("only shows a heat badge at warm and above", () => {
    expect(buildBadges(analyzed({ heatScore: 10 })).some((b) => b.type === "heat")).toBe(false);
    expect(buildBadges(analyzed({ heatScore: 85 }))[0]).toMatchObject({
      type: "heat",
      level: "fire",
    });
  });

  it("builds a forecast badge with urgency level", () => {
    expect(buildBadges(analyzed({ estimatedDaysToSell: 1.4 }))[0]).toMatchObject({
      type: "forecast",
      level: "fast",
    });
    expect(buildBadges(analyzed({ estimatedDaysToSell: 30 }))[0].level).toBe("slow");
  });

  it("orders badges price, trust, heat, forecast", () => {
    const badges = buildBadges(
      analyzed({
        priceRating: "steal",
        priceRatingScore: 30,
        sellerTrustScore: 90,
        heatScore: 70,
        estimatedDaysToSell: 2,
      }),
    );
    expect(badges.map((b) => b.type)).toEqual(["price", "trust", "heat", "forecast"]);
  });
});
