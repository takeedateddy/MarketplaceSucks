import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import {
  extractSellerProfile,
  extractDetailEngagement,
  buildSellerRecord,
} from "@/content/detail-page-parser";

const SELLER_HTML = `
  <div data-testid="marketplace-pdp-seller-info">
    <a href="/marketplace/profile/200001/">
      <img src="https://scontent.xx.fbcdn.net/seller.jpg" alt="Jane D." />
    </a>
    <span>Joined Facebook in 2018</span>
    <span>Very responsive</span>
    <span>4.8 stars (23 reviews)</span>
  </div>
  <div data-testid="marketplace-pdp-engagement">
    <span>12 people saved this</span>
    <span>3 comments</span>
    <span>156 views</span>
  </div>`;

function docFrom(html: string): Document {
  return new JSDOM(`<html><body>${html}</body></html>`).window.document;
}

describe("extractSellerProfile", () => {
  it("parses seller fields from a detail page", () => {
    const parsed = extractSellerProfile(docFrom(SELLER_HTML), "Brooklyn, NY");
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe("200001");
    expect(parsed?.displayName).toBe("Jane D.");
    expect(parsed?.profileUrl).toContain("/marketplace/profile/200001/");
    expect(parsed?.profileImageUrl).toContain("seller.jpg");
    expect(parsed?.ratingOverall).toBe(4.8);
    expect(parsed?.ratingCount).toBe(23);
    expect(parsed?.responseText?.toLowerCase()).toContain("responsive");
    expect(parsed?.accountAgeDays).toBeGreaterThan(0);
    expect(parsed?.location).toBe("Brooklyn, NY");
  });

  it("returns null when no seller block is present", () => {
    expect(extractSellerProfile(docFrom("<div>nothing</div>"))).toBeNull();
  });
});

describe("extractDetailEngagement", () => {
  it("parses saves/comments/views", () => {
    expect(extractDetailEngagement(docFrom(SELLER_HTML))).toEqual({
      saves: 12,
      comments: 3,
      views: 156,
    });
  });

  it("returns null when no engagement block is present", () => {
    expect(extractDetailEngagement(docFrom("<div>nope</div>"))).toBeNull();
  });
});

describe("buildSellerRecord", () => {
  it("computes a trust score and a persisted record", () => {
    const parsed = extractSellerProfile(docFrom(SELLER_HTML), "Brooklyn, NY")!;
    const record = buildSellerRecord(parsed);

    expect(record.id).toBe("200001");
    expect(record.rating).toBe(4.8);
    expect(record.ratingCount).toBe(23);
    expect(record.hasProfilePhoto).toBe(true);
    expect(record.hasLocation).toBe(true);
    // 3+ real factors (age, rating, volume, completeness, response) => a solid score.
    expect(record.trustScore).toBeGreaterThanOrEqual(60);
    expect(record.trustScoreBreakdown.rating).toBeGreaterThan(0);
  });
});
