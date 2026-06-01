import { describe, it, expect } from "vitest";
import { createListing } from "@/core/models/listing";
import {
  listingToRecord,
  listingToPricePoint,
  listingToEngagementSnapshot,
} from "@/content/persistence";

const BASE = {
  id: "42",
  title: "Mid Century Dresser",
  listingUrl: "https://facebook.com/marketplace/item/42",
};

describe("listingToRecord", () => {
  it("maps core fields and converts timestamps to ISO strings", () => {
    const ts = Date.parse("2024-01-15T12:00:00.000Z");
    const listing = createListing({
      ...BASE,
      price: 120,
      category: "Furniture",
      condition: "good",
      firstObserved: ts,
      lastObserved: ts,
    });

    const record = listingToRecord(listing);

    expect(record.id).toBe("42");
    expect(record.price).toBe(120);
    expect(record.condition).toBe("good");
    expect(record.firstObserved).toBe("2024-01-15T12:00:00.000Z");
    expect(record.lastObserved).toBe("2024-01-15T12:00:00.000Z");
    expect(record.disappeared).toBe(false);
  });

  it("stores an unknown condition as null", () => {
    const listing = createListing({ ...BASE });
    expect(listingToRecord(listing).condition).toBeNull();
  });
});

describe("listingToPricePoint", () => {
  it("returns a data point for a priced listing", () => {
    const listing = createListing({ ...BASE, price: 120, category: "Furniture" });
    const point = listingToPricePoint(listing);
    expect(point).not.toBeNull();
    expect(point?.price).toBe(120);
    expect(point?.listingId).toBe("42");
    expect(point?.id).toContain("42-");
  });

  it("returns null for free / unpriced listings", () => {
    expect(listingToPricePoint(createListing({ ...BASE, price: null }))).toBeNull();
    expect(listingToPricePoint(createListing({ ...BASE, price: 0 }))).toBeNull();
  });
});

describe("listingToEngagementSnapshot", () => {
  it("returns a snapshot when any engagement metric is present", () => {
    const listing = createListing({
      ...BASE,
      engagement: { saves: 5, comments: null, views: null },
    });
    const snap = listingToEngagementSnapshot(listing);
    expect(snap).not.toBeNull();
    expect(snap?.saves).toBe(5);
    expect(snap?.searchPosition).toBeNull();
  });

  it("returns null when no engagement metrics are present", () => {
    const listing = createListing({ ...BASE });
    expect(listingToEngagementSnapshot(listing)).toBeNull();
  });
});
